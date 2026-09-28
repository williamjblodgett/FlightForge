import type { DatabaseSync } from "node:sqlite";
import { afterEach,beforeEach,expect,it,vi } from "vitest";
import { d1Adapter,migratedDatabase } from "../helpers/sqlite-d1";
import type { AuthenticatedUser } from "@/modules/auth/types";
import type { CaddieFeedbackInput } from "@/modules/bags/validation";
const mocks=vi.hoisted(()=>({db:vi.fn<()=>D1Database>()}));
vi.mock("@/db/runtime",()=>({getD1Database:mocks.db}));
vi.mock("@/modules/auth/account-repository",()=>({ensurePersistedUserId:async(user:{id:string})=>user.id}));
vi.mock("@/modules/auth/current-user",()=>({getCurrentUser:async()=>null}));
import { recordCaddieFeedback,listPlayerDiscs } from "@/modules/bags/bag-repository";

const user:AuthenticatedUser={id:"learning-user",email:"learning@example.test",displayName:"Learning",roles:["PLAYER"],source:"password",onboardingComplete:true,emailVerified:true,isTestAccount:true,mustChangePassword:false};
const stamp="2026-09-28T12:00:00.000Z",discId="learning-disc";
let sqlite:DatabaseSync;
beforeEach(()=>{
  sqlite=migratedDatabase();mocks.db.mockReturnValue(d1Adapter(sqlite));
  sqlite.prepare("INSERT INTO users(id,email,display_name,created_at,updated_at) VALUES(?,?,?,?,?)").run(user.id,user.email,user.displayName,stamp,stamp);
  sqlite.prepare("INSERT INTO player_discs(id,user_id,mold_name,manufacturer_name,manual_speed,manual_glide,manual_turn,manual_fade,status,created_at,updated_at) VALUES(?,?,?,?,9,5,-1,2,'IN_BAG',?,?)").run(discId,user.id,"Driver","Example",stamp,stamp);
});
afterEach(()=>sqlite.close());
function recommendation(){
  const session=crypto.randomUUID(),id=crypto.randomUUID();
  sqlite.prepare("INSERT INTO ai_sessions(id,user_id,feature,status,started_at) VALUES(?,?,'AI_CADDIE','COMPLETED',?)").run(session,user.id,stamp);
  sqlite.prepare("INSERT INTO ai_recommendations(id,ai_session_id,user_id,recommendation_type,input_summary_json,output_json,created_at) VALUES(?,?,?,'SHOT','{}',?,?)").run(id,session,user.id,JSON.stringify({primaryDiscId:discId}),stamp);
  return id;
}
function profile(throwType="BACKHAND") {return sqlite.prepare("SELECT sample_count,typical_distance_feet,success_rate,observed_turn,observed_fade FROM player_disc_profiles WHERE user_id=? AND player_disc_id=? AND throw_type=?").get(user.id,discId,throwType);}
const feedback={playerDiscId:discId,throwType:"BACKHAND",intendedShape:"STRAIGHT",result:"SUCCESS",flightAdjustment:"AS_EXPECTED",missDirection:"NONE",distanceFeet:null,windMph:0,windDirection:"CALM",representative:true,comment:null} satisfies CaddieFeedbackInput;
it("retains concurrent feedback atomically",async()=>{
  await Promise.all([100,300].map(distanceFeet=>recordCaddieFeedback(user,recommendation(),{...feedback,distanceFeet})));
  expect(profile()).toMatchObject({sample_count:2,typical_distance_feet:200,success_rate:1,observed_turn:-1,observed_fade:2});
});
it("averages measured distances only and reconciles historical count errors",async()=>{
  for(const distanceFeet of [100,null,300]) await recordCaddieFeedback(user,recommendation(),{...feedback,distanceFeet});
  expect(profile()).toMatchObject({sample_count:3,typical_distance_feet:200});
  sqlite.exec("UPDATE player_disc_profiles SET sample_count=2,typical_distance_feet=166.67,success_rate=.5");
  await listPlayerDiscs(user);
  expect(profile()).toMatchObject({sample_count:3,typical_distance_feet:200,success_rate:1});
});
it("preserves tuning across manual baseline changes",async()=>{
  await recordCaddieFeedback(user,recommendation(),feedback);
  sqlite.prepare("UPDATE player_discs SET manual_turn=-3,manual_fade=1 WHERE id=?").run(discId);
  await recordCaddieFeedback(user,recommendation(),feedback);
  expect(profile()).toMatchObject({sample_count:2,observed_turn:-2,observed_fade:1.5,typical_distance_feet:null});
});
it("isolates throw types, excludes nonrepresentative feedback, and rejects duplicates",async()=>{
  const id=recommendation();await recordCaddieFeedback(user,id,feedback);
  await expect(recordCaddieFeedback(user,id,feedback)).rejects.toThrow(/already recorded/u);
  await recordCaddieFeedback(user,recommendation(),{...feedback,representative:false,distanceFeet:900});
  await recordCaddieFeedback(user,recommendation(),{...feedback,throwType:"FOREHAND",distanceFeet:180});
  expect(profile()).toMatchObject({sample_count:1,typical_distance_feet:null});
  expect(profile("FOREHAND")).toMatchObject({sample_count:1,typical_distance_feet:180});
});
it("rolls back feedback when profile persistence fails",async()=>{
  sqlite.exec("CREATE TRIGGER fail_profile BEFORE INSERT ON player_disc_profiles BEGIN SELECT RAISE(ABORT,'test failure'); END");
  await expect(recordCaddieFeedback(user,recommendation(),feedback)).rejects.toThrow();
  expect(sqlite.prepare("SELECT count(*) AS n FROM disc_observations").get()?.n).toBe(0);
  expect(sqlite.prepare("SELECT count(*) AS n FROM ai_feedback").get()?.n).toBe(0);
});
it("returns its committed result without a fallible post-commit read",async()=>{
  const base=d1Adapter(sqlite);let committed=false;
  const guarded={...base,prepare(sql:string){if(committed)throw Error("Read service unavailable after commit");return base.prepare(sql);},
    async batch<T>(statements:D1PreparedStatement[]){const results=await base.batch<T>(statements);committed=Number(sqlite.prepare("SELECT count(*) AS n FROM disc_observations").get()?.n)>0;return results;}} as D1Database;
  mocks.db.mockReturnValue(guarded);
  expect(await recordCaddieFeedback(user,recommendation(),feedback)).toMatchObject({sampleCount:1,observedTurn:-1,observedFade:2});
});
