import { apiError } from "@/lib/http/api-response";
import { logError } from "@/lib/observability/logger";
import { getCurrentUser } from "@/modules/auth/current-user";
import type { AuthenticatedUser } from "@/modules/auth/types";
import { isFeatureEnabled } from "@/modules/config/feature-flags";
import { CommunityError } from "./community-repository";
import { ensureCommunityRuntimeSchema } from "./community-schema";

export async function requireCommunityActor(): Promise<AuthenticatedUser> {
  if (!await isFeatureEnabled("community_chat")) {
    throw new CommunityError("FEATURE_DISABLED", "Community messaging is temporarily paused.", 503);
  }
  await ensureCommunityRuntimeSchema();
  const user = await getCurrentUser();
  if (!user) throw new CommunityError("AUTHENTICATION_REQUIRED", "Sign in to use the community.", 401);
  if (!user.emailVerified || user.identityLinkRequired) {
    throw new CommunityError("FORBIDDEN", "Verify and securely link your account before using the community.", 403);
  }
  if (!user.onboardingComplete && !user.roles.includes("PLATFORM_ADMIN")) {
    throw new CommunityError("FORBIDDEN", "Complete your player profile and privacy settings before joining the community.", 403);
  }
  return user;
}

export function communityErrorResponse(error: unknown) {
  if (error instanceof CommunityError) return apiError(error.code, error.message, error.status);
  logError("community.request.failed", error);
  return apiError("COMMUNITY_UNAVAILABLE", "The community is temporarily unavailable.", 503);
}

export function boundedLimit(value: string | null, fallback = 50, maximum = 100): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}
