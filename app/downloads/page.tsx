import {DownloadsWorkspace} from "./workspace";
export const metadata={title:"Offline downloads",robots:{index:false,follow:false}};
export default function DownloadsPage(){return <main className="page-shell compact-page"><span className="eyebrow">Ready for weak signal</span><h1>Offline downloads</h1><p>Guides are saved only on this browser. Private packs may include your bag and active scores; use your own device.</p><DownloadsWorkspace/></main>;}
