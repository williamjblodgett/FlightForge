"use client";

import { useState, useSyncExternalStore } from "react";
import { ShieldCheck } from "lucide-react";

const subscribeToHydration=()=>()=>{};

export function VerifyEmailForm({ token,returnTo="/profile" }: { token: string;returnTo?:string }) {
  const ready=useSyncExternalStore(subscribeToHydration,()=>true,()=>false);
  const [email,setEmail]=useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function verify() {
    if(busy)return;
    setBusy(true); setMessage("");
    try {
    const response = await fetch("/api/auth/verify-email", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token,returnTo }) });
    const body = await response.json() as { next?: string; error?: { message?: string } };
    if (response.ok) window.location.assign(body.next ?? "/onboarding");
    else { setMessage(body.error?.message ?? "The verification link could not be used."); setBusy(false); }
    }catch{setMessage("The connection failed. Try again or request a fresh link.");}finally{setBusy(false);}
  }
  async function resend(event:React.FormEvent){event.preventDefault();if(busy)return;setBusy(true);try{const response=await fetch("/api/auth/resend-verification",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,returnTo})});const body=await response.json() as {message?:string;error?:{message?:string}};setMessage(body.message??body.error?.message??"Try again shortly.");}catch{setMessage("Could not reach verification recovery. Retry shortly.");}finally{setBusy(false);}}

  return <section className="auth-card account-form"><ShieldCheck aria-hidden="true" /><h2>Confirm account ownership</h2><p>Continue only if you requested this FlightForge account.</p>{message ? <div className="form-error" role="alert">{message}</div> : null}{token?<button className="button button-primary button-wide" disabled={busy||!ready} onClick={verify}>{busy ? "Verifying…" : "Verify email and continue"}</button>:null}<form onSubmit={resend}><h3>Need a new link?</h3><label htmlFor="resend-email">Account email</label><input id="resend-email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} /><button className="button button-secondary button-wide" disabled={busy||!ready} type="submit">{busy?"Please wait…":"Request verification email"}</button></form></section>;
}
