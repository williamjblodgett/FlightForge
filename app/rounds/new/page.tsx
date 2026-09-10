import Link from "next/link";
import {redirect,notFound} from "next/navigation";
import {nextAuthDestination} from "@/modules/auth/continuation";
import {getCurrentUser} from "@/modules/auth/current-user";
import {getCourseById} from "@/modules/courses/demo-courses";
import {getD1Database} from "@/db/runtime";
import {StartRoundForm} from "./StartRoundForm";
export const dynamic="force-dynamic";
export const metadata={title:"Start a personal round",robots:{index:false,follow:false}};
export default async function StartRoundPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const query=await searchParams;const courseId=typeof query.courseId==="string"?query.courseId:"";const course=getCourseById(courseId);if(!course)notFound();
  const user=await getCurrentUser();if(!user)redirect(`/sign-in?return_to=${encodeURIComponent(`/rounds/new?courseId=${courseId}`)}`);
  const destination=`/rounds/new?courseId=${encodeURIComponent(courseId)}`;const next=nextAuthDestination(user,destination);if(next!==destination)redirect(next);
  const layouts=await getD1Database().prepare("SELECT id,name,hole_count AS holeCount FROM course_layouts WHERE course_id=? AND is_active=1 AND deleted_at IS NULL ORDER BY name").bind(courseId).all<{id:string;name:string;holeCount:number}>();
  return <main className="page-shell compact-page"><Link href={`/courses/${course.slug}`}>Back to course</Link><h1>Play {course.name}</h1><p>Your own scorecard. No tournament registration required.</p><StartRoundForm courseId={courseId} holeCount={course.holeCount} layouts={layouts.results}/></main>;
}
