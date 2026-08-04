import { useMemo, useState, type FormEvent } from "react";
import { Building2, ExternalLink, FileCheck2, Heart, LocateFixed, Map, Search, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { courses } from "@/modules/courses/demo-courses";
import { filterCourses, rankCoursesForDiscovery } from "@/modules/courses/search";
import type { Course, CourseDifficulty, CoursePriceType } from "@/modules/courses/types";
import { courseClaimSchema } from "@/modules/courses/validation";
import { CourseHeroArt } from "@/modules/courses/components/CourseHeroArt";
import { useDemoStore } from "../demo-store";

type Coordinates = { latitude: number; longitude: number };

export function DiscoverScreen() {
  const { state, update } = useDemoStore();
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState<CourseDifficulty | "ALL">("ALL");
  const [priceType, setPriceType] = useState<CoursePriceType | "ALL">("ALL");
  const [selectedId, setSelectedId] = useState(courses[8]?.id ?? courses[0]?.id ?? "");
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [locationStatus, setLocationStatus] = useState<string>("");
  const [claimOpen, setClaimOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);

  const filtered = useMemo(() => {
    const result = filterCourses(courses, { query, difficulty, priceType, minimumHoles: null });
    if (!location) return rankCoursesForDiscovery(result);
    return [...result].sort((left, right) => distanceMiles(location, left) - distanceMiles(location, right));
  }, [difficulty, location, priceType, query]);
  const selected = filtered.find((course) => course.id === selectedId) ?? filtered[0] ?? courses[0];
  const visibleCourses = filtered.slice(0, visibleCount);

  const requestLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocationStatus("Location is not available in this browser.");
      return;
    }
    setLocationStatus("Requesting location…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setVisibleCount(12);
        setLocationStatus("Sorted nearest to your approximate current location.");
      },
      () => setLocationStatus("Location was not shared. Search still works by city, ZIP, and course name."),
      { enableHighAccuracy: false, timeout: 8_000, maximumAge: 5 * 60 * 1_000 },
    );
  };

  const toggleFavorite = (courseId: string) => update((current) => ({
    ...current,
    favorites: current.favorites.includes(courseId)
      ? current.favorites.filter((id) => id !== courseId)
      : [...current.favorites, courseId],
  }));

  return (
    <div className="screen discover-screen">
      <section className="screen-title compact-title">
        <div><span className="demo-eyebrow"><Map aria-hidden="true" /> Course discovery</span><h1>Find the right first tee.</h1><p>Search reviewed facts, compare terrain, and see exactly what has—and has not—been operator verified.</p></div>
        <button className="demo-button secondary" type="button" onClick={requestLocation}><LocateFixed aria-hidden="true" />Use my location</button>
      </section>
      {locationStatus ? <p className="inline-status" role="status">{locationStatus}</p> : null}
      <section className="search-panel" aria-label="Course filters">
        <label className="search-input"><Search aria-hidden="true" /><span className="sr-only">Search courses</span><input value={query} onChange={(event) => { setQuery(event.target.value); setVisibleCount(12); }} placeholder="Course, city, ZIP, terrain, or amenity" /></label>
        <label><span>Difficulty</span><select value={difficulty} onChange={(event) => { setDifficulty(event.target.value as CourseDifficulty | "ALL"); setVisibleCount(12); }}><option value="ALL">Any difficulty</option><option value="BEGINNER">Beginner</option><option value="RECREATIONAL">Recreational</option><option value="INTERMEDIATE">Intermediate</option><option value="ADVANCED">Advanced</option></select></label>
        <label><span>Price</span><select value={priceType} onChange={(event) => { setPriceType(event.target.value as CoursePriceType | "ALL"); setVisibleCount(12); }}><option value="ALL">Any price</option><option value="FREE">Free</option><option value="PAID">Pay to play</option><option value="MIXED">Mixed</option></select></label>
        <div className="filter-count"><SlidersHorizontal aria-hidden="true" /><strong>{filtered.length}</strong><span>matches</span></div>
      </section>

      <section className="discovery-layout">
        <div className="course-results" aria-live="polite">
          {filtered.length === 0 ? <div className="empty-panel"><Search /><h2>No courses match yet</h2><p>Try clearing a filter or searching a nearby Maine city.</p></div> : null}
          {visibleCourses.map((course) => {
            const favorite = state.favorites.includes(course.id);
            const distance = location ? distanceMiles(location, course) : null;
            return (
              <article key={course.id} className={`demo-course-card ${selected?.id === course.id ? "selected" : ""}`}>
                <button className="course-card-select" type="button" onClick={() => { setSelectedId(course.id); setClaimOpen(false); }} aria-label={`Show ${course.name} details and map`} />
                <CourseHeroArt course={course} compact />
                <div className="course-card-body">
                  <div className="course-card-heading"><div>{course.verifiedBadge ? <span className="verified-pill"><ShieldCheck />Verified demo</span> : <span className="source-pill">Source reviewed</span>}<h2>{course.name}</h2><p>{course.city}, {course.state}{distance == null ? "" : ` · ${distance.toFixed(1)} mi`}</p></div><button className={favorite ? "favorite active" : "favorite"} type="button" onClick={() => toggleFavorite(course.id)} aria-label={`${favorite ? "Remove" : "Add"} ${course.name} ${favorite ? "from" : "to"} favorites`}><Heart fill={favorite ? "currentColor" : "none"} /></button></div>
                  <div className="course-facts"><span>{course.difficulty.toLowerCase()}</span><span>{course.layoutCount} layout{course.layoutCount === 1 ? "" : "s"}</span><span>{course.priceFromCents == null ? course.priceType.toLowerCase() : `from $${(course.priceFromCents / 100).toFixed(0)}`}</span></div>
                  <p className="course-description">{course.shortDescription}</p>
                  {!course.verifiedBadge ? <p className="unclaimed-inline">This listing has not yet been claimed or verified by the course operator.</p> : null}
                  <div className="source-row"><span>Source: {course.sourceName}</span><a href={course.sourceUrl} target="_blank" rel="noreferrer">View source <ExternalLink /></a></div>
                </div>
              </article>
            );
          })}
          {visibleCount < filtered.length ? (
            <button
              className="demo-button secondary course-load-more"
              type="button"
              onClick={() => setVisibleCount((current) => Math.min(current + 12, filtered.length))}
            >
              Show 12 more <span>{filtered.length - visibleCount} remaining</span>
            </button>
          ) : null}
        </div>
        <aside className="live-map-panel">
          {selected ? (
            <>
              <div className="map-panel-heading"><div><span className="demo-eyebrow">Live map</span><strong>{selected.name}</strong><small>Provider: OpenStreetMap · GPS is approximate</small></div><a href={`https://www.openstreetmap.org/?mlat=${selected.latitude}&mlon=${selected.longitude}#map=15/${selected.latitude}/${selected.longitude}`} target="_blank" rel="noreferrer" aria-label={`Open directions map for ${selected.name}`}><ExternalLink /></a></div>
              <iframe title={`OpenStreetMap for ${selected.name}`} src={openStreetMapEmbed(selected.latitude, selected.longitude)} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" />
              <div className="map-legend"><span><i className="legend-course" />Selected course</span>{location ? <span><i className="legend-user" />Sorted from your location</span> : null}</div>
              <p className="map-warning">Map and GPS distances are estimates and must not be used for emergency navigation.</p>
              <div className="map-course-detail">
                <div className="detail-facts"><span><strong>{selected.holeCount}</strong> holes</span><span><strong>{selected.layoutCount}</strong> layout{selected.layoutCount === 1 ? "" : "s"}</span><span><strong>{selected.difficulty.toLowerCase()}</strong> difficulty</span></div>
                <p>{selected.shortDescription}</p>
                <div className="tag-row">{selected.terrain.map((item) => <span key={item}>{item}</span>)}{selected.amenities.slice(0, 4).map((item) => <span key={item}>{item}</span>)}</div>
                <p className="condition-line"><strong>Current condition:</strong> {state.conditions[selected.id] ?? selected.currentCondition ?? "No operator report"} <small>{selected.conditionSource ? `(${selected.conditionSource.toLowerCase().replace("_", " ")})` : ""}</small></p>
                {!selected.verifiedBadge ? <div className="claim-callout"><Building2 /><div><strong>This listing has not yet been claimed or verified by the course operator.</strong><p>Course facts come from the attributed public source and remain subject to operator review.</p><button className="demo-button secondary" type="button" onClick={() => setClaimOpen((open) => !open)}>{claimOpen ? "Close claim form" : "Start a course claim"}</button></div></div> : <p className="verified-detail"><ShieldCheck /> Fictional verified property: owner tools and bookings affect this browser only.</p>}
                {claimOpen && !selected.verifiedBadge ? <ClaimApplication course={selected} /> : null}
              </div>
            </>
          ) : null}
        </aside>
      </section>
    </div>
  );
}

