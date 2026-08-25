"use client";

import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, List, Map, MapPinned, Search, SlidersHorizontal } from "lucide-react";
import type { Course, CourseDifficulty, CoursePriceType } from "../types";
import { filterCourses, rankCoursesForDiscovery } from "../search";
import { CourseCard } from "./CourseCard";
import { CourseMap, type MapBounds } from "./CourseMap";
import { brand } from "@/config/brand";

type Props = {
  courses: Course[];
  initialFavoriteIds: string[];
  signedIn: boolean;
  variant?: "home" | "directory";
  totalMatches?: number;
  page?: number;
  pageSize?: number;
  initialFilters?: { query: string; difficulty: CourseDifficulty | "ALL"; priceType: CoursePriceType | "ALL"; holes: "ALL" | "9" | "18" | "36"; state: string; evidence: "ALL" | "AUTHORITATIVE" | "DIRECTORY"; view: ViewMode };
};

type ViewMode = "split" | "list" | "map";

export function CourseExplorer({
  courses,
  initialFavoriteIds,
  signedIn,
  variant = "directory",
  totalMatches,
  page = 1,
  pageSize = 24,
  initialFilters,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(initialFilters?.query ?? "");
  const [difficulty, setDifficulty] = useState<CourseDifficulty | "ALL">(initialFilters?.difficulty ?? "ALL");
  const [priceType, setPriceType] = useState<CoursePriceType | "ALL">(initialFilters?.priceType ?? "ALL");
  const [holes, setHoles] = useState<"ALL" | "9" | "18" | "36">(initialFilters?.holes ?? "ALL");
  const [state, setState] = useState(initialFilters?.state ?? "ALL");
  const [evidence, setEvidence] = useState<"ALL" | "AUTHORITATIVE" | "DIRECTORY">(initialFilters?.evidence ?? "ALL");
  const [viewMode, setViewMode] = useState<ViewMode>(initialFilters?.view ?? "split");
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(courses[0]?.id ?? null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const deferredQuery = useDeferredValue(query);
  const [isNavigating, startNavigation] = useTransition();
  const localFiltersDiffer = query !== (initialFilters?.query ?? "")
    || difficulty !== (initialFilters?.difficulty ?? "ALL")
    || priceType !== (initialFilters?.priceType ?? "ALL")
    || holes !== (initialFilters?.holes ?? "ALL")
    || state !== (initialFilters?.state ?? "ALL")
    || evidence !== (initialFilters?.evidence ?? "ALL");

  useEffect(() => {
    if (variant !== "directory") return;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (state !== "ALL") params.set("state", state);
      if (difficulty !== "ALL") params.set("difficulty", difficulty);
      if (priceType !== "ALL") params.set("price", priceType);
      if (holes !== "ALL") params.set("holes", holes);
      if (evidence !== "ALL") params.set("source", evidence);
      if (viewMode !== "split") params.set("view", viewMode);
      if (page > 1 && !localFiltersDiffer) params.set("page", String(page));
      const nextUrl = `${pathname}${params.size ? `?${params}` : ""}`;
      if (`${window.location.pathname}${window.location.search}` === nextUrl) return;
      startNavigation(() => router.replace(nextUrl, { scroll: false }));
    }, 450);
    return () => window.clearTimeout(timer);
  }, [difficulty, evidence, holes, localFiltersDiffer, page, pathname, priceType, query, router, startNavigation, state, variant, viewMode]);

  useEffect(() => {
    if (viewMode !== "map" || !window.matchMedia("(max-width: 800px)").matches) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [viewMode]);

  const favoriteIds = useMemo(() => new Set(initialFavoriteIds), [initialFavoriteIds]);
  const filteredCourses = useMemo(
    () =>
      rankCoursesForDiscovery(
        filterCourses(courses, {
          query: deferredQuery,
          difficulty,
          priceType,
          minimumHoles: holes === "ALL" ? null : Number(holes),
          state,
          evidence,
        }).filter((course) => !mapBounds || (course.latitude <= mapBounds.north && course.latitude >= mapBounds.south && course.longitude <= mapBounds.east && course.longitude >= mapBounds.west)),
      ),
    [courses, deferredQuery, difficulty, evidence, holes, mapBounds, priceType, state],
  );
  const visibleCourses = filteredCourses.slice(0, visibleCount);
  const displayedMatchCount = localFiltersDiffer ? filteredCourses.length : (totalMatches ?? filteredCourses.length);
  const effectiveSelectedCourseId = filteredCourses.some((course) => course.id === selectedCourseId)
    ? selectedCourseId
    : (filteredCourses[0]?.id ?? null);

  function clearFilters() {
    setQuery("");
    setDifficulty("ALL");
    setPriceType("ALL");
    setHoles("ALL");
    setState("ALL");
    setEvidence("ALL");
    setVisibleCount(12);
    setMapBounds(null);
  }

  return (
    <>
      {variant === "home" ? (
        <section className="discovery-hero">
          <div className="hero-grid-overlay" />
          <div className="hero-content page-shell">
            <div className="hero-copy">
              <span className="eyebrow">New England course finder</span>
              <h1>Know before<br /><span>you throw.</span></h1>
              <p>
                Find courses across all six New England states, compare the essentials, and plan your next round with confidence.
              </p>
              <div className="hero-actions">
                <a className="button button-primary" href="#course-results">Explore New England <ArrowRight aria-hidden="true" /></a>
                <Link className="button button-ghost-on-dark" href="/fieldwork">Fieldwork</Link>
              </div>
            </div>
            <div className="hero-visual-stack">
              <figure className="hero-photo">
                {/* This original artwork is intentionally not presented as a photograph of a listed course. */}
                <picture>
                  <source media="(max-width: 760px)" srcSet="/brand/flightforge-maine-hero-mobile.webp" />
                  <img
                    src="/brand/flightforge-maine-hero-v2.webp"
                    alt="A disc golfer throwing across a pine and granite fairway toward a basket"
                    width="1672"
                    height="941"
                    decoding="async"
                    fetchPriority="high"
                  />
                </picture>
                <figcaption>
                  <span>Illustrative field scene</span>
                  <strong>Pines, granite, and the line ahead.</strong>
                </figcaption>
              </figure>
              <div className="hero-signal-card" aria-label={`${brand.productName} launch snapshot`}>
                <div className="signal-orbit"><MapPinned aria-hidden="true" /></div>
                <span className="signal-kicker">Across all six New England states</span>
                <strong>{courses.length} listings</strong>
                <p>Clear course details, useful filters, and direct links for checking current conditions before you go.</p>
                <div className="signal-stats">
                  <div><b>{courses.filter((course) => course.verificationLevel === "DIRECTORY_CROSS_CHECKED").length}</b><span>cross-checked</span></div>
                  <div><b>{courses.filter((course) => course.verificationLevel === "OPERATOR_SOURCE_REVIEWED").length}</b><span>official listings</span></div>
                  <div><b>{courses.filter((course) => course.operationalStatus === "UNAVAILABLE_REPORTED").length}</b><span>reported unavailable</span></div>
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
            <p>Search courses across Maine, Massachusetts, New Hampshire, Vermont, Connecticut, and Rhode Island.</p>
          </div>
          <div className="directory-stat"><strong>{totalMatches ?? courses.length}</strong><span>matching listings</span></div>
        </section>
      )}

      <nav className="regional-state-strip page-shell" aria-label="Browse courses by state">
        <Link href="/places/new-england" aria-label="New England overview">All</Link>
        <Link href="/places/maine">ME</Link>
        <Link href="/places/massachusetts">MA</Link>
        <Link href="/places/new-hampshire">NH</Link>
        <Link href="/places/vermont">VT</Link>
        <Link href="/places/connecticut">CT</Link>
        <Link href="/places/rhode-island">RI</Link>
      </nav>

      <section id="course-results" className={`explorer-shell page-shell${viewMode === "map" ? " is-map-open" : ""}`} aria-labelledby="results-heading">
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
            <span className="search-location">New England</span>
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
            <span>State</span>
            <select value={state} onChange={(event) => { setState(event.target.value); setVisibleCount(12); }}>
              <option value="ALL">All New England</option>
              <option value="ME">Maine</option>
              <option value="MA">Massachusetts</option>
              <option value="NH">New Hampshire</option>
              <option value="VT">Vermont</option>
              <option value="CT">Connecticut</option>
              <option value="RI">Rhode Island</option>
            </select>
          </label>
          <label>
            <span>Listing source</span>
            <select value={evidence} onChange={(event) => { setEvidence(event.target.value as typeof evidence); setVisibleCount(12); }}>
              <option value="ALL">All listings</option>
              <option value="AUTHORITATIVE">Course or public listing</option>
              <option value="DIRECTORY">Course directory listing</option>
            </select>
          </label>
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
            <span className="eyebrow">New England field index</span>
            <h2 id="results-heading">{displayedMatchCount} {displayedMatchCount === 1 ? "course" : "courses"} {localFiltersDiffer || isNavigating ? "shown while the full directory updates" : "ready to explore"}</h2>
          </div>
          <p>Course details can change. Confirm current hours, fees, and conditions before traveling.</p>
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
            {filteredCourses.length === 0 && (localFiltersDiffer || isNavigating) ? (
              <div className="empty-state" role="status">
                <Search aria-hidden="true" />
                <h3>Searching the full directory</h3>
                <p>Checking every course, not only the listings already on this page.</p>
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="empty-state">
                <MapPinned aria-hidden="true" />
                <h3>No courses match those filters</h3>
                <p>Try a broader difficulty, price, or hole count.</p>
                <button className="button button-secondary" type="button" onClick={clearFilters}>Reset filters</button>
              </div>
            ) : null}
            {variant === "directory" && (totalMatches ?? 0) > pageSize ? <nav className="pagination" aria-label="Course result pages">
              <Link className={`button button-secondary${page <= 1 ? " is-disabled" : ""}`} aria-disabled={page <= 1} href={pageHref(page - 1)}>Previous</Link>
              <span>Page {page} of {Math.ceil((totalMatches ?? 0) / pageSize)}</span>
              <Link className={`button button-secondary${page * pageSize >= (totalMatches ?? 0) ? " is-disabled" : ""}`} aria-disabled={page * pageSize >= (totalMatches ?? 0)} href={pageHref(page + 1)}>Next</Link>
            </nav> : null}
          </div>
          <div className="map-panel">
            <CourseMap courses={filteredCourses} selectedCourseId={effectiveSelectedCourseId} onSelect={setSelectedCourseId} onSearchArea={setMapBounds} onClose={() => setViewMode("list")} />
          </div>
        </div>
      </section>
    </>
  );

  function pageHref(nextPage: number) {
    const params = new URLSearchParams();
    if (query) params.set("q", query); if (state !== "ALL") params.set("state", state); if (difficulty !== "ALL") params.set("difficulty", difficulty);
    if (priceType !== "ALL") params.set("price", priceType); if (holes !== "ALL") params.set("holes", holes); if (evidence !== "ALL") params.set("source", evidence); if (viewMode !== "split") params.set("view", viewMode);
    if (nextPage > 1) params.set("page", String(nextPage)); return `${pathname}?${params}`;
  }
}
