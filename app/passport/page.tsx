import {getCurrentUser} from "@/modules/auth/current-user";
import {courses} from "@/modules/courses/demo-courses";
import {PassportWorkspace} from "./workspace";
export const metadata={title:"New England passport",robots:{index:false,follow:false}};
export default async function PassportPage(){const user=await getCurrentUser();return <main className="page-shell compact-page"><span className="eyebrow">Six states. Your own pace.</span><h1>Your course passport</h1><p>A private record of places you have played and want to explore. A stamp is not GPS verification.</p><PassportWorkspace signedIn={Boolean(user)} courses={courses.map(c=>({id:c.id,name:c.name,state:c.state,slug:c.slug}))}/></main>;}
