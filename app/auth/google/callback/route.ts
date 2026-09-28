import {NextResponse} from "next/server";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {cookies} from "next/headers";
import {authReturnPath,authStepPath,nextAuthDestination} from "@/modules/auth/continuation";
import {googleCallbackOrigin,isGoogleSignInEnabled} from "@/modules/auth/google-config";
import {googleIdentityFromUser} from "@/modules/auth/google-identity";
import {ACCOUNT_SESSION_COOKIE,RegistrationConsentRequiredError,resolveSupabaseAccount,revokeAccountSession} from "@/modules/auth/account-repository";
import {DEMO_SESSION_COOKIE} from "@/modules/auth/demo-session";

export async function GET(request:Request){
  const url=new URL(request.url),next=authReturnPath(url.searchParams.get("next"));
  const origin=googleCallbackOrigin();
  const fail=(error:string)=>NextResponse.redirect(new URL(`/sign-in?error=${error}&return_to=${encodeURIComponent(next)}`,origin),{headers:{"Cache-Control":"private, no-store"}});
  if(!isGoogleSignInEnabled())return fail("google_unavailable");
  if(url.searchParams.has("error"))return fail("google_cancelled");
  const code=url.searchParams.get("code");
  if(!code||code.length>4096||url.searchParams.has("type")||url.searchParams.has("token_hash"))return fail("google_failed");
  const client=await createSupabaseServerClient();
  if(!client)return fail("google_unavailable");
  try{
    const flowId=url.searchParams.get("sb_flow_id");
    const exchange=await client.auth.exchangeCodeForSession(code,flowId?{flowId}:undefined);
    if(exchange.error||("redirectType" in exchange.data&&exchange.data.redirectType==="recovery"))throw new Error("Invalid Google confirmation");
    const {data,error}=await client.auth.getUser();
    const identity=googleIdentityFromUser(data.user);
    if(error||!identity)throw new Error("Verified Google identity required");
    let destination:string;
    try{destination=nextAuthDestination(await resolveSupabaseAccount(identity),next);}
    catch(error){if(!(error instanceof RegistrationConsentRequiredError))throw error;destination=authStepPath("/auth/complete",next);}
    const legacy=(await cookies()).get(ACCOUNT_SESSION_COOKIE)?.value;
    if(legacy)await revokeAccountSession(legacy);
    const response=NextResponse.redirect(new URL(destination,origin),{headers:{"Cache-Control":"private, no-store"}});
    for(const name of [ACCOUNT_SESSION_COOKIE,DEMO_SESSION_COOKIE])response.cookies.set(name,"",{path:"/",maxAge:0,httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax"});
    return response;
  }catch{await client.auth.signOut({scope:"local"}).catch(()=>undefined);return fail("google_failed");}
}
