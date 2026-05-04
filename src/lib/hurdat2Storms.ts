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
  /** Newline-separated best-track rows for this storm (comma-separated fields per line). */
  trackCsv: string;
  /** Parsed header fields when the line matches `parseHurdat2StormHeaderLine`. */
  headerParsed: { id: string; name: string; entryCount: number } | null;
  /**
   * True when `headerParsed` is set and its `entryCount` does not match the number of track
   * lines collected before the next storm (or EOF). We still collect all lines until the next
   * header so a wrong count in the file does not drop real track rows.
   */
  entryCountMismatch: boolean;
};

/**
 * Splits full HURDAT2 file text into per-storm chunks. Each `trackCsv` joins that storm’s
 * best-track lines (no storm metadata line included).
 *
 * Declared `entryCount` on each header is compared to the number of track rows actually
 * collected; see `entryCountMismatch` on each chunk. Delimiters are still storm headers so
 * inconsistent counts never cause silent data loss.
 */
export function groupHurdat2IntoStormCsvChunks(text: string): Hurdat2StormCsvChunk[] {
  const lines = text.split(/\r?\n/);
  const stormChunks: Hurdat2StormCsvChunk[] = [];
  let headerLine: string | null = null;
  const stormLines: string[] = [];

  const flush = () => {
    if (headerLine === null) return;
    const headerParsed = parseHurdat2StormHeaderLine(headerLine);
    const trackLineCount = stormLines.length;
    stormChunks.push({
      headerLine,
      trackCsv: stormLines.join("\n"),
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
