export type MapLocation = {
  latitude: number;
  longitude: number;
  label: string;
};

export interface MapService {
  directionsUrl(location: MapLocation): string;
  externalMapUrl(location: MapLocation): string;
  satelliteEmbedUrl(location: MapLocation, apiKey: string): string;
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
  satelliteEmbedUrl(location, apiKey) {
    const parameters = new URLSearchParams({
      key: apiKey,
      center: `${location.latitude},${location.longitude}`,
      zoom: "16",
      maptype: "satellite",
    });
    return `https://www.google.com/maps/embed/v1/view?${parameters.toString()}`;
  },
};
