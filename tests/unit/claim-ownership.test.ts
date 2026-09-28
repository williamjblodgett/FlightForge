import type { DatabaseSync } from "node:sqlite";
import { afterEach,beforeEach,expect,it,vi } from "vitest";
import { d1Adapter,migratedDatabase } from "../helpers/sqlite-d1";
import type { AuthenticatedUser } from "@/modules/auth/types";
const mocks=vi.hoisted(()=>({db:vi.fn<()=>D1Database>(),find:vi.fn()}));
vi.mock("@/db/runtime",()=>({getD1Database:mocks.db}));
vi.mock("@/modules/auth/account-repository",()=>({ensurePersistedUserId:async(u:{id:string})=>u.id,findAccountUserByEmail:mocks.find}));
import { submitCourseClaim,reviewCourseClaim,withCourseOwnership } from "@/modules/courses/course-repository";
import { courses } from "@/modules/courses/demo-courses";

const user:AuthenticatedUser={id:"claim-user",email:"claim@example.test",displayName:"Claimant",roles:["PLAYER"],source:"password",onboardingComplete:true,emailVerified:true,isTestAccount:true,mustChangePassword:false};
const other={...user,id:"other-user",email:"other@example.test"},admin={...user,id:"claim-admin",email:"admin@example.test",roles:["PLATFORM_ADMIN"] as AuthenticatedUser["roles"]};
const stamp="2026-09-28T12:00:00.000Z",course=courses[0];
const application={courseId:course.id,applicantName:"Course Manager",applicantRole:"Owner",businessEmail:user.email,businessPhone:"2075550100",website:null,explanation:"I am the owner and can supply additional proof of authority."};
let sqlite:DatabaseSync;
beforeEach(()=>{
  sqlite=migratedDatabase();mocks.db.mockReturnValue(d1Adapter(sqlite));
  for(const u of [user,other,admin])sqlite.prepare("INSERT INTO users(id,email,display_name,email_verified_at,created_at,updated_at) VALUES(?,?,?,?,?,?)").run(u.id,u.email,u.displayName,stamp,stamp,stamp);
  mocks.find.mockImplementation(async(email:string)=>[user,other,admin].find(u=>u.email===email)??null);
  sqlite.prepare("DELETE FROM courses WHERE id=?").run(course.id);
});
afterEach(()=>sqlite.close());
it("reflects approval of a static-only course without mutating the catalog",async()=>{
  const original={...course};const claim=await submitCourseClaim(user,application,null);
  await reviewCourseClaim(admin,claim.id,"VERIFIED","Ownership confirmed through operator records.",course.name,claim.version);
  expect((await withCourseOwnership([course]))[0]).toMatchObject({claimStatus:"VERIFIED",verifiedBadge:true});
  expect(course).toEqual(original);
  expect(sqlite.prepare("SELECT user_id,status FROM organization_memberships WHERE user_id=?").get(user.id)).toMatchObject({user_id:user.id,status:"ACTIVE"});
  expect(sqlite.prepare("SELECT course_id,user_id,staff_role FROM course_staff WHERE user_id=?").get(user.id)).toMatchObject({course_id:course.id,staff_role:"OWNER"});
  await expect(submitCourseClaim(other,application,null)).rejects.toThrow(/changed/u);
});
it("deduplicates simultaneous submissions and approvals",async()=>{
  const results=await Promise.allSettled([submitCourseClaim(user,application,null),submitCourseClaim(user,application,null)]);
  expect(results.filter(result=>result.status==="fulfilled")).toHaveLength(1);
  const winner=results.find(result=>result.status==="fulfilled");if(winner?.status!=="fulfilled")throw Error("No claim");
  const second=await submitCourseClaim(other,application,null);
  const decisions=await Promise.allSettled([winner.value,second].map(claim=>reviewCourseClaim(admin,claim.id,"VERIFIED","Ownership confirmed through operator records.",course.name,claim.version)));
  expect(decisions.filter(result=>result.status==="fulfilled")).toHaveLength(1);
  expect(sqlite.prepare("SELECT COUNT(*) AS n FROM course_staff WHERE course_id=?").get(course.id)?.n).toBe(1);
  expect(sqlite.prepare("SELECT COUNT(*) AS n FROM course_claim_audit_events WHERE action='CLAIM_REVIEWED'").get()?.n).toBe(1);
  expect(sqlite.prepare("SELECT COUNT(*) AS n FROM player_tool_guards").get()?.n).toBe(0);
});
it("rejects stale reviews and unverified or deactivated claimants",async()=>{
  const claim=await submitCourseClaim(user,application,null);
  await reviewCourseClaim(admin,claim.id,"ADDITIONAL_INFORMATION_REQUIRED","Please supply the operator documentation.",course.name,claim.version);
  await expect(reviewCourseClaim(admin,claim.id,"VERIFIED","Ownership confirmed through operator records.",course.name,claim.version)).rejects.toThrow(/changed/u);
  sqlite.prepare("UPDATE users SET email_verified_at=NULL WHERE id=?").run(user.id);
  await expect(reviewCourseClaim(admin,claim.id,"VERIFIED","Ownership confirmed through operator records.",course.name,claim.version+1)).rejects.toThrow();
  expect(sqlite.prepare("SELECT COUNT(*) AS n FROM course_staff").get()?.n).toBe(0);
});
it("rolls back approval if an ownership grant fails",async()=>{
  const claim=await submitCourseClaim(user,application,null);
  sqlite.exec("CREATE TRIGGER fail_grant BEFORE INSERT ON course_staff BEGIN SELECT RAISE(ABORT,'test grant failure'); END");
  await expect(reviewCourseClaim(admin,claim.id,"VERIFIED","Ownership confirmed through operator records.",course.name,claim.version)).rejects.toThrow();
  expect(sqlite.prepare("SELECT status,version FROM course_claims WHERE id=?").get(claim.id)).toMatchObject({status:"CLAIM_SUBMITTED",version:1});
  expect(sqlite.prepare("SELECT COUNT(*) AS n FROM organization_memberships WHERE user_id=?").get(user.id)?.n).toBe(0);
  expect((await withCourseOwnership([course]))[0].claimStatus).toBe(course.claimStatus);
});
