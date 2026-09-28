import type { DatabaseSync } from "node:sqlite";
import { afterEach,beforeEach,expect,it,vi } from "vitest";
import { d1Adapter,migratedDatabase } from "../helpers/sqlite-d1";
const mocks=vi.hoisted(()=>({db:vi.fn<()=>D1Database>()}));
vi.mock("@/db/runtime",()=>({getD1Database:mocks.db}));
import { ensureAccountSchema,linkSupabaseIdentity,authenticateAccount,createAccountSession,getAccountUserBySession,changeAccountPassword } from "@/modules/auth/account-repository";
import { retireLinkedCredentials } from "@/modules/auth/legacy-credential-retirement";
import { createPasswordRecord } from "@/modules/auth/password";
let sqlite:DatabaseSync,afterFirst:((sql:string)=>void)|undefined;
const stamp="2026-09-28T12:00:00.000Z",password="RegressionOnly987!",email="link@example.test",id="link-user";
beforeEach(async()=>{sqlite=migratedDatabase();afterFirst=undefined;mocks.db.mockReturnValue(d1Adapter(sqlite,sql=>afterFirst?.(sql)));await ensureAccountSchema();});
afterEach(()=>sqlite.close());
async function seed(){
  const record=await createPasswordRecord(password);
  sqlite.prepare("INSERT INTO users(id,email,display_name,email_verified_at,password_hash,password_salt,password_iterations,created_at,updated_at) VALUES(?,?,'Linked User',?,?,?,?,?,?)").run(id,email,stamp,record.hash,record.salt,record.iterations,stamp,stamp);
  return record;
}
it("retires every old password and session when linking hosted identity",async()=>{
  await seed();const first=await createAccountSession(id,null),second=await createAccountSession(id,null);
  const linked=await linkSupabaseIdentity({email,authUserId:crypto.randomUUID(),password});
  expect(linked.id).toBe(id);
  expect(sqlite.prepare("SELECT password_hash,password_salt,password_iterations FROM users WHERE id=?").get(id)).toMatchObject({password_hash:null,password_salt:null,password_iterations:null});
  expect(await authenticateAccount(email,password)).toBeNull();
  expect(await getAccountUserBySession(first.token)).toBeNull();expect(await getAccountUserBySession(second.token)).toBeNull();
  await expect(createAccountSession(id,null)).rejects.toThrow();
});
it("blocks historic linked credentials even before cleanup reaches them",async()=>{
  await seed();const session=await createAccountSession(id,null);
  sqlite.prepare("UPDATE users SET auth_provider_subject=? WHERE id=?").run("supabase:"+crypto.randomUUID(),id);
  expect(await authenticateAccount(email,password)).toBeNull();expect(await getAccountUserBySession(session.token)).toBeNull();
  await expect(changeAccountPassword(id,password,"AnotherPassword123!")).rejects.toThrow();
});
it("rolls back linking if session revocation fails",async()=>{
  await seed();await createAccountSession(id,null);
  sqlite.exec("CREATE TRIGGER fail_revoke BEFORE UPDATE ON auth_sessions BEGIN SELECT RAISE(ABORT,'test failure'); END");
  await expect(linkSupabaseIdentity({email,authUserId:crypto.randomUUID(),password})).rejects.toThrow();
  expect(sqlite.prepare("SELECT auth_provider_subject FROM users WHERE id=?").get(id)?.auth_provider_subject).toBeNull();
  expect(await authenticateAccount(email,password)).toMatchObject({id});
  expect(sqlite.prepare("SELECT count(*) AS n FROM audit_logs WHERE action='SUPABASE_IDENTITY_LINKED'").get()?.n).toBe(0);
});
it("rejects a stale password-change snapshot without revoking newer sessions",async()=>{
  await seed();const replacement=await createPasswordRecord("NewerPassword123!");await createAccountSession(id,null);
  afterFirst=sql=>{
    if(sql.includes("FROM users WHERE id = ?")){
      afterFirst=undefined;
      sqlite.prepare("UPDATE users SET password_hash=?,password_salt=?,password_iterations=? WHERE id=?").run(replacement.hash,replacement.salt,replacement.iterations,id);
    }
  };
  await expect(changeAccountPassword(id,password,"StalePassword123!")).rejects.toThrow();
  expect(sqlite.prepare("SELECT password_hash FROM users WHERE id=?").get(id)?.password_hash).toBe(replacement.hash);
  expect(sqlite.prepare("SELECT revoked_at FROM auth_sessions WHERE user_id=?").get(id)?.revoked_at).toBeNull();
  expect(sqlite.prepare("SELECT count(*) AS n FROM audit_logs WHERE action='PASSWORD_CHANGED'").get()?.n).toBe(0);
});
it("sweeps more than one maintenance batch and preserves unlinked users",async()=>{
  await seed();
  for(let i=0;i<101;i++)sqlite.prepare("INSERT INTO users(id,email,display_name,auth_provider_subject,password_hash,password_salt,password_iterations,created_at,updated_at) VALUES(?,?,?,?,'old','salt',1,?,?)").run("retire-"+i,"retire-"+i+"@example.test","Old account","supabase:"+crypto.randomUUID(),stamp,stamp);
  expect(await retireLinkedCredentials(mocks.db())).toBe(100);
  expect(await retireLinkedCredentials(mocks.db())).toBe(1);
  expect(await retireLinkedCredentials(mocks.db())).toBe(0);
  expect(sqlite.prepare("SELECT COUNT(*) AS n FROM users WHERE auth_provider_subject GLOB 'supabase:*' AND password_hash IS NOT NULL").get()?.n).toBe(0);
  expect(sqlite.prepare("SELECT COUNT(*) AS n FROM audit_logs WHERE action='LEGACY_CREDENTIALS_RETIRED'").get()?.n).toBe(101);
  expect(await authenticateAccount(email,password)).toMatchObject({id});
});
