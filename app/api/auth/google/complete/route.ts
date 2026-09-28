import {z} from "zod";
import {apiError} from "@/lib/http/api-response";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {checkRateLimit,isSameOriginMutation} from "@/lib/security/request-security";
import {isGoogleSignInEnabled} from "@/modules/auth/google-config";
import {googleIdentityFromUser} from "@/modules/auth/google-identity";
import {isRegistrationReady} from "@/modules/auth/registration-readiness";
import {abandonHostedSignupIntent,createHostedSignupIntent,resolveSupabaseAccount} from "@/modules/auth/account-repository";
import {nextAuthDestination} from "@/modules/auth/continuation";

const completionSchema=z.object({displayName:z.string().trim().min(2).max(60),acceptTerms:z.literal(true),returnTo:z.string().max(2048).optional()});
export async function POST(request:Request){
  if(!isSameOriginMutation(request))return apiError("ORIGIN_REJECTED","The account request origin was rejected.",403);
  if(!isGoogleSignInEnabled()||!isRegistrationReady())return apiError("REGISTRATION_PAUSED","New accounts are temporarily unavailable.",503);
  let nonce:string|null=null;
  try{
    const client=await createSupabaseServerClient();const result=await client?.auth.getUser();
    const identity=googleIdentityFromUser(result?.data.user??null);
    if(!identity||result?.error)return apiError("IDENTITY_REQUIRED","Start Google sign-in again before creating an account.",401);
    const limit=await checkRateLimit("google-complete",identity.authUserId,5,900);
    if(!limit.allowed)return apiError("RATE_LIMITED","Too many attempts. Please try again later.",429);
    const input=completionSchema.safeParse(await request.json().catch(()=>null));
    if(!input.success)return apiError("VALIDATION_ERROR","Enter a player name and accept the Terms and Privacy Notice.",422);
    // Consent is recorded only after an explicit same-origin submission by the verified identity.
    nonce=await createHostedSignupIntent(identity.email);
    const account=await resolveSupabaseAccount({...identity,displayName:input.data.displayName,registrationNonce:nonce});
    await abandonHostedSignupIntent(nonce);nonce=null;
    return Response.json({next:nextAuthDestination(account,input.data.returnTo)},{headers:{"Cache-Control":"private, no-store"}});
  }catch{return apiError("ACCOUNT_INCOMPLETE","Your account could not be completed. Your information is preserved; please try again.",503);}
  finally{if(nonce)await abandonHostedSignupIntent(nonce).catch(()=>undefined);}
}
