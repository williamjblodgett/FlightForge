import type {AuthenticatedUser} from "./types";
export function hasSecureIdentity(user:AuthenticatedUser|null):user is AuthenticatedUser {
  return Boolean(user&&user.emailVerified&&!user.identityLinkRequired&&!user.mustChangePassword);
}
export function isPlayerReady(user:AuthenticatedUser|null):user is AuthenticatedUser {
  return hasSecureIdentity(user)&&user.onboardingComplete;
}
