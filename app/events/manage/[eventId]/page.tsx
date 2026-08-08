import { notFound, redirect } from "next/navigation";
import { EventPublisherForm } from "@/components/events/EventPublisherForm";
import { getCurrentUser } from "@/modules/auth/current-user";
import { can } from "@/modules/auth/permissions";
import { isFeatureEnabled } from "@/modules/config/feature-flags";
import { courses } from "@/modules/courses/demo-courses";
import { EventAccessError, getManagedEvent } from "@/modules/events/event-repository";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ eventId: string }> };

export default async function EditEventPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?return_to=%2Fevents%2Fmanage");
  if (!await isFeatureEnabled("event_publishing")) redirect("/events");
  if (!can(user, "manageEvents")) redirect("/events");
  const { eventId } = await params;
  let event;
  try { event = await getManagedEvent(user, eventId); }
  catch (error: unknown) { if (error instanceof EventAccessError) redirect("/events/manage"); throw error; }
  if (!event) notFound();
  return <main className="editor-page"><div className="page-shell editor-page-heading"><span className="eyebrow">Edit organizer listing</span><h1>{event.title}</h1><p>Saving a draft removes it from the public board. Publishing applies the updated facts immediately.</p></div><div className="page-shell"><EventPublisherForm organizerEmail={user.email} initial={event} courses={courses.map((course) => ({ id: course.id, name: course.name, city: course.city }))} /></div></main>;
}
