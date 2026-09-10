import type { Course } from "./types";
export type MapBounds = {north:number;south:number;east:number;west:number};
export type CourseMapSummary = Pick<Course,"id"|"slug"|"name"|"city"|"state"|"latitude"|"longitude"|"holeCount"|"priceType"|"priceFromCents"|"operationalStatus"|"locationPrecision">;
export function toCourseMapSummary(c:Course):CourseMapSummary {const{id,slug,name,city,state,latitude,longitude,holeCount,priceType,priceFromCents,operationalStatus,locationPrecision}=c;return{id,slug,name,city,state,latitude,longitude,holeCount,priceType,priceFromCents,operationalStatus,locationPrecision};}
export function parseMapBounds(value:string):MapBounds|null {const parts=value.split(",");if(parts.length!==4||parts.some(p=>!p.trim()))return null;const[west,south,east,north]=parts.map(Number);if(![west,south,east,north].every(Number.isFinite)||west < -180||east>180||south < -90||north>90||west>=east||south>=north)return null;return{west,south,east,north};}
export function serializeMapBounds(b:MapBounds){return[b.west,b.south,b.east,b.north].map(v=>v.toFixed(6)).join(",");}
export function isInMapBounds(c:Pick<Course,"latitude"|"longitude">,b:MapBounds|null){return !b||(c.latitude>=b.south&&c.latitude<=b.north&&c.longitude>=b.west&&c.longitude<=b.east);}
export function clampCoursePage(raw:string,total:number,size=24){const n=/^\d+$/u.test(raw)?Number(raw):1;return Math.min(Math.max(1,Math.ceil(total/size)),Math.max(1,Number.isFinite(n)?n:1));}
export function clusterMapCourses(courses:CourseMapSummary[],bounds:MapBounds,width:number,height:number){
  const cells=new Map<string,{courses:CourseMapSummary[];x:number;y:number}>();
  for(const c of courses){if(!isInMapBounds(c,bounds))continue;const x=(c.longitude-bounds.west)/(bounds.east-bounds.west)*width;const y=(bounds.north-c.latitude)/(bounds.north-bounds.south)*height;const key=`${Math.floor(x/48)}:${Math.floor(y/48)}`;const cell=cells.get(key);if(!cell)cells.set(key,{courses:[c],x,y});else{const n=cell.courses.length;cell.x=(cell.x*n+x)/(n+1);cell.y=(cell.y*n+y)/(n+1);cell.courses.push(c);}}
  return [...cells].map(([key,c])=>({key,...c,x:c.x/width*100,y:c.y/height*100}));
}
