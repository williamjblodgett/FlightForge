"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import styles from "@/components/community/Community.module.css";

export default function CommunityError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className={`page-shell ${styles.routeError}`}><MessageCircle aria-hidden="true" /><span className={styles.kicker}>Clubhouse signal lost</span><h1>The community page could not open.</h1><p>Your profile and messages are safe. Try the page again or return to course discovery.</p><div><button className={styles.primaryButton} type="button" onClick={reset}>Try again</button><Link className={styles.secondaryButton} href="/courses">Explore courses</Link></div></main>;
}
