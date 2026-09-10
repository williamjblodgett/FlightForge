import type { Metadata } from "next";
import { getCurrentUser } from "@/modules/auth/current-user";
import {nextAuthDestination} from "@/modules/auth/continuation";
import { redirect } from "next/navigation";
import { listPlayerDiscs } from "@/modules/bags/bag-repository";
import { PracticeWorkspace } from "./workspace";
export const metadata:Metadata={title:"Practice history",robots:{index:false,follow:false}};
export default async function PracticePage(){const u=await getCurrentUser();if(!u)redirect("/sign-in?return_to=%2Fpractice");const next=nextAuthDestination(u,"/practice");if(next!=="/practice")redirect(next);const discs=await listPlayerDiscs(u);return <main className="page-shell compact-page"><span className="eyebrow">Build your own flight book</span><h1>Practice history</h1><p>Save measured throws to a specific disc. You decide which representative throws your caddie can use.</p><PracticeWorkspace discs={discs.map(d=>({id:d.id,name:`${d.nickname||d.moldName} · ${d.color||"no color"} · ${d.weightGrams||"?"} g`}))}/></main>;}
