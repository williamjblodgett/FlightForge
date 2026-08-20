"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { loadCommunity } from "./api";
import styles from "./Community.module.css";

export function UnreadMessagesLink() {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    try { setUnreadCount((await loadCommunity()).viewer.unreadCount); }
    catch { /* The inbox itself presents sign-in, feature, and connection errors. */ }
  }, []);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => { void refresh(); }, 0);
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 30_000);
    window.addEventListener("flightforge:unread-changed", refresh);
    return () => { window.clearTimeout(initialTimer); window.clearInterval(timer); window.removeEventListener("flightforge:unread-changed", refresh); };
  }, [refresh]);

  const label = unreadCount ? `Messages, ${unreadCount} unread` : "Messages";
  return <Link className={`${styles.headerMessageLink} ${pathname.startsWith("/messages") ? styles.headerMessageActive : ""}`} href="/messages" aria-label={label} aria-current={pathname.startsWith("/messages") ? "page" : undefined}><MessageCircle aria-hidden="true" />{unreadCount ? <span aria-hidden="true">{unreadCount > 99 ? "99+" : unreadCount}</span> : null}</Link>;
}
