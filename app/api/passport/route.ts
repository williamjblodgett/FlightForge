import { actor,body,handle } from "@/modules/player-tools/server";
import { getPassport,passportSchema,savePassport } from "@/modules/passport/repository";
export function GET(request:Request){return handle(async()=>({stamps:await getPassport((await actor(request)).id)}));}
export function PUT(request:Request){return handle(async()=>savePassport((await actor(request)).id,await body(request,passportSchema)));}
