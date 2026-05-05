import { Hurdat2TrackRow, parseHurdat2TrackLine } from "./hurdat2Track";
import { isPointInFlorida } from "./isPointInFlorida";

// -----------------------------
// Public types
// -----------------------------

/** The main hurricane record type we want to display in the app. */
export type FloridaHurricane = {
  name: string;
  latitude: number;
  longitude: number;
  maximumSustainedWindKt: number;
  landfallRowEvents: LandfallRowEvent[];
};

export type LandfallRowEvent = {
  dateOfLandfall: Date;
  landfallDateTimeDisplay: string;
  latitude: number;
  longitude: number;
};

// -----------------------------
// HURDAT2 storm header parsing
// -----------------------------

/** Two-letter basin + six digits, e.g. AL011851 */
const STORM_HEADER_FIRST_FIELD = /^[A-Z]{2}\d{6}$/i;

/** Checks if a line is a valid HURDAT2 storm header line. */
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

// -----------------------------
// Chunking: full file → per-storm blocks
// -----------------------------

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
 * Groups HURDAT2 data into per-storm chunks (header line + following best-track rows).
 * Used internally by {@link processFloridaHurricanesFromHurdat2Data}.
 */
function groupHurdat2IntoStormChunks(text: string): Hurdat2StormChunk[] {
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

// -----------------------------
// Public API: storms → Florida hurricanes
// -----------------------------

/**
 * Processes HURDAT2 data to extract Florida hurricanes.
 * @param text - The HURDAT2 text data to process.
 * @returns An array of Florida hurricane records.
 */
export function processFloridaHurricanesFromHurdat2Data(text: string): FloridaHurricane[] {
  const storms = groupHurdat2IntoStormChunks(text);

  return storms.flatMap((storm): FloridaHurricane[] => {
    const header = storm.headerParsed;
    if (!header?.idParts || header.idParts.basin !== "AL") return [];

    const trackRowsAll = storm.trackData
      .split("\n")
      .map((line) => parseHurdat2TrackLine(line))
      .filter((r): r is Hurdat2TrackRow => r !== null);

    const huRowsInFlorida = trackRowsAll.filter(
      (row) => row.systemStatus === "HU" && isInFloridaPolygon(row),
    );
    if (huRowsInFlorida.length === 0) return [];

    const landfallRows = findFloridaEntryRows(trackRowsAll).filter(
      (row) => row.systemStatus === "HU",
    );
    if (landfallRows.length === 0) return [];

    const first = landfallRows[0];
    const maxWind = huRowsInFlorida.reduce((max, row) => {
      const v = row.maximumSustainedWindKt ?? 0;
      return v > max ? v : max;
    }, 0);

    const landfallRowEvents = landfallRows.map((row) => {
      return {
        dateOfLandfall: new Date(row.year, row.month - 1, row.day, row.hourUtc, row.minuteUtc),
        landfallDateTimeDisplay:
          formatMmDdYyyy(row.day, row.month, row.year) + " - " + formatHhMm(row.hourUtc, row.minuteUtc),
        latitude: toSignedLatitude(row.latitudeDegrees, row.latitudeHemisphere),
        longitude: toSignedLongitude(row.longitudeDegrees, row.longitudeHemisphere),
      };
    });

    return [
      {
        name: header.name,
        latitude: toSignedLatitude(first.latitudeDegrees, first.latitudeHemisphere),
        longitude: toSignedLongitude(first.longitudeDegrees, first.longitudeHemisphere),
        maximumSustainedWindKt: maxWind,
        landfallRowEvents,
      },
    ];
  });
}

// -----------------------------
// Local helpers: formatting / geography / crossing detection
// -----------------------------

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** `MM/DD/YYYY` using the HURDAT2 row’s calendar fields (month/day/year). */
function formatMmDdYyyy(day: number, month: number, year: number): string {
  return `${pad2(month)}/${pad2(day)}/${String(year)}`;
}

function formatHhMm(hour: number, minute: number): string {
  return `${pad2(hour)}:${pad2(minute)}`;
}

function toSignedLatitude(degrees: number, hemisphere: "N" | "S"): number {
  return hemisphere === "S" ? -Math.abs(degrees) : Math.abs(degrees);
}
function toSignedLongitude(degrees: number, hemisphere: "W" | "E"): number {
  return hemisphere === "W" ? -Math.abs(degrees) : Math.abs(degrees);
}

/** Checks if a track row is within the Florida polygon. */
function isInFloridaPolygon(trackRow: Hurdat2TrackRow): boolean {
  const lat = toSignedLatitude(trackRow.latitudeDegrees, trackRow.latitudeHemisphere);
  const lon = toSignedLongitude(trackRow.longitudeDegrees, trackRow.longitudeHemisphere);
  return isPointInFlorida(lat, lon);
}

/**
 * Finds outside→inside crossings into the Florida polygon.
 *
 * A crossing is recorded on the *inside* row: the first row whose center is inside Florida
 * where the immediately-previous row’s center is outside Florida.
 */
function findFloridaEntryRows(trackRows: Hurdat2TrackRow[]): Hurdat2TrackRow[] {
  const entryRows: Hurdat2TrackRow[] = [];
  let prevInFlorida = false;

  for (const row of trackRows) {
    const inFlorida = isInFloridaPolygon(row);
    if (!prevInFlorida && inFlorida) entryRows.push(row);
    prevInFlorida = inFlorida;
  }

  return entryRows;
}