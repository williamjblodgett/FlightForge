"use client";

import { LocateFixed, MapPin } from "lucide-react";
import type { Course } from "../types";

type Props = {
  courses: Course[];
  selectedCourseId: string | null;
  onSelect: (courseId: string) => void;
};

export function CourseMap({ courses, selectedCourseId, onSelect }: Props) {
  const clusters = clusterCourses(courses);
  return (
    <section className="course-map" aria-label="Map of course results">
      <div className="map-toolbar">
        <span><MapPin aria-hidden="true" /> New England course overview</span>
        <button type="button" disabled title="Location permission is not enabled in this release">
          <LocateFixed aria-hidden="true" /> Use my location
        </button>
      </div>
      <div className="map-canvas">
        <span className="map-region-label map-region-west">NY border</span>
        <span className="map-region-label map-region-coast">Atlantic</span>
        <span className="map-region-label map-region-north">Northern Maine</span>
        {clusters.map((cluster, index) => {
          const selected = cluster.courses.some((course) => course.id === selectedCourseId);
          const target = selected
            ? cluster.courses.find((course) => course.id === selectedCourseId) ?? cluster.courses[0]
            : cluster.courses[0];
          return (
            <button
              key={cluster.key}
              type="button"
              className={`map-pin${selected ? " is-selected" : ""}${cluster.courses.length > 1 ? " is-cluster" : ""}`}
              style={{ left: `${cluster.x}%`, top: `${cluster.y}%` }}
              aria-label={cluster.courses.length > 1
                ? `Select one of ${cluster.courses.length} nearby course listings`
                : `Select ${target.name} in ${target.city}`}
              aria-pressed={selected}
              onClick={() => onSelect(target.id)}
            >
              <span>{cluster.courses.length > 1 ? cluster.courses.length : index + 1}</span>
            </button>
          );
        })}
        {courses.length === 0 ? (
          <div className="map-empty"><MapPin aria-hidden="true" /><strong>No pins match</strong><span>Try widening your filters.</span></div>
        ) : null}
      </div>
      <div className="map-caption">
        <span>Evidence-labeled course centers · clustered for readability</span>
        <span>Provider-neutral map adapter · GPS is not used for emergency navigation</span>
      </div>
    </section>
  );
}

function project(course: Course): { x: number; y: number } {
  const west = -73.7;
  const east = -66.85;
  const south = 41.05;
  const north = 47.48;
  const x = ((course.longitude - west) / (east - west)) * 82 + 9;
  const y = ((north - course.latitude) / (north - south)) * 78 + 9;
  return {
    x: Math.min(92, Math.max(8, x)),
    y: Math.min(90, Math.max(8, y)),
  };
}

function clusterCourses(courses: Course[]) {
  const cells = new Map<string, { courses: Course[]; x: number; y: number }>();
  for (const course of courses) {
    const position = project(course);
    const key = `${Math.round(position.x / 5)}:${Math.round(position.y / 5)}`;
    const existing = cells.get(key);
    if (existing) {
      const count = existing.courses.length;
      existing.x = (existing.x * count + position.x) / (count + 1);
      existing.y = (existing.y * count + position.y) / (count + 1);
      existing.courses.push(course);
    } else {
      cells.set(key, { courses: [course], x: position.x, y: position.y });
    }
  }
  return Array.from(cells, ([key, value]) => ({ key, ...value }));
}
