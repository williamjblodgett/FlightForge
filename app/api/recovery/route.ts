import {z} from "zod";
import {actor,body,handle} from "@/modules/player-tools/server";
import {createTag,tagSchema,recoveryOverview,describeTag,openRecovery,recoveryConversation,sendRecovery,closeRecovery,revokeTag} from "@/modules/recovery/repository";
const schema=z.discriminatedUnion("action",[
  z.object({action:z.literal("LOOKUP"),token:z.string().max(100).optional(),tagId:z.uuid().optional()}),
  z.object({action:z.literal("CONTACT"),id:z.uuid(),token:z.string().max(100).optional(),tagId:z.uuid().optional(),body:z.string().trim().min(10).max(1000)}),
  z.object({action:z.literal("MESSAGE"),id:z.uuid(),messageId:z.uuid(),body:z.string().trim().min(1).max(1000)}),
  z.object({action:z.enum(["CLOSE","DELETE","BLOCK","REVOKE"]),id:z.uuid()}),
]);
export function GET(request:Request){return handle(async()=>{const u=await actor(request),q=new URL(request.url).searchParams;return q.get("case")?recoveryConversation(u.id,q.get("case")!):recoveryOverview(u.id,q.get("course")??undefined);});}
export function POST(request:Request){return handle(async()=>createTag((await actor(request,true)).id,await body(request,tagSchema)));}
export function PUT(request:Request){return handle(async()=>{const i=await body(request,schema),u=await actor(request,["LOOKUP","CONTACT","MESSAGE"].includes(i.action));switch(i.action){case "LOOKUP":return describeTag(u.id,i.token,i.tagId);case "CONTACT":return openRecovery(u.id,i);case "MESSAGE":return sendRecovery(u.id,i.id,i.messageId,i.body);case "REVOKE":return revokeTag(u.id,i.id);default:return closeRecovery(u.id,i.id,i.action);}});}
