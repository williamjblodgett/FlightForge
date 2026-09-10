import type {CoursePack} from "./pack";
export function validPack(value:unknown):value is CoursePack {
  if(!value||typeof value!=="object")return false;
  try {
  const p=value as CoursePack;
  if(p.version!==1||typeof p.packId!=="string"||!Number.isInteger(p.revision)||p.revision<1||typeof p.courseId!=="string"||typeof p.name!=="string"||!Array.isArray(p.holes)||p.holes.length>36||!Array.isArray(p.bag)||p.bag.length>100||!Array.isArray(p.pending)||p.pending.length>1000)return false;
  if(p.privateOwnerId===null&&(p.bag.length||p.round||p.pending.length))return false;
  if(p.round&&(p.round.courseId!==p.courseId||!p.round.context||p.round.context.courseId!==p.courseId||!Array.isArray(p.round.holeScores)||p.round.context.holeCount<1||p.round.context.holeCount>36))return false;
  if(p.holes.some(h=>!h||!Number.isInteger(h.number))||p.bag.some(d=>!d||typeof d.name!=="string"))return false;
  if(p.round?.holeScores.some(s=>!s||!Number.isInteger(s.holeNumber)||!Number.isInteger(s.strokes)||!Number.isInteger(s.penalties)))return false;
  return p.pending.every(s=>s&&typeof s==="object"&&Number.isInteger(s.holeNumber)&&s.holeNumber>=1&&s.holeNumber<=36&&Number.isInteger(s.strokes)&&s.strokes>=1&&s.strokes<=99&&Number.isInteger(s.penalties)&&s.penalties>=0&&s.penalties<=20&&typeof s.clientMutationId==="string");
  }catch{return false;}
}
