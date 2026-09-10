"use client";

import { useState, useEffect } from "react";
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

  const intentKey="flightforge.favorite.intent";
  function signInWithIntent(){try{sessionStorage.setItem(intentKey,JSON.stringify({courseId,expiresAt:Date.now()+30*60_000}));}catch{/* Saving manually after login remains available. */}window.location.assign(`/sign-in?return_to=${encodeURIComponent(window.location.pathname+window.location.search+window.location.hash)}`);}
  useEffect(()=>{if(!signedIn)return;let cancelled=false;const timer=window.setTimeout(async()=>{try{const intent=JSON.parse(sessionStorage.getItem(intentKey)??"null") as {courseId?:string;expiresAt?:number}|null;if(intent?.courseId!==courseId||!intent.expiresAt||intent.expiresAt<Date.now())return;setBusy(true);const response=await fetch(`/api/favorites/${courseId}`,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({favorited:true})});if(response.ok){sessionStorage.removeItem(intentKey);if(!cancelled){setFavorited(true);setAnnouncement(courseName+" saved.");}}else if(!cancelled)setAnnouncement("Sign-in completed. Tap save again to add this course.");}catch{if(!cancelled)setAnnouncement("Could not resume saving. Tap save again.");}finally{if(!cancelled)setBusy(false);}},0);return()=>{cancelled=true;window.clearTimeout(timer);};},[courseId,courseName,signedIn]);
  async function toggle() {
    if (!signedIn) {
      signInWithIntent();
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/favorites/${courseId}`, { method: "PUT",headers:{"content-type":"application/json"},body:JSON.stringify({favorited:!favorited}) });
      if (response.status === 401) {
        signInWithIntent();
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
