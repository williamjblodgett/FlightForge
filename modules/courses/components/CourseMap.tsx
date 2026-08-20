"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { LocateFixed, MapPin, Minus, Plus, Search, X } from "lucide-react";
import type { Course } from "../types";

export type MapBounds = { north: number; south: number; east: number; west: number };
type Props = { courses: Course[]; selectedCourseId: string | null; onSelect: (courseId: string) => void; onSearchArea?: (bounds: MapBounds) => void; onClose?: () => void };

const REGION = { west: -73.7, east: -66.85, south: 41.05, north: 47.48 };

export function CourseMap({ courses, selectedCourseId, onSelect, onSearchArea, onClose }: Props) {
  const [center, setCenter] = useState({ latitude: 44.265, longitude: -70.275 });
  const [zoom, setZoom] = useState(1);
  const [locationMessage, setLocationMessage] = useState("Pan or zoom, then search this area.");
  const drag = useRef<{ x: number; y: number; center: typeof center } | null>(null);
  const pendingCenter = useRef<typeof center | null>(null);
  const animationFrame = useRef<number | null>(null);
  const clusters = useMemo(() => clusterCourses(courses), [courses]);
  const offsetX = ((REGION.west + REGION.east) / 2 - center.longitude) * 12 * zoom;
  const offsetY = (center.latitude - (REGION.south + REGION.north) / 2) * 12 * zoom;

  useEffect(() => () => { if (animationFrame.current != null) window.cancelAnimationFrame(animationFrame.current); }, []);

  function pointerDown(event: ReactPointerEvent<HTMLDivElement>) { drag.current = { x: event.clientX, y: event.clientY, center }; event.currentTarget.setPointerCapture(event.pointerId); }
  function pointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const longitude = drag.current.center.longitude - (event.clientX - drag.current.x) * (REGION.east - REGION.west) / (700 * zoom);
    const latitude = drag.current.center.latitude + (event.clientY - drag.current.y) * (REGION.north - REGION.south) / (500 * zoom);
    pendingCenter.current = { latitude: clamp(latitude, REGION.south, REGION.north), longitude: clamp(longitude, REGION.west, REGION.east) };
    if (animationFrame.current != null) return;
    animationFrame.current = window.requestAnimationFrame(() => {
      if (pendingCenter.current) setCenter(pendingCenter.current);
      pendingCenter.current = null;
      animationFrame.current = null;
    });
  }
  function locate() {
    if (!navigator.geolocation) return setLocationMessage("Location is not supported by this browser.");
    setLocationMessage("Finding your location…");
    navigator.geolocation.getCurrentPosition(({ coords }) => { setCenter({ latitude: coords.latitude, longitude: coords.longitude }); setZoom(4); setLocationMessage(`Location fix ±${Math.round(coords.accuracy)} m. GPS is an estimate.`); }, () => setLocationMessage("Location permission was not granted."), { enableHighAccuracy: true, timeout: 8000 });
  }
  function bounds(): MapBounds { const latSpan = (REGION.north - REGION.south) / zoom; const lngSpan = (REGION.east - REGION.west) / zoom; return { north: center.latitude + latSpan / 2, south: center.latitude - latSpan / 2, east: center.longitude + lngSpan / 2, west: center.longitude - lngSpan / 2 }; }

  return <section className="course-map" aria-label="Interactive map of course results">
    <div className="map-toolbar"><span><MapPin aria-hidden="true" /> Interactive New England map</span><div><button type="button" onClick={locate}><LocateFixed aria-hidden="true" /> My location</button>{onClose ? <button type="button" onClick={onClose} aria-label="Close map"><X aria-hidden="true" /></button> : null}</div></div>
    <div className="map-canvas" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={() => { drag.current = null; }} onWheel={(event) => { event.preventDefault(); setZoom((value) => clamp(value + (event.deltaY < 0 ? .4 : -.4), 1, 8)); }}>
      <div className="map-pan-layer" style={{ transform: `translate(${offsetX}%, ${offsetY}%) scale(${zoom})` }}>
        <span className="map-region-label map-region-west">NY border</span><span className="map-region-label map-region-coast">Atlantic</span><span className="map-region-label map-region-north">Northern Maine</span>
        {clusters.map((cluster, index) => { const selected = cluster.courses.some((course) => course.id === selectedCourseId); const target = selected ? cluster.courses.find((course) => course.id === selectedCourseId) ?? cluster.courses[0] : cluster.courses[0]; return <button key={cluster.key} type="button" className={`map-pin${selected ? " is-selected" : ""}${cluster.courses.length > 1 ? " is-cluster" : ""}`} style={{ left: `${cluster.x}%`, top: `${cluster.y}%`, transform: `translate(-50%, -50%) scale(${1 / zoom}) rotate(-45deg)` }} aria-label={cluster.courses.length > 1 ? `Select one of ${cluster.courses.length} nearby course listings` : `Select ${target.name} in ${target.city}`} aria-pressed={selected} onPointerDown={(event) => event.stopPropagation()} onClick={() => onSelect(target.id)}><span>{cluster.courses.length > 1 ? cluster.courses.length : index + 1}</span></button>; })}
      </div>
      <div className="map-zoom" aria-label="Map zoom controls"><button type="button" onClick={() => setZoom((value) => clamp(value + .5, 1, 8))} aria-label="Zoom in"><Plus /></button><button type="button" onClick={() => setZoom((value) => clamp(value - .5, 1, 8))} aria-label="Zoom out"><Minus /></button></div>
      {onSearchArea ? <button className="search-area-button" type="button" onClick={() => onSearchArea(bounds())}><Search aria-hidden="true" /> Search this area</button> : null}
      {courses.length === 0 ? <div className="map-empty"><MapPin aria-hidden="true" /><strong>No pins match</strong><span>Try widening your filters.</span></div> : null}
    </div>
    <div className="map-caption"><span>{locationMessage}</span><span>Course-center coordinates · not emergency navigation</span></div>
  </section>;
}

function project(course: Course) { return { x: clamp(((course.longitude - REGION.west) / (REGION.east - REGION.west)) * 82 + 9, 8, 92), y: clamp(((REGION.north - course.latitude) / (REGION.north - REGION.south)) * 78 + 9, 8, 90) }; }
function clusterCourses(courses: Course[]) { const cells = new Map<string, { courses: Course[]; x: number; y: number }>(); for (const course of courses) { const position = project(course); const key = `${Math.round(position.x / 5)}:${Math.round(position.y / 5)}`; const existing = cells.get(key); if (existing) { const count = existing.courses.length; existing.x = (existing.x * count + position.x) / (count + 1); existing.y = (existing.y * count + position.y) / (count + 1); existing.courses.push(course); } else cells.set(key, { courses: [course], ...position }); } return Array.from(cells, ([key, value]) => ({ key, ...value })); }
function clamp(value: number, minimum: number, maximum: number) { return Math.min(maximum, Math.max(minimum, value)); }
