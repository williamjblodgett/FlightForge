import {readFileSync,readdirSync} from "node:fs";
import {DatabaseSync} from "node:sqlite";
import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import type {AuthenticatedUser} from "@/modules/auth/types";
import {fictionalDemoCourse} from "@/modules/courses/demo-courses";
const mocks=vi.hoisted(()=>({db:vi.fn<()=>D1Database>(),event:vi.fn(async()=>{throw Error("Unexpected event lookup");})}));
vi.mock("@/db/runtime",()=>({getD1Database:mocks.db}));
vi.mock("@/modules/auth/account-repository",()=>({ensurePersistedUserId:async(user:{id:string})=>user.id}));
vi.mock("@/modules/events/event-repository",()=>({ensureEventSchema:async()=>undefined,getPublishedEventById:mocks.event}));
import {createPersonalContext,resolveRoundContext} from "@/modules/rounds/round-context";
import {getOrCreateActiveRound,saveHoleScore,completeActiveRound,RoundUnavailableError,RoundIncompleteError,RoundConflictError} from "@/modules/rounds/round-repository";
import {getUnreadMessageCount,listUserConversations,listMessages} from "@/modules/community/community-repository";
import {COMMUNITY_GUIDELINES_VERSION} from "@/modules/community/types";
import {getRoundAssistance,assistanceInstructions} from "@/modules/rounds/assistance";
import {verificationJobStatement,drainVerificationOutbox} from "@/modules/notifications/verification-outbox";
import {getRoundForUser,listRoundHistory,correctPersonalRound} from "@/modules/rounds/history-repository";

