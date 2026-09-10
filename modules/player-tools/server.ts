import { z } from "zod";
import { getD1Database } from "@/db/runtime";
import { getCurrentUser } from "@/modules/auth/current-user";
import { ensurePersistedUserId } from "@/modules/auth/account-repository";
import { isPlayerReady } from "@/modules/auth/player-readiness";
import { getCommunityStatus } from "@/modules/community/community-repository";
import { moderateMessage } from "@/modules/community/moderation";
import { checkRateLimit, isSameOriginMutation } from "@/lib/security/request-security";
import { apiError } from "@/lib/http/api-response";
import {isFeatureEnabled,type ProductionFeatureKey} from "@/modules/config/feature-flags";

export class ToolError extends Error {
  constructor(message: string, readonly status = 422) { super(message); }
}
export async function actor(request: Request, social = false, readOnly = false) {
  const key=({"course-updates":"course_updates",groups:"shared_play",practice:"practice_history",recovery:"disc_recovery",leagues:"league_companion",passport:"course_passport",itinerary:"weekend_planner","offline-pack":"offline_guides"} as Record<string,ProductionFeatureKey>)[new URL(request.url).pathname.split("/")[2]];
  if(key&&!await isFeatureEnabled(key))throw new ToolError("This tool is temporarily paused. Your saved records have not been removed.",503);
  const user = await getCurrentUser();
  if (!isPlayerReady(user)) throw new ToolError("Sign in, verify your email and finish player setup first.", 401);
  if (request.method !== "GET") {
    if (!isSameOriginMutation(request)) throw new ToolError("Request origin rejected.", 403);
    const limit = await checkRateLimit(readOnly?"player-tools-read":"player-tools", user.id, readOnly?1500:180, 3600);
    if (!limit.allowed) throw new ToolError("Please wait before making more changes.", 429);
  }
  const id = await ensurePersistedUserId(user);
  if (social) await requireSocial(id);
  return { ...user, id };
}
export async function requireSocial(id: string) {
  const status = await getCommunityStatus(id);
  if (!status.adultAttested || status.suspended || status.muted)
    throw new ToolError("Open Community to confirm adult participation and community guidelines. Restricted accounts cannot participate.", 403);
}
export async function requireUnblocked(a: string, b: string) {
  const row = await getD1Database().prepare("SELECT 1 FROM blocked_users WHERE (blocker_user_id=? AND blocked_user_id=?) OR (blocker_user_id=? AND blocked_user_id=?) LIMIT 1").bind(a,b,b,a).first();
  if (row) throw new ToolError("This interaction is unavailable.",403);
}
export function safeCommunityText(text: string) {
  if (moderateMessage(text).status !== "PUBLISHED") throw new ToolError("Please revise that text to follow the community guidelines.");
  return text;
}
export async function body<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  if(Number(request.headers.get("content-length")??0)>32768)throw new ToolError("Request is too large.",413);
  const reader=request.body?.getReader();
  const decoder=new TextDecoder();let raw="",size=0;
  if(reader)while(true){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.byteLength;if(size>32768){await reader.cancel();throw new ToolError("Request is too large.",413);}raw+=decoder.decode(chunk.value,{stream:true});}
  raw+=decoder.decode();
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new ToolError("Invalid request.",400); }
  const result = schema.safeParse(parsed);
  if (!result.success) throw new ToolError(result.error.issues[0]?.message ?? "Check the form.");
  return result.data;
}
export async function handle(action: () => Promise<unknown>) {
  try { return Response.json(await action(), {headers:{"cache-control":"private, no-store"}}); }
  catch(error) {
    if (error instanceof ToolError) return apiError("PLAYER_TOOL_ERROR",error.message,error.status);
    if(error instanceof Error&&/player_tool_guard_valid|league_event_links.event_id|play_groups.id/iu.test(error.message))return apiError("PLAYER_TOOL_CONFLICT","This record or its permissions changed. Refresh and review before trying again.",409);
    return apiError("PLAYER_TOOL_UNAVAILABLE","This tool could not finish the request. Your existing records are unchanged; please try again.",503);
  }
}
export function audit(actorId: string, resourceType: string, resourceId: string, action: string, detail: unknown = {}) {
  return getD1Database().prepare("INSERT INTO player_tool_audit(id,actor_id,resource_type,resource_id,action,detail_json,created_at) VALUES(?,?,?,?,?,?,?)")
    .bind(crypto.randomUUID(),actorId,resourceType,resourceId,action,JSON.stringify(detail),new Date().toISOString());
}
// A failing CHECK aborts the complete D1 batch if authorization/version changed after a read.
export function transactionGuard(condition:string,values:Array<string|number|null>):D1PreparedStatement[] {
  const db=getD1Database(),id=crypto.randomUUID();
  return [db.prepare(`INSERT INTO player_tool_guards(id,valid) VALUES(?,CASE WHEN ${condition} THEN 1 ELSE 0 END)`).bind(id,...values),
    db.prepare("DELETE FROM player_tool_guards WHERE id=?").bind(id)];
}
