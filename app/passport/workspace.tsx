"use client";
import Link from "next/link";
import {useState} from "react";
import {ReadyControls} from "@/components/player-tools/ReadyControls";
import {ToolLoadState} from "@/components/player-tools/ToolLoadState";
import {useToolResource} from "@/components/player-tools/useToolResource";
import {toolRequest} from "@/modules/player-tools/client";
import type {PassportStamp} from "@/modules/passport/repository";

export function PassportWorkspace({courses}:{courses:{id:string;name:string;state:string;slug:string}[]}) {
  const resource=useToolResource<{stamps:PassportStamp[]}>("/api/passport");
  const stamps=resource.data?.stamps??[];
  const [message,setMessage]=useState(""),[busy,setBusy]=useState(false);
  const [courseId,setCourse]=useState(courses[0]?.id??""),[date,setDate]=useState(""),[state,setState]=useState("PLAYED"),[challenge,setChallenge]=useState(false);
  async function save(id=courseId,next=state) {
    setBusy(true);setMessage("");
    try {
      await toolRequest("/api/passport","PUT",{courseId:id,state:next,visitedOn:date||null});
      const refreshed=await resource.refresh();
      setMessage(refreshed?"Passport saved privately.":"Your passport entry was saved. Retry loading your passport to see the latest details; do not submit it again.");
    } catch(e) {if(!resource.handleAuthFailure(e))setMessage((e as Error).message);} finally {setBusy(false);}
  }
  const played=stamps.filter(s=>s.state==="PLAYED");
  return <ReadyControls><div className="feature-stack">
    {message?<p role="status">{message}</p>:null}
    <ToolLoadState {...resource} label="passport" onRetry={resource.refresh} hasData={Boolean(resource.data)}/>
    {resource.ready?<section className="feature-card"><h2>{played.length} course {played.length===1?"listing":"listings"} played</h2><label className="check-label"><input type="checkbox" checked={challenge} onChange={e=>setChallenge(e.target.checked)}/>Show my six-state challenge</label>{challenge?<div className="passport-states">{["ME","NH","VT","MA","CT","RI"].map(s=><div key={s}><strong>{s}</strong><span>{played.filter(p=>p.region===s).length} played</span></div>)}</div>:null}<small>Private by default. Layout listings count individually; this is not a count of distinct properties.</small></section>:null}
    <form className="feature-card" onSubmit={e=>{e.preventDefault();void save();}}><h2>Add to your passport</h2><fieldset className="ready-controls feature-form" disabled={busy||!resource.ready}>
      <label>Course<select value={courseId} onChange={e=>setCourse(e.target.value)}>{courses.map(c=><option value={c.id} key={c.id}>{c.name} · {c.state}</option>)}</select></label>
      <label>Entry<select value={state} onChange={e=>setState(e.target.value)}><option value="PLAYED">I have played here</option><option value="WISHLIST">Want to play</option></select></label>
      <label>Played date (optional)<input type="date" value={date} max={new Date().toISOString().slice(0,10)} onChange={e=>setDate(e.target.value)}/></label>
      <button className="button button-primary">{busy?"Saving…":"Save passport entry"}</button>
    </fieldset></form>
    {resource.data?<section className="feature-card"><h2>Your stamps & wishlist</h2>{stamps.length?stamps.map(s=><article className="feature-row" key={s.courseId}><div><Link href={"/courses/"+s.slug}>{s.name}</Link><p>{s.source.replaceAll("_"," ").toLowerCase()} · {s.region}{s.date?" · "+s.date.slice(0,10):""}</p></div>{s.source!=="APP_RECORDED"?<button disabled={busy||!resource.ready} onClick={()=>void save(s.courseId,"REMOVE")}>Remove entry</button>:<small>From your saved round</small>}</article>):resource.ready?<p>No stamps yet. Complete a round or add a historical visit.</p>:null}</section>:null}
    <Link className="button button-secondary" href="/plan">Plan a New England weekend</Link>
  </div></ReadyControls>;
}
