"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Ban,
  CalendarDays,
  Check,
  Flag,
  Hash,
  LoaderCircle,
  LockKeyhole,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { AccessibleDialog } from "./AccessibleDialog";
import { AdultCommunityGate } from "./AdultCommunityGate";
import { CommunityRequestError, communityRequest, loadCommunity, normalizeConversation } from "./api";
import type { CommunitySnapshot, ConversationSummary, PlayerSummary } from "./types";
import styles from "./Community.module.css";

type Props = {
  signedIn: boolean;
  viewerName?: string;
  initialContext?: { type: "COURSE" | "EVENT"; id: string };
};

type ActionTarget =
  | { kind: "BLOCK"; player: PlayerSummary }
  | { kind: "REPORT"; player: PlayerSummary }
  | null;

export function CommunityHub({ signedIn, viewerName, initialContext }: Props) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<CommunitySnapshot | null>(null);
  const [loading, setLoading] = useState(signedIn);
  const [error, setError] = useState<string | null>(null);
  const [featureDisabled, setFeatureDisabled] = useState(false);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionTarget, setActionTarget] = useState<ActionTarget>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const openedContextRef = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    if (!signedIn) return;
    setLoading(true);
    setError(null);
    try {
      setSnapshot(await loadCommunity());
      setFeatureDisabled(false);
    } catch (caught) {
      if (caught instanceof CommunityRequestError && caught.code === "FEATURE_DISABLED") setFeatureDisabled(true);
      else setError(caught instanceof Error ? caught.message : "The community board could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [signedIn]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  useEffect(() => {
    if (!signedIn || !snapshot?.viewer.adultAttested || !initialContext) return;
    const contextKey = `${initialContext.type}:${initialContext.id}`;
    if (openedContextRef.current === contextKey) return;
    openedContextRef.current = contextKey;
    setBusyId(`context:${contextKey}`);
    setNotice("Opening the requested community channel…");
    void communityRequest<unknown>("/api/community/conversations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "PUBLIC_CHANNEL", contextType: initialContext.type, contextId: initialContext.id }),
    }).then((raw) => {
      const record = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
      const conversation = normalizeConversation(record.conversation ?? record.data ?? raw);
      if (!conversation.id) throw new Error("The requested community channel is not available yet.");
      router.replace(`/messages/${encodeURIComponent(conversation.id)}`);
    }).catch((caught: unknown) => {
      setNotice(caught instanceof Error ? caught.message : "The requested community channel could not be opened.");
    }).finally(() => setBusyId(null));
  }, [initialContext, router, signedIn, snapshot?.viewer.adultAttested]);

  const filteredChannels = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!snapshot || !needle) return snapshot?.channels ?? [];
    return snapshot.channels.filter((channel) => `${channel.subject} ${channel.contextLabel ?? ""}`.toLocaleLowerCase().includes(needle));
  }, [query, snapshot]);

  const filteredPlayers = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!snapshot || !needle) return snapshot?.suggestedPlayers ?? [];
    return snapshot.suggestedPlayers.filter((player) => `${player.displayName} ${player.homeCity ?? ""} ${player.homeRegionCode ?? ""} ${player.experienceLevel ?? ""}`.toLocaleLowerCase().includes(needle));
  }, [query, snapshot]);

  async function openConversation(payload: Record<string, unknown>, busyKey: string) {
    setBusyId(busyKey);
    setNotice(null);
    try {
      const raw = await communityRequest<unknown>("/api/community/conversations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const record = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
      const conversation = normalizeConversation(record.conversation ?? record.data ?? raw);
      if (!conversation.id) throw new Error("The conversation was created without a destination.");
      router.push(`/messages/${encodeURIComponent(conversation.id)}`);
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "That conversation could not be opened.");
    } finally {
      setBusyId(null);
    }
  }

  async function openChannel(channel: ConversationSummary) {
    if (channel.joined) {
      router.push(`/messages/${encodeURIComponent(channel.id)}`);
      return;
    }
    setBusyId(channel.id);
    setNotice(null);
    try {
      await communityRequest(`/api/community/conversations/${encodeURIComponent(channel.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "JOIN" }),
      });
      router.push(`/messages/${encodeURIComponent(channel.id)}`);
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "That channel could not be joined.");
    } finally {
      setBusyId(null);
    }
  }

  async function updateConnection(player: PlayerSummary, action: "REQUEST" | "ACCEPT" | "DECLINE") {
    setBusyId(`connection:${player.id}`);
    setNotice(null);
    try {
      await communityRequest("/api/community/connections", {
        method: action === "REQUEST" ? "POST" : "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(action === "REQUEST" ? { targetUserId: player.id } : { connectionId: player.connectionId, action }),
      });
      setNotice(action === "REQUEST" ? `Connection request sent to ${player.displayName}.` : action === "ACCEPT" ? `${player.displayName} is now a connection.` : "Connection request declined.");
      await refresh();
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "The connection could not be updated.");
    } finally {
      setBusyId(null);
    }
  }

  async function submitSafetyAction(reason: string, details: string) {
    if (!actionTarget) return;
    setBusyId(`safety:${actionTarget.player.id}`);
    try {
      if (actionTarget.kind === "BLOCK") {
        await communityRequest("/api/community/blocks", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ blockedUserId: actionTarget.player.id }),
        });
        setNotice(`${actionTarget.player.displayName} is blocked in Community. You will not be able to message or connect with each other.`);
      } else {
        await communityRequest("/api/community/reports", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ targetType: "USER", targetId: actionTarget.player.id, category: reason, details: details || null }),
        });
        setNotice("Report received. FlightForge will review the information you shared.");
      }
      setActionTarget(null);
      await refresh();
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "That safety action could not be completed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className={styles.communityPage}>
      <section className={styles.communityHero}>
        <div className={styles.heroContours} aria-hidden="true"><i /><i /><i /></div>
        <div className={`page-shell ${styles.heroInner}`}>
          <div className={styles.heroCopy}>
            <span className={styles.kicker}>The FlightForge clubhouse</span>
            <h1>Find your people.<br /><em>Share the round.</em></h1>
            <p>Talk course conditions, coordinate a card, and stay connected to the players and events around you—with privacy controls that travel everywhere.</p>
            <div className={styles.heroActions}>
              {signedIn ? <button type="button" className={styles.primaryButton} onClick={() => searchRef.current?.focus()}><Search aria-hidden="true" />Explore the clubhouse</button> : <Link className={styles.primaryButton} href="/sign-up?return_to=/community">Create a free account<ArrowRight aria-hidden="true" /></Link>}
              <Link className={styles.secondaryButton} href="/legal/community-guidelines"><ShieldCheck aria-hidden="true" />How we keep play welcoming</Link>
            </div>
          </div>
          <aside className={styles.fieldNote} aria-label="Community access summary">
            <span>Field note / 001</span>
            <MessageCircle aria-hidden="true" />
            <strong>Open channels.<br />Private controls.</strong>
            <dl>
              <div><dt>Public spaces</dt><dd>Course, event & regional</dd></div>
              <div><dt>Direct chat</dt><dd>Your privacy decides</dd></div>
              <div><dt>Launch access</dt><dd>Adults 18+</dd></div>
            </dl>
          </aside>
        </div>
      </section>

      <div className={`page-shell ${styles.communityBody}`}>
        {!signedIn ? <SignedOutCommunity /> : loading ? <CommunityLoading /> : featureDisabled ? <FeaturePaused /> : error ? <CommunityError message={error} onRetry={refresh} /> : snapshot && !snapshot.viewer.adultAttested ? <AdultCommunityGate policyVersion={snapshot.viewer.policyVersion} onComplete={refresh} /> : snapshot ? (
          <>
            <header className={styles.boardHeader}>
              <div><span className={styles.kicker}>Player radio</span><h2>Welcome in{viewerName ? `, ${viewerName}` : ""}.</h2><p>Curated channels keep public conversation tied to real courses, events, and regions.</p></div>
              <label className={styles.communitySearch}>
                <Search aria-hidden="true" /><span className="sr-only">Search channels and players</span>
                <input ref={searchRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search players or channels" />
              </label>
            </header>
            {notice ? <p className={styles.notice} role="status">{notice}</p> : null}
            <section className={styles.clubhouseGrid}>
              <div className={styles.channelBoard}>
                <div className={styles.sectionHeading}><div><Hash aria-hidden="true" /><span><strong>Community channels</strong><small>Official spaces tied to play</small></span></div><Link href="/messages">Open inbox<ArrowRight aria-hidden="true" /></Link></div>
                {filteredChannels.length ? <div className={styles.channelList}>{filteredChannels.map((channel) => <ChannelCard key={channel.id} channel={channel} busy={busyId === channel.id} onOpen={() => void openChannel(channel)} />)}</div> : <EmptySearch label={query ? "No channels match that search." : "Community channels will appear as courses and events open their doors."} />}
              </div>
              <div className={styles.playerBoard}>
                <div className={styles.sectionHeading}><div><Users aria-hidden="true" /><span><strong>Players nearby</strong><small>Only profiles that allow discovery</small></span></div></div>
                {filteredPlayers.length ? <div className={styles.playerList}>{filteredPlayers.map((player) => <PlayerCard key={player.id} player={player} busy={busyId === `connection:${player.id}` || busyId === `message:${player.id}`} onConnect={(action) => void updateConnection(player, action)} onMessage={() => void openConversation({ type: "DIRECT", participantUserId: player.id }, `message:${player.id}`)} onBlock={() => setActionTarget({ kind: "BLOCK", player })} onReport={() => setActionTarget({ kind: "REPORT", player })} />)}</div> : <EmptySearch label={query ? "No players match that search." : "Players appear here when their profile and messaging preferences allow it."} />}
              </div>
            </section>
            <CommunityTrustStrip allowMessages={snapshot.viewer.allowMessages} />
          </>
        ) : null}
      </div>
      <SafetyDialog key={actionTarget ? `${actionTarget.kind}:${actionTarget.player.id}` : "closed"} target={actionTarget} busy={Boolean(busyId?.startsWith("safety:"))} onClose={() => setActionTarget(null)} onSubmit={submitSafetyAction} />
    </main>
  );
}

function SignedOutCommunity() {
  return <section className={styles.signedOutPanel}><LockKeyhole aria-hidden="true" /><div><span className={styles.kicker}>Sign-in required</span><h2>The clubhouse remembers your boundaries.</h2><p>Create a free profile or sign in to set who may contact you, enter adult community spaces, and keep every conversation attached to your account.</p></div><div><Link className={styles.primaryButton} href="/sign-in?return_to=/community">Sign in</Link><Link className={styles.secondaryButton} href="/sign-up?return_to=/community">Create account</Link></div></section>;
}

function CommunityLoading() {
  return <div className={styles.loadingPanel} role="status"><LoaderCircle className={styles.spin} aria-hidden="true" /><strong>Tuning the player radio…</strong><span>Loading your channels and privacy controls.</span></div>;
}

function FeaturePaused() {
  return <div className={styles.statePanel}><MessageCircle aria-hidden="true" /><span className={styles.kicker}>Community paused</span><h2>The clubhouse is temporarily closed.</h2><p>Your profile and existing data are unchanged. Check back after the safety crew finishes its work.</p><Link className={styles.secondaryButton} href="/courses">Find a course</Link></div>;
}

function CommunityError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className={styles.statePanel}><span className={styles.kicker}>Signal lost</span><h2>The clubhouse did not load.</h2><p>{message}</p><button className={styles.secondaryButton} type="button" onClick={onRetry}>Try again</button></div>;
}

function ChannelCard({ channel, busy, onOpen }: { channel: ConversationSummary; busy: boolean; onOpen: () => void }) {
  const Icon = channel.contextType === "EVENT" ? CalendarDays : channel.contextType === "COURSE" ? MapPin : Hash;
  return <article className={styles.channelCard}><div className={styles.channelIcon}><Icon aria-hidden="true" /></div><div className={styles.channelCopy}><div><span>{channel.contextType ? readable(channel.contextType) : "Community"}</span>{channel.unreadCount ? <b>{channel.unreadCount > 99 ? "99+" : channel.unreadCount} new</b> : null}</div><h3>{channel.subject}</h3><p>{channel.lastMessage ? `${channel.lastMessage.senderDisplayName}: ${channel.lastMessage.body}` : `${channel.memberCount} ${channel.memberCount === 1 ? "player" : "players"} listening`}</p></div><button type="button" onClick={onOpen} disabled={busy} aria-label={`${channel.joined ? "Open" : "Join"} ${channel.subject}`}>{busy ? <LoaderCircle className={styles.spin} aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}</button></article>;
}

function PlayerCard({ player, busy, onConnect, onMessage, onBlock, onReport }: { player: PlayerSummary; busy: boolean; onConnect: (action: "REQUEST" | "ACCEPT" | "DECLINE") => void; onMessage: () => void; onBlock: () => void; onReport: () => void }) {
  return <article className={styles.playerCard}><span className={styles.playerAvatar} aria-hidden="true">{player.initials}</span><div className={styles.playerCopy}><h3>{player.displayName}</h3><p>{[player.homeCity, player.homeRegionCode, player.experienceLevel ? readable(player.experienceLevel) : null].filter(Boolean).join(" · ") || "Player profile"}</p>{player.sharedConnectionCount ? <small>{player.sharedConnectionCount} mutual {player.sharedConnectionCount === 1 ? "connection" : "connections"}</small> : null}</div><div className={styles.playerActions}>{player.canMessage ? <button type="button" onClick={onMessage} disabled={busy}><MessageCircle aria-hidden="true" /><span>Message</span></button> : null}{player.connectionState === "CONNECTED" ? <span className={styles.connected}><Check aria-hidden="true" />Connected</span> : player.connectionState === "PENDING_SENT" ? <span className={styles.pending}>Request sent</span> : player.connectionState === "PENDING_RECEIVED" ? <><button type="button" onClick={() => onConnect("ACCEPT")} disabled={busy}><Check aria-hidden="true" /><span>Accept</span></button><button type="button" onClick={() => onConnect("DECLINE")} disabled={busy}><span>Decline</span></button></> : <button type="button" onClick={() => onConnect("REQUEST")} disabled={busy}><UserPlus aria-hidden="true" /><span>Connect</span></button>}<details className={styles.playerMenu}><summary aria-label={`Safety options for ${player.displayName}`}>•••</summary><div><button type="button" onClick={onBlock}><Ban aria-hidden="true" />Block</button><button type="button" onClick={onReport}><Flag aria-hidden="true" />Report</button></div></details></div></article>;
}

function EmptySearch({ label }: { label: string }) {
  return <div className={styles.emptyList}><Search aria-hidden="true" /><p>{label}</p></div>;
}

function CommunityTrustStrip({ allowMessages }: { allowMessages: CommunitySnapshot["viewer"]["allowMessages"] }) {
  const preference = allowMessages === "EVERYONE" ? "Any adult community member may request a conversation." : allowMessages === "NO_ONE" ? "Direct messages are off." : "Only your connections may message you.";
  return <section className={styles.trustStrip} aria-label="Your community privacy"><ShieldCheck aria-hidden="true" /><div><strong>Your boundaries are active</strong><p>{preference} Blocks always override every other setting.</p></div><Link href="/profile">Review privacy settings<ArrowRight aria-hidden="true" /></Link></section>;
}

function SafetyDialog({ target, busy, onClose, onSubmit }: { target: ActionTarget; busy: boolean; onClose: () => void; onSubmit: (reason: string, details: string) => Promise<void> }) {
  const [reason, setReason] = useState("HARASSMENT");
  const [details, setDetails] = useState("");
  if (!target) return null;
  const isBlock = target.kind === "BLOCK";
  return <AccessibleDialog open title={`${isBlock ? "Block" : "Report"} ${target.player.displayName}`} description={isBlock ? "Blocking prevents Community messages and connection requests between both accounts. The player is also hidden from your Community suggestions." : "Reports are private. Share only details that help the safety team understand what happened."} onClose={onClose}><form className={styles.dialogForm} onSubmit={(event) => { event.preventDefault(); void onSubmit(reason, details); }}>{!isBlock ? <><label><span>Reason</span><select value={reason} onChange={(event) => setReason(event.target.value)}><option value="HARASSMENT">Harassment or bullying</option><option value="THREAT">Threat or unsafe behavior</option><option value="HATE">Hateful content</option><option value="SPAM">Spam or scam</option><option value="IMPERSONATION">Impersonation</option><option value="OTHER">Something else</option></select></label><label><span>What should the safety team know? · optional</span><textarea rows={4} maxLength={1000} value={details} onChange={(event) => setDetails(event.target.value)} /></label></> : null}<div className={styles.dialogActions}><button type="button" className={styles.secondaryButton} onClick={onClose}>Cancel</button><button type="submit" className={isBlock ? styles.dangerButton : styles.primaryButton} disabled={busy}>{busy ? "Saving…" : isBlock ? "Block player" : "Send report"}</button></div></form></AccessibleDialog>;
}

function readable(value: string): string {
  return value.toLocaleLowerCase().replaceAll("_", " ").replace(/^\p{L}/u, (letter) => letter.toLocaleUpperCase());
}
