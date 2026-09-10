import { getD1Database } from "@/db/runtime";
import { getCourseById, fictionalDemoCourse } from "@/modules/courses/demo-courses";
import { getPublishedEventById } from "@/modules/events/event-repository";
import type { EventRecord } from "@/modules/events/types";
import type { AuthenticatedUser } from "@/modules/auth/types";
import { ensurePersistedUserId } from "@/modules/auth/account-repository";

export type RoundContext = {
  id: string; kind: "PERSONAL" | "EVENT" | "DEMO";
  courseId: string; layoutId: string | null; holeCount: number;
  title: string; venueName: string; pars: Array<number | null>;
  parSource: "COURSE_LAYOUT" | "UNKNOWN" | "FICTIONAL_DEMO";
  schemaVersion: 1;
  layoutVersion?:number|null;
  holeMetadata?:Array<{number:number;id:string|null;version:number|null}>;
};
export type RoundInput = Pick<EventRecord, "id" | "courseId" | "layoutId" | "holeCount" | "title" | "venueName"> & Partial<Pick<RoundContext, "kind" | "pars" | "parSource">>;

export async function snapshotRoundContext(input: RoundInput): Promise<RoundContext> {
  if (!input.courseId) throw new Error("A round requires a course.");
  const pars: Array<number | null> = Array(input.holeCount).fill(null);
  let layoutVersion:number|null=null;
  const holeMetadata=Array.from({length:input.holeCount},(_,index)=>({number:index+1,id:null as string|null,version:null as number|null}));
  let parSource: RoundContext["parSource"] = "UNKNOWN";
  if (input.layoutId) {
    const rows = await getD1Database().prepare(
      `SELECT h.id AS holeId,h.version AS holeVersion,l.version AS layoutVersion,h.hole_number AS holeNumber, h.par FROM holes h JOIN course_layouts l ON l.id = h.layout_id
       WHERE l.id = ? AND l.course_id = ? AND l.is_active = 1 AND l.deleted_at IS NULL ORDER BY h.hole_number`,
    ).bind(input.layoutId, input.courseId).all<{ holeNumber: number; par: number;holeId:string;holeVersion:number;layoutVersion:number }>();
    for (const hole of rows.results) if (hole.holeNumber >= 1 && hole.holeNumber <= pars.length && hole.par >= 1 && hole.par <= 9) {pars[hole.holeNumber - 1] = hole.par;layoutVersion=hole.layoutVersion;holeMetadata[hole.holeNumber-1]={number:hole.holeNumber,id:hole.holeId,version:hole.holeVersion};}
    if (pars.every((par) => par !== null)) parSource = "COURSE_LAYOUT";
  }
  return { schemaVersion: 1, layoutVersion,holeMetadata, id: input.id, kind: input.kind ?? (input.id === "flightforge-demo-event" ? "DEMO" : "EVENT"), courseId: input.courseId, layoutId: input.layoutId, holeCount: input.holeCount, title: input.title, venueName: input.venueName, pars, parSource };
}

export async function resolveRoundContext(user: AuthenticatedUser, key: string): Promise<RoundContext | null> {
  const userId = await ensurePersistedUserId(user);
  const existing = await getD1Database().prepare(
    "SELECT context_json AS contextJson FROM rounds WHERE created_by = ? AND COALESCE(session_key, event_id) = ? ORDER BY created_at DESC LIMIT 1",
  ).bind(userId, key).first<{ contextJson: string | null }>();
  if (existing?.contextJson) return JSON.parse(existing.contextJson) as RoundContext;
  if (key.startsWith("personal:")) return null;
  const event = await getPublishedEventById(key);
  return event?.courseId ? snapshotRoundContext(event) : null;
}

export async function createPersonalContext(courseId: string, layoutId: string | null, key: string, requestedHoles: number): Promise<RoundContext> {
  const course = getCourseById(courseId) ?? (courseId === fictionalDemoCourse.id ? fictionalDemoCourse : null);
  if (!course) throw new Error("Course not found.");
  let holeCount = requestedHoles;
  let layoutName = "Personal round";
  if (layoutId) {
    const layout = await getD1Database().prepare("SELECT name, hole_count AS holeCount FROM course_layouts WHERE id = ? AND course_id = ? AND is_active = 1 AND deleted_at IS NULL").bind(layoutId, course.id).first<{ name: string; holeCount: number }>();
    if (!layout) throw new Error("That layout is not available at this course.");
    holeCount = layout.holeCount; layoutName = layout.name;
  }
  if (holeCount < 1 || holeCount > 36) throw new Error("Choose between 1 and 36 holes.");
  return snapshotRoundContext({ id: `personal:${key}`, kind: "PERSONAL", courseId, layoutId, holeCount, title: layoutName, venueName: course.name });
}
