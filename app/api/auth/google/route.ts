import {z} from "zod";
import {apiError} from "@/lib/http/api-response";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {checkRateLimit,isSameOriginMutation,requestClientKey} from "@/lib/security/request-security";
import {authReturnPath} from "@/modules/auth/continuation";
import {googleCallbackOrigin,isGoogleSignInEnabled,isSupabaseAuthorizeUrl} from "@/modules/auth/google-config";

export async function POST(request:Request){
  if(!isSameOriginMutation(request))return apiError("ORIGIN_REJECTED","The sign-in request origin was rejected.",403);
  if(!isGoogleSignInEnabled())return apiError("GOOGLE_NOT_READY","Google sign-in is not available yet. Use your email and password.",503);
  try{
    const origin=googleCallbackOrigin();
    if(new URL(request.url).origin!==origin)return apiError("ORIGIN_REJECTED","Start Google sign-in from the FlightForge website.",403);
    const limit=await checkRateLimit("google-signin",requestClientKey(request),10,300);
    if(!limit.allowed)return apiError("RATE_LIMITED","Too many sign-in attempts. Please try again later.",429);
    const input=z.object({returnTo:z.string().max(2048).optional()}).safeParse(await request.json().catch(()=>null));
    if(!input.success)return apiError("VALIDATION_ERROR","The sign-in request is invalid.",422);
    const supabase=await createSupabaseServerClient();
    if(!supabase)throw new Error("Authentication unavailable");
    const next=authReturnPath(input.data.returnTo);
    const {data,error}=await supabase.auth.signInWithOAuth({provider:"google",options:{redirectTo:`${origin}/auth/google/callback?next=${encodeURIComponent(next)}`,skipBrowserRedirect:true,scopes:"openid email profile"}});
    if(error||!data.url||!isSupabaseAuthorizeUrl(data.url))throw new Error("OAuth initiation failed");
    return Response.json({url:data.url},{headers:{"Cache-Control":"private, no-store"}});
  }catch{return apiError("GOOGLE_UNAVAILABLE","Google sign-in could not start. Try again or use your email and password.",503);}
}
