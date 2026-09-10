import {z} from "zod";
import {actor,body,handle} from "@/modules/player-tools/server";
import {attendance,createSeries,leagueDetail,listSeries,rsvp,seriesSchema} from "@/modules/leagues/repository";
import {calendarText} from "@/modules/leagues/calendar";
export function GET(request:Request){return handle(async()=>{const u=await actor(request),q=new URL(request.url).searchParams,id=q.get("id");return id?leagueDetail(u.id,id):{leagues:await listSeries()};});}
export function POST(request:Request){return handle(async()=>createSeries(await actor(request),await body(request,seriesSchema)));}
export function PUT(request:Request){return handle(async()=>{const u=await actor(request),i=await body(request,z.discriminatedUnion("action",[z.object({action:z.literal("RSVP"),eventId:z.uuid(),going:z.boolean()}),z.object({action:z.literal("ATTENDANCE"),id:z.uuid(),attended:z.boolean()}),z.object({action:z.literal("CALENDAR"),id:z.uuid()})]));if(i.action==="RSVP")return rsvp(u.id,i.eventId,i.going);if(i.action==="ATTENDANCE")return attendance(u.id,i.id,i.attended);return {calendar:calendarText((await leagueDetail(u.id,i.id)).events)};});}
