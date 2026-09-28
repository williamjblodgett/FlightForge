/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import {drainVerificationOutbox} from "../modules/notifications/verification-outbox";
import type {VerificationDeliveryEnvironment} from "../modules/notifications/email-verification";
import handler from "vinext/server/app-router-entry";
import { withSecurityHeaders } from "../lib/security/response-headers";
import { purgeCoachingCandidates } from "../modules/media-analysis/coaching-retention";
import { retireLinkedCredentials } from "../modules/auth/legacy-credential-retirement";

interface Env extends VerificationDeliveryEnvironment {
  ASSETS: Fetcher;
  DB: D1Database;
  MEDIA: R2Bucket;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

let lastDeliverySweep=0;
let lastRetentionSweep=0;
const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    // Opportunistic retries keep delivery moving even when the host has no cron trigger.
    if(Date.now()-lastDeliverySweep>60_000){
      lastDeliverySweep=Date.now();
      ctx.waitUntil(drainVerificationOutbox(env.DB,env).catch(()=>{console.error(JSON.stringify({event:"verification_outbox_failed"}));}));
      ctx.waitUntil(retireLinkedCredentials(env.DB).catch(()=>{console.error(JSON.stringify({event:"credential_retirement_retry_required"}));}));
    }
    // Bounded fallback where a hosting account has not enabled cron. Privacy
    // cleanup must not depend on the affected owner opening their history.
    if(Date.now()-lastRetentionSweep>300_000){
      lastRetentionSweep=Date.now();
      ctx.waitUntil(purgeCoachingCandidates(env.DB,env.MEDIA,20).catch(()=>{console.error(JSON.stringify({event:"media_retention_retry_required"}));}));
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      const response = await handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
      return withSecurityHeaders(request, response);
    }

    return withSecurityHeaders(request, await handler.fetch(request, env, ctx));
  },
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(purgeExpiredMedia(env));
    ctx.waitUntil(drainVerificationOutbox(env.DB,env));
    ctx.waitUntil(retireLinkedCredentials(env.DB));
  },
};

export default worker;

async function purgeExpiredMedia(env: Env): Promise<void> {
  const coaching = await purgeCoachingCandidates(env.DB,env.MEDIA);
  const now = new Date().toISOString();
  const expired = await env.DB.prepare(
    `SELECT id, user_id AS userId, storage_key AS storageKey FROM media_uploads u
     WHERE status != 'DELETED' AND deleted_at IS NULL AND expires_at <= ?
       AND NOT EXISTS(SELECT 1 FROM media_analysis_jobs j WHERE j.media_upload_id=u.id AND j.analysis_type='THROW_COACHING')
     ORDER BY expires_at LIMIT 100`,
  ).bind(now).all<{ id: string; userId: string; storageKey: string }>();
  let deleted = coaching.deleted;
  let failed = coaching.failed;
  for (const item of expired.results) {
    try {
      await env.MEDIA.delete(item.storageKey);
      await env.DB.batch([
        env.DB.prepare("UPDATE media_uploads SET status = 'DELETED', deleted_at = ? WHERE id = ? AND user_id = ?").bind(now, item.id, item.userId),
        env.DB.prepare("UPDATE media_analysis_results SET deleted_at = ? WHERE media_analysis_job_id IN (SELECT id FROM media_analysis_jobs WHERE media_upload_id = ?)").bind(now, item.id),
      ]);
      deleted += 1;
    } catch {
      failed += 1;
    }
  }
  console.log(JSON.stringify({ event: "media_retention_completed", deleted, failed, completedAt: now }));
}
