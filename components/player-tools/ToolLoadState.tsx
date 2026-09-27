"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {authStepPath} from "@/modules/auth/continuation";
export function ToolLoadState({loading,error,errorStatus,onRetry,label,hasData=false}:{loading:boolean;error:string;errorStatus?:number;onRetry:()=>unknown;label:string;hasData?:boolean}) {
  const pathname=usePathname();
  if(loading)return <p role="status" className="tool-load-status">{hasData?"Refreshing":"Loading"} {label}…</p>;
  if(!error)return null;
  return <section className="feature-card tool-load-error"><p role="alert">{error}</p>{hasData?<p>Previously loaded information is shown below. Refresh before making more changes.</p>:null}{errorStatus===401?<Link className="button button-primary" href={authStepPath("/sign-in",pathname)}>Sign in to continue</Link>:<button type="button" onClick={()=>void onRetry()}>Retry loading {label}</button>}</section>;
}
