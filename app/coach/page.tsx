import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CameraCoachWorkspace } from "@/components/coach/CameraCoachWorkspace";
import { getCurrentUser } from "@/modules/auth/current-user";
import { can } from "@/modules/auth/permissions";
import { isFeatureEnabled } from "@/modules/config/feature-flags";
import { listCoachingUploads } from "@/modules/media-analysis/coaching-repository";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Camera coach and rangefinder", description: "Private guided throw recording, evidence-aware practice guidance, and GPS distance estimates." };

export default async function CoachPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?return_to=%2Fcoach");
  if (user.mustChangePassword) redirect("/account/password");
  if (!can(user, "useCameraCoach")) redirect("/");
  if (!await isFeatureEnabled("camera_coach")) return <main className="access-page page-shell"><span className="eyebrow">Camera coach</span><h1>Camera coaching is temporarily paused.</h1><p>Your existing private media remains unchanged.</p></main>;
  const uploads = await listCoachingUploads(user).catch(() => []);
  return <main className="coach-page page-shell"><CameraCoachWorkspace initialUploads={uploads}/></main>;
}
