import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point } from "@turf/helpers";
import type { Feature, GeoJsonProperties, Polygon, MultiPolygon } from "geojson";
import floridaGeoJson from "../data/florida.json";

type PolygonFeature = Feature<Polygon | MultiPolygon, GeoJsonProperties>;

/**
 * Returns true when the (lat, lon) point lies inside the Florida polygon.
 *
 * Inputs must be **signed degrees**:
 * - latitude: North positive, South negative
 * - longitude: East positive, West negative
 */
export function isPointInFlorida(latitude: number, longitude: number): boolean {
  const data = floridaGeoJson as unknown as PolygonFeature;
  const geometry = data.geometry;
  return booleanPointInPolygon(point([longitude, latitude]), geometry);
}

