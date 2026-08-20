import Link from "next/link";
import { CalendarPlus2, Search, ShieldCheck, UserRound } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { UnreadMessagesLink } from "@/components/community/UnreadMessagesLink";
import { getCurrentUser } from "@/modules/auth/current-user";
import { can } from "@/modules/auth/permissions";
import { NavLink } from "./NavLink";

const primaryNavigation = [
  { label: "Discover", href: "/courses" },
  { label: "Play", href: "/play" },
  { label: "Events", href: "/events" },
  { label: "Leagues", href: "/roadmap#leagues" },
  { label: "Learn", href: "/roadmap#learn" },
  { label: "Coach", href: "/coach" },
  { label: "Bag", href: "/bag" },
  { label: "Community", href: "/community" },
];

export async function SiteHeader() {
  const user = await getCurrentUser();
  return (
    <header className="site-header">
      <div className="header-inner">
        <BrandMark />
        <nav className="desktop-nav" aria-label="Primary navigation">
          {primaryNavigation.map((item) => (
            <NavLink key={item.label} href={item.href}>{item.label}</NavLink>
          ))}
        </nav>
        <div className="header-actions">
          {can(user, "viewAdmin") ? (
            <Link className="manage-link" href="/admin/claims">
              <ShieldCheck size={16} aria-hidden="true" /> Admin
            </Link>
          ) : can(user, "manageEvents") ? (
            <Link className="manage-link" href="/events/manage">
              <CalendarPlus2 size={16} aria-hidden="true" /> Manage events
            </Link>
          ) : null}
          <Link className="icon-button" href="/courses" aria-label="Search courses">
            <Search aria-hidden="true" />
          </Link>
          {user ? <UnreadMessagesLink /> : null}
          {user ? (
            <details className="profile-menu">
              <summary aria-label={`Open profile menu for ${user.displayName}`}>
                <span className="avatar" aria-hidden="true">{initials(user.displayName)}</span>
                <span className="sr-only">Account for {user.displayName}</span>
              </summary>
              <div className="profile-popover">
                <strong>{user.displayName}</strong>
                <span>{user.email}</span>
                {user.identityLinkRequired
                  ? <Link href="/account/link">Securely link account</Link>
                  : user.mustChangePassword
                  ? <Link href="/account/password">Secure account now</Link>
                  : !user.onboardingComplete
                    ? <Link href="/onboarding">Finish profile setup</Link>
                    : <Link href="/profile">Profile & privacy</Link>}
                {!user.mustChangePassword && user.source === "password" ? <Link href="/account/password">Change password</Link> : null}
                <Link href="/favorites">Saved courses</Link>
                <Link href="/bag">My disc bag</Link>
                <Link href="/coach">Camera coach</Link>
                <Link href="/play">Live scorecard</Link>
                <Link href="/messages">Messages</Link>
                <Link href="/community">Community</Link>
                {can(user, "manageEvents") ? <Link href="/events/manage">Manage events</Link> : null}
                {can(user, "viewAdmin") ? <Link href="/admin/claims">Admin review</Link> : null}
                <SignOutButton source={user.source} />
              </div>
            </details>
          ) : (
            <Link className="profile-link" href="/sign-in" aria-label="Sign in to FlightForge">
              <UserRound size={19} aria-hidden="true" />
              <span>Sign in</span>
            </Link>
          )}
          {user ? <SignOutButton source={user.source} variant="header" /> : null}
        </div>
      </div>
    </header>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/u)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
