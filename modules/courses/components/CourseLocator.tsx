import { ExternalLink, LocateFixed, MapPin } from "lucide-react";
import { externalMapService } from "@/packages/maps/src/map-service";
import type { Course } from "../types";

export function CourseLocator({ course }: { course: Course }) {
  const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || process.env.GOOGLE_MAPS_API_KEY?.trim();
  const location = {
    latitude: course.latitude,
    longitude: course.longitude,
    label: `${course.name}, ${course.city}, ${course.state}`,
  };
  return (
    <div className="detail-map-card">
      {googleMapsKey ? <div className="detail-satellite-map"><iframe
        title={`Satellite map centered on ${course.name}`}
        src={externalMapService.satelliteEmbedUrl(location, googleMapsKey)}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      /></div> : <div className={`detail-map-art detail-map-art-${course.heroTone}`}>
        <div className="detail-map-grid" />
        <span className="detail-map-pin"><MapPin aria-hidden="true" /></span>
        <span className="detail-map-city">{course.city}</span>
        <span className="detail-map-coordinates">{course.latitude.toFixed(3)}, {course.longitude.toFixed(3)}</span>
      </div>}
      <div className="detail-map-actions">
        <a href={externalMapService.directionsUrl(location)} target="_blank" rel="noreferrer">
          <LocateFixed aria-hidden="true" /> Directions <ExternalLink aria-hidden="true" />
        </a>
        <a href={externalMapService.externalMapUrl(location)} target="_blank" rel="noreferrer">
          Open full map <ExternalLink aria-hidden="true" />
        </a>
      </div>
      <p>{googleMapsKey ? "Interactive satellite view" : "Provider-neutral map preview"} · Pins may be approximate. GPS distances are estimates and are not for emergency navigation.</p>
    </div>
  );
}
