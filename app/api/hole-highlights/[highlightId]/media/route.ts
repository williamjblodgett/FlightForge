import { apiError } from "@/lib/http/api-response";
import { getCurrentUser } from "@/modules/auth/current-user";
import { getHighlightMediaAccess } from "@/modules/highlights/highlight-repository";

export async function GET(_request: Request, context: { params: Promise<{ highlightId: string }> }) {
  const { highlightId } = await context.params;
  const access = await getHighlightMediaAccess(highlightId, await getCurrentUser()).catch(() => null);
  if (!access) return apiError("HIGHLIGHT_NOT_FOUND", "This video is unavailable or not approved for viewing.", 404);
  const headers = new Headers({
    "content-type": access.mimeType,
    "cache-control": "private, max-age=300",
    "content-disposition": "inline",
    "x-content-type-options": "nosniff",
  });
  if (access.object.size) headers.set("content-length", String(access.object.size));
  return new Response(access.object.body, { headers });
}
