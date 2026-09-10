import {isPlayerReady} from "@/modules/auth/player-readiness";
import {z} from "zod";
import {getCurrentUser} from "@/modules/auth/current-user";
import {correctPersonalRound} from "@/modules/rounds/history-repository";
import {apiError} from "@/lib/http/api-response";
import {isSameOriginMutation,checkRateLimit} from "@/lib/security/request-security";
const schema=z.object({holeNumber:z.number().int().min(1).max(36),strokes:z.number().int().min(1).max(99),penalties:z.number().int().min(0).max(20),reason:z.string().trim().min(5).max(500),expectedVersion:z.number().int().min(1),clientMutationId:z.uuid()});
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  if(!isSameOriginMutation(request))return apiError("ORIGIN_REJECTED","Request origin rejected.",403);
  const user=await getCurrentUser();if(!isPlayerReady(user))return apiError("AUTHENTICATION_REQUIRED","Sign in first.",401);
  const limit=await checkRateLimit("round-correction",user.id,60,3600).catch(()=>null);if(!limit?.allowed)return apiError("RATE_LIMITED","Please wait before retrying.",429);
  const input=schema.safeParse(await request.json().catch(()=>null));if(!input.success)return apiError("VALIDATION_ERROR","Review the correction and reason.",422);
  try{const result=await correctPersonalRound(user,(await params).id,input.data);return Response.json({saved:result.status===200},{status:result.status});}catch{return apiError("SAVE_FAILED","Correction could not be confirmed. Please retry.",503);}
}
