import type {CoursePack} from "./pack";
import {validPack} from "./validation";
export const PACK_DATABASE="flightforge-course-packs";
export async function packDatabase():Promise<IDBDatabase>{
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(PACK_DATABASE,2);
    const timer=setTimeout(()=>reject(new Error("Offline storage did not respond. Close other tabs and try again.")),6000);
    request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains("packs"))request.result.createObjectStore("packs",{keyPath:"courseId"});if(!request.result.objectStoreNames.contains("control"))request.result.createObjectStore("control");};
    request.onblocked=()=>{clearTimeout(timer);reject(new Error("Close other tabs to access offline storage."));};
    request.onsuccess=()=>{clearTimeout(timer);request.result.onversionchange=()=>request.result.close();resolve(request.result);};
    request.onerror=()=>{clearTimeout(timer);reject(request.error);};
  });
}
async function mutate(action:(store:IDBObjectStore,fail:(error:Error)=>void,control:IDBObjectStore)=>void) {
  const db=await packDatabase();
  return new Promise<void>((resolve,reject)=>{
    let failure:Error|null=null;
    try{
      const tx=db.transaction(["packs","control"],"readwrite");
      const fail=(error:Error)=>{failure=error;tx.abort();};
      tx.oncomplete=()=>{db.close();resolve();};
      tx.onerror=tx.onabort=()=>{db.close();reject(failure??tx.error??new Error("Offline storage write failed."));};
      action(tx.objectStore("packs"),fail,tx.objectStore("control"));
    }catch(error){db.close();reject(error);}
  });
}
export async function listPacks():Promise<CoursePack[]>{
  const db=await packDatabase();
  return new Promise((resolve,reject)=>{
    try{const tx=db.transaction("packs","readonly"),r=tx.objectStore("packs").getAll();
      tx.oncomplete=()=>{db.close();if(r.result.some(p=>!validPack(p)))reject(new Error("A downloaded guide needs recovery. Open the offline guide to export it before replacing it."));else resolve(r.result as CoursePack[]);};
      tx.onerror=tx.onabort=()=>{db.close();reject(tx.error);};
    }catch(error){db.close();reject(error);}
  });
}
export async function savePack(pack:CoursePack,expectedEpoch:number) {
  await mutate((store,fail,control)=>{const epoch=control.get("epoch");epoch.onsuccess=()=>{if(Number(epoch.result??0)!==expectedEpoch){fail(new Error("A sign-out occurred while downloading. Sign in and download again."));return;}const read=store.get(pack.courseId);read.onsuccess=()=>{
    const previous=read.result as CoursePack|undefined;
    if(previous?.pending?.length){fail(new Error("This guide now has pending scores. Sync or export before replacing it."));return;}
    store.put({...pack,packId:crypto.randomUUID(),revision:1,locked:false});
  };};});
}
export async function removePack(courseId:string,packId:string,revision:number) {
  await mutate((store,fail)=>{const read=store.get(courseId);read.onsuccess=()=>{
    const previous=read.result as CoursePack|undefined;if(!previous)return;
    if(previous.packId!==packId||previous.revision!==revision){fail(new Error("This download changed in another tab. Reload and review before removing it."));return;}
    store.delete(courseId);
  };});
}
export async function unlockPack(pack:CoursePack) {
  await mutate((store,fail)=>{const read=store.get(pack.courseId);read.onsuccess=()=>{const p=read.result as CoursePack|undefined;
    if(!p||p.packId!==pack.packId||p.revision!==pack.revision){fail(new Error("The guide changed. Reload first."));return;}
    store.put({...p,locked:false,packId:crypto.randomUUID(),revision:p.revision+1});
  };});
}
export function announceSignOut(){if(typeof BroadcastChannel!=="undefined"){const channel=new BroadcastChannel("flightforge-offline");channel.postMessage("SIGNED_OUT");channel.close();}}
export async function clearPrivatePacksOnSignOut(keepPending=false) {
  await mutate((store,fail,control)=>{const read=store.getAll();read.onsuccess=()=>{
    const packs=read.result as CoursePack[];
    if(!keepPending&&packs.some(p=>p.privateOwnerId&&p.pending?.length)){fail(new Error("Unsynced scores are saved in Downloads. Export/sync them first, or sign out and keep them locked on this device."));return;}
    const epoch=control.get("epoch");epoch.onsuccess=()=>control.put(Number(epoch.result??0)+1,"epoch");
    for(const p of packs)if(p.privateOwnerId)store.put(p.pending.length?{...p,bag:[],locked:true,packId:crypto.randomUUID(),revision:p.revision+1}:{...p,privateOwnerId:null,bag:[],round:null,packId:crypto.randomUUID(),revision:p.revision+1});
  };});
  announceSignOut();
}
export async function deviceEpoch():Promise<number>{const db=await packDatabase();return new Promise((resolve,reject)=>{const tx=db.transaction("control","readonly"),r=tx.objectStore("control").get("epoch");tx.oncomplete=()=>{db.close();resolve(Number(r.result??0));};tx.onerror=tx.onabort=()=>{db.close();reject(tx.error);};});}
