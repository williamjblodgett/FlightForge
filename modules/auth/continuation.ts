import { safeRelativeReturnPath } from "@/lib/http/safe-return-path";
type AccountStep = {mustChangePassword?: boolean; identityLinkRequired?: boolean; onboardingComplete?: boolean};
const entryPaths=new Set(["/sign-in","/sign-up","/verify-email","/auth/callback","/onboarding","/account/password","/account/link","/forgot-password","/account/update-password"]);
export function authReturnPath(value: unknown): string {
  const safe=safeRelativeReturnPath(typeof value==="string"?value:"/profile");
  const path=new URL(safe,"https://flightforge.invalid").pathname;
  return entryPaths.has(path)||path.startsWith("/api/")?"/profile":safe;
}
export function authStepPath(step:string,returnTo:unknown):string{return `${step}?return_to=${encodeURIComponent(authReturnPath(returnTo))}`;}
export function nextAuthDestination(user:AccountStep,returnTo:unknown):string {
  if(user.mustChangePassword)return authStepPath("/account/password",returnTo);
  if(user.identityLinkRequired)return authStepPath("/account/link",returnTo);
  if(!user.onboardingComplete)return authStepPath("/onboarding",returnTo);
  return authReturnPath(returnTo);
}
