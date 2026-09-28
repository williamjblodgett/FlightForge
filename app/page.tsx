import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Backpack, CalendarDays, ChevronRight, MapPin, Ruler, Search } from "lucide-react";
import { getCurrentUser } from "@/modules/auth/current-user";
import { isPlayerReady } from "@/modules/auth/player-readiness";
import { listActiveRoundSummaries } from "@/modules/rounds/round-repository";
import { listRoundHistory } from "@/modules/rounds/history-repository";
import { getFavoriteCourseIds } from "@/modules/courses/course-repository";
import { getCourseById } from "@/modules/courses/demo-courses";
import { CourseHeroArt } from "@/modules/courses/components/CourseHeroArt";
import { FavoriteButton } from "@/modules/courses/components/FavoriteButton";
import type { Course } from "@/modules/courses/types";
import { brand } from "@/config/brand";
import { LocalRoundDate } from "@/components/rounds/LocalRoundDate";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Your next round",description:`Find courses, play a round, and practice with ${brand.productName}.`};
export default async function Home(){
 const user=await getCurrentUser();
 const ready=isPlayerReady(user);
 const [active,history,favoriteIds]=ready?await Promise.all([
   listActiveRoundSummaries(user).catch(()=>null),
   listRoundHistory(user,1).catch(()=>null),
   getFavoriteCourseIds(user.email).catch(()=>null)
 ]):[[],{items:[],hasNext:false},[]];
 const round=active?.[0];
 const activeCourse=round?getCourseById(round.courseId):null;
 const savedCourses=(favoriteIds??[]).map(getCourseById).filter((course):course is Course=>Boolean(course)).slice(0,3);
 return <main className="player-home page-shell">
   <header className="player-greeting"><h1>{user?`Hello, ${user.displayName.split(" ")[0]}`:"Your next round starts here."}</h1><p>{user?"Good to have you out here.":"Find a course. Make time to play."}</p></header>
   <section className="home-action-card" aria-labelledby="home-play-title">
     <div><span className="eyebrow">{round?"Continue round":active===null?"Your rounds":"Get outside"}</span><h2 id="home-play-title">{round?.venueName??(active===null?"Pick up your scorecard":"Where will you play next?")}</h2>
       <p>{round?`${round.completedHoles} of ${round.holeCount} holes scored`:active===null?"Your saved rounds could not load here. Open Play to try again.":"Explore courses across New England."}</p>
       {activeCourse?<p className="home-round-location"><MapPin size={14} aria-hidden="true"/>{activeCourse.city}, {activeCourse.state}</p>:null}
       {round?.eventId==="flightforge-demo-event"?<small>Fictional demo round</small>:null}
     </div>
     <Link prefetch={false} className="button button-primary" href={round?`/play?roundId=${round.id}`:active===null?"/play":"/courses"}><span className="action-label">{round?"Resume round":active===null?"Open Play":"Find a course"}</span><ArrowRight aria-hidden="true"/></Link>
     <span className="home-art-caption">Illustrative landscape</span>
   </section>
   <nav className="home-quick-tools" aria-label="Player tools">
     <Link prefetch={false} href="/bag"><Backpack aria-hidden="true"/><span><strong>My Bag</strong><small>Discs & setup</small></span></Link>
     <Link prefetch={false} href="/bag#caddie-chat"><BookOpen aria-hidden="true"/><span><strong>Caddie</strong><small>Insights & tips</small></span></Link>
     <Link prefetch={false} href="/fieldwork"><Ruler aria-hidden="true"/><span><strong>Fieldwork</strong><small>Measure & practice</small></span></Link>
   </nav>
   <div className="home-notebooks">
     <section className="home-notebook" aria-labelledby="saved-home-title">
       <div className="home-section-heading"><h2 id="saved-home-title">Saved courses</h2><Link prefetch={false} href="/favorites">See all<ChevronRight size={16} aria-hidden="true"/></Link></div>
       {savedCourses.map(course=><article className="home-course-row" key={course.id}>
         <Link prefetch={false} href={`/courses/${course.slug}`}><span className="home-thumb" aria-hidden="true"><CourseHeroArt course={course} compact/></span><span className="home-row-copy"><strong>{course.name}</strong><small>{course.city}, {course.state}</small></span></Link>
         <FavoriteButton courseId={course.id} courseName={course.name} initialFavorite signedIn={ready}/>
       </article>)}
       {!savedCourses.length?<p className="home-notebook-empty">{favoriteIds===null?"Your saved courses could not load. Open Saved courses to try again.":ready?<>Save a course with its heart button to keep it here. <Link href="/courses">Explore courses</Link></>:<>Keep your next-round shortlist here. <Link href="/sign-in?return_to=%2F">Sign in</Link> or <Link href="/sign-up?return_to=%2F">create a free account</Link>.</>}</p>:null}
     </section>
     <section className="home-notebook" aria-labelledby="recent-home-title">
       <div className="home-section-heading"><h2 id="recent-home-title">Recent rounds</h2><Link prefetch={false} href="/rounds">See all<ChevronRight size={16} aria-hidden="true"/></Link></div>
       {history?.items.slice(0,3).map(item=><article className="home-course-row" key={item.id}><Link prefetch={false} href={`/rounds/${item.id}`}><span className="home-thumb"><CalendarDays aria-hidden="true"/></span><span className="home-row-copy"><strong>{item.courseName}</strong><small><LocalRoundDate value={item.completedAt}/> · {item.holeCount} holes</small></span></Link><span className="home-round-total">{item.totalScore}<small>strokes</small></span></article>)}
       {!history?.items.length?<p className="home-notebook-empty">{history===null?"Your history could not load. Open Round history to try again.":ready?"Your completed rounds will appear here. Scores stay private.":"Your rounds, scores and progress—all in one place when you sign in."}</p>:null}
     </section>
   </div>
   <form className="home-search" action="/courses"><label htmlFor="home-course-search"><Search aria-hidden="true"/>Find your next course</label><div><input id="home-course-search" name="q" type="search" placeholder="Course, city, or ZIP" /><button className="button button-secondary" type="submit">Search<ArrowRight aria-hidden="true"/></button></div></form>
   <section className="home-regions"><h2>Explore New England</h2><div>{[["Maine","ME"],["New Hampshire","NH"],["Vermont","VT"],["Massachusetts","MA"],["Connecticut","CT"],["Rhode Island","RI"]].map(([name,code])=><Link prefetch={false} key={code} href={`/courses?state=${code}`}>{name}<ChevronRight aria-hidden="true"/></Link>)}</div><p>Confirm access and conditions with the course before heading out.</p></section>
 </main>;
}
