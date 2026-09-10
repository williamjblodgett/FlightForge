import {GroupWorkspace} from "./workspace";
export const metadata={title:"Group scorecard",robots:{index:false,follow:false},referrer:"no-referrer"};
export default async function GroupPage({params}:{params:Promise<{id:string}>}){return <main className="page-shell compact-page"><GroupWorkspace id={(await params).id}/></main>;}
