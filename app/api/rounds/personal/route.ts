import { getD1Database } from "@/db/runtime";
import { ensurePersistedUserId } from "@/modules/auth/account-repository";
import type {RoundContext} from "@/modules/rounds/round-context";
import { z } from "zod";
import {isPlayerReady} from "@/modules/auth/player-readiness";
import { getCurrentUser } from "@/modules/auth/current-user";
import { createPersonalContext, resolveRoundContext } from "@/modules/rounds/round-context";
import { getOrCreateActiveRound } from "@/modules/rounds/round-repository";
import { apiError } from "@/lib/http/api-response";
import { checkRateLimit, isSameOriginMutation } from "@/lib/security/request-security";

const schema=z.object({courseId:z.string().min(2).max(120),layoutId:z.string().max(120).nullable(),holeCount:z.number().int().min(1).max(36),idempotencyKey:z.uuid()});
export async function POST(request:Request) {
  if(!isSameOriginMutation(request))return apiError("ORIGIN_REJECTED","Request origin rejected.",403);
  const user=await getCurrentUser();
  if(!isPlayerReady(user))return apiError("ACCOUNT_SETUP_REQUIRED","Sign in and complete your player setup first.",401);
  const limit=await checkRateLimit("personal-round",user.id,30,3600).catch(()=>null);
  if(!limit?.allowed)return apiError("RATE_LIMITED","Please wait before starting another round.",429);
  const input=schema.safeParse(await request.json().catch(()=>null));
  if(!input.success)return apiError("VALIDATION_ERROR","Check your course and hole count.",422);
  try {
    const key=`personal:${input.data.idempotencyKey}`;
    const uid=await ensurePersistedUserId(user);
    const previous=await getD1Database().prepare("SELECT id,status,context_json AS contextJson FROM rounds WHERE created_by=? AND session_key=?").bind(uid,key).first<{id:string;status:string;contextJson:string}>();
    if(previous){const prior=JSON.parse(previous.contextJson) as RoundContext;if(prior.courseId!==input.data.courseId||prior.layoutId!==input.data.layoutId||(!prior.layoutId&&prior.holeCount!==input.data.holeCount))return apiError("IDEMPOTENCY_CONFLICT","This request key belongs to a different round selection.",409);return Response.json({roundId:previous.id,next:previous.status==="COMPLETED"?`/rounds/${previous.id}`:`/play?roundId=${previous.id}`});}
    const context=await resolveRoundContext(user,key) ?? await createPersonalContext(input.data.courseId,input.data.layoutId,input.data.idempotencyKey,input.data.holeCount);
    const round=await getOrCreateActiveRound(user,context);
    const persisted=round.context;
    if(!persisted)throw new Error("Round context was not persisted");
    if(persisted.courseId!==input.data.courseId || persisted.layoutId!==input.data.layoutId || (!persisted.layoutId && persisted.holeCount!==input.data.holeCount)) return apiError("IDEMPOTENCY_CONFLICT","This request key belongs to a different round selection.",409);
    return Response.json({roundId:round.id,next:`/play?roundId=${round.id}`},{status:201});
  } catch {return apiError("ROUND_START_FAILED","The round could not be started. Your selection is unchanged; try again.",503);}
}
