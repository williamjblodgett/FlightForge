import type { Metadata } from "next";
import { authReturnPath, nextAuthDestination } from "@/modules/auth/continuation";
import { getRoundAssistance } from "@/modules/rounds/assistance";
import { RoundAssistanceBar } from "@/components/rounds/RoundAssistanceBar";
import { redirect } from "next/navigation";
import { CameraCoachWorkspace } from "@/components/coach/CameraCoachWorkspace";
import { getCurrentUser } from "@/modules/auth/current-user";
import { can } from "@/modules/auth/permissions";
import { isFeatureEnabled } from "@/modules/config/feature-flags";
import { listCoachingUploads } from "@/modules/media-analysis/coaching-repository";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Camera coach and rangefinder", description: "Private guided throw recording, research-informed practice guidance, and GPS distance estimates." };

export default async function CoachPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const query=await searchParams;
  const params=new URLSearchParams();
  for(const key of ["return_to","round","hole","practice"])if(typeof query[key]==="string")params.set(key,query[key]);
  const destination="/coach"+(params.size?"?"+params.toString():"");
  const returnTo=typeof query.return_to==="string"?authReturnPath(query.return_to):null;
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?return_to="+encodeURIComponent(destination));
  const next=nextAuthDestination(user,destination);if(next!==destination)redirect(next);
  const roundContext=await getRoundAssistance(user,typeof query.round==="string"?query.round:undefined,typeof query.hole==="string"?Number(query.hole):undefined);
  if (!can(user, "useCameraCoach")) redirect("/");
  if (!await isFeatureEnabled("camera_coach")) return <main className="access-page page-shell"><span className="eyebrow">Camera coach</span><h1>Camera coaching is temporarily paused.</h1><p>Your existing private media remains unchanged.</p></main>;
  const history=await listCoachingUploads(user).then(uploads=>({uploads,error:false})).catch(()=>({uploads:[],error:true}));
  return <main className="coach-page page-shell"><RoundAssistanceBar context={roundContext} returnTo={returnTo}/><CameraCoachWorkspace initialUploads={history.uploads} historyError={history.error} practiceRequested={query.practice==="1"}/></main>;
}
