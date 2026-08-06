/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { withSecurityHeaders } from "../lib/security/response-headers";

interface Env {
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

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

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
  },
};

export default worker;

async function purgeExpiredMedia(env: Env): Promise<void> {
  const now = new Date().toISOString();
  const expired = await env.DB.prepare(
    "SELECT id, user_id AS userId, storage_key AS storageKey FROM media_uploads WHERE status != 'DELETED' AND deleted_at IS NULL AND expires_at <= ? ORDER BY expires_at LIMIT 100",
  ).bind(now).all<{ id: string; userId: string; storageKey: string }>();
  let deleted = 0;
  let failed = 0;
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
