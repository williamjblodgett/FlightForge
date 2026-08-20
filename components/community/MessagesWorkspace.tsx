"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  Ban,
  BellOff,
  BellRing,
  ChevronLeft,
  Flag,
  Hash,
  Inbox,
  LoaderCircle,
  LockKeyhole,
  MessageCircle,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Users,
  WifiOff,
} from "lucide-react";
import { AccessibleDialog } from "./AccessibleDialog";
import { AdultCommunityGate } from "./AdultCommunityGate";
import {
  CommunityRequestError,
  communityRequest,
  loadCommunity,
  loadMessages,
  normalizeConversation,
  normalizeMessage,
} from "./api";
import type { CommunityMessage, CommunitySnapshot, ConversationSummary, PlayerSummary } from "./types";
import styles from "./Community.module.css";

type Props = {
  initialConversationId?: string;
  viewerId: string;
  viewerName: string;
};

type SafetyAction =
  | { kind: "REPORT_CONVERSATION"; conversation: ConversationSummary }
  | { kind: "REPORT_MESSAGE"; conversation: ConversationSummary; message: CommunityMessage }
  | { kind: "BLOCK"; conversation: ConversationSummary }
  | { kind: "LEAVE"; conversation: ConversationSummary }
  | null;

export function MessagesWorkspace({ initialConversationId, viewerId, viewerName }: Props) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<CommunitySnapshot | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(Boolean(initialConversationId));
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [featureDisabled, setFeatureDisabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [draft, setDraft] = useState(() => initialConversationId && typeof window !== "undefined" ? window.localStorage.getItem(draftKey(initialConversationId, viewerId)) ?? "" : "");
  const [sending, setSending] = useState(false);
  const [online, setOnline] = useState(true);
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [safetyAction, setSafetyAction] = useState<SafetyAction>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const latestReadRef = useRef<string | null>(null);
  const historyPagingStartedRef = useRef(false);
  const selectedId = initialConversationId ?? null;

  const selectedConversation = useMemo(() => {
    const conversation = conversations.find((item) => item.id === selectedId) ?? null;
    if (!conversation || conversation.otherParticipantUserId) return conversation;
    const otherMessage = messages.find((message) => !message.isOwn);
    return otherMessage ? { ...conversation, otherParticipantUserId: otherMessage.senderUserId } : conversation;
  }, [conversations, messages, selectedId]);

  const loadInbox = useCallback(async () => {
    setError(null);
    try {
      const community = await loadCommunity();
      setSnapshot(community);
      setConversations(uniqueConversations([...community.conversations, ...community.channels.filter((channel) => channel.joined)]));
      setFeatureDisabled(false);
    } catch (caught) {
      if (caught instanceof CommunityRequestError && caught.code === "FEATURE_DISABLED") setFeatureDisabled(true);
      else setError(caught instanceof Error ? caught.message : "Your messages could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  const markRead = useCallback(async (conversationId: string, messageId: string) => {
    if (latestReadRef.current === messageId || document.visibilityState !== "visible") return;
    latestReadRef.current = messageId;
    try {
      await communityRequest(`/api/community/conversations/${encodeURIComponent(conversationId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "READ", messageId }),
      });
      setConversations((current) => current.map((conversation) => conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation));
      window.dispatchEvent(new CustomEvent("flightforge:unread-changed", { detail: { delta: 0 } }));
    } catch {
      latestReadRef.current = null;
    }
  }, []);

  const loadThread = useCallback(async (silent = false) => {
    if (!selectedId || snapshot && !snapshot.viewer.adultAttested) return;
    if (!silent) setThreadLoading(true);
    if (!silent) setThreadError(null);
    try {
      const page = await loadMessages(selectedId);
      setMessages((current) => silent ? mergeMessages(current, page.messages) : page.messages);
      setNextCursor((current) => silent && historyPagingStartedRef.current ? current : page.nextCursor);
      if (page.conversation) setConversations((current) => uniqueConversations([page.conversation!, ...current]));
      const latest = page.messages.at(-1);
      if (latest) void markRead(selectedId, latest.id);
    } catch (caught) {
      if (!silent) setThreadError(caught instanceof Error ? caught.message : "This conversation could not be loaded.");
    } finally {
      if (!silent) setThreadLoading(false);
    }
  }, [markRead, selectedId, snapshot]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadInbox(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadInbox]);
  useEffect(() => {
    if (!snapshot?.viewer.adultAttested || !selectedId) return;
    const timer = window.setTimeout(() => { void loadThread(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadThread, selectedId, snapshot?.viewer.adultAttested]);

  useEffect(() => {
    if (!selectedId || !snapshot?.viewer.adultAttested) return;
    const poll = window.setInterval(() => { if (document.visibilityState === "visible" && navigator.onLine) void loadThread(true); }, 4000);
    return () => window.clearInterval(poll);
  }, [loadThread, selectedId, snapshot?.viewer.adultAttested]);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    if (draft) window.localStorage.setItem(draftKey(selectedId, viewerId), draft);
    else window.localStorage.removeItem(draftKey(selectedId, viewerId));
  }, [draft, selectedId, viewerId]);

  useEffect(() => {
    const transcript = transcriptRef.current;
    if (!transcript || threadLoading) return;
    transcript.scrollTop = transcript.scrollHeight;
  }, [selectedId, threadLoading]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!selectedId || body.length < 1 || body.length > 2000 || sending) return;
    if (!online) { setStatus("You are offline. Your draft is saved on this device and has not been sent."); return; }
    const idempotencyKey = createId();
    const optimistic: CommunityMessage = {
      id: `pending:${idempotencyKey}`,
      conversationId: selectedId,
      senderUserId: "current",
      senderDisplayName: viewerName,
      body,
      state: "PENDING",
      createdAt: new Date().toISOString(),
      updatedAt: null,
      isOwn: true,
      pending: true,
    };
    setSending(true);
    setDraft("");
    setStatus("Sending…");
    setMessages((current) => [...current, optimistic]);
    try {
      const raw = await communityRequest<unknown>(`/api/community/conversations/${encodeURIComponent(selectedId)}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json", "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({ body }),
      });
      const record = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
      const saved = normalizeMessage(record.message ?? record.data ?? raw);
      setMessages((current) => mergeMessages(current.filter((message) => message.id !== optimistic.id && message.id !== saved.id), [saved]));
      setStatus(saved.state === "QUARANTINED" ? "Your message is being checked before it appears to others." : "Sent.");
      window.localStorage.removeItem(draftKey(selectedId, viewerId));
      void loadInbox();
    } catch (caught) {
      setMessages((current) => current.filter((message) => message.id !== optimistic.id));
      setDraft(body);
      setStatus(caught instanceof Error ? `${caught.message} Your draft was restored.` : "The message was not sent. Your draft was restored.");
    } finally {
      setSending(false);
      composerRef.current?.focus();
    }
  }

  async function loadOlderMessages() {
    if (!selectedId || !nextCursor || loadingOlder) return;
    historyPagingStartedRef.current = true;
    const transcript = transcriptRef.current;
    const previousHeight = transcript?.scrollHeight ?? 0;
    setLoadingOlder(true);
    try {
      const page = await loadMessages(selectedId, nextCursor);
      setMessages((current) => mergeMessages(page.messages, current));
      setNextCursor(page.nextCursor);
      requestAnimationFrame(() => { if (transcript) transcript.scrollTop = transcript.scrollHeight - previousHeight; });
    } catch (caught) {
      setStatus(caught instanceof Error ? caught.message : "Earlier messages could not be loaded.");
    } finally {
      setLoadingOlder(false);
    }
  }

  async function conversationAction(action: "MUTE" | "UNMUTE" | "LEAVE") {
    if (!selectedConversation) return;
    setActionBusy(true);
    try {
      await communityRequest(`/api/community/conversations/${encodeURIComponent(selectedConversation.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (action === "LEAVE") {
        setSafetyAction(null);
        router.push("/messages");
      } else {
        setConversations((current) => current.map((conversation) => conversation.id === selectedConversation.id ? { ...conversation, muted: action === "MUTE" } : conversation));
        setStatus(action === "MUTE" ? "Conversation muted." : "Conversation notifications restored.");
      }
    } catch (caught) {
      setStatus(caught instanceof Error ? caught.message : "The conversation could not be updated.");
    } finally {
      setActionBusy(false);
    }
  }

  async function submitSafetyAction(reason: string, details: string) {
    if (!safetyAction) return;
    setActionBusy(true);
    try {
      if (safetyAction.kind === "LEAVE") {
        await conversationAction("LEAVE");
        return;
      }
      if (safetyAction.kind === "BLOCK") {
        if (!safetyAction.conversation.otherParticipantUserId) throw new Error("The player could not be identified.");
        await communityRequest("/api/community/blocks", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ blockedUserId: safetyAction.conversation.otherParticipantUserId }),
        });
        setStatus("Player blocked. This conversation is no longer available for contact.");
        setSafetyAction(null);
        router.push("/messages");
        return;
      }
      const targetType = safetyAction.kind === "REPORT_MESSAGE" ? "MESSAGE" : "CONVERSATION";
      const targetId = safetyAction.kind === "REPORT_MESSAGE" ? safetyAction.message.id : safetyAction.conversation.id;
      await communityRequest("/api/community/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetType, targetId, conversationId: safetyAction.conversation.id, category: reason, details: details || null }),
      });
      setStatus("Report received. The safety team can review the relevant conversation context.");
      setSafetyAction(null);
    } catch (caught) {
      setStatus(caught instanceof Error ? caught.message : "That safety action could not be completed.");
    } finally {
      setActionBusy(false);
    }
  }

  if (loading) return <MessagesLoading />;
  if (featureDisabled) return <MessagesState icon={<MessageCircle aria-hidden="true" />} title="Messages are temporarily paused" message="Your saved conversations are unchanged while the community team completes its checks." />;
  if (error) return <MessagesState icon={<WifiOff aria-hidden="true" />} title="The inbox could not connect" message={error} action={<button type="button" className={styles.secondaryButton} onClick={() => { setLoading(true); void loadInbox(); }}>Try again</button>} />;
  if (snapshot && !snapshot.viewer.adultAttested) return <main className={`page-shell ${styles.messagesGatePage}`}><AdultCommunityGate policyVersion={snapshot.viewer.policyVersion} onComplete={() => { setLoading(true); void loadInbox(); }} /></main>;

  return (
    <main className={styles.messagesPage}>
      <div className={`${styles.messagesWorkspace} ${selectedId ? styles.hasThread : styles.noThread}`}>
        <aside className={styles.inboxSidebar} aria-label="Conversation list">
          <header className={styles.inboxHeader}><div><span className={styles.kicker}>Player radio</span><h1>Messages</h1></div><button type="button" onClick={() => setNewDialogOpen(true)} aria-label="Start a new conversation"><Plus aria-hidden="true" /></button></header>
          <label className={styles.inboxSearch}><Search aria-hidden="true" /><span className="sr-only">Search conversations</span><input type="search" placeholder="Search your inbox" onChange={(event) => filterConversationList(event.currentTarget.value)} /></label>
          <div className={styles.inboxMeta}><span>{conversations.reduce((sum, conversation) => sum + conversation.unreadCount, 0)} unread</span><Link href="/community">Find players & channels</Link></div>
          <nav className={styles.conversationList} aria-label="Your conversations">
            {conversations.length ? conversations.map((conversation) => <ConversationItem key={conversation.id} conversation={conversation} selected={conversation.id === selectedId} />) : <div className={styles.inboxEmpty}><Inbox aria-hidden="true" /><strong>Your inbox is ready</strong><p>Find a player or join a curated channel to start talking.</p><Link className={styles.secondaryButton} href="/community">Open community</Link></div>}
          </nav>
          <footer className={styles.inboxSafety}><ShieldCheck aria-hidden="true" /><span>Blocks and message privacy are checked before every send.</span></footer>
        </aside>

        <section className={styles.threadPanel} aria-label={selectedConversation ? `Conversation with ${selectedConversation.subject}` : "Selected conversation"}>
          {!selectedId ? <NoThread /> : threadLoading ? <div className={styles.threadLoading} role="status"><LoaderCircle className={styles.spin} aria-hidden="true" />Loading conversation…</div> : threadError ? <div className={styles.threadState}><WifiOff aria-hidden="true" /><h2>Conversation unavailable</h2><p>{threadError}</p><button className={styles.secondaryButton} type="button" onClick={() => void loadThread()}>Try again</button></div> : selectedConversation ? <>
            <ThreadHeader conversation={selectedConversation} onMute={() => void conversationAction(selectedConversation.muted ? "UNMUTE" : "MUTE")} onLeave={() => setSafetyAction({ kind: "LEAVE", conversation: selectedConversation })} onBlock={() => setSafetyAction({ kind: "BLOCK", conversation: selectedConversation })} onReport={() => setSafetyAction({ kind: "REPORT_CONVERSATION", conversation: selectedConversation })} />
            <div className={styles.transcript} ref={transcriptRef} tabIndex={0} aria-label={`${selectedConversation.subject} messages`}>
              {nextCursor ? <button className={styles.loadOlder} type="button" onClick={() => void loadOlderMessages()} disabled={loadingOlder}>{loadingOlder ? <LoaderCircle className={styles.spin} aria-hidden="true" /> : <ArrowDown aria-hidden="true" />}{loadingOlder ? "Loading…" : "Load earlier messages"}</button> : null}
              {messages.length ? <div className={styles.messageStack}>{messages.map((message) => <MessageBubble key={message.id} message={message} onChanged={(changed) => setMessages((current) => current.map((item) => item.id === changed.id ? changed : item))} onReport={() => setSafetyAction({ kind: "REPORT_MESSAGE", conversation: selectedConversation, message })} />)}</div> : <div className={styles.threadEmpty}><MessageCircle aria-hidden="true" /><strong>Start the conversation</strong><p>Keep personal details private and make every course feel welcoming.</p></div>}
            </div>
            <form className={styles.composer} onSubmit={sendMessage}>
              {!online ? <div className={styles.offlineBanner}><WifiOff aria-hidden="true" />Offline · your draft stays on this device</div> : null}
              <label><span className="sr-only">Message {selectedConversation.subject}</span><textarea ref={composerRef} rows={2} maxLength={2000} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => submitOnEnter(event, event.currentTarget.form)} placeholder={`Message ${selectedConversation.subject}`} /></label>
              <div><small>{draft.length}/2,000</small><button type="submit" disabled={sending || !online || !draft.trim()} aria-label="Send message">{sending ? <LoaderCircle className={styles.spin} aria-hidden="true" /> : <Send aria-hidden="true" />}</button></div>
            </form>
            <p className={styles.messageStatus} role="status">{status}</p>
          </> : <div className={styles.threadState}><LockKeyhole aria-hidden="true" /><h2>Conversation not found</h2><p>It may have been removed, or you may no longer be a member.</p><Link className={styles.secondaryButton} href="/messages">Return to inbox</Link></div>}
        </section>
      </div>
      <NewConversationDialog key={newDialogOpen ? "open" : "closed"} open={newDialogOpen} players={snapshot?.suggestedPlayers ?? []} onClose={() => setNewDialogOpen(false)} onCreated={(conversation) => { setNewDialogOpen(false); router.push(`/messages/${encodeURIComponent(conversation.id)}`); }} />
      <ThreadSafetyDialog key={safetyAction ? `${safetyAction.kind}:${safetyAction.conversation.id}` : "closed"} action={safetyAction} busy={actionBusy} onClose={() => setSafetyAction(null)} onSubmit={submitSafetyAction} />
    </main>
  );

  function filterConversationList(value: string) {
    const needle = value.trim().toLocaleLowerCase();
    const all = uniqueConversations([...(snapshot?.conversations ?? []), ...(snapshot?.channels.filter((channel) => channel.joined) ?? [])]);
    setConversations(needle ? all.filter((conversation) => `${conversation.subject} ${conversation.lastMessage?.body ?? ""}`.toLocaleLowerCase().includes(needle)) : all);
  }
}

function ConversationItem({ conversation, selected }: { conversation: ConversationSummary; selected: boolean }) {
  const Icon = conversation.type === "PUBLIC_CHANNEL" ? Hash : conversation.type === "PRIVATE_GROUP" ? Users : MessageCircle;
  return <Link className={`${styles.conversationItem} ${selected ? styles.selected : ""}`} href={`/messages/${encodeURIComponent(conversation.id)}`} aria-current={selected ? "page" : undefined}><span className={styles.conversationAvatar}><Icon aria-hidden="true" /></span><span className={styles.conversationCopy}><span><strong>{conversation.subject}</strong><time>{relativeTime(conversation.updatedAt)}</time></span><small>{conversation.lastMessage ? `${conversation.lastMessage.senderDisplayName}: ${conversation.lastMessage.body}` : conversation.type === "PUBLIC_CHANNEL" ? `${conversation.memberCount} players` : "No messages yet"}</small></span>{conversation.muted ? <BellOff className={styles.mutedIcon} aria-label="Muted" /> : null}{conversation.unreadCount ? <b className={styles.unreadBadge}>{conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}</b> : null}</Link>;
}

function ThreadHeader({ conversation, onMute, onLeave, onBlock, onReport }: { conversation: ConversationSummary; onMute: () => void; onLeave: () => void; onBlock: () => void; onReport: () => void }) {
  return <header className={styles.threadHeader}><Link className={styles.mobileInboxBack} href="/messages" aria-label="Back to inbox"><ChevronLeft aria-hidden="true" /></Link><span className={styles.threadAvatar}>{conversation.type === "PUBLIC_CHANNEL" ? <Hash aria-hidden="true" /> : conversation.type === "PRIVATE_GROUP" ? <Users aria-hidden="true" /> : <MessageCircle aria-hidden="true" />}</span><div><h2>{conversation.subject}</h2><p>{conversation.type === "PUBLIC_CHANNEL" ? `${conversation.memberCount} players · curated ${conversation.contextType?.toLocaleLowerCase() ?? "community"} channel` : conversation.type === "PRIVATE_GROUP" ? `${conversation.memberCount} members · private group` : "Direct conversation"}</p></div><div className={styles.threadActions}><button type="button" onClick={onMute}>{conversation.muted ? <BellRing aria-hidden="true" /> : <BellOff aria-hidden="true" />}<span>{conversation.muted ? "Unmute" : "Mute"}</span></button><details><summary aria-label={`More options for ${conversation.subject}`}>•••</summary><div>{conversation.canBlock ? <button type="button" onClick={onBlock}><Ban aria-hidden="true" />Block player</button> : null}<button type="button" onClick={onReport}><Flag aria-hidden="true" />Report</button>{conversation.canLeave ? <button type="button" onClick={onLeave}>Leave conversation</button> : null}</div></details></div></header>;
}

function MessageBubble({ message, onChanged, onReport }: { message: CommunityMessage; onChanged: (message: CommunityMessage) => void; onReport: () => void }) {
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(message.body);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [withinEditWindow] = useState(() => Date.now() - Date.parse(message.createdAt) <= 15 * 60 * 1000);
  const tombstone = message.state === "DELETED" || message.state === "REMOVED";
  const canEdit = message.isOwn && !message.pending && !tombstone && withinEditWindow;
  const canDelete = message.isOwn && !message.pending && !tombstone;

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = editBody.trim();
    if (!body || body.length > 2000 || busy) return;
    setBusy(true); setError(null);
    try {
      const raw = await communityRequest<unknown>(`/api/community/conversations/${encodeURIComponent(message.conversationId)}/messages/${encodeURIComponent(message.id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ body }) });
      const record = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
      onChanged(normalizeMessage(record.message ?? record.data ?? raw));
      setEditing(false);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The message could not be edited."); }
    finally { setBusy(false); }
  }

  async function deleteMessage() {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      await communityRequest(`/api/community/conversations/${encodeURIComponent(message.conversationId)}/messages/${encodeURIComponent(message.id)}`, { method: "DELETE" });
      onChanged({ ...message, body: "", state: "DELETED", updatedAt: new Date().toISOString() });
      setDeleteOpen(false);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The message could not be deleted."); }
    finally { setBusy(false); }
  }

  return <article className={`${styles.messageBubble} ${message.isOwn ? styles.ownMessage : ""} ${message.pending ? styles.pendingMessage : ""}`}><div className={styles.messageMeta}><strong>{message.isOwn ? "You" : message.senderDisplayName}</strong><time dateTime={message.createdAt}>{formatMessageTime(message.createdAt)}</time>{message.updatedAt ? <span>edited</span> : null}{!message.isOwn && !tombstone ? <button type="button" onClick={onReport} aria-label={`Report message from ${message.senderDisplayName}`}><Flag aria-hidden="true" /></button> : null}</div>{editing ? <form className={styles.inlineEditor} onSubmit={saveEdit}><label><span className="sr-only">Edit message</span><textarea rows={3} maxLength={2000} value={editBody} onChange={(event) => setEditBody(event.target.value)} /></label>{error ? <span role="alert">{error}</span> : null}<div><button type="button" onClick={() => { setEditing(false); setEditBody(message.body); setError(null); }}>Cancel</button><button type="submit" disabled={busy || !editBody.trim()}>{busy ? "Saving…" : "Save edit"}</button></div></form> : <p className={tombstone ? styles.tombstone : ""}>{message.state === "DELETED" ? "Message deleted by its author." : message.state === "REMOVED" ? "Message removed by a moderator." : message.body}</p>}{message.pending ? <small>Sending…</small> : message.state === "QUARANTINED" ? <small>Only you can see this while it is reviewed.</small> : null}{(canEdit || canDelete) && !editing ? <div className={styles.ownMessageActions}>{canEdit ? <button type="button" onClick={() => setEditing(true)}>Edit</button> : null}{canDelete ? <button type="button" onClick={() => setDeleteOpen(true)}>Delete</button> : null}</div> : null}{error && !editing ? <small className={styles.inlineError} role="alert">{error}</small> : null}<AccessibleDialog open={deleteOpen} title="Delete this message?" description="Other members will see that a message was deleted. Moderation records may be retained according to the community policy." onClose={() => setDeleteOpen(false)}><div className={styles.dialogActions}><button className={styles.secondaryButton} type="button" onClick={() => setDeleteOpen(false)}>Keep message</button><button className={styles.dangerButton} type="button" onClick={() => void deleteMessage()} disabled={busy}>{busy ? "Deleting…" : "Delete message"}</button></div></AccessibleDialog></article>;
}

function NoThread() {
  return <div className={styles.noThreadState}><div className={styles.radioRings} aria-hidden="true"><MessageCircle /></div><span className={styles.kicker}>Player radio</span><h2>Choose a conversation</h2><p>Continue a direct message, coordinate a private group, or tune into a curated channel.</p><Link className={styles.primaryButton} href="/community">Find people & places</Link></div>;
}

function MessagesLoading() {
  return <main className={styles.messagesLoading} role="status"><LoaderCircle className={styles.spin} aria-hidden="true" /><strong>Opening your inbox…</strong></main>;
}

function MessagesState({ icon, title, message, action }: { icon: React.ReactNode; title: string; message: string; action?: React.ReactNode }) {
  return <main className={`page-shell ${styles.messagesState}`}>{icon}<span className={styles.kicker}>Player radio</span><h1>{title}</h1><p>{message}</p>{action ?? <Link className={styles.secondaryButton} href="/community">Open community</Link>}</main>;
}

function NewConversationDialog({ open, players, onClose, onCreated }: { open: boolean; players: PlayerSummary[]; onClose: () => void; onCreated: (conversation: ConversationSummary) => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const filtered = players.filter((player) => player.canMessage && player.displayName.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected.length || busy) return;
    setBusy(true); setError(null);
    try {
      const payload = selected.length === 1 ? { type: "DIRECT", participantUserId: selected[0] } : { type: "PRIVATE_GROUP", subject: subject.trim(), participantUserIds: selected };
      const raw = await communityRequest<unknown>("/api/community/conversations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const record = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
      const conversation = normalizeConversation(record.conversation ?? record.data ?? raw);
      if (!conversation.id) throw new Error("The conversation did not return an ID.");
      onCreated(conversation);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The conversation could not be created.");
    } finally { setBusy(false); }
  }
  return <AccessibleDialog open={open} title="Start a conversation" description="Choose one player for a direct message or up to 24 eligible players for a private group." onClose={onClose}><form className={styles.dialogForm} onSubmit={create}><label><span>Find a player</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search connections" /></label><fieldset className={styles.playerPicker}><legend className="sr-only">Players to add</legend>{filtered.length ? filtered.map((player) => <label key={player.id}><input type="checkbox" checked={selected.includes(player.id)} disabled={!selected.includes(player.id) && selected.length >= 24} onChange={(event) => setSelected((current) => event.target.checked ? [...current, player.id] : current.filter((id) => id !== player.id))} /><span className={styles.playerAvatar} aria-hidden="true">{player.initials}</span><span><strong>{player.displayName}</strong><small>{player.homeRegionCode ?? "FlightForge player"}</small></span></label>) : <p>No eligible players match that search.</p>}</fieldset>{selected.length > 1 ? <label><span>Group name</span><input value={subject} onChange={(event) => setSubject(event.target.value)} minLength={2} maxLength={80} required /></label> : null}{error ? <p className={styles.formError} role="alert">{error}</p> : null}<div className={styles.dialogActions}><button type="button" className={styles.secondaryButton} onClick={onClose}>Cancel</button><button type="submit" className={styles.primaryButton} disabled={busy || !selected.length || selected.length > 24 || selected.length > 1 && subject.trim().length < 2}>{busy ? "Starting…" : selected.length > 1 ? "Create private group" : "Start message"}</button></div></form></AccessibleDialog>;
}

function ThreadSafetyDialog({ action, busy, onClose, onSubmit }: { action: SafetyAction; busy: boolean; onClose: () => void; onSubmit: (reason: string, details: string) => Promise<void> }) {
  const [reason, setReason] = useState("HARASSMENT");
  const [details, setDetails] = useState("");
  if (!action) return null;
  const destructive = action.kind === "BLOCK" || action.kind === "LEAVE";
  const title = action.kind === "BLOCK" ? "Block this player?" : action.kind === "LEAVE" ? "Leave this conversation?" : action.kind === "REPORT_MESSAGE" ? "Report this message" : "Report this conversation";
  const description = action.kind === "BLOCK" ? "Blocking prevents Community messages and connection requests between both accounts." : action.kind === "LEAVE" ? "You will stop receiving messages. A moderator may retain past messages according to the community policy." : "Your report is private and includes enough conversation context for the safety team to review it.";
  return <AccessibleDialog open title={title} description={description} onClose={onClose}><form className={styles.dialogForm} onSubmit={(event) => { event.preventDefault(); void onSubmit(reason, details); }}>{!destructive ? <><label><span>Reason</span><select value={reason} onChange={(event) => setReason(event.target.value)}><option value="HARASSMENT">Harassment or bullying</option><option value="THREAT">Threat or unsafe behavior</option><option value="HATE">Hateful content</option><option value="SPAM">Spam or scam</option><option value="OTHER">Something else</option></select></label><label><span>Additional details · optional</span><textarea rows={4} maxLength={1000} value={details} onChange={(event) => setDetails(event.target.value)} /></label></> : null}<div className={styles.dialogActions}><button className={styles.secondaryButton} type="button" onClick={onClose}>Cancel</button><button className={destructive ? styles.dangerButton : styles.primaryButton} type="submit" disabled={busy}>{busy ? "Saving…" : action.kind === "BLOCK" ? "Block player" : action.kind === "LEAVE" ? "Leave conversation" : "Send report"}</button></div></form></AccessibleDialog>;
}

function uniqueConversations(conversations: ConversationSummary[]): ConversationSummary[] {
  const unique = new Map<string, ConversationSummary>();
  conversations.forEach((conversation) => { if (conversation.id) unique.set(conversation.id, conversation); });
  return [...unique.values()].sort((first, second) => Date.parse(second.updatedAt || "1970-01-01") - Date.parse(first.updatedAt || "1970-01-01"));
}

function mergeMessages(first: CommunityMessage[], second: CommunityMessage[]): CommunityMessage[] {
  const unique = new Map<string, CommunityMessage>();
  [...first, ...second].forEach((message) => { if (message.id) unique.set(message.id, message); });
  return [...unique.values()].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

function draftKey(conversationId: string, viewerId: string): string { return `flightforge:message-draft:${encodeURIComponent(viewerId)}:${conversationId}`; }
function createId(): string { return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`; }

function submitOnEnter(event: KeyboardEvent<HTMLTextAreaElement>, form: HTMLFormElement | null) {
  if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
  event.preventDefault();
  form?.requestSubmit();
}

function relativeTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const delta = Date.now() - date.getTime();
  if (delta < 60_000) return "now";
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h`;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

function formatMessageTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
}
