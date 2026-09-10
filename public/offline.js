/* Dedicated static shell. No authenticated HTML or API response enters CacheStorage. */
const statusNode=document.getElementById("status"),guide=document.getElementById("guide"),courseSelect=document.getElementById("courses");
let packs=[],current=null,busy=false;
function status(message){statusNode.textContent=message;}
function node(tag,text,parent=guide){const el=document.createElement(tag);if(text!==undefined)el.textContent=String(text);parent.append(el);return el;}
function button(text,action,parent=guide){const el=node("button",text,parent);el.type="button";el.disabled=busy;el.addEventListener("click",()=>void action());return el;}
function openDb(){return new Promise((resolve,reject)=>{const r=indexedDB.open("flightforge-course-packs",2);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains("packs"))r.result.createObjectStore("packs",{keyPath:"courseId"});if(!r.result.objectStoreNames.contains("control"))r.result.createObjectStore("control");};r.onblocked=()=>reject(new Error("Close other tabs and reload this guide."));r.onsuccess=()=>{r.result.onversionchange=()=>r.result.close();resolve(r.result);};r.onerror=()=>reject(r.error);});}
async function transaction(mode,action){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction("packs",mode),r=action(tx.objectStore("packs"));tx.oncomplete=()=>{db.close();resolve(r?.result);};tx.onerror=()=>{db.close();reject(tx.error);};tx.onabort=()=>{db.close();reject(tx.error);};});}
async function persist(target,candidate){
  const db=await openDb();
  const next={...candidate,revision:target.revision+1};
  await new Promise((resolve,reject)=>{
    const tx=db.transaction("packs","readwrite"),store=tx.objectStore("packs"),read=store.get(target.courseId);let failure=null;
    read.onsuccess=()=>{const latest=read.result;if(!latest||latest.locked||latest.packId!==target.packId||latest.revision!==target.revision||latest.privateOwnerId!==target.privateOwnerId){failure=new Error("This guide changed in another tab or was locked at sign-out. Your current draft can still be exported. Reload to review.");tx.abort();return;}store.put(next);};
    tx.oncomplete=()=>{db.close();resolve();};tx.onerror=tx.onabort=()=>{db.close();reject(failure||tx.error||new Error("Offline save failed."));};
  });
  Object.assign(target,next);
}
function exportDraft(){const data=JSON.stringify(current,null,2),url=URL.createObjectURL(new Blob([data],{type:"application/json"})),a=document.createElement("a");a.href=url;a.download="flightforge-offline-round.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status("Private guide exported. Store the file securely.");}
function numberInput(label,value,min,max,parent){const wrapper=node("label",label,parent),input=node("input",undefined,wrapper);input.type="number";input.value=String(value);input.min=String(min);input.max=String(max);input.required=true;return input;}
async function sync(){
  if(busy||!current?.round||!current.pending.length)return;
  const target=current;
  busy=true;courseSelect.disabled=true;render();status("Synchronizing saved scores…");
  try{
    while(target.pending.length){
      const change=target.pending[0];
      const response=await fetch("/api/rounds/active",{method:"PUT",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify({...change,roundId:target.round.id,eventId:target.round.eventId,expectedVersion:target.round.version})});
      const result=await response.json();
      if(!response.ok){if(response.status===409&&result.round){const panel=node("section");node("h2","Another device changed this round",panel);node("p","Your pending scores have not been discarded. Export them, then choose whether to apply your queued edits on top of the latest saved version.",panel);button("Export my draft",exportDraft,panel);button("Use latest version and keep my queued edits",async()=>{if(result.round.id!==target.round.id||result.round.eventId!==target.round.eventId||result.round.courseId!==target.courseId){status("Unexpected round response. Draft preserved.");return;}await persist(target,{...target,round:result.round});status("Latest version loaded. Review the queued edits, then choose Sync again.");render();},panel);}throw new Error(result.error?.message||"Sign in with the same player account and retry. Your draft is preserved.");}
      if(result.round.id!==target.round.id||result.round.eventId!==target.round.eventId||result.round.courseId!==target.courseId)throw new Error("Unexpected round response. Draft preserved.");
      await persist(target,{...target,round:result.round,pending:target.pending.filter(s=>s.clientMutationId!==change.clientMutationId)});
    }
    status("All scores synchronized. Finish the round from the main scorecard when online.");
  }catch(error){status(error.message||"Connection failed. Your pending scores are preserved.");}
  finally{busy=false;courseSelect.disabled=false;if(!current||!target.pending.length)render();else guide.querySelectorAll("button").forEach(b=>{b.disabled=false;});}
}
function render(){
  guide.replaceChildren();if(!current)return;
  const p=current;
  if(!valid(p)){node("p","This guide needs recovery or update. Export the raw record before replacing it.");button("Export recoverable record",exportDraft);return;}
  if(p.locked){node("p","This private guide was locked at sign-out. Sign in to the same account, then unlock it in Downloads. Your pending scores are preserved.");return;}
  const section=node("section");node("h2",p.name,section);node("p",p.city+", "+p.state,section);node("p",p.address||"Entrance address not confirmed",section);node("small","Saved "+new Date(p.savedAt).toLocaleString()+" · course facts reviewed "+p.reviewedAt,section);node("p",p.access||"Confirm access before travel.",section);node("p",p.costNote||"Confirm current pricing.",section);node("small","Approximate location: "+p.latitude+", "+p.longitude+" ("+p.locationPrecision.toLowerCase().replaceAll("_"," ")+"). No map tiles are downloaded. Not for emergency navigation.",section);
  if(p.holes.length){const h=node("section");node("h2","Downloaded hole information",h);for(const hole of p.holes)node("p","Hole "+hole.number+" · par "+(hole.par??"unknown")+" · "+(hole.distanceFeet?hole.distanceFeet+" ft":"distance unknown")+(hole.notes?" · "+hole.notes:""),h);}
  else node("p","No operator-supplied hole details have been downloaded.");
  if(p.bag.length){const bag=node("section");node("h2","Your downloaded bag",bag);for(const d of p.bag)node("p",d.name+" · "+[d.speed,d.glide,d.turn,d.fade].join(" / "),bag);}
  if(p.round){
    const card=node("section"),hud=node("div",undefined,card);hud.className="score-hud";node("strong",p.pending.length+" pending changes · last sync "+new Date(p.round.lastSyncedAt).toLocaleString(),hud);
    const merged=new Map(p.round.holeScores.map(s=>[s.holeNumber,s]));for(const s of p.pending)merged.set(s.holeNumber,s);
    node("h2","Offline scorecard",card);node("p",p.round.context?.title||"Your active round",card);
    const table=node("table",undefined,card);node("caption","Saved scores plus your pending edits",table);const head=node("tr",undefined,node("thead",undefined,table));for(const t of ["Hole","Strokes","Penalties"])node("th",t,head);const tbody=node("tbody",undefined,table);
    for(const s of [...merged.values()].sort((a,b)=>a.holeNumber-b.holeNumber)){const row=node("tr",undefined,tbody);for(const v of [s.holeNumber,s.strokes,s.penalties])node("td",v,row);}
    const form=node("form",undefined,card),hole=numberInput("Hole",Math.min((p.round.context?.holeCount||p.holeCount),merged.size+1),1,p.round.context?.holeCount||p.holeCount,form),strokes=numberInput("Strokes",3,1,99,form),penalties=numberInput("Penalties",0,0,20,form),submit=node("button","Save offline score",form);submit.type="submit";submit.disabled=busy;
    form.addEventListener("submit",async e=>{e.preventDefault();if(busy||!form.reportValidity())return;const change={holeNumber:Number(hole.value),strokes:Number(strokes.value),penalties:Number(penalties.value),clientMutationId:crypto.randomUUID()};const target=current;busy=true;courseSelect.disabled=true;submit.disabled=true;try{await persist(target,{...target,pending:[...target.pending,change]});status("Hole "+hole.value+" saved on this device. Sync when connected.");busy=false;render();}catch(error){status(error.message||"Storage failed. This score was not saved; the form remains available.");}finally{busy=false;courseSelect.disabled=false;submit.disabled=false;}});
    button("Sync pending scores",sync,card);button("Export private draft",exportDraft,card);const link=node("a","Open main scorecard (online)",card);link.href="/play?roundId="+encodeURIComponent(p.round.id);
    node("small","Keep this guide and the main scorecard from editing the same hole simultaneously. Conflicts keep your local entries for review.",card);
  }else node("p","No active round was included. Download again with private data enabled after starting a round online.");
}
function invalidate(message){current=null;packs=[];courseSelect.replaceChildren();render();status(message);}
courseSelect.addEventListener("change",async()=>{if(busy)return;const selected=courseSelect.value===""?null:packs[Number(courseSelect.value)]||null;current=null;render();if(!selected)return;try{const latest=await transaction("readonly",store=>store.get(selected.courseId));if(!latest||latest.locked||latest.packId!==selected.packId){invalidate("Guide changed or locked. Reload Downloads before continuing.");return;}current=latest;render();}catch{invalidate("Guide access could not be confirmed. Reload when storage is available.");}});
function valid(p){try{return p&&p.version===1&&typeof p.packId==="string"&&Number.isInteger(p.revision)&&p.revision>0&&typeof p.name==="string"&&typeof p.locationPrecision==="string"&&Array.isArray(p.holes)&&p.holes.length<=36&&Array.isArray(p.bag)&&Array.isArray(p.pending)&&p.pending.length<=1000&&(!p.round||(p.round.courseId===p.courseId&&Array.isArray(p.round.holeScores)&&p.round.context))&&!(p.privateOwnerId===null&&(p.round||p.bag.length||p.pending.length))&&p.holes.every(h=>h&&Number.isInteger(h.number))&&p.bag.every(d=>d&&typeof d.name==="string")&&p.pending.every(s=>s&&Number.isInteger(s.holeNumber)&&Number.isInteger(s.strokes)&&Number.isInteger(s.penalties))&&(!p.round||p.round.holeScores.every(s=>s&&Number.isInteger(s.holeNumber)&&Number.isInteger(s.strokes)&&Number.isInteger(s.penalties)));}catch{return false;}}
if(typeof BroadcastChannel!=="undefined"){const channel=new BroadcastChannel("flightforge-offline");channel.onmessage=e=>{if(e.data==="SIGNED_OUT"){current=null;packs=[];courseSelect.replaceChildren();render();status("Signed out. Private guides are locked. Reopen Downloads after signing in.");}};}
async function recheck(){const target=current;if(!target||!target.privateOwnerId)return;try{const latest=await transaction("readonly",store=>store.get(target.courseId));if(!latest||latest.locked||latest.packId!==target.packId||latest.privateOwnerId!==target.privateOwnerId){invalidate("This guide was locked or replaced. Reload Downloads before continuing.");}}catch{invalidate("Private guide access could not be confirmed. Reload when storage is available.");}}
addEventListener("pageshow",()=>void recheck());document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")void recheck();});
function network(){document.getElementById("network").textContent=navigator.onLine?"Connection available":"Offline";}
addEventListener("online",network);addEventListener("offline",network);network();
transaction("readonly",store=>store.getAll()).then(result=>{packs=result;for(const [index,p] of packs.entries()){const option=document.createElement("option");option.value=String(index);option.textContent=(p?.name||"Guide needs recovery")+(p?.privateOwnerId?" · private pack":"");courseSelect.append(option);}status(packs.length?"Choose a downloaded guide.":"No guides downloaded. Save a course while online first.");}).catch(()=>status("Offline storage is unavailable. No scores or guide data have been loaded."));
