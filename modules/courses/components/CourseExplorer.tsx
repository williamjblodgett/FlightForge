"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, List, Map, MapPinned, Search, SlidersHorizontal } from "lucide-react";
import type { Course, CourseDifficulty, CoursePriceType } from "../types";
import { filterCourses, rankCoursesForDiscovery } from "../search";
import { CourseCard } from "./CourseCard";
import { CourseMap } from "./CourseMap";
import { brand } from "@/config/brand";

type Props = {
  courses: Course[];
  initialFavoriteIds: string[];
  signedIn: boolean;
  variant?: "home" | "directory";
};

type ViewMode = "split" | "list" | "map";

export function CourseExplorer({
  courses,
  initialFavoriteIds,
  signedIn,
  variant = "directory",
}: Props) {
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState<CourseDifficulty | "ALL">("ALL");
  const [priceType, setPriceType] = useState<CoursePriceType | "ALL">("ALL");
  const [holes, setHoles] = useState<"ALL" | "9" | "18" | "36">("ALL");
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(courses[0]?.id ?? null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);

  const favoriteIds = useMemo(() => new Set(initialFavoriteIds), [initialFavoriteIds]);
  const filteredCourses = useMemo(
    () =>
      rankCoursesForDiscovery(
        filterCourses(courses, {
          query,
          difficulty,
          priceType,
          minimumHoles: holes === "ALL" ? null : Number(holes),
        }),
      ),
    [courses, difficulty, holes, priceType, query],
  );
  const visibleCourses = filteredCourses.slice(0, visibleCount);
  const effectiveSelectedCourseId = filteredCourses.some((course) => course.id === selectedCourseId)
    ? selectedCourseId
    : (filteredCourses[0]?.id ?? null);

  function clearFilters() {
    setQuery("");
    setDifficulty("ALL");
    setPriceType("ALL");
    setHoles("ALL");
    setVisibleCount(12);
  }

  return (
    <>
      {variant === "home" ? (
        <section className="discovery-hero">
          <div className="hero-grid-overlay" />
          <div className="hero-content page-shell">
            <div className="hero-copy">
              <span className="eyebrow">Maine field index · source checked</span>
              <h1>Know before<br /><span>you throw.</span></h1>
              <p>
                A statewide course ledger with evidence attached: who lists it, when it was checked, and whether “available” came from an operator or a directory.
              </p>
              <div className="hero-actions">
                <a className="button button-primary" href="#course-results">Explore Maine courses <ArrowRight aria-hidden="true" /></a>
                <Link className="button button-ghost-on-dark" href="/sign-up">Create a free field book</Link>
              </div>
            </div>
            <div className="hero-visual-stack">
              <figure className="hero-photo">
                {/* This original artwork is intentionally not presented as a photograph of a listed course. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brand/flightforge-maine-hero-v2.webp"
                  alt="A disc golfer throwing across a pine and granite fairway toward a basket"
                  width="1672"
                  height="941"
                  decoding="async"
                  fetchPriority="high"
                />
                <figcaption>
                  <span>Illustrative field scene</span>
                  <strong>Pines, granite, and the line ahead.</strong>
                </figcaption>
              </figure>
              <div className="hero-signal-card" aria-label={`${brand.productName} launch snapshot`}>
                <div className="signal-orbit"><MapPinned aria-hidden="true" /></div>
                <span className="signal-kicker">Field audit · Aug 4, 2026</span>
                <strong>{courses.length} listings</strong>
                <p>Public factual fields only. Every operational claim stays attached to its source.</p>
                <div className="signal-stats">
                  <div><b>{courses.filter((course) => course.verificationLevel === "DIRECTORY_CROSS_CHECKED").length}</b><span>double-sourced</span></div>
                  <div><b>{courses.filter((course) => course.verificationLevel === "OPERATOR_SOURCE_REVIEWED").length}</b><span>operator-sourced</span></div>
                  <div><b>{courses.filter((course) => course.operationalStatus === "UNAVAILABLE_REPORTED").length}</b><span>unavailable</span></div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="directory-intro page-shell">
          <div>
            <span className="eyebrow">Course discovery</span>
            <h1>Choose the round that fits today.</h1>
            <p>Search all currently reviewed Maine listings, then inspect the source evidence before making the drive.</p>
          </div>
          <div className="directory-stat"><strong>{courses.length}</strong><span>launch listings</span></div>
        </section>
      )}

      <section id="course-results" className="explorer-shell page-shell" aria-labelledby="results-heading">
        <div className="explorer-topbar">
          <div className="search-field">
            <Search aria-hidden="true" />
            <label className="sr-only" htmlFor="course-search">Search by course, city, or amenity</label>
            <input
              id="course-search"
              type="search"
              placeholder="Course, city, ZIP, or amenity"
              value={query}
              onChange={(event) => { setQuery(event.target.value); setVisibleCount(12); }}
            />
            <span className="search-location">Maine</span>
          </div>
          <button
            className={`filter-trigger${filtersOpen ? " is-active" : ""}`}
            type="button"
            aria-expanded={filtersOpen}
            aria-controls="course-filters"
            onClick={() => setFiltersOpen((value) => !value)}
          >
            <SlidersHorizontal aria-hidden="true" /> Filters
          </button>
          <div className="view-toggle" aria-label="Result view">
            <button type="button" className={viewMode === "split" ? "is-active" : ""} onClick={() => setViewMode("split")} aria-label="Split map and list view" aria-pressed={viewMode === "split"}><MapPinned aria-hidden="true" /></button>
            <button type="button" className={viewMode === "list" ? "is-active" : ""} onClick={() => setViewMode("list")} aria-label="List view" aria-pressed={viewMode === "list"}><List aria-hidden="true" /></button>
            <button type="button" className={viewMode === "map" ? "is-active" : ""} onClick={() => setViewMode("map")} aria-label="Map view" aria-pressed={viewMode === "map"}><Map aria-hidden="true" /></button>
          </div>
        </div>

        <div id="course-filters" className={`filter-row${filtersOpen ? " is-open" : ""}`}>
          <label>
            <span>Difficulty</span>
            <select value={difficulty} onChange={(event) => { setDifficulty(event.target.value as CourseDifficulty | "ALL"); setVisibleCount(12); }}>
              <option value="ALL">Any level</option>
              <option value="UNRATED">Not yet rated</option>
              <option value="BEGINNER">Beginner</option>
              <option value="RECREATIONAL">Recreational</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
            </select>
          </label>
          <label>
            <span>Price</span>
            <select value={priceType} onChange={(event) => { setPriceType(event.target.value as CoursePriceType | "ALL"); setVisibleCount(12); }}>
              <option value="ALL">Free or paid</option>
              <option value="FREE">Free</option>
              <option value="PAID">Pay to play</option>
              <option value="MIXED">Mixed pricing</option>
            </select>
          </label>
          <label>
            <span>Holes</span>
            <select value={holes} onChange={(event) => { setHoles(event.target.value as typeof holes); setVisibleCount(12); }}>
              <option value="ALL">Any count</option>
              <option value="9">9+</option>
              <option value="18">18+</option>
              <option value="36">36+</option>
            </select>
          </label>
          <button className="clear-filters" type="button" onClick={clearFilters}>Clear all</button>
        </div>

        <div className="results-summary">
          <div>
            <span className="eyebrow">Statewide Maine field index</span>
            <h2 id="results-heading">{filteredCourses.length} {filteredCourses.length === 1 ? "course" : "courses"} ready to explore</h2>
          </div>
          <p>Coordinates are directory-sourced; same-day conditions still require operator confirmation.</p>
        </div>

        <div className={`explorer-layout view-${viewMode}`}>
          <div className="course-results-list" aria-live="polite">
            {visibleCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                favorite={favoriteIds.has(course.id)}
                signedIn={signedIn}
                selected={effectiveSelectedCourseId === course.id}
                onSelect={setSelectedCourseId}
              />
            ))}
            {visibleCount < filteredCourses.length ? (
              <div className="course-list-more">
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => setVisibleCount((current) => Math.min(current + 12, filteredCourses.length))}
                >
                  Show 12 more <span>{filteredCourses.length - visibleCount} remaining</span>
                </button>
              </div>
            ) : null}
            {filteredCourses.length === 0 ? (
              <div className="empty-state">
                <MapPinned aria-hidden="true" />
                <h3>No courses match those filters</h3>
                <p>Try a broader difficulty, price, or hole count.</p>
                <button className="button button-secondary" type="button" onClick={clearFilters}>Reset filters</button>
              </div>
            ) : null}
          </div>
          <div className="map-panel">
            <CourseMap courses={filteredCourses} selectedCourseId={effectiveSelectedCourseId} onSelect={setSelectedCourseId} />
          </div>
        </div>
      </section>
    </>
  );
}
