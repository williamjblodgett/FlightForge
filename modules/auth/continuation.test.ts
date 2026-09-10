import {describe,it,expect} from "vitest";
import {authReturnPath,nextAuthDestination} from "./continuation";
describe("authentication continuation",()=>{
 it("preserves filters and anchors through all required steps",()=>{const path="/courses?q=Bellamy&view=map#results";expect(nextAuthDestination({mustChangePassword:true},path)).toBe("/account/password?return_to="+encodeURIComponent(path));expect(nextAuthDestination({identityLinkRequired:true},path)).toBe("/account/link?return_to="+encodeURIComponent(path));expect(nextAuthDestination({},path)).toBe("/onboarding?return_to="+encodeURIComponent(path));expect(nextAuthDestination({onboardingComplete:true},path)).toBe(path);});
 it("rejects external redirects and auth loops",()=>{for(const path of ["https://bad.test","//bad.test","/onboarding","/account/link","/api/admin"]){expect(["/","/profile"]).toContain(authReturnPath(path));}});
});
