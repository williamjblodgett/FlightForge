"use client";

import Link from "next/link";
import { BadgeCheck, CalendarRange, Clock3, Database, Flag, MapPin, Trees, TriangleAlert } from "lucide-react";
import type { Course } from "../types";
import { formatCoursePrice } from "../demo-courses";
import { CourseHeroArt } from "./CourseHeroArt";
import { FavoriteButton } from "./FavoriteButton";

type Props = {
  course: Course;
  favorite: boolean;
  signedIn: boolean;
  selected?: boolean;
  onSelect?: (courseId: string) => void;
};

export function CourseCard({ course, favorite, signedIn, selected, onSelect }: Props) {
  return (
    <article
      id={`course-card-${course.id}`}
      className={`course-card${selected ? " is-selected" : ""}`}
      onMouseEnter={() => onSelect?.(course.id)}
    >
      <CourseHeroArt course={course} compact />
      <div className="course-card-body">
        <div className="course-card-heading">
          <div>
            <div className="course-location"><MapPin aria-hidden="true" /> {course.city}, {course.state}</div>
            <h3><Link href={`/courses/${course.slug}`}>{course.name}</Link></h3>
          </div>
          <FavoriteButton
            courseId={course.id}
            courseName={course.name}
            initialFavorite={favorite}
            signedIn={signedIn}
          />
        </div>

        <div className="course-trust-row">
          {course.verifiedBadge ? (
            <span className="verified-badge"><BadgeCheck aria-hidden="true" /> Verified operator</span>
          ) : course.verificationLevel === "OPERATOR_SOURCE_REVIEWED" ? (
            <span className="verified-badge source-reviewed"><BadgeCheck aria-hidden="true" /> Operator source reviewed</span>
          ) : course.verificationLevel === "DIRECTORY_CROSS_CHECKED" ? (
            <span className="source-badge"><Database aria-hidden="true" /> 2 sources matched</span>
          ) : (
            <span className="source-badge"><Database aria-hidden="true" /> 1 directory source</span>
          )}
          <span>{approximateMilesFromPortland(course.latitude, course.longitude)} mi from Portland</span>
        </div>

        <div className={`evidence-status status-${course.operationalStatus.toLowerCase()}`}>
          {course.operationalStatus === "UNAVAILABLE_REPORTED" ? <TriangleAlert aria-hidden="true" /> : <CalendarRange aria-hidden="true" />}
          {operationalLabel(course)}
        </div>

        <div className="course-meta-grid">
          <span><Flag aria-hidden="true" />{course.holeCount > 0 ? <><strong>{course.holeCount}</strong> holes</> : "Hole count unconfirmed"}</span>
          <span><Trees aria-hidden="true" />{friendlyDifficulty(course.difficulty)}</span>
          <span className="course-price">{formatCoursePrice(course)}</span>
        </div>

        {course.nextAvailableAt ? (
          <div className="availability-row"><Clock3 aria-hidden="true" /><span>Next tee time</span><strong>{course.nextAvailableAt}</strong></div>
        ) : (
          <div className="availability-row is-muted"><Clock3 aria-hidden="true" /><span>Booking not connected</span></div>
        )}
        {course.currentCondition ? (
          <div className="condition-row"><span className="condition-dot" />{course.currentCondition}</div>
        ) : null}
      </div>
    </article>
  );
}

function friendlyDifficulty(value: Course["difficulty"]): string {
  if (value === "UNRATED") return "Difficulty unverified";
  return value[0] + value.slice(1).toLowerCase();
}

function operationalLabel(course: Course): string {
  switch (course.operationalStatus) {
    case "OPERATOR_CONFIRMED_AVAILABLE": return "Operator source reports available";
    case "OPERATOR_CONFIRMED_SEASONAL": return "Seasonal · operator source reports available";
    case "AVAILABLE_REPORTED": return "Directory reports available";
    case "SEASONAL_AVAILABLE": return "Seasonal · directory reports available";
    case "UNAVAILABLE_REPORTED": return "Directory reports unavailable";
    default: return "Current status not confirmed";
  }
}

function approximateMilesFromPortland(latitude: number, longitude: number): number {
  const earthRadiusMiles = 3958.8;
  const portland = { latitude: 43.6591, longitude: -70.2568 };
  const latitudeDelta = radians(latitude - portland.latitude);
  const longitudeDelta = radians(longitude - portland.longitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(portland.latitude)) *
      Math.cos(radians(latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return Math.round(earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function radians(value: number): number {
  return (value * Math.PI) / 180;
}
