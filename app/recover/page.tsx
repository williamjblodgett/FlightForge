import {RecoveryWorkspace} from "./workspace";
import {courses} from "@/modules/courses/demo-courses";
import {getCurrentUser} from "@/modules/auth/current-user";
import {listPlayerDiscs} from "@/modules/bags/bag-repository";
import {isPlayerReady} from "@/modules/auth/player-readiness";
export const metadata={title:"Lost disc recovery",robots:{index:false,follow:false},referrer:"no-referrer"};
export default async function RecoveryPage(){const user=await getCurrentUser();const discs=isPlayerReady(user)?await listPlayerDiscs(user):[];return <main className="page-shell compact-page"><span className="eyebrow">Bring a good disc home</span><h1>Lost & found</h1><p>Use a private contact tag or a course lost-disc board. No phone number or email address is published.</p><RecoveryWorkspace signedIn={Boolean(user)} discs={discs.map(d=>({id:d.id,name:d.nickname||d.moldName}))} courses={courses.map(c=>({id:c.id,name:c.name,state:c.state}))}/></main>;}
