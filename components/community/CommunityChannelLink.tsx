"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LoaderCircle, MessageCircle } from "lucide-react";
import { communityRequest, normalizeConversation } from "./api";
import styles from "./Community.module.css";

type Props = {
  contextType: "COURSE" | "EVENT";
  contextId: string;
  label?: string;
  className?: string;
  signedIn?: boolean;
};

export function CommunityChannelLink({ contextType, contextId, label = "Open community chat", className, signedIn = true }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const raw = await communityRequest<unknown>("/api/community/conversations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "PUBLIC_CHANNEL", contextType, contextId }),
      });
      const record = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
      const conversation = normalizeConversation(record.conversation ?? record.data ?? raw);
      if (!conversation.id) throw new Error("The community channel is not available yet.");
      router.push(`/messages/${encodeURIComponent(conversation.id)}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The community channel could not be opened.");
    } finally { setBusy(false); }
  }

  if (!signedIn) {
    const returnTo = `/community?context=${contextType.toLowerCase()}&id=${encodeURIComponent(contextId)}`;
    return <span className={styles.contextLinkWrap}><Link className={className ?? styles.contextLink} href={`/sign-in?return_to=${encodeURIComponent(returnTo)}`}><MessageCircle aria-hidden="true" />Sign in for chat</Link></span>;
  }
  return <span className={styles.contextLinkWrap}><button className={className ?? styles.contextLink} type="button" onClick={() => void open()} disabled={busy}>{busy ? <LoaderCircle className={styles.spin} aria-hidden="true" /> : <MessageCircle aria-hidden="true" />}{busy ? "Opening…" : label}</button>{error ? <span className={styles.contextLinkError} role="alert">{error}</span> : null}</span>;
}
