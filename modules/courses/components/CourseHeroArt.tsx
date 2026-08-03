import { MapPin } from "lucide-react";
import type { Course } from "../types";

type Props = { course: Course; compact?: boolean };

export function CourseHeroArt({ course, compact = false }: Props) {
  return (
    <div className={`course-art course-art-${course.heroTone}${compact ? " course-art-compact" : ""}`} role="img" aria-label={`Field-map artwork for ${course.name}`}>
      <svg className="course-contours" viewBox="0 0 640 420" preserveAspectRatio="none" aria-hidden="true">
        <path d="M-40 335C62 225 136 390 238 282s190-40 246-129 126-73 201-37" />
        <path d="M-55 300C57 185 143 347 226 246s180-36 240-125 139-62 211-34" />
        <path d="M-50 258C74 154 136 312 219 210s174-27 230-112 142-54 222-21" />
        <path d="M-27 213C92 124 151 266 229 177s169-19 224-90 130-42 201-12" />
        <path d="M5 169C112 94 163 223 241 146s155-11 213-73 118-28 183-5" />
      </svg>
      <span className="course-art-coordinate">{course.city.toUpperCase()} / {course.state}</span>
      <span className="course-art-pin"><MapPin aria-hidden="true" /></span>
      <span className="course-art-holes"><b>{course.holeCount || "—"}</b> holes</span>
      <span className="course-art-route" aria-hidden="true">01—07—12—18</span>
    </div>
  );
}
