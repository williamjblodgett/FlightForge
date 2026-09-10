import {afterEach,describe,it,expect,vi} from "vitest";
import {writeOfflineRound,readOfflineRound,validateOfflineRound,type OfflineRoundState} from "./offline-store";
const state=(id:string):OfflineRoundState=>({schemaVersion:2,eventId:id,ownerScope:"test",roundId:null,serverVersion:1,scores:Array.from({length:18},()=>null),pending:[],updatedAt:new Date().toISOString(),lastSyncedAt:null,currentHole:12});
afterEach(()=>vi.unstubAllGlobals());
describe("truthful device persistence",()=>{
  it("reports memory-only when durable stores fail",async()=>{vi.stubGlobal("indexedDB",undefined);vi.stubGlobal("localStorage",{setItem(){throw Error("quota");},getItem(){throw Error("denied");}});expect(await writeOfflineRound(state("denied"))).toBe("MEMORY_ONLY");});
  it("journals current hole with local storage fallback",async()=>{const store=new Map<string,string>();vi.stubGlobal("indexedDB",undefined);vi.stubGlobal("localStorage",{setItem:(k:string,v:string)=>store.set(k,v),getItem:(k:string)=>store.get(k)??null,removeItem:(k:string)=>store.delete(k)});expect(await writeOfflineRound(state("saved"))).toBe("LOCAL_STORAGE");expect((await readOfflineRound("saved","test"))?.currentHole).toBe(12);});
  it("rejects an out-of-range active hole",()=>expect(validateOfflineRound({...state("bad"),currentHole:99},"bad","test")).toBeNull());
});
