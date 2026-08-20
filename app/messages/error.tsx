"use client";

import Link from "next/link";
import { WifiOff } from "lucide-react";
import styles from "@/components/community/Community.module.css";

export default function MessagesError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className={`page-shell ${styles.routeError}`}><WifiOff aria-hidden="true" /><span className={styles.kicker}>Player radio</span><h1>Your inbox could not open.</h1><p>No message was lost. Try again or return to the community board.</p><div><button className={styles.primaryButton} type="button" onClick={reset}>Try again</button><Link className={styles.secondaryButton} href="/community">Open community</Link></div></main>;
}
