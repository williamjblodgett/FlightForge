import {readFileSync,readdirSync} from "node:fs";
import {DatabaseSync} from "node:sqlite";
import {beforeEach,afterEach,describe,it,expect,vi} from "vitest";
import type {AuthenticatedUser} from "@/modules/auth/types";
const mock=vi.hoisted(()=>({db:vi.fn<()=>D1Database>(),user:vi.fn()}));
vi.mock("@/db/runtime",()=>({getD1Database:mock.db}));
vi.mock("@/modules/auth/account-repository",()=>({ensurePersistedUserId:async(u:{id:string})=>u.id}));
vi.mock("@/modules/auth/current-user",()=>({getCurrentUser:mock.user}));
vi.mock("@/modules/config/feature-flags",()=>({isFeatureEnabled:async()=>true}));
vi.mock("@/lib/security/request-security",()=>({isSameOriginMutation:()=>true,checkRateLimit:async()=>({allowed:true,retryAfterSeconds:0})}));
import {DELETE as deletePractice} from "@/app/api/practice/route";
import {PUT as recoveryAction} from "@/app/api/recovery/route";
import {practiceProfiles,savePractice,listPractice} from "@/modules/practice/practice-repository";
import {postCondition,listConditions,courseUpdates} from "@/modules/courses/conditions-repository";
import {createGroup,getGroup,requestJoin,manageMember,addGuest,startGroupRound,guestScore} from "@/modules/groups/repository";
import {createTag,openRecovery,revokeTag,sendRecovery,closeRecovery,recoveryOverview} from "@/modules/recovery/repository";
import {rsvp,leagueDetail,createSeries} from "@/modules/leagues/repository";
import {weeklyStarts,calendarText} from "@/modules/leagues/calendar";
import {getPassport,savePassport} from "@/modules/passport/repository";
import {itinerary} from "@/modules/itineraries/planning";
import {courses} from "@/modules/courses/demo-courses";
import {COMMUNITY_GUIDELINES_VERSION} from "@/modules/community/types";
type Value=string|number|null|Uint8Array;
let sqlite:DatabaseSync;
let afterFirst:((sql:string)=>void)|null=null;
function adapter(database:DatabaseSync):D1Database{
  class Statement{
    constructor(readonly sql:string,readonly values:Value[]=[]){}
    bind(...values:Value[]){return new Statement(this.sql,values);}
    execute(){const s=database.prepare(this.sql);if(/^\s*(SELECT|PRAGMA)/i.test(this.sql))return {success:true,results:s.all(...this.values),meta:{changes:0}};return {success:true,results:[],meta:{changes:Number(s.run(...this.values).changes)}};}
    async first<T>(){const row=database.prepare(this.sql).get(...this.values)??null;afterFirst?.(this.sql);return row as T|null;}
    async all<T>(){const r=this.execute();return {...r,results:r.results as T[]};}
    async run(){return this.execute();}
  }
  return {prepare:(sql:string)=>new Statement(sql),async batch(statements:Statement[]){database.exec("BEGIN");try{const results=statements.map(s=>s.execute());database.exec("COMMIT");return results;}catch(e){database.exec("ROLLBACK");throw e;}}} as unknown as D1Database;
}
const a:AuthenticatedUser={id:"tool-player-a",email:"tool-a@example.test",displayName:"Player A",roles:["PLAYER"],source:"password",onboardingComplete:true,isTestAccount:true,mustChangePassword:false,emailVerified:true};
const b={...a,id:"tool-player-b",email:"tool-b@example.test",displayName:"Player B"};
const c={...a,id:"tool-player-c",email:"tool-c@example.test",displayName:"Player C"};
const course=courses[0],discId="tool-owned-disc",stamp=new Date().toISOString();
beforeEach(()=>{
  afterFirst=null;mock.user.mockResolvedValue(a);sqlite=new DatabaseSync(":memory:");
  const dir=new URL("../../drizzle/",import.meta.url);
  for(const file of readdirSync(dir).filter(f=>/^\d{4}_.+\.sql$/.test(f)).sort())sqlite.exec(readFileSync(new URL(file,dir),"utf8").replaceAll("--> statement-breakpoint",""));
  mock.db.mockReturnValue(adapter(sqlite));
  for(const user of [a,b,c]){
    sqlite.prepare("INSERT INTO users(id,email,display_name,created_at,updated_at) VALUES(?,?,?,?,?)").run(user.id,user.email,user.displayName,stamp,stamp);
    sqlite.prepare("INSERT INTO community_user_status(user_id,adult_attested_at,guidelines_accepted_at,guidelines_version,status,updated_at) VALUES(?,?,?,?,'ACTIVE',?)").run(user.id,stamp,stamp,COMMUNITY_GUIDELINES_VERSION,stamp);
  }
  sqlite.prepare("INSERT INTO player_discs(id,user_id,mold_name,manufacturer_name,manual_speed,manual_glide,manual_turn,manual_fade,status,created_at,updated_at) VALUES(?,?,?,?,9,5,-1,2,'IN_BAG',?,?)").run(discId,a.id,"Control Driver","Example",stamp,stamp);
});
afterEach(()=>sqlite.close());
describe("owned practice and private passport",()=>{
  it("deduplicates samples, requires ownership, aggregates distances and revokes calibration",async()=>{
    const samples=Array.from({length:3},(_,i)=>({id:crypto.randomUUID(),discId,throwType:"BACKHAND" as const,distanceFeet:240+i*10,uncertaintyMeters:3,useForCaddie:true,measuredAt:stamp,version:0}));
    await Promise.all(samples.map(s=>savePractice(a.id,s)));
    await savePractice(a.id,samples[0]);expect(await listPractice(a.id)).toHaveLength(3);
    expect(await practiceProfiles(a.id)).toEqual([expect.objectContaining({count:3,distance:250,spread:20})]);
    await expect(savePractice(b.id,samples[0])).rejects.toThrow();
    await savePractice(a.id,{...samples[0],version:1,useForCaddie:false});expect(await practiceProfiles(a.id)).toHaveLength(0);
    await expect(savePractice(a.id,samples[0])).rejects.toThrow();
    sqlite.prepare("UPDATE practice_measurements SET deleted_at=?,use_for_caddie=0,version=version+1 WHERE id=?").run(stamp,samples[1].id);
    await expect(savePractice(a.id,samples[1])).rejects.toThrow();
  });
  it("excludes uncertain and non-backhand/forehand observations",async()=>{
    for(let i=0;i<4;i++)await savePractice(a.id,{id:crypto.randomUUID(),discId,throwType:"STANDSTILL",distanceFeet:200,uncertaintyMeters:20,useForCaddie:true,measuredAt:stamp,version:0});
    expect(await practiceProfiles(a.id)).toEqual([]);
  });
  it("keeps marked visits private and removes only manual entries",async()=>{
    await savePassport(a.id,{courseId:course.id,state:"PLAYED",visitedOn:"2026-01-01"});
    expect(await getPassport(a.id)).toEqual([expect.objectContaining({source:"MARKED_PLAYED"})]);expect(await getPassport(b.id)).toEqual([]);
    await savePassport(a.id,{courseId:course.id,state:"REMOVE",visitedOn:null});expect(await getPassport(a.id)).toEqual([]);
  });
});
describe("course reports and shared play",()=>{
  it("labels player reports, bounds expiry and removes expired reports from follows",async()=>{
    const input={id:crypto.randomUUID(),courseId:course.id,status:"MUDDY" as const,note:"Muddy paths after today's rain.",hours:72};
    await postCondition(a.id,input);const reports=await listConditions(course.id,a.id);expect(reports[0].sourceType).toBe("PLAYER");expect(Date.parse(reports[0].expiresAt)-Date.parse(reports[0].observedAt)).toBeLessThanOrEqual(86400000);
    sqlite.prepare("INSERT INTO follows(id,follower_user_id,target_type,target_id,created_at) VALUES(?,?,'COURSE',?,?)").run(crypto.randomUUID(),b.id,course.id,stamp);
    expect((await courseUpdates(b.id)).notices).toHaveLength(1);sqlite.prepare("UPDATE course_conditions SET expires_at='2000-01-01'").run();expect((await courseUpdates(b.id)).notices).toEqual([]);
  });
  it("enforces private invitations, host approval, capacity and own-card access",async()=>{
    const input={id:crypto.randomUUID(),courseId:course.id,layoutId:null,holeCount:2,startsAt:new Date(Date.now()+3600000).toISOString(),visibility:"PRIVATE" as const,pace:"RELAXED" as const,beginnersWelcome:true,capacity:2};
    const created=await createGroup(a,input);await expect(getGroup(b.id,created.id)).rejects.toThrow();
    expect((await getGroup(b.id,created.id,created.token)).roster).toEqual([]);
    await requestJoin(b,created.id,created.token);const requested=await getGroup(a.id,created.id);const member=requested.roster.find(m=>m.status==="PENDING")!;
    await manageMember(a.id,created.id,member.id,true);
    await expect(addGuest(a.id,created.id,"Guest",crypto.randomUUID())).rejects.toThrow();
    await expect(startGroupRound(c,created.id)).rejects.toThrow();
    const start=await startGroupRound(b,created.id);expect(start.next).toMatch(/roundId=/);
    expect((await getGroup(a.id,created.id)).roster.find(m=>m.name==="Player B")?.roundId).toBeNull();
    await expect(guestScore(b.id,created.id,member.id,{holeNumber:1,strokes:1,penalties:0,version:1})).rejects.toThrow();
  });
});
describe("private recovery",()=>{
  it("hides identities, stops revoked contacts and preserves deleted terminal state",async()=>{
    const tag=await createTag(a.id,{discId,label:"Blue driver",courseId:course.id,publicListing:true});
    const contact=await openRecovery(b.id,{id:crypto.randomUUID(),token:tag.token,body:"I found a blue disc with a distinctive gold star marking."});
    await sendRecovery(a.id,contact.id,crypto.randomUUID(),"Please leave it with the course desk.");
    await closeRecovery(b.id,contact.id,"DELETE");await revokeTag(a.id,tag.id);
    expect((await recoveryOverview(a.id)).cases).toEqual([]);
    await expect(openRecovery(c.id,{id:crypto.randomUUID(),token:tag.token,body:"I may have found your disc."})).rejects.toThrow();
  });
  it("blocks communication after disc deletion",async()=>{
    const tag=await createTag(a.id,{discId,label:"Blue driver",courseId:null,publicListing:false});
    const contact=await openRecovery(b.id,{id:crypto.randomUUID(),token:tag.token,body:"The identifying mark is a silver moon."});
    sqlite.prepare("UPDATE player_discs SET deleted_at=? WHERE id=?").run(stamp,discId);
    await expect(sendRecovery(b.id,contact.id,crypto.randomUUID(),"A second message")).rejects.toThrow();
  });
});
function seedEvent(){
  const id=crypto.randomUUID(),league=crypto.randomUUID(),start=new Date(Date.now()+86400000).toISOString(),end=new Date(Date.now()+90000000).toISOString();
  sqlite.prepare(`INSERT INTO events(id,slug,organizer_user_id,organizer_email,organization_name,event_type,title,summary,description,course_id,venue_name,city,region_code,starts_at,ends_at,contact_email,capacity,format,divisions_json,status,visibility,created_at,updated_at) VALUES(?,?,?,?,?,'LEAGUE',?,?,?,?,?,?,?,?,?,?,1,'STROKE_PLAY','[]','PUBLISHED','PUBLIC',?,?)`).run(id,id,a.id,a.email,"Test league","Weekly round","A test event summary","A test event description",course.id,course.name,course.city,course.state,start,end,a.email,stamp,stamp);
  sqlite.prepare("INSERT INTO leagues(id,administrator_user_id,name,slug,status,privacy,rules_json,created_at,updated_at) VALUES(?,?,?,?,'ACTIVE','PUBLIC','{}',?,?)").run(league,a.id,"Test league",league,stamp,stamp);
  sqlite.prepare("INSERT INTO league_events(id,league_id,course_id,starts_at,status,configuration_json,created_at,updated_at) VALUES(?,?,?,?,'SCHEDULED',?,?,?)").run(crypto.randomUUID(),league,course.id,start,JSON.stringify({eventId:id}),stamp,stamp);
  return {id,league};
}
describe("league scheduling and seats",()=>{
  it("publishes a recurring series atomically and rejects a duplicate template",async()=>{
    const e=seedEvent();sqlite.prepare("DELETE FROM league_events WHERE league_id=?").run(e.league);
    const input={id:crypto.randomUUID(),name:"Autumn weekly league",description:"A relaxed local weekly round.",templateId:e.id,weeks:3};
    const admin={...a,roles:["PLATFORM_ADMIN"] as AuthenticatedUser["roles"]};
    const results=await Promise.allSettled([createSeries(admin,input),createSeries(admin,{...input,id:crypto.randomUUID()})]);
    expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(1);
    expect(sqlite.prepare("SELECT COUNT(*) AS n FROM events WHERE id IN (SELECT event_id FROM league_event_links)").get()?.n).toBe(3);
    expect(sqlite.prepare("SELECT COUNT(*) AS n FROM league_event_links").get()?.n).toBe(3);
  });
  it("serializes capacity and promotes a waitlisted player exactly once",async()=>{
    const e=seedEvent();await Promise.all([rsvp(a.id,e.id,true),rsvp(b.id,e.id,true)]);const rows=sqlite.prepare("SELECT user_id,status FROM companion_rsvps ORDER BY created_at,id").all();expect(rows.filter(r=>r.status==="GOING")).toHaveLength(1);expect(rows.filter(r=>r.status==="WAITLIST")).toHaveLength(1);
    const current=rows.find(r=>r.status==="GOING")!.user_id as string;await Promise.all([rsvp(current,e.id,false),rsvp(current,e.id,false)]);expect(sqlite.prepare("SELECT COUNT(*) AS n FROM companion_rsvps WHERE status='GOING'").get()?.n).toBe(1);
    expect((await leagueDetail(c.id,e.league)).roster).toEqual([]);
    sqlite.prepare("UPDATE events SET status='DRAFT' WHERE id=?").run(e.id);expect((await leagueDetail(c.id,e.league)).events).toEqual([]);
  });
  it("requires actual course authority to publish a league",async()=>{
    const e=seedEvent();await expect(createSeries(a,{id:crypto.randomUUID(),name:"Unapproved league",description:"A realistic description",templateId:e.id,weeks:4})).rejects.toThrow();
  });
  it("keeps weekly local time across DST and escapes calendar content",()=>{
    expect(weeklyStarts("2026-10-25T14:00:00.000Z","America/New_York",2)).toEqual(["2026-10-25T14:00:00.000Z","2026-11-01T15:00:00.000Z"]);
    const cal=calendarText([{id:"event-id",title:"Round\nInjected:bad",venue:"Park, Maine",startsAt:stamp,endsAt:stamp,status:"CANCELLED",version:2}]);expect(cal).toContain("STATUS:CANCELLED");expect(cal).not.toContain("\r\nInjected:bad");expect(cal).toContain("TRIGGER:-PT1H");
  });
  it("flags daylight overruns and rolls a weekend over month boundaries",()=>{
    const result=itinerary({date:"2026-09-30",startMinutes:900,daylightCutoffMinutes:1080,bufferMinutes:30,stops:[{courseId:course.id,day:1,roundMinutes:180,travelMinutes:60,breakMinutes:0}]});expect(result[0]).toMatchObject({date:"2026-10-01",arrival:960,finish:1140,overrun:90});
  });
});
const apiRequest=(path:string,method:string,data:unknown)=>new Request("https://flightforge.test/api/"+path,{method,headers:{origin:"https://flightforge.test","content-type":"application/json"},body:JSON.stringify(data)});
describe("privacy mutation races",()=>{
  it("rejects stale practice deletion without claiming consent was removed",async()=>{
    const sample={id:crypto.randomUUID(),discId,throwType:"BACKHAND" as const,distanceFeet:250,uncertaintyMeters:3,useForCaddie:true,measuredAt:stamp,version:0};
    await savePractice(a.id,sample);await savePractice(a.id,{...sample,version:1,distanceFeet:260});
    expect((await deletePractice(apiRequest("practice","DELETE",{id:sample.id,version:1}))).status).toBe(409);
    expect(sqlite.prepare("SELECT deleted_at,use_for_caddie,version FROM practice_measurements WHERE id=?").get(sample.id)).toMatchObject({deleted_at:null,use_for_caddie:1,version:2});
    expect((await deletePractice(apiRequest("practice","DELETE",{id:sample.id,version:2}))).status).toBe(200);
  });
  it("rejects an invitation revoked after the initial group lookup",async()=>{
    const g=await createGroup(a,{id:crypto.randomUUID(),courseId:course.id,layoutId:null,holeCount:2,startsAt:new Date(Date.now()+3600000).toISOString(),visibility:"PRIVATE",pace:"RELAXED",beginnersWelcome:true,capacity:2});
    afterFirst=sql=>{if(!sql.includes("FROM play_groups WHERE id="))return;afterFirst=null;sqlite.prepare("UPDATE play_groups SET token_hash=?,version=version+1 WHERE id=?").run("rotated-token-hash",g.id);};
    await expect(requestJoin(b,g.id,g.token)).rejects.toThrow();expect(afterFirst).toBeNull();
    expect(sqlite.prepare("SELECT id FROM play_group_members WHERE group_id=? AND user_id=?").get(g.id,b.id)).toBeUndefined();
  });
  it("allows muted owners to revoke tags and delete recovery conversations",async()=>{
    const tag=await createTag(a.id,{discId,label:"Blue driver",courseId:course.id,publicListing:true});
    const contact=await openRecovery(b.id,{id:crypto.randomUUID(),token:tag.token,body:"I found the disc with a distinctive silver marking."});
    sqlite.prepare("UPDATE community_user_status SET muted_until=? WHERE user_id=?").run("2099-01-01T00:00:00.000Z",a.id);
    expect((await recoveryAction(apiRequest("recovery","PUT",{action:"REVOKE",id:tag.id}))).status).toBe(200);
    expect((await recoveryAction(apiRequest("recovery","PUT",{action:"DELETE",id:contact.id}))).status).toBe(200);
    expect(sqlite.prepare("SELECT revoked_at,public_listing FROM recovery_tags WHERE id=?").get(tag.id)).toMatchObject({revoked_at:expect.any(String),public_listing:0});
    expect(sqlite.prepare("SELECT status FROM recovery_cases WHERE id=?").get(contact.id)?.status).toBe("DELETED");
  });
  it("does not resurrect a case deleted after CLOSE reads authorization",async()=>{
    const tag=await createTag(a.id,{discId,label:"Blue driver",courseId:null,publicListing:false});
    const contact=await openRecovery(b.id,{id:crypto.randomUUID(),token:tag.token,body:"The identifying mark is a silver moon."});
    afterFirst=sql=>{if(!sql.includes("FROM recovery_cases WHERE id=? AND"))return;afterFirst=null;sqlite.prepare("UPDATE recovery_cases SET status='DELETED' WHERE id=?").run(contact.id);sqlite.prepare("DELETE FROM recovery_messages WHERE case_id=?").run(contact.id);};
    await Promise.allSettled([closeRecovery(a.id,contact.id,"CLOSE")]);expect(afterFirst).toBeNull();
    expect(sqlite.prepare("SELECT status FROM recovery_cases WHERE id=?").get(contact.id)?.status).toBe("DELETED");expect((await recoveryOverview(a.id)).cases).toEqual([]);
  });
});
