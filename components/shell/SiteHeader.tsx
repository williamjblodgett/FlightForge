import Link from "next/link";
import { Bell, CalendarPlus2, MessageCircle, Search, ShieldCheck, UserRound } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { getCurrentUser } from "@/modules/auth/current-user";
import { can } from "@/modules/auth/permissions";

const primaryNavigation = [
  { label: "Discover", href: "/courses" },
  { label: "Play", href: "/roadmap#play" },
  { label: "Events", href: "/events" },
  { label: "Leagues", href: "/roadmap#leagues" },
  { label: "Learn", href: "/roadmap#learn" },
  { label: "Bag", href: "/bag" },
  { label: "Community", href: "/roadmap#community" },
];

export async function SiteHeader() {
  const user = await getCurrentUser();
  return (
    <header className="site-header">
      <div className="header-inner">
        <BrandMark />
        <nav className="desktop-nav" aria-label="Primary navigation">
          {primaryNavigation.map((item) => (
            <Link key={item.label} href={item.href}>{item.label}</Link>
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
          ) : user?.roles.includes("COURSE_OWNER") ? (
            <Link className="manage-link" href="/roadmap#owner">Manage course</Link>
          ) : null}
          <Link className="icon-button" href="/courses" aria-label="Search courses">
            <Search aria-hidden="true" />
          </Link>
          <button className="icon-button" type="button" aria-label="Notifications — coming soon" disabled>
            <Bell aria-hidden="true" />
          </button>
          <button className="icon-button" type="button" aria-label="Messages — coming soon" disabled>
            <MessageCircle aria-hidden="true" />
          </button>
          {user ? (
            <details className="profile-menu">
              <summary aria-label={`Open profile menu for ${user.displayName}`}>
                <span className="avatar" aria-hidden="true">{initials(user.displayName)}</span>
              </summary>
              <div className="profile-popover">
                <strong>{user.displayName}</strong>
                <span>{user.email}</span>
                {user.mustChangePassword
                  ? <Link href="/account/password">Secure account now</Link>
                  : !user.onboardingComplete
                    ? <Link href="/onboarding">Finish profile setup</Link>
                    : <Link href="/profile">Profile & privacy</Link>}
                {!user.mustChangePassword && user.source === "password" ? <Link href="/account/password">Change password</Link> : null}
                <Link href="/favorites">Saved courses</Link>
                <Link href="/bag">My disc bag</Link>
                {can(user, "manageEvents") ? <Link href="/events/manage">Manage events</Link> : null}
                {can(user, "viewAdmin") ? <Link href="/admin/claims">Admin review</Link> : null}
                <SignOutButton source={user.source} />
              </div>
            </details>
          ) : (
            <Link className="profile-link" href="/sign-in">
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
