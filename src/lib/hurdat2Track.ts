/**
 * HURDAT2 best-track (time-series) row semantics.
 * Files use comma-separated values; fixed “spaces” in the spec correspond to these fields.
 */

/** Record identifier (space 17 / field before status); blank field normalized to `""`. */
export type Hurdat2RecordIdentifier = "" | "L" | "P" | "I" | "S" | "T";

/** Status of system (before 4th comma in CSV layout = field index 3 after date/time/record). */
export type Hurdat2SystemStatus =
  | "TD"
  | "TS"
  | "HU"
  | "EX"
  | "SD"
  | "SS"
  | "LO"
  | "DB";

/**
 * One best-track observation row after storm header lines.
 */
export type Hurdat2TrackRow = {
  /** Calendar year (from date field YYYYMMDD). */
  year: number;
  /** Month 1–12 (from date field). */
  month: number;
  /** Day of month (from date field). */
  day: number;
  /** Hours in UTC (from HHMM time field). */
  hourUtc: number;
  /** Minutes in UTC (from HHMM time field). */
  minuteUtc: number;
  /**
   * Record identifier: L landfall, P min central pressure, I intensity peak (pressure + wind),
   * S status change, T extra track detail, or blank/space when none.
   */
  recordIdentifier: Hurdat2RecordIdentifier;
  /** Intensity / nature of the system at this time. */
  systemStatus: Hurdat2SystemStatus;
  /** Latitude magnitude in degrees. */
  latitudeDegrees: number;
  latitudeHemisphere: "N" | "S";
  /** Longitude magnitude in degrees. */
  longitudeDegrees: number;
  longitudeHemisphere: "W" | "E";
  /** Maximum sustained wind in knots. */
  maximumSustainedWindKt: number | null;
};

const SYSTEM_STATUSES = new Set<string>(["TD", "TS", "HU", "EX", "SD", "SS", "LO", "DB"]);

function parseInt(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const t = raw.trim();
  if (t === "") return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return n;
}

function parseLatToken(token: string): { deg: number; hemi: "N" | "S" } | null {
  const t = token.trim();
  const m = t.match(/^(\d+\.?\d*)\s*([NS])$/i);
  if (!m) return null;
  const deg = Number(m[1]);
  if (!Number.isFinite(deg)) return null;
  const h = m[2].toUpperCase();
  if (h !== "N" && h !== "S") return null;
  return { deg, hemi: h };
}

function parseLonToken(token: string): { deg: number; hemi: "W" | "E" } | null {
  const t = token.trim();
  const m = t.match(/^(\d+\.?\d*)\s*([EW])$/i);
  if (!m) return null;
  const deg = Number(m[1]);
  if (!Number.isFinite(deg)) return null;
  const h = m[2].toUpperCase();
  if (h !== "W" && h !== "E") return null;
  return { deg, hemi: h };
}

function normalizeRecordId(raw: string | undefined): Hurdat2RecordIdentifier {
  const t = (raw ?? "").trim();
  if (t === "" || t === " ") return "";
  if (t === "L" || t === "P" || t === "I" || t === "S" || t === "T") return t;
  return "";
}

function parseStatus(raw: string): Hurdat2SystemStatus | null {
  const s = raw.trim().toUpperCase();
  if (!SYSTEM_STATUSES.has(s)) return null;
  return s as Hurdat2SystemStatus;
}

/**
 * Parses one comma-separated HURDAT2 best-track line into {@link Hurdat2TrackRow}.
 * Expects at least 20 fields but only uses the first 7.
 */
export function parseHurdat2TrackLine(line: string): Hurdat2TrackRow | null {
  const fields = line.split(",").map((s) => s.trim());
  if (fields.length < 20) return null;

  const dateStr = fields[0];
  if (!/^\d{8}$/.test(dateStr)) return null;
  const year = Number(dateStr.slice(0, 4));
  const month = Number(dateStr.slice(4, 6));
  const day = Number(dateStr.slice(6, 8));
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;

  const timeStr = fields[1];
  if (!/^\d{3,4}$/.test(timeStr)) return null;
  const timePadded = timeStr.padStart(4, "0");
  const hourUtc = Number(timePadded.slice(0, 2));
  const minuteUtc = Number(timePadded.slice(2, 4));
  if (!Number.isFinite(hourUtc) || !Number.isFinite(minuteUtc)) return null;

  const recordIdentifier = normalizeRecordId(fields[2]);
  const systemStatus = parseStatus(fields[3] ?? "");
  if (!systemStatus) return null;

  const lat = parseLatToken(fields[4] ?? "");
  const lon = parseLonToken(fields[5] ?? "");
  if (!lat || !lon) return null;

  const maximumSustainedWindKt = parseInt(fields[6]);

  return {
    year,
    month,
    day,
    hourUtc,
    minuteUtc,
    recordIdentifier,
    systemStatus,
    latitudeDegrees: lat.deg,
    latitudeHemisphere: lat.hemi,
    longitudeDegrees: lon.deg,
    longitudeHemisphere: lon.hemi,
    maximumSustainedWindKt
  };
}
