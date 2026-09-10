import {getCurrentUser} from "@/modules/auth/current-user";
import {listManagedEvents} from "@/modules/events/event-repository";
import {can} from "@/modules/auth/permissions";
import {LeaguesWorkspace} from "./workspace";
export const metadata={title:"Local leagues"};
export default async function LeaguesPage(){const u=await getCurrentUser();const events=u&&can(u,"manageEvents")?await listManagedEvents(u):[];return <main className="page-shell compact-page"><span className="eyebrow">See you next week</span><h1>Local leagues</h1><p>Recurring rounds, RSVP, waitlists and attendance, all in one place.</p><LeaguesWorkspace templates={events.filter(e=>e.status==="PUBLISHED"&&e.visibility==="PUBLIC"&&Date.parse(e.startsAt)>new Date().getTime()).map(e=>({id:e.id,title:e.title,startsAt:e.startsAt,timeZone:e.timeZone}))}/></main>;}
