import { z } from "zod";
import { getD1Database } from "@/db/runtime";
import type {AuthenticatedUser} from "@/modules/auth/types";
import {randomToken,sha256Text} from "@/modules/auth/password";
import {createPersonalContext,type RoundContext} from "@/modules/rounds/round-context";
import {getOrCreateActiveRound} from "@/modules/rounds/round-repository";
import {getRoundForUser} from "@/modules/rounds/history-repository";
import {getCourseById} from "@/modules/courses/demo-courses";
import {audit,requireUnblocked,requireSocial,safeCommunityText,ToolError,transactionGuard} from "@/modules/player-tools/server";
export const createGroupSchema=z.object({id:z.uuid(),courseId:z.string().max(120),layoutId:z.string().max(120).nullable(),holeCount:z.number().int().min(1).max(36),startsAt:z.iso.datetime(),visibility:z.enum(["PRIVATE","PUBLIC"]),pace:z.enum(["RELAXED","STEADY","QUICK"]),beginnersWelcome:z.boolean(),capacity:z.number().int().min(2).max(8)})
  .refine(i=>Date.parse(i.startsAt)>Date.now()-86400000&&Date.parse(i.startsAt)<Date.now()+90*86400000,"Choose a date within the next 90 days.");
type GroupRow={id:string;hostId:string;courseId:string;contextJson:string;startsAt:string;visibility:string;pace:string;beginnersWelcome:number;capacity:number;tokenHash:string;status:string;version:number};
type MemberRow={id:string;userId:string|null;displayName:string;status:string;roundId:string|null;guestScoresJson:string;version:number};
const selectGroup="SELECT id,host_id AS hostId,course_id AS courseId,context_json AS contextJson,starts_at AS startsAt,visibility,pace,beginners_welcome AS beginnersWelcome,capacity,token_hash AS tokenHash,status,version FROM play_groups";
export async function createGroup(user:AuthenticatedUser,i:z.infer<typeof createGroupSchema>) {
  const db=getD1Database(),previous=await db.prepare(selectGroup+" WHERE id=?").bind(i.id).first<GroupRow>();
  if(previous){const c=JSON.parse(previous.contextJson) as RoundContext;if(previous.hostId!==user.id||previous.courseId!==i.courseId||previous.startsAt!==i.startsAt||previous.capacity!==i.capacity||previous.visibility!==i.visibility||previous.pace!==i.pace||Boolean(previous.beginnersWelcome)!==i.beginnersWelcome||c.layoutId!==i.layoutId||(!i.layoutId&&c.holeCount!==i.holeCount))throw new ToolError("This request belongs to another group selection.",409);return {id:previous.id};}
  const c=await createPersonalContext(i.courseId,i.layoutId,i.id,i.holeCount),token=randomToken(),now=new Date().toISOString();
  await db.batch([
    db.prepare("INSERT OR IGNORE INTO play_groups(id,host_id,course_id,context_json,starts_at,visibility,pace,beginners_welcome,capacity,token_hash,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,'OPEN',?)").bind(i.id,user.id,i.courseId,JSON.stringify(c),i.startsAt,i.visibility,i.pace,Number(i.beginnersWelcome),i.capacity,await sha256Text(token),now),
    ...transactionGuard("EXISTS(SELECT 1 FROM play_groups WHERE id=? AND host_id=? AND course_id=? AND starts_at=? AND capacity=? AND visibility=? AND pace=? AND beginners_welcome=?)",[i.id,user.id,i.courseId,i.startsAt,i.capacity,i.visibility,i.pace,Number(i.beginnersWelcome)]),
    db.prepare("INSERT OR IGNORE INTO play_group_members(id,group_id,user_id,display_name,status,created_at,updated_at) VALUES(?,?,?,?,'ACTIVE',?,?)").bind(crypto.randomUUID(),i.id,user.id,user.displayName,now,now),
    audit(user.id,"play_group",i.id,"CREATE",{visibility:i.visibility}),
  ]);
  const persisted=await group(i.id);
  return {id:i.id,token:persisted.tokenHash===await sha256Text(token)?token:undefined};
}
async function group(id:string){const g=await getD1Database().prepare(selectGroup+" WHERE id=?").bind(id).first<GroupRow>();if(!g)throw new ToolError("Group not found.",404);return g;}
async function members(id:string){return(await getD1Database().prepare("SELECT id,user_id AS userId,display_name AS displayName,status,round_id AS roundId,guest_scores_json AS guestScoresJson,version FROM play_group_members WHERE group_id=? AND status IN ('ACTIVE','PENDING') ORDER BY created_at,id LIMIT 120").bind(id).all<MemberRow>()).results;}
async function safeRoster(g:GroupRow,uid:string){await requireUnblocked(uid,g.hostId);for(const m of await members(g.id))if(m.userId&&m.status==="ACTIVE")await requireUnblocked(uid,m.userId);}
export async function listGroups(uid:string) {
  const rows=(await getD1Database().prepare(`SELECT g.id,g.course_id AS courseId,g.starts_at AS startsAt,g.pace,g.capacity,g.beginners_welcome AS beginnersWelcome,
    (SELECT COUNT(*) FROM play_group_members m WHERE m.group_id=g.id AND m.status='ACTIVE') AS players,
    EXISTS(SELECT 1 FROM play_group_members m WHERE m.group_id=g.id AND m.user_id=? AND m.status IN ('ACTIVE','PENDING')) AS mine
    FROM play_groups g WHERE (g.visibility='PUBLIC' AND g.status='OPEN' AND datetime(g.starts_at)>datetime('now','-6 hours')
      OR EXISTS(SELECT 1 FROM play_group_members m WHERE m.group_id=g.id AND m.user_id=? AND m.status IN ('ACTIVE','PENDING')))
    AND NOT EXISTS(SELECT 1 FROM play_group_members m JOIN blocked_users b ON (b.blocker_user_id=? AND b.blocked_user_id=m.user_id) OR (b.blocker_user_id=m.user_id AND b.blocked_user_id=?) WHERE m.group_id=g.id AND m.status='ACTIVE')
    ORDER BY g.starts_at DESC LIMIT 60`).bind(uid,uid,uid,uid).all<{id:string;courseId:string;startsAt:string;pace:string;capacity:number;players:number;beginnersWelcome:number;mine:number}>()).results;
  return rows.map(g=>({...g,courseName:getCourseById(g.courseId)?.name??"Course"}));
}
export async function getGroup(uid:string,id:string,token?:string) {
  const g=await group(id);await safeRoster(g,uid);const all=await members(id),mine=all.find(m=>m.userId===uid);
  if(g.visibility!=="PUBLIC"&&mine?.status!=="ACTIVE"&&mine?.status!=="PENDING"&&(!token||await sha256Text(token)!==g.tokenHash))throw new ToolError("Use a valid invitation to open this private group.",403);
  const active=mine?.status==="ACTIVE";
  const roster=active?await Promise.all(all.filter(m=>m.status==="ACTIVE"||(g.hostId===uid&&m.status==="PENDING")).map(async m=>{
    // The group membership authorizes only this score projection, never private personal-round routes.
    const scores=m.roundId?(await getD1Database().prepare(`SELECT h.hole_number AS holeNumber,h.strokes,h.penalties FROM hole_scores h JOIN scorecards s ON s.id=h.scorecard_id JOIN round_players p ON p.id=s.round_player_id
      WHERE s.round_id=? AND p.user_id=? ORDER BY h.hole_number`).bind(m.roundId,m.userId).all<{holeNumber:number;strokes:number;penalties:number}>()).results:JSON.parse(m.guestScoresJson) as Array<{holeNumber:number;strokes:number;penalties:number}>;
    return {id:m.id,name:m.displayName,status:m.status,mine:m.userId===uid,guest:m.userId===null,version:m.version,scores,roundId:m.userId===uid?m.roundId:null};
  })):[];
  return {id:g.id,courseName:getCourseById(g.courseId)?.name??"Course",startsAt:g.startsAt,status:g.status,pace:g.pace,capacity:g.capacity,visibility:g.visibility,beginnersWelcome:Boolean(g.beginnersWelcome),host:g.hostId===uid,membership:mine?.status??null,context:JSON.parse(g.contextJson) as RoundContext,roster};
}
export async function requestJoin(user:AuthenticatedUser,id:string,token?:string) {
  const g=await group(id);await safeRoster(g,user.id);
  if(g.status!=="OPEN"||Date.parse(g.startsAt)<Date.now()-86400000)throw new ToolError("This group is no longer accepting players.",409);
  if(g.visibility==="PRIVATE"&&(!token||await sha256Text(token)!==g.tokenHash))throw new ToolError("A valid invitation is required.",403);
  const now=new Date().toISOString();
  await getD1Database().prepare("INSERT OR IGNORE INTO play_group_members(id,group_id,user_id,display_name,status,created_at,updated_at) SELECT ?,?,?,?,'PENDING',?,? WHERE (SELECT COUNT(*) FROM play_group_members WHERE group_id=? AND status='PENDING')<100 AND EXISTS(SELECT 1 FROM play_groups g WHERE g.id=? AND g.status='OPEN' AND datetime(g.starts_at)>datetime('now','-1 day') AND (g.visibility='PUBLIC' OR g.token_hash=?) AND NOT EXISTS(SELECT 1 FROM blocked_users b WHERE (b.blocker_user_id=? AND b.blocked_user_id=g.host_id) OR (b.blocked_user_id=? AND b.blocker_user_id=g.host_id))) AND NOT EXISTS(SELECT 1 FROM play_group_members m JOIN blocked_users b ON (b.blocker_user_id=? AND b.blocked_user_id=m.user_id) OR (b.blocked_user_id=? AND b.blocker_user_id=m.user_id) WHERE m.group_id=? AND m.status='ACTIVE')").bind(crypto.randomUUID(),id,user.id,user.displayName,now,now,id,id,token?await sha256Text(token):"",user.id,user.id,user.id,user.id,id).run();
  const membership=(await members(id)).find(m=>m.userId===user.id);if(!membership||!["ACTIVE","PENDING"].includes(membership.status))throw new ToolError("The host removed this request; contact them through your existing communication channel.",409);
  return {requested:true,status:membership.status};
}
export async function manageMember(uid:string,id:string,memberId:string,approve:boolean) {
  const g=await group(id),db=getD1Database();if(g.hostId!==uid)throw new ToolError("Only the host manages participants.",403);
  const m=(await members(id)).find(m=>m.id===memberId);if(!m||m.userId===uid)throw new ToolError("Choose another participant.");
  if(approve){if(m.userId){await requireSocial(m.userId);await safeRoster(g,m.userId);}if(g.status!=="OPEN")throw new ToolError("The group is locked.",409);}
  const results=await db.batch([db.prepare(`UPDATE play_group_members SET status=?,version=version+1,updated_at=? WHERE id=? AND group_id=? AND status=?
    AND (?=0 OR (SELECT COUNT(*) FROM play_group_members WHERE group_id=? AND status='ACTIVE')<(SELECT capacity FROM play_groups WHERE id=? AND status='OPEN'))
    AND (?=0 OR NOT EXISTS(SELECT 1 FROM play_group_members active JOIN blocked_users b ON (b.blocker_user_id=play_group_members.user_id AND b.blocked_user_id=active.user_id) OR (b.blocked_user_id=play_group_members.user_id AND b.blocker_user_id=active.user_id) WHERE active.group_id=play_group_members.group_id AND active.status='ACTIVE'))`)
    .bind(approve?"ACTIVE":"REMOVED",new Date().toISOString(),memberId,id,approve?"PENDING":m.status,Number(approve),id,id,Number(approve)),db.prepare("INSERT INTO player_tool_audit(id,actor_id,resource_type,resource_id,action,detail_json,created_at) SELECT ?,?,'play_group',?,?,?,? WHERE changes()=1").bind(crypto.randomUUID(),uid,id,approve?"APPROVE":"REMOVE",JSON.stringify({memberId}),new Date().toISOString())]);
  if(!results[0].meta.changes)throw new ToolError("This group changed or is full. Refresh the roster.",409);
  return {updated:true};
}
export async function addGuest(uid:string,id:string,name:string,guestId:string) {
  const g=await group(id),db=getD1Database();if(g.hostId!==uid||g.status!=="OPEN")throw new ToolError("Only the host can add guests to an open group.",403);
  safeCommunityText(name);const now=new Date().toISOString();
  const r=await db.prepare(`INSERT OR IGNORE INTO play_group_members(id,group_id,display_name,status,created_at,updated_at)
    SELECT ?,?,?,'ACTIVE',?,? WHERE (SELECT COUNT(*) FROM play_group_members WHERE group_id=? AND status='ACTIVE')<(SELECT capacity FROM play_groups WHERE id=? AND status='OPEN')`).bind(guestId,id,name,now,now,id,id).run();
  if(!r.meta.changes)throw new ToolError("Group full or guest already added.",409);return {added:true};
}
export async function startGroupRound(user:AuthenticatedUser,id:string) {
  const g=await group(id);await safeRoster(g,user.id);const m=(await members(id)).find(m=>m.userId===user.id&&m.status==="ACTIVE");
  if(!m)throw new ToolError("Host approval is required before scoring.",403);
  if(m.roundId)return {next:(await getRoundForUser(user,m.roundId))?.status==="COMPLETED"?`/rounds/${m.roundId}`:`/play?roundId=${m.roundId}`};
  if(g.status==="CLOSED")throw new ToolError("This group has ended.",409);
  const context={...JSON.parse(g.contextJson) as RoundContext,id:`personal:group-${id}-${user.id}`};
  const round=await getOrCreateActiveRound(user,context,context);
  const linked=await getD1Database().prepare("UPDATE play_group_members SET round_id=?,updated_at=?,version=version+1 WHERE id=? AND user_id=? AND status='ACTIVE' AND (round_id IS NULL OR round_id=?) AND EXISTS(SELECT 1 FROM play_groups WHERE id=? AND status!='CLOSED')").bind(round.id,new Date().toISOString(),m.id,user.id,round.id,id).run();
  if(!linked.meta.changes)throw new ToolError("Your membership changed; the personal round remains in your round history.",409);
  return {next:`/play?roundId=${round.id}`};
}
export async function setGroupStatus(uid:string,id:string,status:"OPEN"|"LOCKED"|"CLOSED") {const g=await group(id);if(g.hostId!==uid)throw new ToolError("Only the host manages this group.",403);await getD1Database().prepare("UPDATE play_groups SET status=?,version=version+1 WHERE id=? AND host_id=?").bind(status,id,uid).run();return {updated:true};}
export async function rotateGroupLink(uid:string,id:string){const g=await group(id);if(g.hostId!==uid)throw new ToolError("Only the host creates invitations.",403);const token=randomToken();await getD1Database().prepare("UPDATE play_groups SET token_hash=?,version=version+1 WHERE id=? AND host_id=?").bind(await sha256Text(token),id,uid).run();return {token};}
export async function guestScore(uid:string,id:string,memberId:string,input:{holeNumber:number;strokes:number;penalties:number;version:number}) {
  const g=await group(id),db=getD1Database();if(g.hostId!==uid||g.status==="CLOSED")throw new ToolError("Only the host can record guest scores in an active group.",403);
  const m=(await members(id)).find(m=>m.id===memberId&&m.userId===null&&m.status==="ACTIVE");if(!m||input.holeNumber>(JSON.parse(g.contextJson) as RoundContext).holeCount)throw new ToolError("Guest or hole not found.",404);
  if(m.version!==input.version)throw new ToolError("Guest scores changed; refresh before correcting.",409);
  const scores=JSON.parse(m.guestScoresJson) as Array<{holeNumber:number;strokes:number;penalties:number}>;
  const next=[...scores.filter(s=>s.holeNumber!==input.holeNumber),{holeNumber:input.holeNumber,strokes:input.strokes,penalties:input.penalties}].sort((a,b)=>a.holeNumber-b.holeNumber);
  const mutation=crypto.randomUUID();
  const changes=await db.batch([
    ...transactionGuard("EXISTS(SELECT 1 FROM play_groups WHERE id=? AND host_id=? AND status!='CLOSED') AND EXISTS(SELECT 1 FROM play_group_members WHERE id=? AND status='ACTIVE' AND user_id IS NULL)",[id,uid,memberId]),
    db.prepare("UPDATE play_group_members SET guest_scores_json=?,version=version+1,updated_at=? WHERE id=? AND group_id=? AND version=?").bind(JSON.stringify(next),new Date().toISOString(),memberId,id,input.version),
    db.prepare("INSERT INTO player_tool_audit(id,actor_id,resource_type,resource_id,action,detail_json,created_at) SELECT ?,?,'guest_score',?,'CORRECT',?,? WHERE changes()=1").bind(mutation,uid,memberId,JSON.stringify({previous:scores,next}),new Date().toISOString()),
  ]);
  if(!changes[2].meta.changes)throw new ToolError("Guest scores changed; refresh before correcting.",409);return {saved:true};
}
export async function leaveGroup(uid:string,id:string){const g=await group(id);if(g.hostId===uid)throw new ToolError("Hosts can end participation using Host controls.");await getD1Database().prepare("UPDATE play_group_members SET status='REMOVED',version=version+1,updated_at=? WHERE group_id=? AND user_id=? AND status IN ('ACTIVE','PENDING')").bind(new Date().toISOString(),id,uid).run();return {left:true};}
