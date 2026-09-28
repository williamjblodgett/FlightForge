import type { DatabaseSync } from "node:sqlite";
import { afterEach,beforeEach,expect,it,vi } from "vitest";
import { d1Adapter,migratedDatabase } from "../helpers/sqlite-d1";
import { purgeCoachingCandidates,purgeCoachingObject } from "@/modules/media-analysis/coaching-retention";
let sqlite:DatabaseSync,db:D1Database;
const remove=vi.fn(),bucket={delete:remove} as unknown as R2Bucket;
const old="2020-01-01T00:00:00.000Z";
beforeEach(()=>{sqlite=migratedDatabase();db=d1Adapter(sqlite);remove.mockReset().mockResolvedValue(undefined);});
afterEach(()=>sqlite.close());
function seed(id:string,deleted=false,owner="retention-user",coaching=true){
  sqlite.prepare("INSERT OR IGNORE INTO users(id,email,display_name,created_at,updated_at) VALUES(?,?,?, ?,?)").run(owner,owner+"@example.test",owner,old,old);
  sqlite.prepare("INSERT INTO media_uploads(id,user_id,storage_key,media_type,mime_type,byte_size,status,expires_at,created_at,deleted_at) VALUES(?,?,?,'VIDEO','video/mp4',100,?,?,?,?)").run(id,owner,"coaching/"+id,deleted?"DELETED":"QUARANTINED",old,old,deleted?old:null);
  sqlite.prepare("INSERT INTO media_analysis_jobs(id,media_upload_id,user_id,analysis_type,input_context_json,status,idempotency_key,created_at) VALUES(?,?,?,?,'{}','GUIDANCE_READY',?,?)").run("job-"+id,id,owner,coaching?"THROW_COACHING":"OTHER","key-"+id,old);
  sqlite.prepare("INSERT INTO media_analysis_results(id,media_analysis_job_id,output_json,created_at) VALUES(?,?,'{}',?)").run("result-"+id,"job-"+id,old);
  return {id,userId:owner,storageKey:"coaching/"+id};
}
it("retries storage failure without falsely tombstoning",async()=>{
  seed("retry");remove.mockRejectedValueOnce(Error("R2 unavailable"));
  expect(await purgeCoachingCandidates(db,bucket)).toEqual({deleted:0,failed:1});
  expect(sqlite.prepare("SELECT deleted_at FROM media_uploads WHERE id='retry'").get()?.deleted_at).toBeNull();
  expect(await purgeCoachingCandidates(db,bucket)).toEqual({deleted:1,failed:0});
  expect(sqlite.prepare("SELECT deleted_at FROM media_analysis_results WHERE id='result-retry'").get()?.deleted_at).toBeTruthy();
});
it("repairs historical false tombstones and makes confirmed deletion idempotent",async()=>{
  const item=seed("historical",true);
  expect(await purgeCoachingCandidates(db,bucket)).toEqual({deleted:1,failed:0});
  remove.mockRejectedValue(Error("offline"));
  await purgeCoachingObject(db,bucket,item);
  expect(await purgeCoachingCandidates(db,bucket)).toEqual({deleted:0,failed:0});
  expect(remove).toHaveBeenCalledTimes(1);
});
it("retries a DB failure after deleting storage",async()=>{
  seed("db-retry");sqlite.exec("CREATE TRIGGER fail_tombstone BEFORE UPDATE ON media_uploads BEGIN SELECT RAISE(ABORT,'test failure'); END");
  expect(await purgeCoachingCandidates(db,bucket)).toEqual({deleted:0,failed:1});
  sqlite.exec("DROP TRIGGER fail_tombstone");
  expect(await purgeCoachingCandidates(db,bucket)).toEqual({deleted:1,failed:0});
  expect(remove).toHaveBeenCalledTimes(2);
});
it("continues past failures while isolating owners and non-coaching uploads",async()=>{
  seed("a");seed("b");seed("other",false,"other-owner");seed("not-coaching",false,"retention-user",false);
  remove.mockRejectedValueOnce(Error("one failure"));
  expect(await purgeCoachingCandidates(db,bucket,100,"retention-user")).toEqual({deleted:1,failed:1});
  expect(remove.mock.calls.map(call=>call[0])).toEqual(["coaching/a","coaching/b"]);
});
