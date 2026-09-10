import Link from "next/link";
import {redirect} from "next/navigation";
import {getCurrentUser} from "@/modules/auth/current-user";
import {listRoundHistory} from "@/modules/rounds/history-repository";
export const dynamic="force-dynamic";
export const metadata={title:"Round history",robots:{index:false,follow:false}};
export default async function HistoryPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const user=await getCurrentUser();if(!user)redirect("/sign-in?return_to=%2Frounds");
  const query=await searchParams;const page=Math.min(10000,Math.max(1,Number.parseInt(String(query.page??1),10)||1));
  const history=await listRoundHistory(user,page);
  return <main className="page-shell compact-page"><span className="eyebrow">Your game</span><h1>Round history</h1><p>App-recorded scores, private to your account.</p><div className="result-list">{history.items.map(r=><Link className="result-row" href={`/rounds/${r.id}`} key={r.id}><span><strong>{r.courseName}</strong><small>{r.title} · {new Date(r.completedAt).toLocaleDateString()}</small></span><b>{r.totalScore} strokes</b><span>{r.holeCount} holes</span></Link>)}</div>{!history.items.length?<section className="empty-state"><h2>No completed rounds yet</h2><p>Finish a personal or event scorecard to see it here.</p><Link className="button button-primary" href="/courses">Find a course</Link></section>:null}<nav className="pagination" aria-label="History pages">{page>1?<Link href={`/rounds?page=${page-1}`}>Previous</Link>:null}{history.hasNext?<Link href={`/rounds?page=${page+1}`}>Next</Link>:null}</nav></main>;
}
