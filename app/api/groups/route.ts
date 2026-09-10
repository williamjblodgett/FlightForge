import { z } from "zod";
import {actor,body,handle,ToolError} from "@/modules/player-tools/server";
import {createGroup,createGroupSchema,listGroups,getGroup,requestJoin,manageMember,addGuest,startGroupRound,setGroupStatus,rotateGroupLink,guestScore,leaveGroup} from "@/modules/groups/repository";
const actionSchema=z.discriminatedUnion("action",[
  z.object({action:z.literal("READ"),id:z.uuid(),token:z.string().max(100).optional()}),
  z.object({action:z.literal("JOIN"),id:z.uuid(),token:z.string().max(100).optional()}),
  z.object({action:z.literal("MEMBER"),id:z.uuid(),memberId:z.uuid(),approve:z.boolean()}),
  z.object({action:z.literal("GUEST"),id:z.uuid(),guestId:z.uuid(),name:z.string().trim().min(1).max(40)}),
  z.object({action:z.literal("LEAVE"),id:z.uuid()}),
  z.object({action:z.literal("START"),id:z.uuid()}),z.object({action:z.literal("INVITE"),id:z.uuid()}),
  z.object({action:z.literal("STATUS"),id:z.uuid(),status:z.enum(["OPEN","LOCKED","CLOSED"])}),
  z.object({action:z.literal("SCORE"),id:z.uuid(),memberId:z.uuid(),holeNumber:z.number().int().min(1).max(36),strokes:z.number().int().min(1).max(99),penalties:z.number().int().min(0).max(20),version:z.number().int().positive()}),
]);
export function GET(request:Request){return handle(async()=>{const u=await actor(request,true),q=new URL(request.url).searchParams,id=q.get("id");return id?getGroup(u.id,id):{groups:await listGroups(u.id)};});}
export function POST(request:Request){return handle(async()=>createGroup(await actor(request,true),await body(request,createGroupSchema)));}
export function PUT(request:Request){return handle(async()=>{const i=await body(request,actionSchema),u=await actor(request,true,i.action==="READ");switch(i.action){case "LEAVE":return leaveGroup(u.id,i.id);case "READ":return getGroup(u.id,i.id,i.token);case "JOIN":return requestJoin(u,i.id,i.token);case "MEMBER":return manageMember(u.id,i.id,i.memberId,i.approve);case "GUEST":return addGuest(u.id,i.id,i.name,i.guestId);case "START":return startGroupRound(u,i.id);case "STATUS":return setGroupStatus(u.id,i.id,i.status);case "INVITE":return rotateGroupLink(u.id,i.id);case "SCORE":return guestScore(u.id,i.id,i.memberId,i);default:throw new ToolError("Unknown action.");}});}
