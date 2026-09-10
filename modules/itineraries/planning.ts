import {z} from "zod";
export const planSchema=z.object({
  date:z.iso.date(),startMinutes:z.number().int().min(0).max(1439),daylightCutoffMinutes:z.number().int().min(0).max(1439),bufferMinutes:z.number().int().min(0).max(120),
  stops:z.array(z.object({courseId:z.string().max(120),day:z.number().int().min(0).max(1),roundMinutes:z.number().int().min(15).max(360),travelMinutes:z.number().int().min(0).max(720),breakMinutes:z.number().int().min(0).max(180)})).max(8),
});
export type Plan=z.infer<typeof planSchema>;
export function itinerary(plan:Plan) {
  const clocks=[plan.startMinutes,plan.startMinutes];
  return plan.stops.map(s=>{
    const arrival=clocks[s.day]+s.travelMinutes,finish=arrival+s.roundMinutes;
    clocks[s.day]=finish+s.breakMinutes;
    const date=new Date(plan.date+"T12:00:00Z");date.setUTCDate(date.getUTCDate()+s.day);
    return {...s,date:date.toISOString().slice(0,10),arrival,finish,overrun:Math.max(0,finish-(plan.daylightCutoffMinutes-plan.bufferMinutes))};
  });
}
export function clockLabel(minutes:number){return `${Math.floor(minutes/60)%24}:${String(minutes%60).padStart(2,"0")}${minutes>=1440?" (+1 day)":""}`;}
