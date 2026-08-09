"use client";

import { useEffect, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from "react";
import { Headphones, LoaderCircle, Mic, MicOff, Send, ShieldCheck, Volume2 } from "lucide-react";
import { caddieKnowledgeSources } from "@/modules/ai-caddie/knowledge";

type Message = { id: string; role: "user" | "assistant"; content: string; provider: string | null; confidence: string | null; createdAt: string };

export function CaddieChat() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Loading your private caddie history…");
  const [readAloud, setReadAloud] = useState(false);
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const [voiceState, setVoiceState] = useState<"idle" | "connecting" | "ready" | "talking">("idle");
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const dataRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetch("/api/caddie/chat", { cache: "no-store" }), fetch("/api/caddie/realtime", { cache: "no-store" })])
      .then(async ([historyResponse, realtimeResponse]) => {
        if (historyResponse.ok) {
          const history = await historyResponse.json() as { conversationId: string | null; messages: Message[] };
          if (!cancelled) { setConversationId(history.conversationId); setMessages(history.messages); setStatus(history.messages.length ? "Private history loaded." : "Ask about a shot, rule, wind, disc, or practice cue."); }
        } else if (!cancelled) setStatus("Start a new caddie conversation below.");
        if (realtimeResponse.ok) {
          const realtime = await realtimeResponse.json() as { available?: boolean };
          if (!cancelled) setVoiceAvailable(realtime.available === true);
        }
      }).catch(() => { if (!cancelled) setStatus("Start a new caddie conversation below."); });
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      dataRef.current?.close();
      peerRef.current?.close();
    };
  }, []);

  useEffect(() => { transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = question.trim();
    if (message.length < 2 || busy) return;
    setBusy(true); setQuestion(""); setStatus("Caddie is checking your private bag and field guide…");
    try {
      const response = await fetch("/api/caddie/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message, conversationId }) });
      const body = await response.json() as { conversationId?: string; messages?: Message[]; mode?: string; error?: { message?: string } };
      if (!response.ok || !body.messages) { setQuestion(message); setStatus(body.error?.message ?? "The caddie could not answer. Try again."); return; }
      setConversationId(body.conversationId ?? null); setMessages((current) => [...current, ...body.messages!]);
      const reply = body.messages.findLast((item) => item.role === "assistant")?.content;
      setStatus(body.mode === "AI" ? "AI answer grounded with your FlightForge context." : "Field-guide answer used; live AI was unavailable.");
      if (readAloud && reply && "speechSynthesis" in window) { window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(reply)); }
    } catch { setQuestion(message); setStatus("The caddie could not be reached. Your message was not lost."); }
    finally { setBusy(false); }
  }

  async function connectVoice() {
    if (!voiceAvailable || voiceState !== "idle") return;
    setVoiceState("connecting"); setStatus("Requesting microphone access…");
    try {
      const peer = new RTCPeerConnection();
      const audio = document.createElement("audio"); audio.autoplay = true;
      peer.ontrack = (event) => { audio.srcObject = event.streams[0]; };
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const track = stream.getAudioTracks()[0]; track.enabled = false; peer.addTrack(track, stream);
      const channel = peer.createDataChannel("oai-events");
      channel.addEventListener("message", (event) => {
        try {
          const payload = JSON.parse(String(event.data)) as { type?: string; transcript?: string };
          if (payload.type === "response.audio_transcript.done" && payload.transcript) setStatus(`Caddie: ${payload.transcript}`);
          if (payload.type === "response.done") setVoiceState("ready");
        } catch { /* Ignore malformed provider telemetry. */ }
      });
      const offer = await peer.createOffer(); await peer.setLocalDescription(offer);
      const response = await fetch("/api/caddie/realtime", { method: "POST", headers: { "content-type": "application/sdp" }, body: offer.sdp });
      if (!response.ok) throw new Error("Voice session failed");
      await peer.setRemoteDescription({ type: "answer", sdp: await response.text() });
      peerRef.current = peer; dataRef.current = channel; streamRef.current = stream;
      setVoiceState("ready"); setStatus("Voice caddie connected. Hold the microphone button while you speak.");
    } catch {
      closeVoice(); setVoiceState("idle"); setStatus("Live voice could not connect. Text caddie remains available.");
    }
  }

  function beginTalking(event: ReactPointerEvent<HTMLButtonElement>) {
    if (voiceState !== "ready") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const track = streamRef.current?.getAudioTracks()[0]; if (track) track.enabled = true;
    setVoiceState("talking"); setStatus("Listening… release to ask.");
  }

  function stopTalking() {
    if (voiceState !== "talking") return;
    const track = streamRef.current?.getAudioTracks()[0]; if (track) track.enabled = false;
    if (dataRef.current?.readyState === "open") {
      dataRef.current.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
      dataRef.current.send(JSON.stringify({ type: "response.create" }));
      setStatus("Caddie is answering…");
    }
    setVoiceState("ready");
  }

  function closeVoice() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    dataRef.current?.close(); peerRef.current?.close();
    streamRef.current = null; dataRef.current = null; peerRef.current = null;
  }

  return <section id="caddie-chat" className="caddie-chat" aria-labelledby="caddie-chat-title">
    <header><div><span className="eyebrow"><Headphones aria-hidden="true" /> Field conversation</span><h2 id="caddie-chat-title">Chat with your caddie</h2><p>Private bag context, curated disc-golf knowledge, and a safe fallback when AI is unavailable.</p></div><div className="caddie-privacy"><ShieldCheck aria-hidden="true" /><span>Server-side key<br />Private history</span></div></header>
    <div className="caddie-transcript" ref={transcriptRef} aria-live="polite" aria-label="Caddie conversation">
      {messages.length ? messages.map((message) => <article key={message.id} className={`caddie-message is-${message.role}`}><span>{message.role === "assistant" ? "Caddie" : "You"}</span><p>{message.content}</p>{message.role === "assistant" ? <small>{message.provider === "OPENAI" ? "AI-assisted" : "FlightForge field guide"} · {message.confidence?.toLowerCase() ?? "limited"} confidence</small> : null}</article>) : <div className="caddie-chat-empty"><strong>Try asking:</strong><button type="button" onClick={() => setQuestion("What should I consider in a 12 mph headwind?")}>“What changes in a headwind?”</button><button type="button" onClick={() => setQuestion("Explain speed, glide, turn, and fade.")}>“Explain flight numbers.”</button><button type="button" onClick={() => setQuestion("Give me one safe backhand form cue.")}>“Give me one form cue.”</button></div>}
    </div>
    <form className="caddie-chat-form" onSubmit={send}><label className="sr-only" htmlFor="caddie-question">Ask your caddie</label><textarea id="caddie-question" rows={2} minLength={2} maxLength={1200} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about this shot, wind, a rule, or your bag…" /><button type="submit" disabled={busy || question.trim().length < 2} aria-label="Send to caddie">{busy ? <LoaderCircle className="spin" aria-hidden="true" /> : <Send aria-hidden="true" />}</button></form>
    <div className="caddie-voice-row"><label><input type="checkbox" checked={readAloud} onChange={(event) => setReadAloud(event.target.checked)} /><Volume2 aria-hidden="true" /> Read text replies</label>{voiceAvailable ? voiceState === "idle" || voiceState === "connecting" ? <button className="button button-secondary" type="button" onClick={connectVoice} disabled={voiceState === "connecting"}><Mic aria-hidden="true" />{voiceState === "connecting" ? "Connecting…" : "Connect live voice"}</button> : <button className={`voice-hold${voiceState === "talking" ? " is-listening" : ""}`} type="button" onPointerDown={beginTalking} onPointerUp={stopTalking} onPointerCancel={stopTalking}><Mic aria-hidden="true" />{voiceState === "talking" ? "Release to ask" : "Hold to talk"}</button> : <span className="voice-not-configured"><MicOff aria-hidden="true" />Live voice appears when the provider is configured.</span>}</div>
    <p className="caddie-chat-status" role="status">{status}</p><details className="caddie-knowledge-sources"><summary>How answers are grounded</summary><p>FlightForge combines your private bag with rules, manufacturer terminology, and published research. A source does not imply endorsement.</p><ul>{caddieKnowledgeSources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a><span>{source.scope}</span></li>)}</ul></details><p className="caddie-safety-note">Check the fairway and landing area before every throw. Advice is estimated and is not medical guidance or an official rules ruling.</p>
  </section>;
}
