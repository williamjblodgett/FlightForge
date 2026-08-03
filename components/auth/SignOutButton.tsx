"use client";

import { useState } from "react";

export function SignOutButton() {
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "DELETE" });
      window.location.assign("/");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button className="profile-signout" type="button" onClick={signOut} disabled={busy}>
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
