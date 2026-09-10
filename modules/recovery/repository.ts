import {z} from "zod";
import {getD1Database} from "@/db/runtime";
import {randomToken,sha256Text} from "@/modules/auth/password";
import {getCourseById} from "@/modules/courses/demo-courses";
import {audit,requireSocial,requireUnblocked,safeCommunityText,ToolError,transactionGuard} from "@/modules/player-tools/server";
import {checkRateLimit} from "@/lib/security/request-security";
export const tagSchema=z.object({discId:z.string().max(120),label:z.string().trim().min(3).max(100),courseId:z.string().max(120).nullable(),publicListing:z.boolean()});
type Tag={id:string;ownerId:string;label:string;courseId:string|null;publicListing:number};
async function tagLookup(token:string|undefined,id:string|undefined) {
  const db=getD1Database();
  const q=`SELECT t.id,t.user_id AS ownerId,t.label,t.course_id AS courseId,t.public_listing AS publicListing FROM recovery_tags t
    JOIN player_discs d ON d.id=t.disc_id AND d.user_id=t.user_id WHERE t.revoked_at IS NULL AND d.deleted_at IS NULL AND `;
  const tag=token?await db.prepare(q+"t.token_hash=?").bind(await sha256Text(token)).first<Tag>():id?await db.prepare(q+"t.id=? AND t.public_listing=1").bind(id).first<Tag>():null;
  if(!tag)throw new ToolError("This recovery link is unavailable or has been revoked.",404);
  return tag;
}
export async function createTag(uid:string,input:z.infer<typeof tagSchema>) {
  const db=getD1Database();if(input.courseId&&!getCourseById(input.courseId))throw new ToolError("Course not found.");
  if(input.publicListing&&!input.courseId)throw new ToolError("Choose the course for a public lost-disc listing.");
  const disc=await db.prepare("SELECT id FROM player_discs WHERE id=? AND user_id=? AND deleted_at IS NULL").bind(input.discId,uid).first();if(!disc)throw new ToolError("Choose a disc you own.",403);
  safeCommunityText(input.label);const id=crypto.randomUUID(),token=randomToken(),now=new Date().toISOString();
  await db.batch([
    db.prepare("UPDATE recovery_tags SET revoked_at=?,public_listing=0 WHERE disc_id=? AND user_id=? AND revoked_at IS NULL").bind(now,input.discId,uid),
    db.prepare("UPDATE recovery_cases SET status='CLOSED',updated_at=? WHERE status!='DELETED' AND tag_id IN (SELECT id FROM recovery_tags WHERE disc_id=? AND user_id=?)").bind(now,input.discId,uid),
    db.prepare("INSERT INTO recovery_tags(id,user_id,disc_id,token_hash,label,course_id,public_listing,created_at) VALUES(?,?,?,?,?,?,?,?)").bind(id,uid,input.discId,await sha256Text(token),input.label,input.courseId,Number(input.publicListing),now),
    audit(uid,"recovery_tag",id,"CREATE",{publicListing:input.publicListing}),
  ]);return {id,token};
}
export async function recoveryOverview(uid:string,courseId?:string) {
  const db=getD1Database();
  const tags=(await db.prepare("SELECT id,label,course_id AS courseId,public_listing AS publicListing,revoked_at AS revokedAt FROM recovery_tags WHERE user_id=? AND revoked_at IS NULL ORDER BY created_at DESC LIMIT 100").bind(uid).all()).results;
  const cases=(await db.prepare(`SELECT c.id,t.label,c.status,c.updated_at AS updatedAt,c.owner_id=? AS owner FROM recovery_cases c JOIN recovery_tags t ON t.id=c.tag_id
    WHERE (c.owner_id=? OR c.finder_id=?) AND c.status!='DELETED' ORDER BY c.updated_at DESC LIMIT 100`).bind(uid,uid,uid).all()).results;
  const board=courseId?(await db.prepare(`SELECT t.id,t.label,t.created_at AS createdAt FROM recovery_tags t JOIN player_discs d ON d.id=t.disc_id AND d.user_id=t.user_id
    WHERE t.course_id=? AND t.public_listing=1 AND t.revoked_at IS NULL AND d.deleted_at IS NULL LIMIT 100`).bind(courseId).all()).results:[];
  return {tags,cases,board};
}
export async function describeTag(uid:string,token?:string,id?:string){const t=await tagLookup(token,id);await requireUnblocked(uid,t.ownerId);return {id:t.id,label:t.label,courseName:t.courseId?getCourseById(t.courseId)?.name:null};}
export async function openRecovery(uid:string,i:{id:string;token?:string;tagId?:string;body:string}) {
  const t=await tagLookup(i.token,i.tagId);if(t.ownerId===uid)throw new ToolError("This is your own disc tag.");
  await requireSocial(t.ownerId);await requireUnblocked(uid,t.ownerId);safeCommunityText(i.body);
  const limit=await checkRateLimit("recovery-contact",uid,10,86400);if(!limit.allowed)throw new ToolError("Contact limit reached. Try again tomorrow.",429);
  const db=getD1Database(),now=new Date().toISOString();
  const previous=await db.prepare("SELECT id FROM recovery_cases WHERE id=? AND finder_id=? AND tag_id=?").bind(i.id,uid,t.id).first();if(previous){const first=await db.prepare("SELECT body FROM recovery_messages WHERE case_id=? AND sender_id=? ORDER BY created_at,id LIMIT 1").bind(i.id,uid).first<{body:string}>();if(first?.body!==i.body)throw new ToolError("This contact request key belongs to a different message.",409);return {id:i.id};}
  await db.batch([
    ...transactionGuard("EXISTS(SELECT 1 FROM recovery_tags t JOIN player_discs d ON d.id=t.disc_id AND d.user_id=t.user_id WHERE t.id=? AND t.revoked_at IS NULL AND d.deleted_at IS NULL) AND NOT EXISTS(SELECT 1 FROM blocked_users WHERE (blocker_user_id=? AND blocked_user_id=?) OR (blocker_user_id=? AND blocked_user_id=?))",[t.id,uid,t.ownerId,t.ownerId,uid]),
    db.prepare("INSERT INTO recovery_cases(id,owner_id,finder_id,tag_id,course_id,status,created_at,updated_at) VALUES(?,?,?,?,?,'OPEN',?,?)").bind(i.id,t.ownerId,uid,t.id,t.courseId,now,now),
    db.prepare("INSERT INTO recovery_messages(id,case_id,sender_id,body,created_at) VALUES(?,?,?,?,?)").bind(crypto.randomUUID(),i.id,uid,i.body,now),
  ]);return {id:i.id};
}
async function requireCase(uid:string,id:string,communicate=true) {
  const c=await getD1Database().prepare("SELECT id,owner_id AS ownerId,finder_id AS finderId,status,tag_id AS tagId FROM recovery_cases WHERE id=? AND (owner_id=? OR finder_id=?) AND status!='DELETED'").bind(id,uid,uid).first<{id:string;ownerId:string;finderId:string;status:string;tagId:string}>();
  if(!c)throw new ToolError("Recovery conversation not found.",404);if(communicate)await requireUnblocked(c.ownerId,c.finderId);return c;
}
export async function recoveryConversation(uid:string,id:string){const c=await requireCase(uid,id);const messages=(await getD1Database().prepare("SELECT id,body,sender_id=? AS mine,created_at AS createdAt FROM recovery_messages WHERE case_id=? ORDER BY created_at,id LIMIT 200").bind(uid,id).all()).results;return {id,status:c.status,owner:c.ownerId===uid,messages};}
export async function sendRecovery(uid:string,id:string,messageId:string,text:string) {
  const c=await requireCase(uid,id);if(c.status!=="OPEN")throw new ToolError("This conversation is closed.",409);await requireSocial(c.ownerId);await requireSocial(c.finderId);safeCommunityText(text);
  const db=getD1Database(),now=new Date().toISOString();await db.batch([
    db.prepare(`INSERT OR IGNORE INTO recovery_messages(id,case_id,sender_id,body,created_at)
      SELECT ?,?,?,?,? FROM recovery_cases c JOIN recovery_tags t ON t.id=c.tag_id WHERE c.id=? AND c.status='OPEN' AND t.revoked_at IS NULL AND EXISTS(SELECT 1 FROM player_discs d WHERE d.id=t.disc_id AND d.user_id=t.user_id AND d.deleted_at IS NULL)
      AND NOT EXISTS(SELECT 1 FROM blocked_users WHERE (blocker_user_id=c.owner_id AND blocked_user_id=c.finder_id) OR (blocker_user_id=c.finder_id AND blocked_user_id=c.owner_id))`).bind(messageId,id,uid,text,now,id),
    db.prepare("UPDATE recovery_cases SET updated_at=? WHERE id=? AND status='OPEN'").bind(now,id),
  ]);const saved=await db.prepare("SELECT body FROM recovery_messages WHERE id=? AND case_id=? AND sender_id=?").bind(messageId,id,uid).first<{body:string}>();if(saved?.body!==text)throw new ToolError("Message was not saved. The conversation may have closed.",409);return {sent:true};
}
export async function closeRecovery(uid:string,id:string,action:"CLOSE"|"DELETE"|"BLOCK") {
  const c=await requireCase(uid,id,false),db=getD1Database(),now=new Date().toISOString(),other=c.ownerId===uid?c.finderId:c.ownerId;
  const statements=[db.prepare("UPDATE recovery_cases SET status=?,updated_at=? WHERE id=? AND status!='DELETED'").bind(action==="DELETE"?"DELETED":"CLOSED",now,id),db.prepare("INSERT INTO player_tool_audit(id,actor_id,resource_type,resource_id,action,detail_json,created_at) SELECT ?,?,'recovery_case',?,?,'{}',? WHERE changes()=1").bind(crypto.randomUUID(),uid,id,action,now)];
  if(action==="DELETE")statements.push(db.prepare("DELETE FROM recovery_messages WHERE case_id=?").bind(id));
  if(action==="BLOCK")statements.push(db.prepare("INSERT OR IGNORE INTO blocked_users(id,blocker_user_id,blocked_user_id,created_at) VALUES(?,?,?,?)").bind(crypto.randomUUID(),uid,other,now));
  await db.batch(statements);return {closed:true};
}
export async function revokeTag(uid:string,id:string) {const db=getD1Database(),now=new Date().toISOString();await db.batch([db.prepare("UPDATE recovery_tags SET revoked_at=?,public_listing=0 WHERE id=? AND user_id=?").bind(now,id,uid),db.prepare("UPDATE recovery_cases SET status='CLOSED',updated_at=? WHERE status!='DELETED' AND tag_id IN (SELECT id FROM recovery_tags WHERE id=? AND user_id=?)").bind(now,id,uid)]);return {revoked:true};}
