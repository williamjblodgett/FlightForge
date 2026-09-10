"use client";

import { useState,useRef } from "react";
import { clearPrivatePacksOnSignOut,announceSignOut } from "@/modules/offline/store";
import { LogOut } from "lucide-react";

type Props = {
  variant?: "menu" | "header" | "standalone";
};

export function SignOutButton({ variant = "menu" }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lock=useRef(false);const [cleanupIssue,setCleanupIssue]=useState(false);
  async function signOut(force=false) {
    if(lock.current)return;lock.current=true;
    setBusy(true);
    setError(null);
    try {
      try{await clearPrivatePacksOnSignOut(force);}catch(error){if(!force){setCleanupIssue(true);throw error;}announceSignOut();}
      const response = await fetch("/api/auth/logout", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { accept: "application/json" },
      });
      if (!response.ok) throw new Error("Sign-out request rejected");
      window.location.assign("/");
    } catch(error) {
      setError(error instanceof Error?error.message:"Sign out could not be completed. Please try again.");
    } finally {
      lock.current=false;setBusy(false);
    }
  }

  return (
    <span className={`signout-control signout-control-${variant}`}>
      <button
        className={`profile-signout signout-${variant}`}
        type="button"
        onClick={()=>void signOut()}
        disabled={busy}
        aria-label={busy ? "Signing out" : "Sign out"}
      >
        {variant !== "menu" ? <LogOut size={17} aria-hidden="true" /> : null}
        <span>{busy ? "Signing out…" : "Sign out"}</span>
      </button>
      {cleanupIssue?<span className="signout-recovery"><a href="/downloads">Open Downloads</a><button type="button" disabled={busy} onClick={()=>void signOut(true)}>Sign out anyway; keep unsynced drafts on this device</button><small>Local cleanup may be incomplete. Use your own device and clear browser data only after saving your scores.</small></span>:null}
      {error ? <span className="signout-error" role="alert">{error}</span> : null}
    </span>
  );
}