type Value=string|number|null|Uint8Array;
let sqlite:DatabaseSync;
function adapter(database:DatabaseSync):D1Database{
 class Statement{
  constructor(readonly sql:string,readonly values:Value[]=[]){}
  bind(...values:Value[]){return new Statement(this.sql,values);}
  execute(){const s=database.prepare(this.sql);if(/^\s*(SELECT|PRAGMA)\b/iu.test(this.sql))return {success:true,results:s.all(...this.values),meta:{changes:0}};return {success:true,results:[],meta:{changes:Number(s.run(...this.values).changes)}};}
  async first<T>(){return (database.prepare(this.sql).get(...this.values)??null) as T|null;}
  async all<T>(){const r=this.execute();return {...r,results:r.results as T[]};}
  async run(){return this.execute();}
 }
 return {prepare:(sql:string)=>new Statement(sql),async batch(statements:Statement[]){database.exec("BEGIN");try{const result=statements.map(s=>s.execute());database.exec("COMMIT");return result;}catch(error){database.exec("ROLLBACK");throw error;}}} as unknown as D1Database;
}
const user:AuthenticatedUser={id:"round-test-user",email:"round-test@example.test",displayName:"Round Tester",roles:["PLAYER"],source:"password",onboardingComplete:true,isTestAccount:true,mustChangePassword:false,emailVerified:true};
const stamp="2026-09-10T12:00:00.000Z",layoutId="round-test-layout";
beforeEach(()=>{
 sqlite=new DatabaseSync(":memory:");mocks.event.mockClear();
 const dir=new URL("../../drizzle/",import.meta.url);
 for(const file of readdirSync(dir).filter(f=>/^\d{4}_.+\.sql$/u.test(f)).sort())sqlite.exec(readFileSync(new URL(file,dir),"utf8").replaceAll("--> statement-breakpoint",""));
 sqlite.prepare("INSERT INTO users(id,email,display_name,created_at,updated_at) VALUES(?,?,?,?,?)").run(user.id,user.email,user.displayName,stamp,stamp);
 sqlite.prepare("INSERT OR IGNORE INTO courses(id,slug,name,city,region_code,latitude,longitude,hole_count,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)").run(fictionalDemoCourse.id,fictionalDemoCourse.slug,fictionalDemoCourse.name,fictionalDemoCourse.city,fictionalDemoCourse.state,String(fictionalDemoCourse.latitude),String(fictionalDemoCourse.longitude),2,stamp,stamp);
 sqlite.prepare("INSERT INTO course_layouts(id,course_id,name,slug,hole_count,is_active,created_at,updated_at,version) VALUES(?,?,?,?,?,?,?,?,?)").run(layoutId,fictionalDemoCourse.id,"Original layout","round-test-layout",2,1,stamp,stamp,7);
 for(const [n,par]of [[1,3],[2,4]])sqlite.prepare("INSERT INTO holes(id,layout_id,hole_number,par,created_at,updated_at,version) VALUES(?,?,?,?,?,?,?)").run("hole-"+n,layoutId,n,par,stamp,stamp,n);
 mocks.db.mockReturnValue(adapter(sqlite));
});
afterEach(()=>{vi.unstubAllGlobals();sqlite.close();});
describe("migrated personal round lifecycle",()=>{
 it("preserves layout, records retries once, completes, reopens, corrects, and isolates owners",async()=>{
  const context=await createPersonalContext(fictionalDemoCourse.id,layoutId,crypto.randomUUID(),18);
  expect(context).toMatchObject({kind:"PERSONAL",holeCount:2,pars:[3,4],parSource:"COURSE_LAYOUT"});
  let round=await getOrCreateActiveRound(user,context);const original=round.context;
  expect((await getOrCreateActiveRound(user,context)).id).toBe(round.id);
  sqlite.prepare("UPDATE course_layouts SET hole_count=1,version=8 WHERE id=?").run(layoutId);
  sqlite.prepare("UPDATE holes SET par=9,version=version+1 WHERE layout_id=?").run(layoutId);
  expect(await resolveRoundContext(user,context.id)).toEqual(original);
  const first={roundId:round.id,holeNumber:1,strokes:3,penalties:0,expectedVersion:round.version,clientMutationId:crypto.randomUUID()};
  round=await saveHoleScore(user,context,first);
  expect((await saveHoleScore(user,context,first)).version).toBe(round.version);
  expect(round.corrections).toHaveLength(1);
  await expect(saveHoleScore(user,context,{...first,roundId:crypto.randomUUID(),clientMutationId:crypto.randomUUID()})).rejects.toBeInstanceOf(RoundUnavailableError);
  await expect(saveHoleScore(user,context,{...first,clientMutationId:crypto.randomUUID()})).rejects.toBeInstanceOf(RoundConflictError);
  await expect(completeActiveRound(user,context,{roundId:round.id,expectedVersion:round.version,clientMutationId:crypto.randomUUID()})).rejects.toBeInstanceOf(RoundIncompleteError);
  round=await saveHoleScore(user,context,{roundId:round.id,holeNumber:2,strokes:4,penalties:1,expectedVersion:round.version,clientMutationId:crypto.randomUUID()});
  const finish={roundId:round.id,expectedVersion:round.version,clientMutationId:crypto.randomUUID()};
  const completed=await completeActiveRound(user,{...context,holeCount:1},finish);
  expect(completed.totalScore).toBe(8);expect(await completeActiveRound(user,context,finish)).toEqual(completed);
  expect((await getRoundForUser(user,round.id))?.context).toEqual(original);
  expect((await listRoundHistory(user)).items).toEqual([expect.objectContaining({id:round.id,holeCount:2,totalScore:8})]);
  await expect(saveHoleScore(user,context,{...first,expectedVersion:completed.version,clientMutationId:crypto.randomUUID()})).rejects.toBeInstanceOf(RoundUnavailableError);
  const correction={holeNumber:2,strokes:3,penalties:0,reason:"Corrected recorded score",expectedVersion:completed.version,clientMutationId:crypto.randomUUID()};
  expect(await correctPersonalRound(user,round.id,correction)).toEqual({status:200});
  expect(await correctPersonalRound(user,round.id,correction)).toEqual({status:200});
  const corrected=await getRoundForUser(user,round.id);expect(corrected?.totalScore).toBe(6);expect(corrected?.round.corrections).toHaveLength(3);
  expect((await listRoundHistory(user)).items[0].totalScore).toBe(6);
  const stranger={...user,id:"stranger"};expect(await getRoundForUser(stranger,round.id)).toBeNull();expect((await listRoundHistory(stranger)).items).toEqual([]);expect(await correctPersonalRound(stranger,round.id,correction)).toEqual({status:403});
  expect(mocks.event).not.toHaveBeenCalled();
 });
 it("does not invent pars for an unknown layout",async()=>{const c=await createPersonalContext(fictionalDemoCourse.id,null,crypto.randomUUID(),2);expect(c.pars).toEqual([null,null]);expect(c.parSource).toBe("UNKNOWN");});
});
async function makeRound(scored=false){
 const context=await createPersonalContext(fictionalDemoCourse.id,layoutId,crypto.randomUUID(),2);
 let round=await getOrCreateActiveRound(user,context);
 if(scored)for(const [holeNumber,strokes] of [[1,3],[2,4]])round=await saveHoleScore(user,context,{roundId:round.id,holeNumber,strokes,penalties:0,expectedVersion:round.version,clientMutationId:crypto.randomUUID()});
 return {context,round};
}
describe("concurrent mutation and context safety",()=>{
 it("applies identical concurrent scores only once and rejects changed retry payloads",async()=>{
  const {context,round}=await makeRound();
  const input={roundId:round.id,holeNumber:1,strokes:3,penalties:0,expectedVersion:round.version,clientMutationId:crypto.randomUUID()};
  const saved=await Promise.all([saveHoleScore(user,context,input),saveHoleScore(user,context,input)]);
  expect(saved.map(r=>r.version)).toEqual([round.version+1,round.version+1]);
  expect(saved[0].corrections).toHaveLength(1);
  await expect(saveHoleScore(user,context,{...input,strokes:5})).rejects.toBeInstanceOf(RoundConflictError);
 });
 it("completes and corrects concurrent retries once, retaining accurate history",async()=>{
  const {context,round}=await makeRound(true);
  const finish={roundId:round.id,expectedVersion:round.version,clientMutationId:crypto.randomUUID()};
  const completed=await Promise.all([completeActiveRound(user,context,finish),completeActiveRound(user,context,finish)]);
  expect(completed[0]).toEqual(completed[1]);
  expect(sqlite.prepare("SELECT COUNT(*) AS n FROM audit_logs WHERE resource_id=? AND action='ROUND_COMPLETED'").get(round.id)?.n).toBe(1);
  const correction={holeNumber:2,strokes:3,penalties:0,reason:"Corrected the recorded score.",expectedVersion:completed[0].version,clientMutationId:crypto.randomUUID()};
  expect(await Promise.all([correctPersonalRound(user,round.id,correction),correctPersonalRound(user,round.id,correction)])).toEqual([{status:200},{status:200}]);
  expect(await correctPersonalRound(user,round.id,{...correction,strokes:5})).toEqual({status:409});
  const detail=await getRoundForUser(user,round.id);expect(detail?.totalScore).toBe(6);expect(detail?.round.corrections).toHaveLength(3);
  expect(sqlite.prepare("SELECT COUNT(*) AS n FROM audit_logs WHERE resource_id=? AND action='ROUND_CORRECTED'").get(round.id)?.n).toBe(1);
 });
 it("only supplies the owning player's active hole snapshot to assistance",async()=>{
  const {context,round}=await makeRound(true);
  const help=await getRoundAssistance(user,context.id,2);
  expect(help).toMatchObject({holeNumber:2,par:4,course:fictionalDemoCourse.name});
  expect(await getRoundAssistance({...user,id:"stranger"},context.id,2)).toBeNull();
  for(const hole of [0,3,1.5,NaN,Infinity,undefined])expect(await getRoundAssistance(user,context.id,hole)).toBeNull();
  expect(assistanceInstructions(help)).toContain("have NOT been supplied");expect(assistanceInstructions(help)).not.toContain(user.id);
  await completeActiveRound(user,context,{roundId:round.id,expectedVersion:round.version,clientMutationId:crypto.randomUUID()});
  expect(await getRoundAssistance(user,context.id,2)).toBeNull();
 });
});
describe("durable verification retry outbox",()=>{
 it("retries provider failure, prevents concurrent delivery, stores no raw token",async()=>{
  sqlite.prepare("UPDATE users SET status='PENDING_EMAIL_VERIFICATION' WHERE id=?").run(user.id);
  const db=mocks.db();await verificationJobStatement(db,user.id,"https://flightforge.test","/courses?q=Bellamy").run();
  sqlite.prepare("UPDATE verification_delivery_jobs SET next_attempt_at=?").run(stamp);
  const outbound=vi.fn<typeof fetch>(async()=>new Response("unavailable",{status:503}));vi.stubGlobal("fetch",outbound);
  expect(await drainVerificationOutbox(db,{EMAIL_VERIFICATION_WEBHOOK_URL:"https://mail.test",EMAIL_VERIFICATION_WEBHOOK_SECRET:"unit-only"})).toEqual({delivered:0,failed:1});
  expect(sqlite.prepare("SELECT status,attempts FROM verification_delivery_jobs").get()).toMatchObject({status:"PENDING",attempts:1});
  sqlite.prepare("UPDATE verification_delivery_jobs SET next_attempt_at=?").run(stamp);
  const results=await Promise.all([drainVerificationOutbox(db,{EMAIL_DELIVERY_MODE:"test"}),drainVerificationOutbox(db,{EMAIL_DELIVERY_MODE:"test"})]);
  expect(results.reduce((sum,r)=>sum+r.delivered,0)).toBe(1);
  expect(sqlite.prepare("SELECT status,attempts FROM verification_delivery_jobs").get()).toMatchObject({status:"DELIVERED",attempts:2});
  const token=sqlite.prepare("SELECT token_hash AS hash FROM email_verification_tokens LIMIT 1").get();expect(String(token?.hash)).toMatch(/^[A-Za-z0-9_-]{43}$/u);
  const sentBody=JSON.parse(String(outbound.mock.calls[0]?.[1]?.body));expect(JSON.stringify(sqlite.prepare("SELECT * FROM verification_delivery_jobs").get())).not.toContain(new URL(sentBody.variables.verifyUrl).searchParams.get("token"));
 });
});
it("isolates private inboxes, blocks, moderation and read cursors",async()=>{
 const a=user,b={...user,id:"message-b",email:"b@example.test"},c={...user,id:"message-c",email:"c@example.test"};
 for(const actor of [b,c])sqlite.prepare("INSERT INTO users(id,email,display_name,created_at,updated_at) VALUES(?,?,?,?,?)").run(actor.id,actor.email,actor.displayName,stamp,stamp);
 for(const actor of [a,b,c])sqlite.prepare("INSERT INTO community_user_status(user_id,adult_attested_at,guidelines_version,guidelines_accepted_at,status,updated_at) VALUES(?,?,?,?,'ACTIVE',?)").run(actor.id,stamp,COMMUNITY_GUIDELINES_VERSION,stamp,stamp);
 const cid="private-ab-test";sqlite.prepare("INSERT INTO conversations(id,conversation_type,subject,visibility,status,created_by,created_at,updated_at) VALUES(?,'DIRECT','Private A and B','PRIVATE','ACTIVE',?,?,?)").run(cid,a.id,stamp,stamp);
 for(const actor of [a,b])sqlite.prepare("INSERT INTO conversation_members(id,conversation_id,user_id,joined_at) VALUES(?,?,?,?)").run("member-"+actor.id,cid,actor.id,stamp);
 for(const [id,sender,status]of [["01",b.id,"PUBLISHED"],["02",b.id,"PUBLISHED"],["03",b.id,"QUARANTINED"],["04",a.id,"PUBLISHED"],["05",b.id,"DELETED"]])sqlite.prepare("INSERT INTO messages(id,conversation_id,sender_user_id,body,moderation_status,created_at,deleted_at) VALUES(?,?,?,?,?,?,?)").run(id,cid,sender,"Message "+id,status,stamp,status==="DELETED"?stamp:null);
 sqlite.prepare("UPDATE conversation_members SET last_read_at=?,last_read_message_id='01',notifications_muted=1 WHERE conversation_id=? AND user_id=?").run(stamp,cid,a.id);
 expect(await getUnreadMessageCount(a)).toBe(1);expect(await getUnreadMessageCount(c)).toBe(0);
 expect((await listUserConversations(a.id)).map(x=>x.id)).toContain(cid);expect(await listUserConversations(c.id)).toEqual([]);
 await expect(listMessages(c,cid,null,20)).rejects.toMatchObject({code:"FORBIDDEN"});
 for(const [blocker,blocked]of [[a.id,b.id],[b.id,a.id]]){sqlite.prepare("INSERT INTO blocked_users(id,blocker_user_id,blocked_user_id,created_at) VALUES('test-block',?,?,?)").run(blocker,blocked,stamp);expect(await getUnreadMessageCount(a)).toBe(0);expect(await listUserConversations(a.id)).toEqual([]);sqlite.prepare("DELETE FROM blocked_users WHERE id='test-block'").run();}
 sqlite.prepare("UPDATE conversation_members SET left_at=? WHERE conversation_id=? AND user_id=?").run(stamp,cid,a.id);
 expect(await getUnreadMessageCount(a)).toBe(0);expect(await listUserConversations(a.id)).toEqual([]);
});
it("hosted resend queries the migrated nonce schema", () => {
  const route = readFileSync(new URL("../../app/api/auth/resend-verification/route.ts", import.meta.url), "utf8");
  const sql = route.match(/"([^"]*FROM hosted_signup_intents[^"]*)"/u)?.[1];
  expect(sql).toBeTruthy();
  const nonce=crypto.randomUUID();
  sqlite.prepare("INSERT INTO hosted_signup_intents(nonce,email,terms_version,privacy_version,accepted_at,expires_at) VALUES(?,?,?,?,?,?)").run(nonce,user.email,"terms-v1","privacy-v1",stamp,"2099-01-01T00:00:00.000Z");
  const lookup=sqlite.prepare(sql!);
  expect(lookup.get(user.email,stamp,"terms-v1","privacy-v1")).toMatchObject({nonce});
  expect(lookup.get(user.email,stamp,"outdated","privacy-v1")).toBeUndefined();
});
