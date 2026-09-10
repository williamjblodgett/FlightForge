import { z } from "zod";
import { getD1Database } from "@/db/runtime";
import { getCourseById } from "./demo-courses";
import { safeCommunityText,ToolError } from "@/modules/player-tools/server";
export const conditionSchema=z.object({id:z.uuid(),courseId:z.string().max(120),status:z.enum(["OPEN","CLOSED","MUDDY","SNOW","ICE","MAINTENANCE","LAYOUT_CHANGE"]),note:z.string().trim().min(5).max(600),hours:z.number().int().min(1).max(72)});
export type CourseNotice={id:string;courseId:string;status:string;note:string;sourceType:string;observedAt:string;expiresAt:string;mine:boolean};
export async function isCourseOperator(uid:string,courseId:string) {
  return Boolean(await getD1Database().prepare(`SELECT 1 FROM organization_memberships m JOIN organizations o ON o.id=m.organization_id
    JOIN organization_course_access a ON a.organization_id=m.organization_id
    WHERE m.user_id=? AND m.status='ACTIVE' AND o.organization_type='COURSE_OPERATOR' AND o.deleted_at IS NULL AND a.course_id=?
    AND EXISTS(SELECT 1 FROM json_each(m.permissions_json) WHERE value IN ('OWNER','MANAGE_COURSE')) LIMIT 1`).bind(uid,courseId).first());
}
export async function postCondition(uid:string,input:z.infer<typeof conditionSchema>){
  if(!getCourseById(input.courseId))throw new ToolError("Choose a published course.",404);
  safeCommunityText(input.note);
  const operator=await isCourseOperator(uid,input.courseId),now=new Date().toISOString();
  const expires=new Date(Date.parse(now)+Math.min(input.hours,operator?72:24)*3_600_000).toISOString();
  const db=getD1Database();
  const fingerprint=JSON.stringify({uid,...input});
  await db.batch([
    db.prepare("INSERT OR IGNORE INTO course_conditions(id,course_id,status,note,source_type,source_user_id,observed_at,expires_at,created_at,condition_codes_json) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(input.id,input.courseId,input.status,input.note,operator?"OPERATOR":"PLAYER",uid,now,expires,now,fingerprint),
    db.prepare("INSERT INTO player_tool_audit(id,actor_id,resource_type,resource_id,action,detail_json,created_at) SELECT ?,?,'course_condition',?,'POST',?,? WHERE changes()=1").bind(crypto.randomUUID(),uid,input.id,JSON.stringify({source:operator?"OPERATOR":"PLAYER",expires}),now),
  ]);
  const saved=await db.prepare("SELECT condition_codes_json AS fingerprint FROM course_conditions WHERE id=?").bind(input.id).first<{fingerprint:string}>();
  if(saved?.fingerprint!==fingerprint)throw new ToolError("This request key was used for another report.",409);
  return {saved:true};
}
export async function listConditions(courseId:string,uid:string|null=null):Promise<CourseNotice[]> {
  return (await getD1Database().prepare(`SELECT id,course_id AS courseId,status,note,source_type AS sourceType,
    observed_at AS observedAt,expires_at AS expiresAt,source_user_id=? AS mine FROM course_conditions
    WHERE course_id=? AND datetime(expires_at)>datetime('now') ORDER BY observed_at DESC LIMIT 20`).bind(uid,courseId).all<CourseNotice>()).results;
}
export async function courseUpdates(uid:string) {
  const db=getD1Database();
  const notices=(await db.prepare(`SELECT c.id,c.course_id AS courseId,c.status,c.note,c.source_type AS sourceType,c.observed_at AS observedAt,c.expires_at AS expiresAt
    FROM course_conditions c JOIN follows f ON f.target_type='COURSE' AND f.target_id=c.course_id AND f.follower_user_id=?
    WHERE datetime(c.expires_at)>datetime('now') ORDER BY c.observed_at DESC LIMIT 100`).bind(uid).all<CourseNotice>()).results;
  const followed=(await db.prepare("SELECT target_id AS courseId FROM follows WHERE follower_user_id=? AND target_type='COURSE' ORDER BY created_at DESC LIMIT 300").bind(uid).all<{courseId:string}>()).results;
  return {notices: notices.map(n=>({...n,courseName:getCourseById(n.courseId)?.name??"Course"})),followed};
}
