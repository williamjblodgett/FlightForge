import { z } from "zod";
import { getD1Database } from "@/db/runtime";
import { ToolError } from "@/modules/player-tools/server";
export const practiceSchema=z.object({
  id:z.uuid(),discId:z.string().min(1).max(120),throwType:z.enum(["BACKHAND","FOREHAND","PUTTING","STANDSTILL"]),
  distanceFeet:z.number().finite().min(1).max(1500),uncertaintyMeters:z.number().finite().min(0).max(500),
  useForCaddie:z.boolean(),measuredAt:z.iso.datetime(),version:z.number().int().min(0).default(0),
}).refine(v=>Date.parse(v.measuredAt)<=Date.now()+60_000,"Measurement cannot be in the future.");
export type PracticeSample=z.infer<typeof practiceSchema>;
export async function savePractice(uid:string,input:PracticeSample) {
  const db=getD1Database();
  const owned=await db.prepare("SELECT id FROM player_discs WHERE id=? AND user_id=? AND deleted_at IS NULL").bind(input.discId,uid).first();
  if(!owned)throw new ToolError("Choose a disc from your own bag.",403);
  const now=new Date().toISOString();
  // A stable measurement ID replaces a corrected import, rather than counting it twice.
  await db.prepare(`INSERT INTO practice_measurements(id,user_id,disc_id,throw_type,distance_feet,uncertainty_meters,use_for_caddie,measured_at,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET disc_id=excluded.disc_id,throw_type=excluded.throw_type,distance_feet=excluded.distance_feet,
    uncertainty_meters=excluded.uncertainty_meters,use_for_caddie=excluded.use_for_caddie,measured_at=excluded.measured_at,updated_at=excluded.updated_at,version=practice_measurements.version+1
    WHERE practice_measurements.user_id=excluded.user_id AND practice_measurements.version=? AND practice_measurements.deleted_at IS NULL`).bind(input.id,uid,input.discId,input.throwType,input.distanceFeet,input.uncertaintyMeters,Number(input.useForCaddie),input.measuredAt,now,now,input.version).run();
  const saved=await db.prepare("SELECT disc_id AS discId,throw_type AS throwType,distance_feet AS distanceFeet,uncertainty_meters AS uncertaintyMeters,use_for_caddie AS useForCaddie,measured_at AS measuredAt FROM practice_measurements WHERE id=? AND user_id=? AND deleted_at IS NULL").bind(input.id,uid).first<PracticeSample>();
  if(!saved||saved.discId!==input.discId||saved.throwType!==input.throwType||saved.distanceFeet!==input.distanceFeet||saved.uncertaintyMeters!==input.uncertaintyMeters||Boolean(saved.useForCaddie)!==input.useForCaddie||saved.measuredAt!==input.measuredAt)throw new ToolError("This measurement changed. Reload before editing; deleted measurements cannot be re-imported.",409);
  return {saved:true};
}
export async function listPractice(uid:string) {
  return (await getD1Database().prepare(`SELECT p.id,p.disc_id AS discId,p.throw_type AS throwType,p.distance_feet AS distanceFeet,
    p.uncertainty_meters AS uncertaintyMeters,p.use_for_caddie AS useForCaddie,p.measured_at AS measuredAt,p.version,
    COALESCE(d.nickname,d.mold_name,'Disc') AS discName FROM practice_measurements p JOIN player_discs d ON d.id=p.disc_id AND d.user_id=p.user_id
    WHERE p.user_id=? AND p.deleted_at IS NULL AND d.deleted_at IS NULL ORDER BY p.measured_at DESC LIMIT 200`).bind(uid).all<PracticeSample & {discName:string}>()).results;
}
export type PracticeProfile={discId:string;throwType:"BACKHAND"|"FOREHAND";count:number;distance:number;spread:number;uncertainty:number};
export async function practiceProfiles(uid:string):Promise<PracticeProfile[]> {
  // Aggregate committed, explicitly approved distance-only samples. Do not invent turn, fade or success metrics.
  return (await getD1Database().prepare(`SELECT p.disc_id AS discId,p.throw_type AS throwType,COUNT(*) AS count,
    AVG(p.distance_feet) AS distance,MAX(p.distance_feet)-MIN(p.distance_feet) AS spread,AVG(p.uncertainty_meters) AS uncertainty
    FROM practice_measurements p JOIN player_discs d ON d.id=p.disc_id AND d.user_id=p.user_id
    WHERE p.user_id=? AND p.deleted_at IS NULL AND d.deleted_at IS NULL AND p.use_for_caddie=1 AND p.throw_type IN ('BACKHAND','FOREHAND')
    AND p.uncertainty_meters<=10 AND p.uncertainty_meters*3.28084<=p.distance_feet*0.15
    GROUP BY p.disc_id,p.throw_type HAVING COUNT(*)>=3`).bind(uid).all<PracticeProfile>()).results;
}
