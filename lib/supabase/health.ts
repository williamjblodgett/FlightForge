import {getSupabaseConfiguration} from "./config";
import {logError} from "@/lib/observability/logger";
export type AuthProviderHealth={status:"AVAILABLE"|"UNAVAILABLE"|"NOT_CONFIGURED";checkedAt:string};
let cache:{key:string;until:number;result:Promise<AuthProviderHealth>}|null=null;
export async function getAuthProviderHealth():Promise<AuthProviderHealth>{
  const checkedAt=new Date().toISOString();
  let config;try{config=getSupabaseConfiguration();}catch{return {status:"UNAVAILABLE",checkedAt};}
  if(!config)return {status:"NOT_CONFIGURED",checkedAt};
  const key=config.url+config.publishableKey;
  if(cache?.key===key&&cache.until>Date.now())return cache.result;
  const result=(async():Promise<AuthProviderHealth>=>{
    try{
      const response=await fetch(`${config.url.replace(/\/$/u,"")}/auth/v1/health`,{headers:{apikey:config.publishableKey},redirect:"error",signal:AbortSignal.timeout(3000)});
      if(!response.ok)throw Error("Authentication health check failed");
      return {status:"AVAILABLE",checkedAt};
    }catch{
      logError("auth.provider_unavailable",new Error("Authentication provider health check failed"));
      return {status:"UNAVAILABLE",checkedAt};
    }
  })();
  cache={key,until:Date.now()+60000,result};
  return result;
}
