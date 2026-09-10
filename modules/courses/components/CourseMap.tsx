"use client";
import Link from "next/link";
import {useEffect,useMemo,useRef,useState,type PointerEvent} from "react";
import {LocateFixed,MapPin,Minus,Plus,Search,X} from "lucide-react";
import {clusterMapCourses,type CourseMapSummary,type MapBounds} from "../map-model";
export type {MapBounds} from "../map-model";
type Props={courses:CourseMapSummary[];selectedCourseId:string|null;onSelect:(id:string)=>void;onSearchArea?:(bounds:MapBounds)=>void;onClose?:()=>void;initialBounds?:MapBounds|null};
const REGION={west:-73.7,east:-66.85,south:41.05,north:47.48};
export function CourseMap({courses,selectedCourseId,onSelect,onSearchArea,onClose,initialBounds}:Props){
  const [center,setCenter]=useState({latitude:initialBounds?(initialBounds.north+initialBounds.south)/2:44.265,longitude:initialBounds?(initialBounds.east+initialBounds.west)/2:-70.275});
  const [zoom,setZoom]=useState(initialBounds?Math.min(32,Math.max(1,Math.min((REGION.north-REGION.south)/(initialBounds.north-initialBounds.south),(REGION.east-REGION.west)/(initialBounds.east-initialBounds.west)))):1);
  const [size,setSize]=useState({width:600,height:500});
  const [members,setMembers]=useState<string[]>([]);
  const [locationMessage,setLocationMessage]=useState("Course locator · use the list for all course details.");
  const canvas=useRef<HTMLDivElement>(null);
  const drag=useRef<{x:number;y:number;center:typeof center}|null>(null);
  const bounds=useMemo(()=>({north:center.latitude+(REGION.north-REGION.south)/zoom/2,south:center.latitude-(REGION.north-REGION.south)/zoom/2,east:center.longitude+(REGION.east-REGION.west)/zoom/2,west:center.longitude-(REGION.east-REGION.west)/zoom/2}),[center,zoom]);
  const clusters=useMemo(()=>clusterMapCourses(courses,bounds,size.width,size.height),[courses,bounds,size]);
  const selected=courses.find(c=>c.id===selectedCourseId);
  useEffect(()=>{const node=canvas.current;if(!node)return;const observer=new ResizeObserver(()=>setSize({width:Math.max(1,node.clientWidth),height:Math.max(1,node.clientHeight)}));observer.observe(node);return()=>observer.disconnect();},[]);
  function boundedCenter(latitude:number,longitude:number){const latSpan=(REGION.north-REGION.south)/2,lngSpan=(REGION.east-REGION.west)/2;return {latitude:Math.max(-90+latSpan,Math.min(90-latSpan,latitude)),longitude:Math.max(-180+lngSpan,Math.min(180-lngSpan,longitude))};}
  function pointerDown(event:PointerEvent<HTMLDivElement>){if((event.target as HTMLElement).closest("button,a"))return;drag.current={x:event.clientX,y:event.clientY,center};event.currentTarget.setPointerCapture(event.pointerId);}
  function pointerMove(event:PointerEvent<HTMLDivElement>){if(!drag.current)return;const rect=event.currentTarget.getBoundingClientRect();setCenter(boundedCenter(drag.current.center.latitude+(event.clientY-drag.current.y)/rect.height*(REGION.north-REGION.south)/zoom,drag.current.center.longitude-(event.clientX-drag.current.x)/rect.width*(REGION.east-REGION.west)/zoom));}
  function locate(){if(!navigator.geolocation){setLocationMessage("Location is not supported. Use search instead.");return;}setLocationMessage("Finding your location…");navigator.geolocation.getCurrentPosition(({coords})=>{setCenter(boundedCenter(coords.latitude,coords.longitude));setZoom(8);setLocationMessage("GPS accuracy ±"+Math.round(coords.accuracy)+" m. Confirm access before traveling.");},()=>setLocationMessage("Location unavailable. Search by town or course instead."),{enableHighAccuracy:true,timeout:8000});}
  return <section className="course-map" aria-label="Interactive map of course results">
    <div className="map-toolbar"><span><MapPin aria-hidden="true"/>New England course locator</span><div><button type="button" onClick={locate}><LocateFixed aria-hidden="true"/>My location</button>{onClose?<button type="button" onClick={onClose} aria-label="Close map"><X aria-hidden="true"/></button>:null}</div></div>
    <div ref={canvas} className="map-canvas" tabIndex={0} aria-label="Course map. Use arrow keys to pan." onKeyDown={event=>{if(event.target!==event.currentTarget)return;const delta:Record<string,[number,number]>={ArrowUp:[.15,0],ArrowDown:[-.15,0],ArrowLeft:[0,-.15],ArrowRight:[0,.15]};const d=delta[event.key];if(!d)return;event.preventDefault();setCenter(c=>boundedCenter(c.latitude+d[0]*(bounds.north-bounds.south),c.longitude+d[1]*(bounds.east-bounds.west)));}} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} onLostPointerCapture={()=>{drag.current=null;}}>
      {clusters.map(cluster=><button key={cluster.key} type="button" className={"map-pin"+(cluster.courses.some(c=>c.id===selectedCourseId)?" is-selected":"")} style={{left:cluster.x+"%",top:cluster.y+"%"}} aria-pressed={cluster.courses.some(c=>c.id===selectedCourseId)} aria-label={cluster.courses.length>1?"Show "+cluster.courses.length+" nearby courses":"Select "+cluster.courses[0].name} onClick={()=>{if(cluster.courses.length===1){setMembers([]);onSelect(cluster.courses[0].id);}else{setMembers(cluster.courses.map(c=>c.id));setCenter({latitude:cluster.courses.reduce((s,c)=>s+c.latitude,0)/cluster.courses.length,longitude:cluster.courses.reduce((s,c)=>s+c.longitude,0)/cluster.courses.length});setZoom(z=>Math.min(32,z*2));}}}><span>{cluster.courses.length>1?cluster.courses.length:<MapPin size={16} aria-hidden="true"/>}</span></button>)}
      <div className="map-zoom" aria-label="Map zoom controls"><button type="button" onClick={()=>setZoom(z=>Math.min(32,z*1.5))} aria-label="Zoom in"><Plus aria-hidden="true"/></button><button type="button" onClick={()=>setZoom(z=>Math.max(1,z/1.5))} aria-label="Zoom out"><Minus aria-hidden="true"/></button></div>
      {onSearchArea?<button className="search-area-button" onClick={()=>onSearchArea(bounds)}><Search aria-hidden="true"/>Search this area</button>:null}
      {!clusters.length?<div className="map-empty"><strong>No courses in this view</strong><span>Zoom out or change your filters.</span></div>:null}
    </div>
    {members.length>1?<section className="map-course-preview" aria-label="Nearby course listings">{courses.filter(c=>members.includes(c.id)).map(c=><button className="button" key={c.id} onClick={()=>{onSelect(c.id);setMembers([]);}}>{c.name} · {c.city}, {c.state}</button>)}</section>:null}
    {selected&&members.length<2?<section className="map-course-preview" aria-live="polite" aria-label="Selected course"><h3>{selected.name}</h3><p>{selected.city}, {selected.state} · {selected.holeCount||"Unconfirmed"} holes</p><p>{selected.operationalStatus==="UNAVAILABLE_REPORTED"?"Reported unavailable.":"Check current access, hours, and fees."}</p><Link className="button button-primary" href={"/courses/"+selected.slug}>Open course</Link></section>:null}
    <div className="map-caption" role="status">{locationMessage} Pins are approximate, not emergency navigation.</div>
  </section>;
}
