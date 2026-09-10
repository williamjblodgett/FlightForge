import { z } from "zod";
import { getD1Database } from "@/db/runtime";
import { actor,body,handle,ToolError } from "@/modules/player-tools/server";
import { listPractice,practiceProfiles,practiceSchema,savePractice } from "@/modules/practice/practice-repository";
export function GET(request:Request){return handle(async()=>{const u=await actor(request);return {samples:await listPractice(u.id),profiles:await practiceProfiles(u.id)};});}
export function PUT(request:Request){return handle(async()=>savePractice((await actor(request)).id,await body(request,practiceSchema)));}
export function DELETE(request:Request){return handle(async()=>{const u=await actor(request);const {id,version}=await body(request,z.object({id:z.uuid(),version:z.number().int().positive()}));const db=getD1Database();const result=await db.prepare("UPDATE practice_measurements SET deleted_at=?,use_for_caddie=0,version=version+1 WHERE id=? AND user_id=? AND version=? AND deleted_at IS NULL").bind(new Date().toISOString(),id,u.id,version).run();if(!result.meta.changes){const old=await db.prepare("SELECT deleted_at FROM practice_measurements WHERE id=? AND user_id=?").bind(id,u.id).first<{deleted_at:string|null}>();if(!old?.deleted_at)throw new ToolError("This sample changed. Refresh before deleting it.",409);}return {deleted:true};});}
