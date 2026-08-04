"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import type { AuthenticatedUser } from "@/modules/auth/types";

type Props = {
  source: AuthenticatedUser["source"];
  variant?: "menu" | "header" | "standalone";
};

export function SignOutButton({ source, variant = "menu" }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signOut() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/logout", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { accept: "application/json" },
      });
      if (!response.ok) throw new Error("Sign-out request rejected");
      window.location.assign(
        source === "chatgpt"
          ? "/signout-with-chatgpt?return_to=%2F"
          : "/",
      );
    } catch {
      setError("Sign out could not be completed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className={`signout-control signout-control-${variant}`}>
      <button
        className={`profile-signout signout-${variant}`}
        type="button"
        onClick={signOut}
        disabled={busy}
        aria-label={busy ? "Signing out" : "Sign out"}
      >
        {variant !== "menu" ? <LogOut size={17} aria-hidden="true" /> : null}
        <span>{busy ? "Signing out…" : "Sign out"}</span>
      </button>
      {error ? <span className="signout-error" role="alert">{error}</span> : null}
    </span>
  );
}
