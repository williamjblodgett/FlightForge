import type { RoundDetail } from "./history-repository";
export function buildRoundRecap(detail:RoundDetail) {
  const scores=detail.round.holeScores;
  const penalties=scores.reduce((n,s)=>n+s.penalties,0);
  const known=detail.context.pars.length===detail.context.holeCount&&detail.context.pars.every(p=>p!==null);
  const hardest=[...scores].sort((a,b)=>(b.strokes+b.penalties-(known?detail.context.pars[b.holeNumber-1]!:0))-(a.strokes+a.penalties-(known?detail.context.pars[a.holeNumber-1]!:0))).slice(0,3).map(s=>s.holeNumber);
  return {
    penalties,hardest,aces:scores.filter(s=>s.strokes===1&&s.penalties===0).length,
    relativeToPar:known?detail.totalScore-detail.context.pars.reduce<number>((n,p)=>n+p!,0):null,
    drill:penalties>0?"Landing-zone drill: choose a safe target well away from hazards. Make ten controlled throws, recording where each lands.":"Distance-control drill: choose three safe landing zones at different distances. Throw three discs to each and record your accuracy.",
    reason:penalties>0?"You recorded penalties. Practicing conservative landing zones may help.":"Hole totals cannot diagnose throwing technique. This is a general practice suggestion, not a form assessment.",
  };
}
