"use client";

import { useState } from "react";
import { Heart } from "lucide-react";

type Props = {
  courseId: string;
  courseName: string;
  initialFavorite: boolean;
  signedIn: boolean;
  showLabel?: boolean;
};

export function FavoriteButton({
  courseId,
  courseName,
  initialFavorite,
  signedIn,
  showLabel = false,
}: Props) {
  const [favorited, setFavorited] = useState(initialFavorite);
  const [busy, setBusy] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  async function toggle() {
    if (!signedIn) {
      window.location.assign(`/sign-in?return_to=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/favorites/${courseId}`, { method: "POST" });
      if (response.status === 401) {
        window.location.assign(`/sign-in?return_to=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      if (!response.ok) {
        setAnnouncement("Could not update this favorite. Try again.");
        return;
      }
      const result = (await response.json()) as { favorited: boolean };
      setFavorited(result.favorited);
      setAnnouncement(result.favorited ? `${courseName} saved.` : `${courseName} removed from saved courses.`);
    } catch {
      setAnnouncement("Could not update this favorite. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        className={`favorite-button${favorited ? " is-favorite" : ""}${showLabel ? " has-label" : ""}`}
        type="button"
        aria-label={favorited ? `Remove ${courseName} from favorites` : `Add ${courseName} to favorites`}
        aria-pressed={favorited}
        disabled={busy}
        onClick={toggle}
      >
        <Heart aria-hidden="true" fill={favorited ? "currentColor" : "none"} />
        {showLabel ? <span>{favorited ? "Saved" : "Save course"}</span> : null}
      </button>
      <span className="sr-only" aria-live="polite">{announcement}</span>
    </>
  );
}
