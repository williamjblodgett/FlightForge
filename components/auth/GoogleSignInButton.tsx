"use client";

import {useState} from "react";
import {useClientReady} from "@/components/player-tools/ReadyControls";

export function GoogleSignInButton({returnTo}:{returnTo:string}) {
  const ready=useClientReady();
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  async function start(){
    setBusy(true);setError("");
    try{
      const response=await fetch("/api/auth/google",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({returnTo})});
      const data=await response.json() as {url?:string;error?:{message?:string}};
      if(!response.ok||!data.url)throw new Error(data.error?.message||"Google sign-in is temporarily unavailable. You can still use your email and password.");
      window.location.assign(data.url);
    }catch(error){setError(error instanceof Error?error.message:"Google sign-in could not start. Try again.");setBusy(false);}
  }
  return <div className="google-signin"><button type="button" className="button button-secondary button-wide" disabled={!ready||busy} aria-busy={busy} onClick={()=>void start()}>{busy?"Opening Google…":"Continue with Google"}</button>{error?<p className="form-error" role="alert">{error}</p>:null}<p className="auth-divider">or use your email</p></div>;
}
