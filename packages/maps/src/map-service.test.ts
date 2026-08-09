import { describe, expect, it } from "vitest";
import { externalMapService } from "./map-service";

describe("map service", () => {
  const location = { latitude: 44.31, longitude: -69.78, label: "Test Course, Augusta, ME" };

  it("creates provider links without mixing the API key into directions", () => {
    expect(externalMapService.directionsUrl(location)).toContain("destination=44.31%2C-69.78");
    expect(externalMapService.directionsUrl(location)).not.toContain("secret");
  });

  it("creates a satellite embed URL with an explicitly supplied restricted browser key", () => {
    const url = new URL(externalMapService.satelliteEmbedUrl(location, "restricted-browser-key"));
    expect(url.pathname).toBe("/maps/embed/v1/view");
    expect(url.searchParams.get("maptype")).toBe("satellite");
    expect(url.searchParams.get("center")).toBe("44.31,-69.78");
    expect(url.searchParams.get("key")).toBe("restricted-browser-key");
  });
});
