import { afterEach,beforeEach,expect,it,vi } from "vitest";
const mocks=vi.hoisted(()=>({config:vi.fn(),reset:vi.fn(),limit:vi.fn()}));
vi.mock("@/lib/supabase/config",()=>({getSupabaseConfiguration:mocks.config,isSupabaseConfigured:()=>Boolean(mocks.config())}));
vi.mock("@/lib/supabase/server",()=>({createSupabaseServerClient:async()=>({auth:{resetPasswordForEmail:mocks.reset}})}));
vi.mock("@/lib/security/request-security",()=>({isSameOriginMutation:()=>true,requestClientKey:()=>"test-client",checkRateLimit:mocks.limit}));
vi.mock("@/db/runtime",()=>({getPrivateMediaBucket:()=>({}),getD1Database:()=>({prepare:()=>({first:async()=>({healthy:1}),all:async()=>({results:[]})})})}));
import { getAuthProviderHealth } from "@/lib/supabase/health";
import { POST } from "@/app/api/auth/reset-password/route";
import { GET } from "@/app/api/health/route";
const outbound=vi.fn<typeof fetch>();
beforeEach(()=>{
  mocks.config.mockReturnValue({url:"https://"+crypto.randomUUID()+".supabase.co",publishableKey:"test-public-key",serviceRoleKey:null});
  mocks.limit.mockResolvedValue({allowed:true});mocks.reset.mockReset();
  outbound.mockReset().mockResolvedValue(new Response("{}",{status:200}));vi.stubGlobal("fetch",outbound);
});
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
function recover(){return POST(new Request("https://flightforge.test/api/auth/reset-password",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email:"test@example.test",returnTo:"/bag"})}));}
it.each([{code:"unexpected_failure",status:500},{name:"AuthRetryableFetchError"}])("reports provider recovery errors honestly",async(error)=>{
  mocks.reset.mockResolvedValue({error});const response=await recover();expect(response.status).toBe(503);expect(await response.text()).not.toContain("accepted");
});
it("handles recovery network failure and delivery acceptance",async()=>{
  mocks.reset.mockRejectedValueOnce(Error("network"));expect((await recover()).status).toBe(503);
  mocks.reset.mockResolvedValueOnce({error:null});expect((await recover()).status).toBe(200);
  expect(mocks.reset).toHaveBeenLastCalledWith("test@example.test",{redirectTo:"https://flightforge.test/auth/callback?type=recovery&next=%2Fbag"});
});
it("does not reveal recipient-specific outcomes and distinguishes request throttling",async()=>{
  for(const code of ["user_not_found","email_not_confirmed","over_email_send_rate_limit"]){mocks.reset.mockResolvedValue({error:{code,status:429}});expect((await recover()).status).toBe(200);}
  mocks.reset.mockResolvedValue({error:{code:"over_request_rate_limit",status:429}});expect((await recover()).status).toBe(429);
  mocks.limit.mockRejectedValue(Error("DB unavailable"));expect((await recover()).status).toBe(503);
});
it("checks actual provider reachability and deduplicates health probes",async()=>{
  expect((await Promise.all([getAuthProviderHealth(),getAuthProviderHealth()])).map(result=>result.status)).toEqual(["AVAILABLE","AVAILABLE"]);
  expect(outbound).toHaveBeenCalledTimes(1);
  expect(outbound.mock.calls[0][0]).toContain("/auth/v1/health");
});
it.each(["network","http"])("reports degraded public health for %s failure",async(kind)=>{
  if(kind==="network")outbound.mockRejectedValue(Error("DNS failure"));else outbound.mockResolvedValue(new Response("bad gateway",{status:502}));
  expect((await getAuthProviderHealth()).status).toBe("UNAVAILABLE");
  const response=await GET();expect(response.status).toBe(503);expect(await response.json()).toMatchObject({status:"degraded",authentication:{status:"UNAVAILABLE"}});
});
it("refreshes after the cache TTL or configuration changes",async()=>{
  await getAuthProviderHealth();const now=Date.now();vi.spyOn(Date,"now").mockReturnValue(now+61_000);
  await getAuthProviderHealth();expect(outbound).toHaveBeenCalledTimes(2);
  mocks.config.mockReturnValue({url:"https://changed.supabase.co",publishableKey:"changed"});await getAuthProviderHealth();expect(outbound).toHaveBeenCalledTimes(3);
});
