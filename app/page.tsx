import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Compass, Play, Ruler, Search, Disc3 } from "lucide-react";
import { getCurrentUser } from "@/modules/auth/current-user";
import { listActiveRoundSummaries } from "@/modules/rounds/round-repository";
import { listRoundHistory } from "@/modules/rounds/history-repository";
import { brand } from "@/config/brand";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Your next round",description:`Find courses, play a round, and practice with ${brand.productName}.`};
export default async function Home(){
 const user=await getCurrentUser();
 const ready=Boolean(user&&!user.identityLinkRequired&&!user.mustChangePassword&&user.onboardingComplete);
 const [active,history]=ready&&user?await Promise.all([listActiveRoundSummaries(user).catch(()=>[]),listRoundHistory(user,1).catch(()=>({items:[],hasNext:false}))]):[[],{items:[],hasNext:false}];
 return <main className="player-home page-shell">
   <header className="player-greeting"><span className="eyebrow">{user?`Welcome back, ${user.displayName}`:"Disc golf, from the first tee"}</span><h1>Your next round<br/><em>starts here.</em></h1><p>Find a course. Keep your score. Enjoy the walk.</p></header>
   <section className="home-action-card" aria-labelledby="home-play-title"><div><span className="eyebrow">{active.length?"Pick up where you left off":"Make time to play"}</span><h2 id="home-play-title">{active[0]?.venueName??"Ready for a round?"}</h2><p>{active[0]?`${active[0].completedHoles} of ${active[0].holeCount} holes scored`:"Choose a course and keep a personal scorecard."}</p></div><Link className="button button-primary" href={active[0]?`/play?roundId=${active[0].id}`:"/courses"}><Play aria-hidden="true"/>{active.length?"Resume round":"Find a course"}</Link></section>
   <form className="home-search" action="/courses"><label htmlFor="home-course-search"><Search aria-hidden="true"/>Where are you playing?</label><div><input id="home-course-search" name="q" type="search" placeholder="Course, city, or ZIP" /><button className="button button-secondary" type="submit">Search<ArrowRight aria-hidden="true"/></button></div></form>
   <nav className="home-quick-tools" aria-label="Player tools"><Link href="/fieldwork"><Ruler/><span>Fieldwork<small>Measure & practice</small></span></Link><Link href="/bag"><Disc3/><span>Bag & caddie<small>Your discs, your shot</small></span></Link><Link href="/courses?view=map"><Compass/><span>Course map<small>Explore New England</small></span></Link></nav>
   {history.items.length?<section className="home-recent"><div className="section-heading"><h2>Recent rounds</h2><Link href="/rounds">All history</Link></div>{history.items.slice(0,3).map(round=><Link className="history-row" href={`/rounds/${round.id}`} key={round.id}><span><strong>{round.courseName}</strong><small>{round.title}</small></span><ArrowRight aria-hidden="true"/></Link>)}</section>:<section className="home-recent"><h2>{ready?"Your field notebook":"Make it your game"}</h2><p>{ready?"Completed rounds will appear here. Your scores stay private.":"A free FlightForge account keeps your bag, favorites, and completed rounds together."}</p><Link href={ready?"/rounds":"/sign-up"}>{ready?"View round history":"Create a free account"} <ArrowRight aria-hidden="true"/></Link></section>}
   <section className="home-regions"><h2>Six states. Plenty to explore.</h2><div>{[["Maine","ME"],["New Hampshire","NH"],["Vermont","VT"],["Massachusetts","MA"],["Connecticut","CT"],["Rhode Island","RI"]].map(([name,code])=><Link key={code} href={`/courses?state=${code}`}>{name}<ArrowRight aria-hidden="true"/></Link>)}</div><p>Check current access and conditions before travelling.</p></section>
 </main>;
}
