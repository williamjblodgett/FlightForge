import { apiError } from "@/lib/http/api-response";
import { completeHighlightSanitization } from "@/modules/highlights/highlight-repository";
import { z } from "zod";

const resultSchema = z.object({ status: z.enum(["CLEAN", "REJECTED"]), sanitizedStorageKey: z.string().max(500).nullable(), reason: z.string().trim().min(10).max(1000) });
export async function POST(request: Request, { params }: { params: Promise<{ highlightId: string }> }) {
  const expected = process.env.MEDIA_SANITIZATION_CALLBACK_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/iu, "");
  if (!expected || !supplied || !constantTimeEqual(expected, supplied)) return apiError("FORBIDDEN", "A valid media-worker credential is required.", 403);
  let body: unknown; try { body = await request.json(); } catch { return apiError("INVALID_JSON", "Use valid JSON.", 400); }
  const parsed = resultSchema.safeParse(body); if (!parsed.success) return apiError("VALIDATION_ERROR", "Review the sanitization result.", 422);
  const { highlightId } = await params;
  const saved = await completeHighlightSanitization({ id: highlightId, ...parsed.data }).catch(() => false);
  return saved ? Response.json({ saved: true }) : apiError("RESULT_REJECTED", "The sanitization result was not accepted.", 409);
}
function constantTimeEqual(first: string, second: string) { const encoder = new TextEncoder(); const a = encoder.encode(first), b = encoder.encode(second); let mismatch = a.length ^ b.length; for (let index = 0; index < Math.max(a.length, b.length); index++) mismatch |= (a[index] ?? 0) ^ (b[index] ?? 0); return mismatch === 0; }
