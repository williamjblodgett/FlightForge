import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isFreshRecoveryClaims } from "./recovery-assurance";
const seconds=1800000000;
const claims={sub:"user",iss:"https://project.supabase.co/auth/v1",aud:"authenticated",role:"authenticated",session_id:"new-session",iat:seconds,exp:seconds+3600,amr:[{method:"recovery",timestamp:seconds}]};
beforeEach(()=>{vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL","https://project.supabase.co");vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY","test-public-key");});
afterEach(()=>vi.unstubAllEnvs());
describe("provider-attested recovery",()=>{
 it("accepts a fresh recovery AMR",()=>expect(isFreshRecoveryClaims(claims,"user",seconds*1000)).toBe(true));
 it("rejects stale recovery history even with a newly refreshed iat",()=>expect(isFreshRecoveryClaims({...claims,amr:[{method:"recovery",timestamp:seconds-3600}]},"user",seconds*1000)).toBe(false));
 it("rejects OAuth, missing AMR and malformed timestamps",()=>{for(const amr of [undefined,[],[{method:"oauth",timestamp:seconds}],[{method:"recovery",timestamp:String(seconds)}],[{method:"recovery",timestamp:seconds+3600}]])expect(isFreshRecoveryClaims({...claims,amr},"user",seconds*1000)).toBe(false);});
 it("rejects wrong issuer, subject, audience, role, session and expiry",()=>{for(const override of [{iss:"https://other.supabase.co/auth/v1"},{sub:"other"},{aud:"service_role"},{role:"service_role"},{session_id:""},{exp:seconds-1}])expect(isFreshRecoveryClaims({...claims,...override},"user",seconds*1000)).toBe(false);});
});
