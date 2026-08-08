"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="system-state page-shell"><span className="eyebrow">Something went off line</span><h1>We couldn’t finish that play.</h1><p>Your local round draft is preserved. Try the request again.</p><button className="button button-primary" onClick={reset}>Try again</button></main>;
}
