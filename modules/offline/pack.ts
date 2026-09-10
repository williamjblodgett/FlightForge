import type {ActiveRound} from "@/modules/rounds/round-repository";
export type CoursePack={
  version:1;packId:string;revision:number;locked:boolean;courseId:string;name:string;slug:string;city:string;state:string;address:string|null;
  latitude:number;longitude:number;locationPrecision:string;holeCount:number;access:string|null;costNote:string|null;
  savedAt:string;reviewedAt:string;privateOwnerId:string|null;
  holes:Array<{number:number;par:number|null;distanceFeet:number|null;notes:string|null}>;
  bag:Array<{name:string;speed:number;glide:number;turn:number;fade:number}>;
  round:ActiveRound|null;
  pending:Array<{holeNumber:number;strokes:number;penalties:number;clientMutationId:string}>;
};
