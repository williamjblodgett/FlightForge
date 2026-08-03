export type MapLocation = {
  latitude: number;
  longitude: number;
  label: string;
};

export interface MapService {
  directionsUrl(location: MapLocation): string;
  externalMapUrl(location: MapLocation): string;
}

export const externalMapService: MapService = {
  directionsUrl(location) {
    const destination = `${location.latitude},${location.longitude}`;
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
  },
  externalMapUrl(location) {
    const query = `${location.label} ${location.latitude},${location.longitude}`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  },
};
