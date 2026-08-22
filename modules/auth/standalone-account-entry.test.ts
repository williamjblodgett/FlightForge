import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("standalone FlightForge account entry", () => {
  it("uses email and password as the public sign-in path without a ChatGPT control", () => {
    const page = readFileSync("app/sign-in/page.tsx", "utf8");
    const form = readFileSync("app/sign-in/SignInForm.tsx", "utf8");

    expect(page).not.toContain("chatGPTSignInPath");
    expect(form).not.toContain("hostedSignInPath");
    expect(form).not.toContain("Continue with secure sign-in");
    expect(form).toContain('fetch("/api/auth/login"');
    expect(form).toContain('type="email"');
    expect(form).toContain('type="password"');
  });

  it("carries a safe requested destination through signup and password recovery", () => {
    const signIn = readFileSync("app/sign-in/SignInForm.tsx", "utf8");
    const signUp = readFileSync("app/sign-up/SignupForm.tsx", "utf8");
    const forgotPassword = readFileSync("app/forgot-password/ForgotPasswordForm.tsx", "utf8");
    const callback = readFileSync("app/auth/callback/route.ts", "utf8");
    const updatePassword = readFileSync("app/api/auth/update-password/route.ts", "utf8");

    expect(signIn).toContain("/sign-up?return_to=");
    expect(signIn).toContain("/forgot-password?return_to=");
    expect(signUp).toContain("JSON.stringify({ displayName, email, password, acceptTerms, returnTo })");
    expect(forgotPassword).toContain("JSON.stringify({ email, returnTo })");
    expect(callback).toContain("/account/update-password?return_to=");
    expect(updatePassword).toContain("safeRelativeReturnPath(String(body.returnTo))");
    expect(updatePassword).toContain("next: returnTo");
  });
});
