"use client";
import Link from "next/link";
import { BadgeCheck, CalendarRange, Clock3, Flag, MapPin, Trees, TriangleAlert } from "lucide-react";
import type { Course } from "../types";
import { formatCoursePrice } from "../demo-courses";
import { CourseHeroArt } from "./CourseHeroArt";
import { FavoriteButton } from "./FavoriteButton";
type Props={course:Course;favorite:boolean;signedIn:boolean;selected?:boolean;onSelect?:(courseId:string)=>void};
export function CourseCard({course,favorite,signedIn,selected,onSelect}:Props){
  return <article id={`course-card-${course.id}`} className={`course-card companion-course-card${selected?" is-selected":""}`} onMouseEnter={()=>onSelect?.(course.id)}>
    <div className="course-thumbnail"><CourseHeroArt course={course} compact/><span>Artwork</span></div>
    <div className="course-card-body">
      <div className="course-card-heading"><div><h3><Link prefetch={false} href={`/courses/${course.slug}`}>{course.name}</Link></h3><div className="course-location">{course.city}, {course.state}</div></div><FavoriteButton courseId={course.id} courseName={course.name} initialFavorite={favorite} signedIn={signedIn}/></div>
      <div className="course-card-facts"><span><Flag aria-hidden="true"/>{course.holeCount>0?`${course.holeCount} holes`:"Holes unconfirmed"}</span><span>{formatCoursePrice(course)}</span></div>
      {(course.operationalStatus.includes("SEASONAL")||course.operationalStatus==="UNAVAILABLE_REPORTED"||course.evidenceStatus==="STALE")?<p className="course-access-note"><TriangleAlert aria-hidden="true"/>{course.operationalStatus==="UNAVAILABLE_REPORTED"?"Reported unavailable":course.operationalStatus.includes("SEASONAL")?"Seasonal · check current access":"Details may be outdated"}</p>:null}
    </div>
    <details className="course-card-details"><summary>Access & listing details<span className="sr-only"> for {course.name}</span></summary><div>
      <p><CalendarRange aria-hidden="true"/>{operationalLabel(course)}. Confirm current access with the course.</p>
      <p><BadgeCheck aria-hidden="true"/>{course.verifiedBadge?"Verified operator":course.verificationLevel==="OPERATOR_SOURCE_REVIEWED"?"Official details checked · ownership unclaimed":course.verificationLevel==="DIRECTORY_CROSS_CHECKED"?"Listing cross-checked · ownership unclaimed":"Directory listing · ownership unclaimed"}</p>
      <p><MapPin aria-hidden="true"/>{course.locationPrecision==="ENTRANCE_GEOCODED"?"Entrance located":course.locationPrecision==="FACILITY_GEOCODED"?"Facility located":"Approximate location"}</p>
      <p><Trees aria-hidden="true"/>{course.difficulty==="UNRATED"?"Difficulty unverified":course.difficulty.toLowerCase()}</p>
      {course.evidenceStatus!=="CURRENT"?<p>{course.evidenceStatus==="STALE"?"Details may be outdated.":"An information update is recommended."}</p>:null}
      <p><Clock3 aria-hidden="true"/>{course.nextAvailableAt?`Next tee time: ${course.nextAvailableAt}`:"Contact the course for booking details."}</p>
      {course.currentCondition?<p>{course.currentCondition}</p>:null}
    </div></details>
  </article>;
}
function operationalLabel(course:Course):string{
  switch(course.operationalStatus){
    case "OPERATOR_CONFIRMED_AVAILABLE":case "AVAILABLE_REPORTED":return "Listed as available";
    case "OPERATOR_CONFIRMED_SEASONAL":case "SEASONAL_AVAILABLE":return "Seasonal availability";
    case "UNAVAILABLE_REPORTED":return "Reported unavailable";
    default:return "Availability unconfirmed";
  }
}
