import {getD1Database} from "@/db/runtime";
import {actor,body,handle,ToolError} from "@/modules/player-tools/server";
import {planSchema} from "@/modules/itineraries/planning";
import {getCourseById} from "@/modules/courses/demo-courses";
export function GET(request:Request){return handle(async()=>{const u=await actor(request);const row=await getD1Database().prepare("SELECT plan_json AS plan FROM player_itineraries WHERE id=? AND user_id=?").bind(u.id,u.id).first<{plan:string}>();return {plan:row?JSON.parse(row.plan):null};});}
export function PUT(request:Request){return handle(async()=>{const u=await actor(request);const i=await body(request,planSchema);if(i.stops.some(s=>!getCourseById(s.courseId)))throw new ToolError("A selected course is unavailable.");await getD1Database().prepare("INSERT INTO player_itineraries(id,user_id,plan_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET plan_json=excluded.plan_json,updated_at=excluded.updated_at WHERE player_itineraries.user_id=excluded.user_id").bind(u.id,u.id,JSON.stringify(i),new Date().toISOString()).run();return {saved:true};});}
export function DELETE(request:Request){return handle(async()=>{const u=await actor(request);await getD1Database().prepare("DELETE FROM player_itineraries WHERE user_id=?").bind(u.id).run();return {deleted:true};});}
