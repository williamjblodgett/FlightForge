import {getCurrentUser} from "@/modules/auth/current-user";
import {courses} from "@/modules/courses/demo-courses";
import {GroupsWorkspace} from "./workspace";
import {PlayerToolGate} from "@/components/player-tools/PlayerToolGate";
export const metadata={title:"Play together",robots:{index:false,follow:false}};
export default async function GroupsPage(){const user=await getCurrentUser();return <main className="page-shell compact-page"><span className="eyebrow">A good round starts with good company</span><h1>Play together</h1><p>Create a private group or welcome nearby players. All join requests need host approval. Group access is for adults who accept our community guidelines.</p><PlayerToolGate user={user} returnTo="/groups"><GroupsWorkspace courses={courses.map(c=>({id:c.id,name:c.name,state:c.state,holes:c.holeCount}))}/></PlayerToolGate></main>;}
