import Link from "next/link";
import type {RoundAssistance} from "@/modules/rounds/assistance";
export function RoundAssistanceBar({context,returnTo}:{context:RoundAssistance|null;returnTo:string|null}){
  if(!returnTo&&!context)return null;
  return <aside className="round-assist-context" aria-label="Current round context"><div>{context?<><strong>{context.course} · Hole {context.holeNumber}</strong><p>{context.par===null?"Par not recorded":`Par ${context.par}`} · Tell the caddie your distance, lie, and wind.</p></>:<p>Your scorecard and place are saved on this device.</p>}</div>{returnTo?<Link className="button button-secondary" href={returnTo}>{context?`Return to hole ${context.holeNumber}`:returnTo.startsWith("/fieldwork")?"Return to Fieldwork":"Return to your round"}</Link>:null}</aside>;
}
