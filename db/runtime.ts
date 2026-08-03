import { env } from "cloudflare:workers";

export function getD1Database(): D1Database {
  if (!env.DB) {
    throw new Error("The FlightForge D1 demo database binding is unavailable.");
  }
  return env.DB;
}

export function getPrivateMediaBucket(): R2Bucket {
  if (!env.MEDIA) {
    throw new Error("The FlightForge private media binding is unavailable.");
  }
  return env.MEDIA;
}
