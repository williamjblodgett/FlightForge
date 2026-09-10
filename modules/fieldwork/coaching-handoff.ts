export type PracticeHandoff = { distanceFeet: number | null; discUsed: string; throwType: "BACKHAND" | "FOREHAND" | "PUTTING" | "STANDSTILL"; uncertaintyMeters: number };
export function readPracticeHandoff(raw: string | null, now=Date.now()): PracticeHandoff | null {
  try {
    const value: unknown=JSON.parse(raw??"null"); if(!value||typeof value!=="object")return null;
    const v=value as Record<string,unknown>;
    if(v.version!==1||typeof v.expiresAt!=="number"||v.expiresAt<now||v.expiresAt>now+31*60_000||typeof v.distanceFeet!=="number"||!Number.isFinite(v.distanceFeet)||v.distanceFeet<0||typeof v.uncertaintyMeters!=="number"||!Number.isFinite(v.uncertaintyMeters)||v.uncertaintyMeters<0||!["BACKHAND","FOREHAND","PUTTING","STANDSTILL"].includes(String(v.throwType)))return null;
    return {distanceFeet:v.distanceFeet<=1500?Math.round(v.distanceFeet):null,discUsed:typeof v.discUsed==="string"?v.discUsed.trim().slice(0,100):"",throwType:v.throwType as PracticeHandoff["throwType"],uncertaintyMeters:v.uncertaintyMeters};
  }catch{return null;}
}
