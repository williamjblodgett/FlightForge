import { redirect } from "next/navigation";
import { EventPublisherForm } from "@/components/events/EventPublisherForm";
import { getCurrentUser } from "@/modules/auth/current-user";
import { can } from "@/modules/auth/permissions";
import { isFeatureEnabled } from "@/modules/config/feature-flags";
import { courses } from "@/modules/courses/demo-courses";

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?returnTo=%2Fevents%2Fnew");
  if (!await isFeatureEnabled("event_publishing")) redirect("/events");
  if (!can(user, "manageEvents")) return <main className="access-page page-shell"><span className="eyebrow">Coordinator verification required</span><h1>Publishing access is protected.</h1><p>Course owners, tournament directors, league administrators, and platform administrators can publish events. Contact support to verify an organizer account.</p></main>;
  return <main className="editor-page"><div className="page-shell editor-page-heading"><span className="eyebrow">Event operations</span><h1>Create an event</h1><p>Save privately while details are still changing, or publish immediately when the information is ready for players.</p></div><div className="page-shell"><EventPublisherForm organizerEmail={user.email} courses={courses.map((course) => ({ id: course.id, name: course.name, city: course.city }))} /></div></main>;
}
