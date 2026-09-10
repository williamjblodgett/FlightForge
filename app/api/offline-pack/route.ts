import {getD1Database} from "@/db/runtime";
import {getCourseById} from "@/modules/courses/demo-courses";
import {actor,handle,ToolError} from "@/modules/player-tools/server";
import {listPlayerDiscs} from "@/modules/bags/bag-repository";
import {getRoundForUser} from "@/modules/rounds/history-repository";
import type {CoursePack} from "@/modules/offline/pack";
export function GET(request:Request){return handle(async()=>{
  const q=new URL(request.url).searchParams;
  if(q.has("checkOwner")){const u=await actor(request);if(u.id!==q.get("checkOwner"))throw new ToolError("Sign in to the same player account to unlock this guide.",403);return {authorized:true};}
  const course=getCourseById(q.get("courseId")??"");if(!course)throw new ToolError("Course not found.",404);
  const user=q.get("private")==="1"?await actor(request):null,db=getD1Database();
  const active=user?await db.prepare("SELECT id FROM rounds WHERE created_by=? AND course_id=? AND status='IN_PROGRESS' ORDER BY updated_at DESC LIMIT 1").bind(user.id,course.id).first<{id:string}>():null;
  const detail=active&&user?await getRoundForUser(user,active.id):null;
  if(active&&(!detail||detail.status!=="IN_PROGRESS"))throw new ToolError("The active round changed. Try the download again.",409);
  const layout=detail?detail.context.layoutId:(await db.prepare("SELECT id FROM course_layouts WHERE course_id=? AND is_active=1 AND deleted_at IS NULL ORDER BY name LIMIT 1").bind(course.id).first<{id:string}>())?.id;
  const holes=layout?(await db.prepare("SELECT hole_number AS number,par,distance_feet AS distanceFeet,notes FROM holes WHERE layout_id=? ORDER BY hole_number").bind(layout).all<CoursePack["holes"][number]>()).results:[];
  const bag=user?(await listPlayerDiscs(user)).filter(d=>d.status==="IN_BAG").slice(0,100).map(d=>({name:d.nickname||d.moldName,speed:d.speed,glide:d.glide,turn:d.turn,fade:d.fade})):[];
  const pack:CoursePack={version:1,packId:crypto.randomUUID(),revision:1,locked:false,courseId:course.id,name:course.name,slug:course.slug,city:course.city,state:course.state,address:course.addressLine1,latitude:course.latitude,longitude:course.longitude,locationPrecision:course.locationPrecision,holeCount:course.holeCount,access:course.access,costNote:course.costNote,savedAt:new Date().toISOString(),reviewedAt:course.lastReviewedAt,privateOwnerId:user?.id??null,holes:detail?detail.context.pars.map((par,index)=>({number:index+1,par,distanceFeet:null,notes:null})):holes,bag,round:detail?.round??null,pending:[]};
  return {pack};
});}
