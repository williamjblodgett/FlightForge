"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, List, Map, MapPinned, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import type { Course, CourseDifficulty, CoursePriceType } from "../types";
import { filterCourses } from "../search";
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

  const favoriteIds = useMemo(() => new Set(initialFavoriteIds), [initialFavoriteIds]);
  const filteredCourses = useMemo(
    () =>
      filterCourses(courses, {
        query,
        difficulty,
        priceType,
        minimumHoles: holes === "ALL" ? null : Number(holes),
      }),
    [courses, difficulty, holes, priceType, query],
  );

  function clearFilters() {
    setQuery("");
    setDifficulty("ALL");
    setPriceType("ALL");
    setHoles("ALL");
  }

  return (
    <>
      {variant === "home" ? (
        <section className="discovery-hero">
          <div className="hero-grid-overlay" />
          <div className="hero-content page-shell">
            <div className="hero-copy">
              <span className="eyebrow"><Sparkles aria-hidden="true" /> Built for every kind of round</span>
              <h1>Find your line.<br /><span>Forge your game.</span></h1>
              <p>
                Discover courses, compare the details that matter, and build a home for every round—starting in Maine, ready for anywhere.
              </p>
              <div className="hero-actions">
                <a className="button button-primary" href="#course-results">Explore Maine courses <ArrowRight aria-hidden="true" /></a>
                <Link className="button button-ghost-on-dark" href="/roadmap">See what’s taking shape</Link>
              </div>
            </div>
            <div className="hero-signal-card" aria-label={`${brand.productName} launch snapshot`}>
              <div className="signal-orbit"><MapPinned aria-hidden="true" /></div>
              <span className="signal-kicker">Launch region</span>
              <strong>Maine</strong>
              <p>One source-aware dataset. A nationwide geographic architecture.</p>
              <div className="signal-stats">
                <div><b>{courses.filter((course) => !course.fictionalDemo).length}</b><span>reviewed seeds</span></div>
                <div><b>1</b><span>verified demo</span></div>
                <div><b>50</b><span>states ready</span></div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="directory-intro page-shell">
          <div>
            <span className="eyebrow">Course discovery</span>
            <h1>Choose the round that fits today.</h1>
            <p>Search source-attributed listings and compare terrain, difficulty, price, amenities, and operator verification.</p>
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
              onChange={(event) => setQuery(event.target.value)}
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
            <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as CourseDifficulty | "ALL")}>
              <option value="ALL">Any level</option>
              <option value="BEGINNER">Beginner</option>
              <option value="RECREATIONAL">Recreational</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
            </select>
          </label>
          <label>
            <span>Price</span>
            <select value={priceType} onChange={(event) => setPriceType(event.target.value as CoursePriceType | "ALL")}>
              <option value="ALL">Free or paid</option>
              <option value="FREE">Free</option>
              <option value="PAID">Pay to play</option>
              <option value="MIXED">Mixed pricing</option>
            </select>
          </label>
          <label>
            <span>Holes</span>
            <select value={holes} onChange={(event) => setHoles(event.target.value as typeof holes)}>
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
            <span className="eyebrow">Maine launch collection</span>
            <h2 id="results-heading">{filteredCourses.length} {filteredCourses.length === 1 ? "course" : "courses"} ready to explore</h2>
          </div>
          <p>Locations are approximate until an operator verifies the listing.</p>
        </div>

        <div className={`explorer-layout view-${viewMode}`}>
          <div className="course-results-list" aria-live="polite">
            {filteredCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                favorite={favoriteIds.has(course.id)}
                signedIn={signedIn}
                selected={selectedCourseId === course.id}
                onSelect={setSelectedCourseId}
              />
            ))}
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
            <CourseMap courses={filteredCourses} selectedCourseId={selectedCourseId} onSelect={setSelectedCourseId} />
          </div>
        </div>
      </section>
    </>
  );
}
