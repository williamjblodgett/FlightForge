"use client";

import { useState } from "react";
import { CircleOff, Globe2, LockKeyhole } from "lucide-react";
import type { EventRecord } from "@/modules/events/types";

export function EventStatusControls({ event }: { event: EventRecord }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function change(action: "PUBLISH" | "UNPUBLISH" | "CANCEL") {
    const reason = action === "PUBLISH" ? "Coordinator approved this event for public display." : action === "UNPUBLISH" ? "Coordinator returned this event to draft." : "Coordinator cancelled the event.";
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, reason, version: event.version }),
      });
      const body = await response.json() as { error?: { message?: string } };
      if (!response.ok) { setError(body.error?.message ?? "The status could not be changed."); return; }
      window.location.reload();
    } catch { setError("The event service could not be reached."); }
    finally { setBusy(false); }
  }

  return <div className="event-status-controls">
    {event.status === "DRAFT" ? <button type="button" onClick={() => change("PUBLISH")} disabled={busy}><Globe2 aria-hidden="true" />Publish</button> : null}
    {event.status === "PUBLISHED" ? <button type="button" onClick={() => change("UNPUBLISH")} disabled={busy}><LockKeyhole aria-hidden="true" />Return to draft</button> : null}
    {event.status !== "CANCELLED" ? <button className="danger-action" type="button" onClick={() => change("CANCEL")} disabled={busy}><CircleOff aria-hidden="true" />Cancel event</button> : null}
    {error ? <span role="alert">{error}</span> : null}
  </div>;
}
