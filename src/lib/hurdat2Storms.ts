/**
 * HURDAT2 / best-track text: each storm starts with a metadata line
 * (basin id, name, number of following track rows), then comma-separated track rows.
 *
 * Track rows begin with an 8-digit date (YYYYMMDD); storm ids match two letters + six digits.
 * We detect storm headers by that id pattern (not by “three non-empty fields”, which can
 * match the first tokens of a track row).
 */

/** Two-letter basin + six digits, e.g. AL011851 */
const STORM_HEADER_FIRST_FIELD = /^[A-Z]{2}\d{6}$/i;

export function isHurdat2StormHeaderLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  const firstField = trimmed.split(",")[0]?.trim() ?? "";
  if (/^\d{8}$/.test(firstField)) return false;
  return STORM_HEADER_FIRST_FIELD.test(firstField);
}

/** The three logical fields on a storm header line: id, name, number of track rows. */
export function parseHurdat2StormHeaderLine(line: string): { id: string; name: string; entryCount: number } | null {
  if (!isHurdat2StormHeaderLine(line)) return null;
  const parts = line
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s !== "");
  if (parts.length < 3) return null;
  const entryCount = Number(parts[2]);
  if (!Number.isFinite(entryCount)) return null;
  return { id: parts[0], name: parts[1], entryCount };
}

export type Hurdat2StormCsvChunk = {
  /** Raw storm metadata line (id, name, entry count). */
  headerLine: string;
  /** Newline-separated track rows only — safe to pass to `parseCsvText` for row/column parsing. */
  trackCsv: string;
};

/**
 * Splits full HURDAT2 file text into per-storm chunks. Each `trackCsv` is one string you can
 * pass to `parseCsvText` (no synthetic header row; rows are raw best-track lines).
 */
export function groupHurdat2IntoStormCsvChunks(text: string): Hurdat2StormCsvChunk[] {
  const lines = text.split(/\r?\n/);
  const chunks: Hurdat2StormCsvChunk[] = [];
  let headerLine: string | null = null;
  const trackLines: string[] = [];

  const flush = () => {
    if (headerLine === null) return;
    chunks.push({
      headerLine,
      trackCsv: trackLines.join("\n"),
    });
    trackLines.length = 0;
    headerLine = null;
  };

  for (const line of lines) {
    if (line.trim() === "") continue;
    if (isHurdat2StormHeaderLine(line)) {
      flush();
      headerLine = line.trimEnd();
    } else if (headerLine !== null) {
      trackLines.push(line.trimEnd());
    }
  }
  flush();

  return chunks;
}

/** Same groups as {@link groupHurdat2IntoStormCsvChunks}, but only the track CSV strings. */
export function hurdat2TrackCsvStrings(text: string): string[] {
  return groupHurdat2IntoStormCsvChunks(text).map((c) => c.trackCsv);
}

export async function readFileAsText(file: File): Promise<string> {
  return file.text();
}
