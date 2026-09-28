import type { DatabaseSync } from "node:sqlite";
import { afterEach,beforeEach,expect,it,vi } from "vitest";
import { d1Adapter,migratedDatabase } from "../helpers/sqlite-d1";
import type { AuthenticatedUser } from "@/modules/auth/types";
const mocks=vi.hoisted(()=>({db:vi.fn<()=>D1Database>()}));
vi.mock("@/db/runtime",()=>({getD1Database:mocks.db}));
import { getCommunityDashboard,listMessages,listUserConversations } from "@/modules/community/community-repository";
import { COMMUNITY_GUIDELINES_VERSION } from "@/modules/community/types";
const user:AuthenticatedUser={id:"viewer",email:"viewer@example.test",displayName:"Viewer",roles:["PLAYER"],source:"password",onboardingComplete:true,emailVerified:true,isTestAccount:true,mustChangePassword:false};
const stamp="2026-09-28T12:00:00.000Z";
let sqlite:DatabaseSync;
beforeEach(()=>{
  sqlite=migratedDatabase();mocks.db.mockReturnValue(d1Adapter(sqlite));
  for(const id of ["viewer","allowed","blocked"]){
    sqlite.prepare("INSERT INTO users(id,email,display_name,created_at,updated_at) VALUES(?,?,?,?,?)").run(id,id+"@example.test",id,stamp,stamp);
    sqlite.prepare("INSERT INTO community_user_status(user_id,adult_attested_at,guidelines_version,guidelines_accepted_at,status,updated_at) VALUES(?,?,?,?,'ACTIVE',?)").run(id,stamp,COMMUNITY_GUIDELINES_VERSION,stamp,stamp);
  }
});
afterEach(()=>sqlite.close());
function channel(id:string,type="PUBLIC_CHANNEL",date=stamp){
  sqlite.prepare("INSERT INTO conversations(id,conversation_type,subject,visibility,status,created_by,created_at,updated_at) VALUES(?,?,?,'PUBLIC','ACTIVE','viewer',?,?)").run(id,type,id,date,date);
  sqlite.prepare("INSERT INTO conversation_members(id,conversation_id,user_id,joined_at) VALUES(?,?,'viewer',?)").run("member-"+id,id,date);
}
function message(id:string,channelId:string,sender:string,deleted=false){sqlite.prepare("INSERT INTO messages(id,conversation_id,sender_user_id,body,moderation_status,created_at,deleted_at) VALUES(?,?,?,?,'PUBLISHED',?,?)").run(id,channelId,sender,"Body "+id,stamp,deleted?stamp:null);}
it.each([["viewer","blocked"],["blocked","viewer"]])("filters previews and unread in either block direction: %s",async(blocker,blocked)=>{
  channel("public-test");message("01","public-test","allowed");message("02","public-test","blocked");message("03","public-test","allowed",true);
  sqlite.prepare("INSERT INTO blocked_users(id,blocker_user_id,blocked_user_id,created_at) VALUES('block',?,?,?)").run(blocker,blocked,stamp);
  const entry=(await getCommunityDashboard(user)).channels.find(item=>item.id==="public-test");
  expect(entry?.lastMessage).toMatchObject({id:"01",body:"Body 01",senderDisplayName:"allowed",createdAt:stamp});
  expect(entry?.unreadCount).toBe(1);
  sqlite.prepare("UPDATE messages SET deleted_at=? WHERE id='01'").run(stamp);
  expect((await getCommunityDashboard(user)).channels.find(item=>item.id==="public-test")?.lastMessage).toBeNull();
});
it("opens old authorized conversations beyond directory caps with their metadata",async()=>{
  channel("old-public","PUBLIC_CHANNEL","2000-01-01");channel("old-private","PRIVATE_GROUP","2000-01-01");
  for(let i=0;i<105;i++)channel("new-public-"+i);
  for(let i=0;i<55;i++)channel("new-private-"+i,"PRIVATE_GROUP");
  expect(await listUserConversations(user.id)).toHaveLength(50);
  expect((await getCommunityDashboard(user)).channels).toHaveLength(100);
  for(const id of ["old-public","old-private"]){
    const result=await listMessages(user,id,null,20);
    expect(result.conversation).toMatchObject({id,joined:true});
    expect(result.messages).toEqual([]);
  }
  sqlite.prepare("UPDATE conversation_members SET left_at=? WHERE conversation_id='old-public'").run(stamp);
  await expect(listMessages(user,"old-public",null,20)).rejects.toMatchObject({code:"FORBIDDEN"});
  sqlite.prepare("UPDATE conversations SET status='CLOSED' WHERE id='old-private'").run();
  await expect(listMessages(user,"old-private",null,20)).rejects.toMatchObject({code:"FORBIDDEN"});
});
