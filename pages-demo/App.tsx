import { lazy, Suspense, useEffect, useLayoutEffect, useState, type ComponentType, type CSSProperties } from "react";
import {
  Bell,
  BookOpen,
  CalendarDays,
  Compass,
  Disc3,
  Gauge,
  Home,
  LogIn,
  LogOut,
  Menu,
  Play,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { useDemoStore } from "./demo-store";
import { brand } from "@/config/brand";

const HomeScreen = lazy(() => import("./screens/HomeScreen").then((module) => ({ default: () => <RouteReady><module.HomeScreen /></RouteReady> })));
const DiscoverScreen = lazy(() => import("./screens/DiscoverScreen").then((module) => ({ default: () => <RouteReady><module.DiscoverScreen /></RouteReady> })));
const PlayScreen = lazy(() => import("./screens/PlayScreen").then((module) => ({ default: () => <RouteReady><module.PlayScreen /></RouteReady> })));
const EventsScreen = lazy(() => import("./screens/EventsScreen").then((module) => ({ default: () => <RouteReady><module.EventsScreen /></RouteReady> })));
const BagCaddieScreen = lazy(() => import("./screens/BagCaddieScreen").then((module) => ({ default: () => <RouteReady><module.BagCaddieScreen /></RouteReady> })));
const CoachScreen = lazy(() => import("./screens/CoachScreen").then((module) => ({ default: () => <RouteReady><module.CoachScreen /></RouteReady> })));
const OwnerScreen = lazy(() => import("./screens/OwnerScreen").then((module) => ({ default: () => <RouteReady><module.OwnerScreen /></RouteReady> })));
const ProfileScreen = lazy(() => import("./screens/ProfileScreen").then((module) => ({ default: () => <RouteReady><module.ProfileScreen /></RouteReady> })));

export type ScreenId = "home" | "discover" | "play" | "events" | "bag" | "coach" | "owner" | "profile";

const navigation = [
  { id: "discover", label: "Discover", icon: Compass },
  { id: "play", label: "Play", icon: Play },
  { id: "events", label: "Events", icon: CalendarDays },
  { id: "bag", label: "Bag + Caddie", icon: Disc3 },
  { id: "coach", label: "Learn", icon: BookOpen },
  { id: "owner", label: "Manage", icon: Gauge },
] satisfies Array<{ id: ScreenId; label: string; icon: typeof Compass }>;

const screenComponents: Record<ScreenId, ComponentType> = {
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
  const { state, signedIn, signOut, startSession } = useDemoStore();
  const [screen, setScreen] = useState<ScreenId>(() => screenFromHash());
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onHashChange = () => setScreen(screenFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useLayoutEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      document.getElementById("demo-main")?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [screen]);

  const navigate = (next: ScreenId) => {
    window.location.hash = next;
    setScreen(next);
    setMenuOpen(false);
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
        <span><strong>Public interactive preview.</strong> Personal changes stay on this device; real listings remain unclaimed unless marked otherwise.</span>
      </div>
      <header className="demo-header">
        <button className="brand-button" type="button" onClick={() => navigate("home")} aria-label={brand.logo.accessibleLabel}>
          <span className="brand-symbol" aria-hidden="true" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}brand/flightforge-mark.png)` }} />
          <span>{brand.logo.wordmark}</span>
        </button>
        {signedIn ? (
          <nav className="demo-desktop-nav" aria-label="Primary">
            {navigation.map((item) => (
              <button key={item.id} type="button" className={screen === item.id ? "active" : ""} onClick={() => navigate(item.id)}>
                {item.label}
              </button>
            ))}
          </nav>
        ) : null}
        <div className="demo-header-actions">
          {signedIn ? (
            <>
              <button className="icon-control notification-control" type="button" onClick={() => navigate("profile")} aria-label={`${state.notificationCount} notifications`}>
                <Bell aria-hidden="true" />
                <span>{state.notificationCount}</span>
              </button>
              <button className="demo-header-signout" type="button" onClick={signOut} aria-label="Sign out of the interactive demo">
                <LogOut aria-hidden="true" /><span>Sign out</span>
              </button>
              <button className="profile-chip" type="button" onClick={() => navigate("profile")} aria-label="Open profile and privacy">
                <span className="avatar">RP</span>
                <span>{state.displayName}</span>
              </button>
              <button className="icon-control menu-control" type="button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label="Toggle navigation">
                {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
              </button>
            </>
          ) : (
            <button className="demo-header-signout" type="button" onClick={startSession} aria-label="Enter the interactive demo">
              <LogIn aria-hidden="true" /><span>Enter demo</span>
            </button>
          )}
        </div>
      </header>
      {signedIn && menuOpen ? (
        <nav className="demo-mobile-menu" aria-label="Expanded navigation">
          <button type="button" onClick={() => navigate("profile")}><UserRound aria-hidden="true" />Profile &amp; privacy</button>
          {navigation.map((item) => (
            <button key={item.id} type="button" onClick={() => navigate(item.id)}><item.icon aria-hidden="true" />{item.label}</button>
          ))}
        </nav>
      ) : null}
      <main id="demo-main" tabIndex={-1}>
        {signedIn ? <Suspense fallback={<ScreenLoading />}><Screen /></Suspense> : <DemoSignedOutScreen onEnter={startSession} />}
      </main>
      <footer className="demo-footer">
        <div><strong>{brand.productName}</strong><span>Find your line. Forge your game.</span></div>
        <p>Working-title product demo · Maine seed market · No affiliation with PDGA, course directories, manufacturers, or retailers.</p>
        <button type="button" onClick={() => { if (!signedIn) startSession(); navigate("profile"); }}>Privacy & readiness</button>
      </footer>
      {signedIn ? <nav className="demo-bottom-nav" aria-label="Mobile quick navigation">
        <button type="button" className={screen === "home" ? "active" : ""} onClick={() => navigate("home")}><Home aria-hidden="true" /><span>Home</span></button>
        <button type="button" className={screen === "discover" ? "active" : ""} onClick={() => navigate("discover")}><Compass aria-hidden="true" /><span>Explore</span></button>
        <button type="button" className={`center-play ${screen === "play" ? "active" : ""}`} onClick={() => navigate("play")}><span><Play aria-hidden="true" /></span><b>Play</b></button>
        <button type="button" className={screen === "events" ? "active" : ""} onClick={() => navigate("events")}><CalendarDays aria-hidden="true" /><span>Events</span></button>
        <button type="button" className={["bag", "coach", "owner", "profile"].includes(screen) || menuOpen ? "active" : ""} onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen}><Menu aria-hidden="true" /><span>More</span></button>
      </nav> : null}
    </div>
  );
}

function ScreenLoading() {
  return <section className="screen screen-loading" role="status" aria-live="polite"><span className="demo-eyebrow">Opening field view</span><div /><div /><div /></section>;
}

function RouteReady({ children }: { children: React.ReactNode }) {
  useLayoutEffect(() => {
    const reset = () => window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    reset();
    const frame = window.requestAnimationFrame(reset);
    document.getElementById("demo-main")?.focus({ preventScroll: true });
    return () => window.cancelAnimationFrame(frame);
  }, []);
  return children;
}

function DemoSignedOutScreen({ onEnter }: { onEnter: () => void }) {
  const accountAppUrl = import.meta.env.VITE_ACCOUNT_APP_URL ?? "https://flightforge-maine-launch.williamjblodgett.chatgpt.site";
  return (
    <section className="screen demo-signed-out" aria-labelledby="demo-signed-out-heading">
      <span className="demo-eyebrow"><ShieldCheck aria-hidden="true" /> Device-local demo</span>
      <h1 id="demo-signed-out-heading">You’re signed out.</h1>
      <p>No server account was used on this GitHub Pages edition. Your device-local demonstration data remains in this browser unless you delete it from Profile &amp; privacy.</p>
      <button className="demo-button primary" type="button" onClick={onEnter}>
        <LogIn aria-hidden="true" /> Enter the interactive demo
      </button>
      <a className="demo-button secondary" href={accountAppUrl}>Create a real free account</a>
    </section>
  );
}

function screenFromHash(): ScreenId {
  const value = window.location.hash.replace(/^#/u, "");
  return value in screenComponents ? (value as ScreenId) : "home";
}

export function navigateTo(screen: ScreenId): void {
  window.location.hash = screen;
}
