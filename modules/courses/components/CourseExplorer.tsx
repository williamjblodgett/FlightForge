"use client";
import {useEffect,useRef,useState,useTransition,type ReactNode,type RefObject} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {List,Map,Search,SlidersHorizontal} from "lucide-react";
import type {Course,CourseDifficulty,CoursePriceType} from "../types";
import {CourseCard} from "./CourseCard";
import {CourseMap} from "./CourseMap";
import {serializeMapBounds,toCourseMapSummary,type MapBounds,type CourseMapSummary} from "../map-model";
type ViewMode="split"|"list"|"map";
export type ExplorerFilters={query:string;difficulty:CourseDifficulty|"ALL";priceType:CoursePriceType|"ALL";holes:"ALL"|"9"|"18"|"36";state:string;evidence:"ALL"|"AUTHORITATIVE"|"DIRECTORY";view:ViewMode};
type Props={courses:Course[];mapCourses?:CourseMapSummary[];initialFavoriteIds:string[];signedIn:boolean;variant?:"home"|"directory";totalMatches?:number;page?:number;pageSize?:number;initialFilters?:ExplorerFilters;initialBounds?:MapBounds|null};
export function CourseExplorer({courses,mapCourses,initialFavoriteIds,signedIn,totalMatches=courses.length,page=1,pageSize=24,initialFilters,initialBounds}:Props){
  const router=useRouter();const[query,setQuery]=useState(initialFilters?.query??"");const[filtersOpen,setFiltersOpen]=useState(false);const[view,setView]=useState<ViewMode>(initialFilters?.view??"list");const[selected,setSelected]=useState<string|null>(null);const[pending,startTransition]=useTransition();const mapTrigger=useRef<HTMLButtonElement>(null);
  const pins=mapCourses??courses.map(toCourseMapSummary);
  const [previousView,setPreviousView]=useState(initialFilters?.view); if(previousView!==initialFilters?.view){setPreviousView(initialFilters?.view);setView(initialFilters?.view??"list");}
  function navigate(changes:Record<string,string|null>,resetPage=true){const params=new URLSearchParams(window.location.search);if(!params.has("state")&&initialFilters?.state&&initialFilters.state!=="ALL")params.set("state",initialFilters.state);for(const[key,value]of Object.entries(changes)){if(!value||value==="ALL")params.delete(key);else params.set(key,value);}if(resetPage)params.delete("page");startTransition(()=>router.push("/courses"+(params.size?"?"+params:""),{scroll:false}));}
  function setViewMode(mode:ViewMode){setView(mode);navigate({view:mode},false);}
  function pageHref(n:number){const p=new URLSearchParams();if(initialFilters?.query)p.set("q",initialFilters.query);if(initialFilters?.state&&initialFilters.state!=="ALL")p.set("state",initialFilters.state);if(initialFilters?.difficulty&&initialFilters.difficulty!=="ALL")p.set("difficulty",initialFilters.difficulty);if(initialFilters?.priceType&&initialFilters.priceType!=="ALL")p.set("price",initialFilters.priceType);if(initialFilters?.holes&&initialFilters.holes!=="ALL")p.set("holes",initialFilters.holes);if(initialFilters?.evidence&&initialFilters.evidence!=="ALL")p.set("source",initialFilters.evidence);if(initialBounds)p.set("bbox",serializeMapBounds(initialBounds));p.set("view",view);p.set("page",String(n));return"/courses?"+p;}
  function clear(){setQuery("");navigate({q:null,state:null,difficulty:null,price:null,holes:null,source:null,evidence:null,bbox:null});}
  const map=<CourseMap courses={pins} selectedCourseId={selected} onSelect={setSelected} initialBounds={initialBounds} onSearchArea={b=>navigate({bbox:serializeMapBounds(b)})} onClose={()=>setViewMode("list")}/>;
  return <section className="explorer-shell page-shell compact-explorer" aria-labelledby="results-heading">
    <header className="compact-page-heading"><div><span className="eyebrow">New England</span><h1>Find your course</h1></div><span>{totalMatches} {totalMatches === 1 ? "listing" : "listings"}</span></header>
    <form className="explorer-topbar" role="search" onSubmit={event=>{event.preventDefault();navigate({q:query});}}>
      <div className="search-field"><Search aria-hidden="true"/><label className="sr-only" htmlFor="course-search">Search by course, city, or amenity</label><input id="course-search" type="search" placeholder="Course, town, ZIP, or amenity" value={query} onChange={e=>setQuery(e.target.value)}/></div>
      <button className="button button-primary" type="submit">Search</button><button className="filter-trigger" type="button" aria-expanded={filtersOpen} aria-controls="course-filters" onClick={()=>setFiltersOpen(v=>!v)}><SlidersHorizontal aria-hidden="true"/>Filters</button>
      <div className="view-toggle" aria-label="Result view"><button type="button" onClick={()=>setViewMode("list")} aria-label="List view" aria-pressed={view==="list"}><List aria-hidden="true"/></button><button ref={mapTrigger} type="button" onClick={()=>setViewMode("map")} aria-label="Map view" aria-pressed={view==="map"}><Map aria-hidden="true"/></button></div>
    </form>
    <nav className="state-filter-chips" aria-label="Browse courses by state">{[["ALL","All"],["ME","Maine"],["MA","Massachusetts"],["NH","New Hampshire"],["VT","Vermont"],["CT","Connecticut"],["RI","Rhode Island"]].map(([code,name])=><Link aria-current={(initialFilters?.state??"ALL")===code?"page":undefined} key={code} href={"/courses"+(code==="ALL"?"":"?state="+code)}>{name}</Link>)}</nav>
    <div id="course-filters" className={"filter-row"+(filtersOpen?" is-open":"")}>
      <label>Difficulty<select value={initialFilters?.difficulty??"ALL"} onChange={e=>navigate({difficulty:e.target.value})}>{["ALL","UNRATED","BEGINNER","RECREATIONAL","INTERMEDIATE","ADVANCED"].map(v=><option key={v} value={v}>{v==="ALL"?"Any difficulty":v.toLowerCase()}</option>)}</select></label>
      <label>Price<select value={initialFilters?.priceType??"ALL"} onChange={e=>navigate({price:e.target.value})}><option value="ALL">Any price</option><option value="FREE">Free</option><option value="PAID">Pay to play</option><option value="MIXED">Mixed pricing</option></select></label>
      <label>Holes<select value={initialFilters?.holes??"ALL"} onChange={e=>navigate({holes:e.target.value})}><option value="ALL">Any count</option><option value="9">9+</option><option value="18">18+</option><option value="36">36+</option></select></label>
      <label>Listing source<select value={initialFilters?.evidence??"ALL"} onChange={e=>navigate({source:e.target.value})}><option value="ALL">All listings</option><option value="AUTHORITATIVE">Course or public agency</option><option value="DIRECTORY">Directory</option></select></label><button className="button" type="button" onClick={clear}>Clear filters</button>
    </div>
    <div className="results-summary"><h2 id="results-heading">{totalMatches} {totalMatches===1?"course":"courses"}{initialBounds?" in this area":""}</h2>{initialBounds?<button className="button" onClick={()=>navigate({bbox:null})}>Clear map area</button>:null}<p role="status">{pending?"Updating directory…":"Confirm current access, hours, and fees before traveling."}</p></div>
    <div className={"explorer-layout view-"+(view==="map"?"list":view)} aria-busy={pending}><div className="course-results-list">
      {courses.map(c=><CourseCard key={c.id} course={c} favorite={initialFavoriteIds.includes(c.id)} signedIn={signedIn} selected={selected===c.id} onSelect={setSelected}/>)}
      {!courses.length?<div className="empty-state"><h3>No courses match</h3><p>Try another town or clear your filters.</p><button className="button" onClick={clear}>Clear filters</button></div>:null}
      {totalMatches>pageSize?<nav className="pagination" aria-label="Course result pages">{page<=1?<button className="button" disabled>Previous</button>:<Link className="button" href={pageHref(page-1)}>Previous</Link>}<span>Page {page} of {Math.max(1,Math.ceil(totalMatches/pageSize))}</span>{page*pageSize>=totalMatches?<button className="button" disabled>Next</button>:<Link className="button" href={pageHref(page+1)}>Next</Link>}</nav>:null}
    </div>{view==="split"?<div className="map-panel">{map}</div>:null}</div>
    {view==="map"?<MapDialog returnFocusRef={mapTrigger} onClose={()=>setViewMode("list")}>{map}</MapDialog>:null}
  </section>;
}
function MapDialog({children,onClose,returnFocusRef}:{children:ReactNode;onClose:()=>void;returnFocusRef:RefObject<HTMLButtonElement|null>}){
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const dialog=ref.current;if(!dialog)return;const returnTarget=returnFocusRef.current;const overflow=document.body.style.overflow;dialog.showModal();document.body.style.overflow="hidden";return()=>{dialog.close();document.body.style.overflow=overflow;if(returnTarget?.isConnected)returnTarget.focus();};},[returnFocusRef]);
  return <dialog ref={ref} className="course-map-dialog" aria-label="Explore courses on the map" onCancel={event=>{event.preventDefault();onClose();}}>{children}</dialog>;
}
