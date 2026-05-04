import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point } from "@turf/helpers";
import floridaGeoJson from "../data/florida.json";

/**
 * Returns true when the (lat, lon) point lies inside the Florida polygon.
 *
 * Inputs must be **signed degrees**:
 * - latitude: North positive, South negative
 * - longitude: East positive, West negative
 */
export function isPointInFlorida(latitude: number, longitude: number): boolean {
  const data = floridaGeoJson as any;
  const feature = data?.features?.[0];
  const geometry = feature?.geometry;
  if (!geometry) return false;
  return booleanPointInPolygon(point([longitude, latitude]), geometry);
}

