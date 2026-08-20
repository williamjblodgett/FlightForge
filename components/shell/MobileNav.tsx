import { CalendarDays, Compass, Home, Play, UserRound } from "lucide-react";
import { getCurrentUser } from "@/modules/auth/current-user";
import { NavLink } from "./NavLink";

export async function MobileNav() {
  const user = await getCurrentUser();
  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      <NavLink href="/"><Home aria-hidden="true" /><span>Home</span></NavLink>
      <NavLink match={["/courses", "/places"]} href="/courses"><Compass aria-hidden="true" /><span>Explore</span></NavLink>
      <NavLink className="mobile-play" href="/play">
        <span className="mobile-play-icon"><Play aria-hidden="true" /></span>
        <span>Play</span>
      </NavLink>
      <NavLink href="/events"><CalendarDays aria-hidden="true" /><span>Events</span></NavLink>
      <NavLink match={["/profile", "/sign-in", "/sign-up", "/onboarding", "/account", "/favorites", "/bag", "/coach", "/community", "/messages"]} href={user ? (user.mustChangePassword ? "/account/password" : user.onboardingComplete ? "/profile" : "/onboarding") : "/sign-in"}><UserRound aria-hidden="true" /><span>Profile</span></NavLink>
    </nav>
  );
}
