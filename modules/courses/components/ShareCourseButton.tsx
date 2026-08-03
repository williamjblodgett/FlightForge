"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { brand } from "@/config/brand";

type Props = { courseName: string };

export function ShareCourseButton({ courseName }: Props) {
  const [message, setMessage] = useState("");

  async function share() {
    const shareData = { title: courseName, text: `Explore ${courseName} on ${brand.productName}`, url: window.location.href };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setMessage("Share sheet opened.");
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setMessage("Course link copied.");
      }
    } catch {
      setMessage("Sharing was cancelled.");
    }
  }

  return (
    <>
      <button className="button button-secondary" type="button" onClick={share}>
        <Share2 aria-hidden="true" /> Invite friends
      </button>
      <span className="sr-only" aria-live="polite">{message}</span>
    </>
  );
}
