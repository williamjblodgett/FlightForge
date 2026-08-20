import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("hosted authentication security contracts", () => {
  it("binds Supabase provisioning to an app-recorded legal acceptance", () => {
    const signupRoute = readFileSync("app/api/auth/signup/route.ts", "utf8");
    const accountRepository = readFileSync("modules/auth/account-repository.ts", "utf8");
    const currentUser = readFileSync("modules/auth/current-user.ts", "utf8");
    expect(signupRoute).toContain("createHostedSignupIntent");
    expect(signupRoute).toContain("flightforge_registration_nonce");
    expect(currentUser).toContain("registrationNonce: supabaseIdentity.registrationNonce");
    expect(accountRepository).toContain("claimHostedSignupIntent");
    expect(accountRepository).toContain("'TERMS'");
    expect(accountRepository).toContain("'PRIVACY'");
  });

  it("requires a one-time recovery intent before replacing a Supabase password", () => {
    const callbackRoute = readFileSync("app/auth/callback/route.ts", "utf8");
    const updateRoute = readFileSync("app/api/auth/update-password/route.ts", "utf8");
    expect(callbackRoute).toContain("createPasswordRecoveryIntent");
    expect(callbackRoute).toContain("PASSWORD_RECOVERY_INTENT_COOKIE");
    expect(updateRoute).toContain("consumePasswordRecoveryIntent");
    expect(updateRoute.indexOf("consumePasswordRecoveryIntent")).toBeLessThan(updateRoute.indexOf("updateUser({ password })"));
  });
});
