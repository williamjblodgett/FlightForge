import {verificationJobStatement,acknowledgeVerificationDelivery} from "@/modules/notifications/verification-outbox";
import { z } from "zod";
import { getD1Database } from "@/db/runtime";
import { apiError } from "@/lib/http/api-response";
import { checkRateLimit,isSameOriginMutation,requestClientKey } from "@/lib/security/request-security";
import { createEmailVerificationToken,ensureAccountSchema } from "@/modules/auth/account-repository";
import { authReturnPath } from "@/modules/auth/continuation";
import { sendEmailVerification,isEmailVerificationDeliveryConfigured } from "@/modules/notifications/email-verification";
import { registrationUsesHostedAuth } from "@/modules/auth/registration-readiness";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { legalPolicyVersions } from "@/config/public-launch";

export async function POST(request:Request){
  if(!isSameOriginMutation(request))return apiError("ORIGIN_REJECTED","The verification request origin was rejected.",403);
  const input=z.object({email:z.email().transform(v=>v.trim().toLowerCase()),returnTo:z.string().max(2048).optional()}).safeParse(await request.json().catch(()=>null));
  if(!input.success)return apiError("VALIDATION_ERROR","Enter a valid email address.",422);
  try{
    const ip=await checkRateLimit("verification-resend-ip",requestClientKey(request),6,900);
    const email=await checkRateLimit("verification-resend-email",input.data.email,3,900);
    if(!ip.allowed||!email.allowed)return apiError("RATE_LIMITED","Please wait before requesting another link.",429);
    await ensureAccountSchema();
    const db=getD1Database();
    const pending=await db.prepare("SELECT id,email,display_name AS displayName FROM users WHERE email = ? AND status = 'PENDING_EMAIL_VERIFICATION' AND email_verified_at IS NULL AND password_hash IS NOT NULL AND auth_provider_subject IS NULL AND deleted_at IS NULL LIMIT 1").bind(input.data.email).first<{id:string;email:string;displayName:string}>();
    const returnTo=authReturnPath(input.data.returnTo),origin=new URL(request.url).origin;
    if(pending&&isEmailVerificationDeliveryConfigured()){
      await verificationJobStatement(db,pending.id,origin,returnTo).run();
      const token=await createEmailVerificationToken(pending.id,true);
      await sendEmailVerification({...pending,token,origin,returnTo}).then(()=>acknowledgeVerificationDelivery(db,pending.id)).catch(()=>undefined);
    }else if(registrationUsesHostedAuth()){
      const versions=legalPolicyVersions();
      const intent=versions?await db.prepare("SELECT nonce FROM hosted_signup_intents WHERE email = ? AND consumed_at IS NULL AND expires_at > ? AND terms_version = ? AND privacy_version = ? LIMIT 1").bind(input.data.email,new Date().toISOString(),versions.terms,versions.privacy).first():null;
      if(intent){const supabase=await createSupabaseServerClient();await supabase?.auth.resend({type:"signup",email:input.data.email,options:{emailRedirectTo:origin+"/auth/callback?next="+encodeURIComponent(returnTo)}});}
    }
    return Response.json({message:"If this address has an eligible pending account, a new verification email has been requested. Check spam too. If an old signup has expired, start signup again to review the current terms."},{status:202,headers:{"Cache-Control":"private, no-store"}});
  }catch{return apiError("VERIFICATION_UNAVAILABLE","Verification recovery is temporarily unavailable. Please try again shortly.",503);}
}
