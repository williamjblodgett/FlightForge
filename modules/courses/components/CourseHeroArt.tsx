import { Disc3, MapPin, Mountain, Trees } from "lucide-react";
import type { Course } from "../types";

type Props = {
  course: Course;
  compact?: boolean;
};

export function CourseHeroArt({ course, compact = false }: Props) {
  return (
    <div
      className={`course-art course-art-${course.heroTone}${compact ? " course-art-compact" : ""}`}
      role="img"
      aria-label={`Abstract terrain artwork for ${course.name}`}
    >
      <div className="course-art-sun" />
      <Mountain className="course-art-mountain" aria-hidden="true" />
      <Trees className="course-art-trees" aria-hidden="true" />
      <span className="course-art-pin"><MapPin aria-hidden="true" /></span>
      <Disc3 className="course-art-disc" aria-hidden="true" />
      {course.fictionalDemo ? <span className="demo-ribbon">Fictional demo</span> : null}
    </div>
  );
}
