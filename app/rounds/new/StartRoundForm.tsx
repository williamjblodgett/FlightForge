"use client";
import {useClientReady} from "@/components/player-tools/ReadyControls";
import { useRef,useState,type FormEvent } from "react";
export function StartRoundForm({courseId,holeCount,layouts}:{courseId:string;holeCount:number;layouts:Array<{id:string;name:string;holeCount:number}>}){
  const ready=useClientReady();
  const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);const key=useRef<string|null>(null);
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();if(busy)return;setBusy(true);setMessage("");const data=new FormData(event.currentTarget);key.current??=crypto.randomUUID();
    try{const response=await fetch("/api/rounds/personal",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({courseId,layoutId:data.get("layoutId")||null,holeCount:Number(data.get("holeCount")),idempotencyKey:key.current})});const body=await response.json() as {next?:string;error?:{message?:string}};if(!response.ok)throw new Error(body.error?.message??"Unable to start the round.");window.location.assign(body.next??"/play");}
    catch(error){setMessage(error instanceof Error?error.message:"Connection lost. Please retry.");}finally{setBusy(false);}}
  return <form className="settings-form" onChange={()=>{if(!busy)key.current=null;}} onSubmit={submit}><fieldset disabled={!ready||busy} className="settings-form"><label>Layout<select name="layoutId"><option value="">Personal scorecard — pars not confirmed</option>{layouts.map(l=><option value={l.id} key={l.id}>{l.name} · {l.holeCount} holes</option>)}</select></label><label>Holes to play<input type="number" name="holeCount" min={1} max={36} defaultValue={holeCount||18} required/></label><p>Published layouts use their recorded hole count and pars. Otherwise this is a personal, strokes-only scorecard with your selected hole count.</p><button className="button button-primary" disabled={busy}>{busy?"Starting…":"Start personal round"}</button>{message?<p role="alert">{message}</p>:null}</fieldset></form>;
}
