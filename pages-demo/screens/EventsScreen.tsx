import { CalendarDays, Check, Clock3, MapPin, Megaphone, Trophy, Users } from "lucide-react";
import { leagueStandings, tournaments } from "../data";
import { useDemoStore } from "../demo-store";

export function EventsScreen() {
  const { state, update } = useDemoStore();
  const toggleRegistration = (eventId: string) => update((current) => ({
    ...current,
    eventRegistrations: current.eventRegistrations.includes(eventId)
      ? current.eventRegistrations.filter((id) => id !== eventId)
      : [...current.eventRegistrations, eventId],
    notificationCount: current.notificationCount + 1,
  }));
  return (
    <div className="screen events-screen">
      <section className="screen-title compact-title"><div><span className="demo-eyebrow"><Trophy /> Events + leagues</span><h1>Competition without the spreadsheet maze.</h1><p>Explore fictional demonstration events, register with capacity protection, and follow a transparent regional league table.</p></div></section>
      <section className="event-feature-grid">
        {tournaments.map((event, index) => {
          const registered = state.eventRegistrations.includes(event.id);
          const remaining = event.capacity - event.registered - (registered ? 1 : 0);
          return <article key={event.id} className={`event-card event-tone-${index + 1}`}><div className="event-banner"><span>Fictional demonstration event</span><strong>{event.name.split(" ").map((word) => word[0]).join("")}</strong></div><div className="event-body"><div className="event-title-row"><div><span className="source-pill">Registration open</span><h2>{event.name}</h2></div><span className="event-price">${(event.feeCents / 100).toFixed(0)}<small>demo fee</small></span></div><div className="event-facts"><span><CalendarDays />{event.date}</span><span><MapPin />{event.course}</span><span><Trophy />{event.format}</span><span><Users />{remaining} places remaining</span></div><div className="capacity-meter"><div><i style={{ width: `${((event.registered + (registered ? 1 : 0)) / event.capacity) * 100}%` }} /></div><span>{event.registered + (registered ? 1 : 0)} / {event.capacity} registered</span></div><div className="tag-row">{event.divisions.map((division) => <span key={division}>{division}</span>)}</div><button className={`demo-button ${registered ? "secondary" : "primary"} wide`} type="button" onClick={() => toggleRegistration(event.id)}>{registered ? <><Check />Registered · Withdraw</> : "Register in demo"}</button><p className="demo-disclosure">No payment is processed. Withdrawal updates this device immediately.</p></div></article>;
        })}
      </section>

      <section className="league-section">
        <div className="section-heading-row"><div><span className="demo-eyebrow">Casco Bay Traveling League · Fictional</span><h2>Regional season standings</h2><p>Seven weekly events across four host courses. Best five scores count.</p></div><span className="season-pill"><Clock3 />Week 7 of 10</span></div>
        <div className="league-layout">
          <div className="standings-table" role="table" aria-label="League standings"><div className="standing-row header" role="row"><span>Rank</span><span>Player</span><span>Events</span><span>Points</span></div>{leagueStandings.map((entry) => <div key={entry.player} className={`standing-row ${entry.player === state.displayName ? "current-player" : ""}`} role="row"><span>{entry.rank}</span><span><i>{entry.player.split(" ").map((word) => word[0]).join("")}</i><strong>{entry.player}</strong>{entry.player === state.displayName ? <small>You</small> : null}</span><span>{entry.events}</span><span>{entry.points}</span></div>)}</div>
          <aside className="announcement-card"><div><Megaphone /><span>Organizer update</span></div><h3>Week eight moves to the Ridge layout</h3><p>Check-in opens at 5:10 PM. The fictional organizer posted this update for demonstration only.</p><time>Updated today · 9:30 AM</time><div className="announcement-divider" /><strong>Notification controls</strong><label className="check-row"><input type="checkbox" defaultChecked /><span>Schedule and group assignments</span></label><label className="check-row"><input type="checkbox" defaultChecked /><span>Weather delays and closures</span></label><label className="check-row"><input type="checkbox" /><span>Nearby event recommendations</span></label></aside>
        </div>
      </section>
    </div>
  );
}
