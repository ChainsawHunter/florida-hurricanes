import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import buffer from "@turf/buffer";
import { point } from "@turf/helpers";
import type { Feature, GeoJsonProperties, Polygon, MultiPolygon } from "geojson";
import floridaGeoJson from "../data/florida.json";

type PolygonFeature = Feature<Polygon | MultiPolygon, GeoJsonProperties>;

/**
 * Coastline “forgiveness” buffer.
 * Consider landfall within 15km of the coastline.
 */
const FLORIDA_BUFFER_KM = 15;

const FLORIDA_BUFFERED_GEOMETRY = (() => {
  const data = floridaGeoJson as PolygonFeature;
  const buffered = buffer(data, FLORIDA_BUFFER_KM, { units: "kilometers" });
  if (!buffered?.geometry) return data.geometry;
  return buffered.geometry;
})();

/**
 * Returns true when the (lat, lon) point lies inside the Florida polygon.
 * @param latitude - The latitude of the point to check.
 * @param longitude - The longitude of the point to check.
 * @returns True if the point is inside the Florida polygon, false otherwise.
*/
export function isPointInFlorida(latitude: number, longitude: number): boolean {
  return booleanPointInPolygon(point([longitude, latitude]), FLORIDA_BUFFERED_GEOMETRY);
}

