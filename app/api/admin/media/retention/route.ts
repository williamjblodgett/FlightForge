import { apiError } from "@/lib/http/api-response";
import { isSameOriginMutation } from "@/lib/security/request-security";
import { getCurrentUser } from "@/modules/auth/current-user";
import { can } from "@/modules/auth/permissions";
import { purgeExpiredCoachingMedia } from "@/modules/media-analysis/coaching-repository";

export async function POST(request: Request) {
  const user = await getCurrentUser(); const authorizedUser = can(user, "viewAdmin") && isSameOriginMutation(request);
  const configured = process.env.RETENTION_JOB_SECRET; const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/iu, "") ?? "";
  const authorizedJob = Boolean(configured && supplied && await constantTimeEqual(configured!, supplied));
  if (!authorizedUser && !authorizedJob) return apiError("FORBIDDEN", "Retention-job authorization failed.", 403);
  const result = await purgeExpiredCoachingMedia();
  return Response.json({ ...result, completedAt: new Date().toISOString() });
}
async function constantTimeEqual(left: string, right: string) { const encoder = new TextEncoder(); const [a,b] = await Promise.all([crypto.subtle.digest("SHA-256", encoder.encode(left)), crypto.subtle.digest("SHA-256", encoder.encode(right))]); const x = new Uint8Array(a), y = new Uint8Array(b); let diff = 0; for (let i=0;i<x.length;i++) diff |= x[i] ^ y[i]; return diff === 0; }
