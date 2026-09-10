import { CalendarDays, Compass, Home, Play, MoreHorizontal } from "lucide-react";
import { NavLink } from "./NavLink";

export async function MobileNav() {
  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      <NavLink href="/"><Home aria-hidden="true" /><span>Home</span></NavLink>
      <NavLink match={["/courses", "/places"]} href="/courses"><Compass aria-hidden="true" /><span>Explore</span></NavLink>
      <NavLink className="mobile-play" match={["/play", "/rounds/new"]} href="/play">
        <span className="mobile-play-icon"><Play aria-hidden="true" /></span>
        <span>Play</span>
      </NavLink>
      <NavLink href="/events"><CalendarDays aria-hidden="true" /><span>Events</span></NavLink>
      <NavLink exclude={["/rounds/new"]} match={["/more", "/profile", "/sign-in", "/sign-up", "/onboarding", "/account", "/favorites", "/bag", "/coach", "/fieldwork", "/rounds", "/community", "/messages"]} href="/more"><MoreHorizontal aria-hidden="true"/><span>More</span></NavLink>
    </nav>
  );
}