function ClaimApplication({ course }: { course: Course }) {
  const { state, update } = useDemoStore();
  const [status, setStatus] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = courseClaimSchema.safeParse({
      courseId: course.id,
      applicantName: form.get("applicantName"),
      applicantRole: form.get("applicantRole"),
      businessEmail: form.get("businessEmail"),
      businessPhone: form.get("businessPhone"),
      website: form.get("website"),
      explanation: form.get("explanation"),
    });
    if (!parsed.success) {
      setStatus(parsed.error.issues[0]?.message ?? "Review the highlighted claim fields.");
      return;
    }
    const evidence = form.get("evidence");
    if (!(evidence instanceof File) || evidence.size === 0) {
      setStatus("Add a PDF, PNG, or JPEG supporting document.");
      return;
    }
    if (!["application/pdf", "image/png", "image/jpeg"].includes(evidence.type) || evidence.size > 5 * 1024 * 1024) {
      setStatus("Supporting evidence must be a PDF, PNG, or JPEG no larger than 5 MB.");
      return;
    }
    if (state.claims.some((claim) => claim.courseId === course.id && claim.businessEmail.toLowerCase() === parsed.data.businessEmail.toLowerCase() && !["REJECTED", "SUSPENDED"].includes(claim.status))) {
      setStatus("An active claim from this business email already exists for the course.");
      return;
    }
    const createdAt = new Date().toISOString();
    const claimId = crypto.randomUUID();
    update((current) => ({
      ...current,
      claims: [{
        id: claimId,
        ...parsed.data,
        evidenceValidated: true,
        status: "CLAIM_SUBMITTED",
        version: 1,
        createdAt,
        audit: [{ id: crypto.randomUUID(), action: "SUBMITTED", fromStatus: null, toStatus: "CLAIM_SUBMITTED", reason: "Device-local demonstration claim submitted by applicant.", actor: parsed.data.businessEmail, createdAt }],
      }, ...current.claims],
      notificationCount: current.notificationCount + 1,
    }));
    event.currentTarget.reset();
    setSubmitted(true);
    setStatus(`Claim ${claimId.slice(0, 8)} recorded in the device-local administrator queue.`);
  };

  return (
    <form className="map-claim-form" onSubmit={submit}>
      <div className="claim-form-heading"><FileCheck2 /><div><strong>Course-claim application</strong><small>Supporting bytes are validated but are not retained or transmitted by this static edition.</small></div></div>
      <div className="form-grid two"><label><span>Applicant name</span><input name="applicantName" required minLength={2} /></label><label><span>Role</span><input name="applicantRole" required minLength={2} placeholder="Owner or manager" /></label></div>
      <div className="form-grid two"><label><span>Business email</span><input name="businessEmail" required type="email" /></label><label><span>Business phone</span><input name="businessPhone" required type="tel" /></label></div>
      <label><span>Website (optional)</span><input name="website" type="url" placeholder="https://" /></label>
      <label><span>Authority explanation</span><textarea name="explanation" required minLength={30} rows={3} /></label>
      <label><span>Supporting document</span><input name="evidence" required type="file" accept="application/pdf,image/png,image/jpeg" /></label>
      <button className="demo-button primary wide" type="submit">Submit local claim</button>
      {status ? <p className={submitted ? "success-message" : "inline-status"} role="status">{status}</p> : null}
    </form>
  );
}

function openStreetMapEmbed(latitude: number, longitude: number): string {
  const longitudeRadius = 0.025;
  const latitudeRadius = 0.018;
  const bbox = [longitude - longitudeRadius, latitude - latitudeRadius, longitude + longitudeRadius, latitude + latitudeRadius].join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${latitude}%2C${longitude}`;
}

function distanceMiles(origin: Coordinates, course: { latitude: number; longitude: number }): number {
  const radians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = radians(course.latitude - origin.latitude);
  const longitudeDelta = radians(course.longitude - origin.longitude);
  const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(radians(origin.latitude)) * Math.cos(radians(course.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
