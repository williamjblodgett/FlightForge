import { useEffect, useState, type CSSProperties } from "react";
import {
  Bell,
  BookOpen,
  CalendarDays,
  Compass,
  Disc3,
  Gauge,
  Home,
  Menu,
  Play,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { BagCaddieScreen } from "./screens/BagCaddieScreen";
import { CoachScreen } from "./screens/CoachScreen";
import { DiscoverScreen } from "./screens/DiscoverScreen";
import { EventsScreen } from "./screens/EventsScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { OwnerScreen } from "./screens/OwnerScreen";
import { PlayScreen } from "./screens/PlayScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { useDemoStore } from "./demo-store";
import { brand } from "@/config/brand";

export type ScreenId = "home" | "discover" | "play" | "events" | "bag" | "coach" | "owner" | "profile";

const navigation = [
  { id: "discover", label: "Discover", icon: Compass },
  { id: "play", label: "Play", icon: Play },
  { id: "events", label: "Events", icon: CalendarDays },
  { id: "bag", label: "Bag + Caddie", icon: Disc3 },
  { id: "coach", label: "Learn", icon: BookOpen },
  { id: "owner", label: "Manage", icon: Gauge },
] satisfies Array<{ id: ScreenId; label: string; icon: typeof Compass }>;

const screenComponents: Record<ScreenId, () => React.JSX.Element> = {
  home: HomeScreen,
  discover: DiscoverScreen,
  play: PlayScreen,
  events: EventsScreen,
  bag: BagCaddieScreen,
  coach: CoachScreen,
  owner: OwnerScreen,
  profile: ProfileScreen,
};

export function App() {
  const { state } = useDemoStore();
  const [screen, setScreen] = useState<ScreenId>(() => screenFromHash());
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onHashChange = () => setScreen(screenFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigate = (next: ScreenId) => {
    window.location.hash = next;
    setScreen(next);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const Screen = screenComponents[screen];

  return (
    <div className="demo-app" style={{
      "--forest-950": brand.colors.primary[950],
      "--forest-900": brand.colors.primary[900],
      "--forest-700": brand.colors.primary[700],
      "--forest-600": brand.colors.primary[500],
      "--lime": brand.colors.secondary[300],
      "--lime-strong": brand.colors.secondary[500],
      "--amber": brand.colors.accent,
    } as CSSProperties}>
      <a className="skip-link" href="#demo-main">Skip to content</a>
      <div className="demo-environment" role="status">
        <ShieldCheck aria-hidden="true" />
        <span><strong>Interactive launch demo.</strong> Personal changes stay on this device; real listings remain unclaimed unless marked otherwise.</span>
      </div>
      <header className="demo-header">
        <button className="brand-button" type="button" onClick={() => navigate("home")} aria-label={brand.logo.accessibleLabel}>
          <span className="brand-symbol" aria-hidden="true" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}brand/flightforge-mark.png)` }} />
          <span>{brand.logo.wordmark.toUpperCase()}</span>
        </button>
        <nav className="demo-desktop-nav" aria-label="Primary">
          {navigation.map((item) => (
            <button key={item.id} type="button" className={screen === item.id ? "active" : ""} onClick={() => navigate(item.id)}>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="demo-header-actions">
          <button className="icon-control notification-control" type="button" onClick={() => navigate("profile")} aria-label={`${state.notificationCount} notifications`}>
            <Bell aria-hidden="true" />
            <span>{state.notificationCount}</span>
          </button>
          <button className="profile-chip" type="button" onClick={() => navigate("profile")}>
            <span className="avatar">RP</span>
            <span>{state.displayName}</span>
          </button>
          <button className="icon-control menu-control" type="button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label="Toggle navigation">
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
      </header>
      {menuOpen ? (
        <nav className="demo-mobile-menu" aria-label="Expanded navigation">
          {navigation.map((item) => (
            <button key={item.id} type="button" onClick={() => navigate(item.id)}><item.icon aria-hidden="true" />{item.label}</button>
          ))}
          <button type="button" onClick={() => navigate("profile")}><UserRound aria-hidden="true" />Profile & privacy</button>
        </nav>
      ) : null}
      <main id="demo-main"><Screen /></main>
      <footer className="demo-footer">
        <div><strong>{brand.productName}</strong><span>Find your line. Forge your game.</span></div>
        <p>Working-title product demo · Maine seed market · No affiliation with PDGA, course directories, manufacturers, or retailers.</p>
        <button type="button" onClick={() => navigate("profile")}>Privacy & readiness</button>
      </footer>
      <nav className="demo-bottom-nav" aria-label="Mobile quick navigation">
        <button type="button" className={screen === "home" ? "active" : ""} onClick={() => navigate("home")}><Home aria-hidden="true" /><span>Home</span></button>
        <button type="button" className={screen === "discover" ? "active" : ""} onClick={() => navigate("discover")}><Compass aria-hidden="true" /><span>Explore</span></button>
        <button type="button" className={`center-play ${screen === "play" ? "active" : ""}`} onClick={() => navigate("play")}><span><Play aria-hidden="true" /></span><b>Play</b></button>
        <button type="button" className={screen === "events" ? "active" : ""} onClick={() => navigate("events")}><CalendarDays aria-hidden="true" /><span>Events</span></button>
        <button type="button" className={screen === "profile" ? "active" : ""} onClick={() => navigate("profile")}><UserRound aria-hidden="true" /><span>Profile</span></button>
      </nav>
    </div>
  );
}

function screenFromHash(): ScreenId {
  const value = window.location.hash.replace(/^#/u, "");
  return value in screenComponents ? (value as ScreenId) : "home";
}

export function navigateTo(screen: ScreenId): void {
  window.location.hash = screen;
}
