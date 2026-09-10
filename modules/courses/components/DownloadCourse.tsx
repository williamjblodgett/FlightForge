"use client";
import {ReadyControls} from "@/components/player-tools/ReadyControls";
import Link from "next/link";
import {useState,useRef} from "react";
import {toolRequest} from "@/modules/player-tools/client";
import {listPacks,savePack,deviceEpoch} from "@/modules/offline/store";
import {installOfflineShell} from "@/modules/offline/install";
import type {CoursePack} from "@/modules/offline/pack";
export function DownloadCourse({courseId,signedIn}:{courseId:string;signedIn:boolean}) {
  const[privateData,setPrivate]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
  const lock=useRef(false);
  async function save(){if(lock.current)return;lock.current=true;setBusy(true);try{const epoch=await deviceEpoch();const previous=(await listPacks()).find(p=>p.courseId===courseId);if(previous?.pending.length)throw new Error("This guide has unsynced scores. Sync or export them from Downloads before replacing it.");const {pack}=await toolRequest<{pack:CoursePack}>(`/api/offline-pack?courseId=${encodeURIComponent(courseId)}&private=${privateData?"1":"0"}`);await installOfflineShell();await savePack(pack,epoch);setMessage(`Available offline. Saved ${new Date(pack.savedAt).toLocaleString()} · ${Math.ceil(JSON.stringify(pack).length/1024)} KB.`);}catch(e){setMessage((e as Error).message);}finally{lock.current=false;setBusy(false);}}
  return <ReadyControls><section className="feature-card"><h2>Take this course offline</h2><p>Save course facts and available hole information. No satellite tiles, third-party imagery or live conditions are included.</p>{signedIn?<label className="check-label"><input type="checkbox" disabled={busy} checked={privateData} onChange={e=>setPrivate(e.target.checked)}/>Also store my bag and latest active round on this device. Anyone using this browser can view them offline.</label>:null}<div className="feature-actions"><button disabled={busy} onClick={()=>void save()}>{busy?"Saving guide…":"Save for offline use"}</button><Link href="/downloads">Manage downloads</Link></div><p role="status">{message}</p><p>On iPhone or Safari, open your guide before losing signal and keep it open. Offline reopening support still needs real-device validation.</p><small>GPS locations are approximate and not suitable for emergency navigation. Refresh this guide before your trip.</small></section></ReadyControls>;
}
