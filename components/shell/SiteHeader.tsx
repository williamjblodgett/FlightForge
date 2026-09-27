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
            <NavLink key={item.label} href={item.href} prefetch={["/coach","/bag","/community"].includes(item.href)?false:undefined}>{item.label}</NavLink>
          ))}
        </nav>
        <div className="header-actions">
          {can(user, "viewAdmin") ? (
            <Link prefetch={false} className="manage-link" href="/admin/claims">
              <ShieldCheck size={16} aria-hidden="true" /> Admin
            </Link>
          ) : can(user, "manageEvents") ? (
            <Link prefetch={false} className="manage-link" href="/events/manage">
              <CalendarPlus2 size={16} aria-hidden="true" /> Manage events
            </Link>
          ) : null}
          <Link prefetch={false} className="icon-button" href="/courses" aria-label="Search courses">
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
                  ? <Link prefetch={false} href="/account/link">Securely link account</Link>
                  : user.mustChangePassword
                  ? <Link prefetch={false} href="/account/password">Secure account now</Link>
                  : !user.onboardingComplete
                    ? <Link prefetch={false} href="/onboarding">Finish profile setup</Link>
                    : <Link prefetch={false} href="/profile">Profile & privacy</Link>}
                {!user.mustChangePassword && user.source === "password" ? <Link prefetch={false} href="/account/password">Change password</Link> : null}
                <Link prefetch={false} href="/more">All player tools</Link>
                <Link prefetch={false} href="/rounds">Round history</Link>
                <Link prefetch={false} href="/favorites">Saved courses</Link>
                <Link prefetch={false} href="/bag">My disc bag</Link>
                <Link prefetch={false} href="/coach">Camera coach</Link>
                <Link prefetch={false} href="/fieldwork">Fieldwork & throw distance</Link>
                <Link prefetch={false} href="/play">Live scorecard</Link>
                <Link prefetch={false} href="/messages">Messages</Link>
                <Link prefetch={false} href="/community">Community</Link>
                {can(user, "manageEvents") ? <Link prefetch={false} href="/events/manage">Manage events</Link> : null}
                {can(user, "viewAdmin") ? <Link prefetch={false} href="/admin/claims">Admin review</Link> : null}
                <SignOutButton />
              </div>
            </details>
          ) : (
            <Link prefetch={false} className="profile-link" href="/sign-in" aria-label="Sign in to FlightForge">
              <UserRound size={19} aria-hidden="true" />
              <span>Sign in</span>
            </Link>
          )}
          {user ? <SignOutButton variant="header" /> : null}
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
