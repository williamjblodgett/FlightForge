"use client";

import {useSyncExternalStore} from "react";

const subscribe=()=>()=>{};
const format: Intl.DateTimeFormatOptions={month:"short",day:"numeric",year:"numeric"};

/** Hydrate from a stable UTC label, then use the player's device timezone. */
export function LocalRoundDate({value}:{value:string}) {
  const label=useSyncExternalStore(subscribe,
    ()=>new Date(value).toLocaleDateString(undefined,format),
    ()=>new Date(value).toLocaleDateString("en-US",{...format,timeZone:"UTC"})+" UTC");
  return <time dateTime={value}>{label}</time>;
}
