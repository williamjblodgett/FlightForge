"use client";
import {useSyncExternalStore,type ReactNode} from "react";
const subscribe=()=>()=>{};
export function useClientReady(){return useSyncExternalStore(subscribe,()=>true,()=>false);}
// Disabled native controls cannot submit or lose a first tap before React attaches handlers.
export function ReadyControls({children}:{children:ReactNode}){
  const ready=useClientReady();
  return <fieldset className="ready-controls" disabled={!ready} inert={!ready} aria-busy={!ready}>{children}</fieldset>;
}
