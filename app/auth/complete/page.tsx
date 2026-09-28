import type {Metadata} from "next";
import {redirect} from "next/navigation";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {googleIdentityFromUser} from "@/modules/auth/google-identity";
import {authReturnPath,authStepPath,nextAuthDestination} from "@/modules/auth/continuation";
import {isGoogleSignInEnabled} from "@/modules/auth/google-config";
import {isRegistrationReady} from "@/modules/auth/registration-readiness";
import {getCurrentUser} from "@/modules/auth/current-user";
import {CompleteGoogleAccount} from "./CompleteGoogleAccount";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Finish your account",robots:{index:false,follow:false}};

export default async function CompleteAccountPage({searchParams}:{searchParams:Promise<{return_to?:string}>}){
  const returnTo=authReturnPath((await searchParams).return_to);
  if(!isGoogleSignInEnabled())redirect(authStepPath("/sign-in",returnTo));
  const client=await createSupabaseServerClient();
  const result=await client?.auth.getUser().catch(()=>null);
  const identity=googleIdentityFromUser(result?.data.user??null);
  if(!identity||result?.error)redirect(authStepPath("/sign-in",returnTo));
  const account=await getCurrentUser();
  if(account)redirect(nextAuthDestination(account,returnTo));
  return <main className="auth-page page-shell"><div className="auth-heading"><h1>Make yourself at home.</h1><p>Google confirmed your sign-in. Choose your player name, then set your information and privacy preferences.</p></div><CompleteGoogleAccount displayName={identity.displayName} returnTo={returnTo} registrationReady={isRegistrationReady()}/></main>;
}
