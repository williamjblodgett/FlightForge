"use client";

import { LocateFixed, MapPin } from "lucide-react";
import type { Course } from "../types";

type Props = {
  courses: Course[];
  selectedCourseId: string | null;
  onSelect: (courseId: string) => void;
};

export function CourseMap({ courses, selectedCourseId, onSelect }: Props) {
  return (
    <section className="course-map" aria-label="Map of course results">
      <div className="map-toolbar">
        <span><MapPin aria-hidden="true" /> Maine course overview</span>
        <button type="button" disabled title="Location permission is not enabled in this demonstration">
          <LocateFixed aria-hidden="true" /> Use my location
        </button>
      </div>
      <div className="map-canvas">
        <span className="map-region-label map-region-west">Lakes</span>
        <span className="map-region-label map-region-coast">Coast</span>
        <span className="map-region-label map-region-north">North</span>
        {courses.map((course, index) => {
          const position = project(course);
          return (
            <button
              key={course.id}
              type="button"
              className={`map-pin${course.id === selectedCourseId ? " is-selected" : ""}`}
              style={{ left: `${position.x}%`, top: `${position.y}%` }}
              aria-label={`Select ${course.name} in ${course.city}`}
              aria-pressed={course.id === selectedCourseId}
              onClick={() => onSelect(course.id)}
            >
              <span>{index + 1}</span>
            </button>
          );
        })}
        {courses.length === 0 ? (
          <div className="map-empty"><MapPin aria-hidden="true" /><strong>No pins match</strong><span>Try widening your filters.</span></div>
        ) : null}
      </div>
      <div className="map-caption">
        <span>Approximate seed coordinates</span>
        <span>Provider-neutral map adapter · GPS is not used for emergency navigation</span>
      </div>
    </section>
  );
}

function project(course: Course): { x: number; y: number } {
  const west = -70.9;
  const east = -68.45;
  const south = 43.45;
  const north = 45.0;
  const x = ((course.longitude - west) / (east - west)) * 82 + 9;
  const y = ((north - course.latitude) / (north - south)) * 78 + 9;
  return {
    x: Math.min(92, Math.max(8, x)),
    y: Math.min(90, Math.max(8, y)),
  };
}
