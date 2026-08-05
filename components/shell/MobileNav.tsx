import Link from "next/link";
import { CalendarDays, Compass, Home, Play, UserRound } from "lucide-react";
import { getCurrentUser } from "@/modules/auth/current-user";

export async function MobileNav() {
  const user = await getCurrentUser();
  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      <Link href="/"><Home aria-hidden="true" /><span>Home</span></Link>
      <Link href="/courses"><Compass aria-hidden="true" /><span>Explore</span></Link>
      <Link className="mobile-play" href="/roadmap#play">
        <span className="mobile-play-icon"><Play aria-hidden="true" /></span>
        <span>Play</span>
      </Link>
      <Link href="/events"><CalendarDays aria-hidden="true" /><span>Events</span></Link>
      <Link href={user ? (user.mustChangePassword ? "/account/password" : user.onboardingComplete ? "/profile" : "/onboarding") : "/sign-in"}><UserRound aria-hidden="true" /><span>Profile</span></Link>
    </nav>
  );
}
