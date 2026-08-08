import Link from "next/link";

export default function NotFound() {
  return <main className="system-state page-shell"><span className="eyebrow">404 · Out of bounds</span><h1>That page isn’t on this layout.</h1><p>The link may be old, private, or no longer published.</p><div><Link className="button button-primary" href="/courses">Explore courses</Link> <Link className="button button-secondary" href="/">Go home</Link></div></main>;
}
