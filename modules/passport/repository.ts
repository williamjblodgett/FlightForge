import { z } from "zod";
import { getD1Database } from "@/db/runtime";
import { courses,getCourseById } from "@/modules/courses/demo-courses";
import { ToolError } from "@/modules/player-tools/server";
export const passportSchema=z.object({courseId:z.string().max(120),state:z.enum(["PLAYED","WISHLIST","REMOVE"]),visitedOn:z.iso.date().nullable()}).refine(i=>!i.visitedOn||i.visitedOn<=new Date().toISOString().slice(0,10),"A played date cannot be in the future.");
export async function savePassport(uid:string,i:z.infer<typeof passportSchema>) {
  if(!getCourseById(i.courseId))throw new ToolError("Choose a published course.",404);
  const db=getD1Database();
  if(i.state==="REMOVE")await db.prepare("DELETE FROM passport_entries WHERE user_id=? AND course_id=?").bind(uid,i.courseId).run();
  else {const now=new Date().toISOString();await db.prepare(`INSERT INTO passport_entries(id,user_id,course_id,state,visited_on,created_at,updated_at) VALUES(?,?,?,?,?,?,?)
    ON CONFLICT(user_id,course_id) DO UPDATE SET state=excluded.state,visited_on=excluded.visited_on,updated_at=excluded.updated_at`).bind(crypto.randomUUID(),uid,i.courseId,i.state,i.visitedOn,now,now).run();}
  return {saved:true};
}
export type PassportStamp={courseId:string;state:"PLAYED"|"WISHLIST";source:"APP_RECORDED"|"MARKED_PLAYED"|"WISHLIST";date:string|null;name:string;region:string;slug:string};
export async function getPassport(uid:string):Promise<PassportStamp[]> {
  const db=getD1Database();
  const manual=(await db.prepare("SELECT course_id AS courseId,state,visited_on AS date FROM passport_entries WHERE user_id=?").bind(uid).all<{courseId:string;state:"PLAYED"|"WISHLIST";date:string|null}>()).results;
  const recorded=(await db.prepare(`SELECT r.course_id AS courseId,MAX(r.completed_at) AS date FROM rounds r
    JOIN round_players p ON p.round_id=r.id AND p.user_id=r.created_by
    WHERE r.created_by=? AND r.status='COMPLETED' AND json_extract(r.context_json,'$.kind')!='DEMO' GROUP BY r.course_id`).bind(uid).all<{courseId:string;date:string}>()).results;
  const index=new Map<string,PassportStamp>();
  for(const m of manual){const c=getCourseById(m.courseId);if(c)index.set(c.id,{...m,name:c.name,region:c.state,slug:c.slug,source:m.state==="WISHLIST"?"WISHLIST":"MARKED_PLAYED"});}
  for(const r of recorded){const c=courses.find(c=>c.id===r.courseId&&!c.fictionalDemo);if(c)index.set(c.id,{...r,state:"PLAYED",name:c.name,region:c.state,slug:c.slug,source:"APP_RECORDED"});}
  return [...index.values()].sort((a,b)=>(b.date??"").localeCompare(a.date??""));
}
