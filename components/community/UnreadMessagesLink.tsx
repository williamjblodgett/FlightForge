"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { communityRequest,CommunityRequestError } from "./api";
import styles from "./Community.module.css";

export function UnreadMessagesLink() {
  const busy=useRef(false);
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    if(busy.current)return;busy.current=true;
    try{const result=await communityRequest<{unreadCount:number}>("/api/community/unread");setUnreadCount(Math.max(0,result.unreadCount));}
    catch(error){if(error instanceof CommunityRequestError&&(error.status===401||error.status===403))setUnreadCount(0);}
    finally{busy.current=false;}
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
