"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => { if ("serviceWorker" in navigator && location.protocol === "https:") void navigator.serviceWorker.register("/sw.js", { scope: "/",updateViaCache:"none" }).catch(()=>{/* Explicit downloads surface installation errors to the player. */}); }, []);
  return null;
}
