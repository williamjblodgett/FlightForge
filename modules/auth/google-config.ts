import {brand} from "@/config/brand";
import {getSupabaseConfiguration} from "@/lib/supabase/config";

/** Activation is explicit: merely having Supabase configured must not advertise Google. */
export function isGoogleSignInEnabled():boolean {
  try{return process.env.GOOGLE_SIGN_IN_ENABLED==="true"&&getSupabaseConfiguration()!==null;}catch{return false;}
}

export function googleCallbackOrigin():string {
  const url=new URL(process.env.NEXT_PUBLIC_APP_URL||`https://${brand.domain}`);
  if(url.username||url.password||url.search||url.hash||url.pathname!=="/")throw new Error("Invalid authentication origin.");
  if(url.protocol!=="https:"&&!(process.env.NODE_ENV!=="production"&&url.protocol==="http:"&&["localhost","127.0.0.1"].includes(url.hostname)))throw new Error("Authentication requires HTTPS.");
  return url.origin;
}

export function isSupabaseAuthorizeUrl(value:string):boolean {
  try{const configured=getSupabaseConfiguration();if(!configured)return false;const url=new URL(value);return url.origin===new URL(configured.url).origin&&url.pathname==="/auth/v1/authorize"&&url.searchParams.get("provider")==="google"&&!url.username&&!url.password;}catch{return false;}
}
