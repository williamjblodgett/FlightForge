import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Supabase authentication security contracts", () => {
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

  it("never treats ChatGPT request headers as a FlightForge session", () => {
    const currentUser = readFileSync("modules/auth/current-user.ts", "utf8");
    const linkRoute = readFileSync("app/api/account/link-hosted/route.ts", "utf8");
    const accountRepository = readFileSync("modules/auth/account-repository.ts", "utf8");

    expect(currentUser).not.toContain("getChatGPTUser");
    expect(currentUser).not.toContain("oai-authenticated-user");
    expect(linkRoute).not.toContain("getChatGPTUser");
    expect(linkRoute).toContain("getSupabaseIdentity");
    expect(linkRoute).toContain("supabase?.emailVerified");
    expect(linkRoute).toContain("linkSupabaseIdentity");
    expect(accountRepository).toContain('if (user.source === "chatgpt") throw new ExternalIdentityLinkRequiredError()');
  });

  it("derives and classifies linked Supabase subjects on the server", () => {
    const accountRepository = readFileSync("modules/auth/account-repository.ts", "utf8");

    expect(accountRepository).toContain("export async function linkSupabaseIdentity");
    expect(accountRepository).toContain("const providerSubject = `supabase:${input.authUserId}`");
    expect(accountRepository).toContain('row.authProviderSubject?.startsWith("supabase:")');
  });

  it("fails closed when Supabase is configured to auto-confirm signup", () => {
    const signupRoute = readFileSync("app/api/auth/signup/route.ts", "utf8");
    const guard = signupRoute.indexOf("if (data.session)");
    const signOut = signupRoute.indexOf("supabase.auth.signOut()", guard);
    const abandon = signupRoute.indexOf("abandonHostedSignupIntent(registrationNonce)", signOut);
    const rejection = signupRoute.indexOf('"EMAIL_VERIFICATION_NOT_ENFORCED"', abandon);

    expect(guard).toBeGreaterThan(-1);
    expect(signOut).toBeGreaterThan(guard);
    expect(abandon).toBeGreaterThan(signOut);
    expect(rejection).toBeGreaterThan(abandon);
    expect(signupRoute).not.toContain("next: data.session");
  });

  it("grants configured roles only after a password account verifies its email", () => {
    const accountRepository = readFileSync("modules/auth/account-repository.ts", "utf8");
    const verificationStart = accountRepository.indexOf("export async function verifyAccountEmail");
    const nextFunction = accountRepository.indexOf("export async function authenticateAccount", verificationStart);
    const verification = accountRepository.slice(verificationStart, nextFunction);

    expect(verification).toContain("email_verified_at");
    expect(verification).toContain("await persistConfiguredRoles(verified.id, verified.email)");
  });
});
