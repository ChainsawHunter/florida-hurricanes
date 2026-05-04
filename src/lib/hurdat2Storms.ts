import { Hurdat2TrackRow, parseHurdat2TrackLine } from "./hurdat2Track";
import { isPointInFlorida } from "./isPointInFlorida";

/** The main hurricane record type we want to eventually display in the app. */
export type FloridaHurricane = {
  name: string;
  dateOfLandfall: Date;
  latitude: number;
  longitude: number;
  maximumSustainedWindKt: number;
};

/** Two-letter basin + six digits, e.g. AL011851 */
const STORM_HEADER_FIRST_FIELD = /^[A-Z]{2}\d{6}$/i;

export function isHurdat2StormHeaderLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  const firstField = trimmed.split(",")[0]?.trim() ?? "";
  if (/^\d{8}$/.test(firstField)) return false;
  return STORM_HEADER_FIRST_FIELD.test(firstField);
}

export type Hurdat2StormIdParts = {
  /** Two-letter basin code, e.g. Atlantic `AL`. */
  basin: string;
  /** Cyclone number within the season (leading zero kept), e.g. `"01"`. */
  cycloneNumber: string;
  /** Four-digit season year, e.g. 1851. */
  year: number;
};

/**
 * Parses a HURDAT2 storm id: two letters + two digits (cyclone #) + four digits (year),
 * e.g. `AL011851` → basin `AL`, cyclone number `01`, year `1851`.
 */
export function parseHurdat2StormId(id: string): Hurdat2StormIdParts | null {
  const trimmed = id.trim();
  const m = trimmed.match(/^([A-Za-z]{2})(\d{2})(\d{4})$/);
  if (!m) return null;
  const year = Number(m[3]);
  if (!Number.isFinite(year)) return null;
  return {
    basin: m[1].toUpperCase(),
    cycloneNumber: m[2],
    year,
  };
}

export type Hurdat2StormHeaderParsed = {
  id: string;
  name: string;
  entryCount: number;
  /** Present when `id` matches `LLNNYYYY`; otherwise `null`. */
  idParts: Hurdat2StormIdParts | null;
};

/** The storm header line: id, name, number of track rows, plus parsed id components when possible. */
export function parseHurdat2StormHeaderLine(line: string): Hurdat2StormHeaderParsed | null {
  if (!isHurdat2StormHeaderLine(line)) return null;
  const parts = line
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s !== "");
  if (parts.length < 3) return null;
  const entryCount = Number(parts[2]);
  if (!Number.isFinite(entryCount)) return null;
  const id = parts[0];
  return {
    id,
    name: parts[1],
    entryCount,
    idParts: parseHurdat2StormId(id),
  };
}

export type Hurdat2StormChunk = {
  /** Raw storm metadata line (id, name, entry count). */
  headerLine: string;
  /** Newline-separated best-track rows for this storm (comma-separated fields per line). */
  trackData: string;
  /** Parsed header fields when the line matches `parseHurdat2StormHeaderLine`. */
  headerParsed: Hurdat2StormHeaderParsed | null;
  /**
   * True when `headerParsed` is set and its `entryCount` does not match the number of track
   * lines collected before the next storm (or EOF). We still collect all lines until the next
   * header so a wrong count in the file does not drop real track rows.
   */
  entryCountMismatch: boolean;
};

/**
 * Splits full HURDAT2 text into per-storm chunks (header line + following best-track rows).
 * Used internally by {@link processFloridaHurricanesFromHurdat2Data};
 */
function splitHurdat2TextIntoStormChunks(text: string): Hurdat2StormChunk[] {
  const lines = text.split(/\r?\n/);
  const stormChunks: Hurdat2StormChunk[] = [];
  let headerLine: string | null = null;
  const stormLines: string[] = [];

  const flush = () => {
    if (headerLine === null) return;
    const headerParsed = parseHurdat2StormHeaderLine(headerLine);
    const trackLineCount = stormLines.length;
    stormChunks.push({
      headerLine,
      trackData: stormLines.join("\n"),
      headerParsed,
      entryCountMismatch: headerParsed !== null && headerParsed.entryCount !== trackLineCount,
    });
    stormLines.length = 0;
    headerLine = null;
  };

  for (const line of lines) {
    if (line.trim() === "") continue;
    if (isHurdat2StormHeaderLine(line)) {
      flush();
      headerLine = line.trimEnd();
    } else if (headerLine !== null) {
      stormLines.push(line.trimEnd());
    }
  } 
  flush();

  return stormChunks;
}

/** Processes HURDAT2 data to extract Florida hurricanes. */
export function processFloridaHurricanesFromHurdat2Data(text: string): FloridaHurricane[] {
  const storms = splitHurdat2TextIntoStormChunks(text);

  return storms.flatMap((storm): FloridaHurricane[] => {
    const header = storm.headerParsed;
    if (!header?.idParts || header.idParts.basin !== "AL") return [];

    const trackRows = storm.trackData
      .split("\n")
      .map((line) => parseHurdat2TrackLine(line))
      .filter((r): r is Hurdat2TrackRow => r !== null)
      .filter(isFloridaHurricaneTrackRow);

    if (trackRows.length === 0) return [];

    const first = trackRows[0];
    const maxWind = trackRows.reduce((max, row) => {
      const v = row.maximumSustainedWindKt ?? 0;
      return v > max ? v : max;
    }, 0);

    return [
      {
        name: header.name,
        // JS Date month is 0-based; HURDAT2 month is 1-based.
        dateOfLandfall: new Date(
          header.idParts.year,
          first.month - 1,
          first.day,
          first.hourUtc,
          first.minuteUtc,
        ),
        latitude: toSignedLatitude(first.latitudeDegrees, first.latitudeHemisphere),
        longitude: toSignedLongitude(first.longitudeDegrees, first.longitudeHemisphere),
        maximumSustainedWindKt: maxWind,
      },
    ];
  });
}

function toSignedLatitude(degrees: number, hemisphere: "N" | "S"): number {
  return hemisphere === "S" ? -Math.abs(degrees) : Math.abs(degrees);
}
function toSignedLongitude(degrees: number, hemisphere: "W" | "E"): number {
  return hemisphere === "W" ? -Math.abs(degrees) : Math.abs(degrees);
}

/** Checks if a track row is within the Florida polygon. */
function isInFloridaPolygon(trackRow: Hurdat2TrackRow): boolean {
  const lat = trackRow.latitudeDegrees * (trackRow.latitudeHemisphere === "S" ? -1 : 1);
  const lon = toSignedLongitude(trackRow.longitudeDegrees, trackRow.longitudeHemisphere);
  return isPointInFlorida(lat, lon);
}

/** Checks if a track row is a Florida hurricane. */
function isFloridaHurricaneTrackRow(trackRow: Hurdat2TrackRow): boolean {
  return trackRow.systemStatus === "HU" && isInFloridaPolygon(trackRow);
}