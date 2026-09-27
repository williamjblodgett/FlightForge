import type { Metadata } from "next";
import Link from "next/link";
import { Disc3, Sparkles, Camera, Ruler, History, Users, MessageCircle, Heart, Shield, CalendarDays, ChevronRight, Settings } from "lucide-react";
import { getCurrentUser } from "@/modules/auth/current-user";
import { can } from "@/modules/auth/permissions";
import { nextAuthDestination } from "@/modules/auth/continuation";
import { SignOutButton } from "@/components/auth/SignOutButton";
export const metadata:Metadata={title:"Player tools",robots:{index:false,follow:false}};
const sections=[
  {title:"Play & explore",tools:[
    {title:"Play together",copy:"Invitations and shared scoreboards",href:"/groups",icon:Users},
    {title:"Saved courses",copy:"Your next-round shortlist",href:"/favorites",icon:Heart},
    {title:"Local leagues",copy:"Weekly rounds, RSVP and attendance",href:"/leagues",icon:CalendarDays},
    {title:"Weekend planner",copy:"Courses, travel and daylight",href:"/plan",icon:CalendarDays},
    {title:"Course passport",copy:"Your New England playing history",href:"/passport",icon:History},
    {title:"Round history",copy:"Saved scores and personal results",href:"/rounds",icon:History}
  ]},
  {title:"Practice & improve",tools:[
    {title:"My bag",copy:"Discs and flight characteristics",href:"/bag",icon:Disc3},
    {title:"Caddie",copy:"Plan a shot with your own discs",href:"/bag#caddie-chat",icon:Sparkles},
    {title:"Camera coach",copy:"Record, review and practice",href:"/coach",icon:Camera},
    {title:"Fieldwork",copy:"Find space and estimate throw distance",href:"/fieldwork",icon:Ruler},
    {title:"Practice history",copy:"Teach your caddie your real distances",href:"/practice",icon:History}
  ]},
  {title:"Community & essentials",tools:[
    {title:"Messages",copy:"Your private conversations",href:"/messages",icon:MessageCircle},
    {title:"Community",copy:"Players and course conversations",href:"/community",icon:Users},
    {title:"Course updates",copy:"Conditions from courses you follow",href:"/updates",icon:Heart},
    {title:"Lost & found",copy:"Private disc tags and recovery",href:"/recover",icon:Disc3},
    {title:"Offline downloads",copy:"Course guides, bag and active scores",href:"/downloads",icon:Shield}
  ]}
];
export default async function MorePage(){
  const user=await getCurrentUser();
  return <main className="tools-page page-shell">
    <header><h1>More</h1><p>{user?user.displayName:"Player tools and account settings"}</p></header>
    <section className="account-tools"><h2>Account & privacy</h2>{user?<>
      <Link prefetch={false} className="button button-secondary" href={nextAuthDestination(user,"/profile")}><Settings aria-hidden="true"/>Profile & privacy</Link>
      {can(user,"manageEvents")?<Link prefetch={false} href="/events/manage"><CalendarDays aria-hidden="true"/>Manage events</Link>:null}
      {can(user,"viewAdmin")?<Link prefetch={false} href="/admin"><Shield aria-hidden="true"/>Administration</Link>:null}
      <SignOutButton variant="standalone"/>
    </>:<><Link prefetch={false} className="button button-primary" href="/sign-in?return_to=%2Fmore">Sign in</Link><Link prefetch={false} className="button button-secondary" href="/sign-up?return_to=%2Fmore">Create free account</Link></>}</section>
    <nav className="tool-groups" aria-label="All player tools">{sections.map(section=><section key={section.title}>
      <h2>{section.title}</h2><div className="tool-directory">{section.tools.map(({title,copy,href,icon:Icon})=><Link prefetch={false} key={title} href={href}><Icon aria-hidden="true"/><span><strong>{title}</strong><small>{copy}</small></span><ChevronRight aria-hidden="true"/></Link>)}</div>
    </section>)}</nav>
  </main>;
}
