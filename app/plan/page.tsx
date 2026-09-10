import {courses} from "@/modules/courses/demo-courses";
import {Planner} from "./workspace";
export const metadata={title:"Weekend planner",robots:{index:false,follow:false}};
export default function PlanPage(){return <main className="page-shell compact-page"><span className="eyebrow">Make a day of it</span><h1>Weekend planner</h1><p>Build a one- or two-day plan with room for driving, breaks and daylight.</p><Planner courses={courses.filter(c=>c.operationalStatus!=="UNAVAILABLE_REPORTED").map(c=>({id:c.id,name:c.name,state:c.state,difficulty:c.difficulty,holes:c.holeCount,slug:c.slug}))}/></main>;}
