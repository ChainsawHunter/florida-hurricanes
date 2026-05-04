import { describe, expect, it } from "vitest";
import { parseHurdat2TrackLine } from "./hurdat2Track";

/** Atlantic HURDAT2 best-track row: 21 comma-separated fields. */
const EXAMPLE_TS =
  "18510816, 0000,  , TS, 13.4N,  48.0W,  40, -999, -999, -999, -999, -999, -999, -999, -999, -999, -999, -999, -999, -999, -999";

const EXAMPLE_LANDFALL =
  "18510625, 2100, L, HU, 28.2N,  96.8W,  80, -999, -999, -999, -999, -999, -999, -999, -999, -999, -999, -999, -999, -999, -999";

describe("parseHurdat2TrackLine", () => {
  it("parses the documented TS example for fields we need (21 fields)", () => {
    const row = parseHurdat2TrackLine(EXAMPLE_TS);
    expect(row).not.toBeNull();
    expect(row!.year).toBe(1851);
    expect(row!.month).toBe(8);
    expect(row!.day).toBe(16);
    expect(row!.hourUtc).toBe(0);
    expect(row!.minuteUtc).toBe(0);
    expect(row!.recordIdentifier).toBe("");
    expect(row!.systemStatus).toBe("TS");
    expect(row!.latitudeDegrees).toBe(13.4);
    expect(row!.latitudeHemisphere).toBe("N");
    expect(row!.longitudeDegrees).toBe(48.0);
    expect(row!.longitudeHemisphere).toBe("W");
    expect(row!.maximumSustainedWindKt).toBe(40);
  });

  it("parses record identifier L (landfall)", () => {
    const row = parseHurdat2TrackLine(EXAMPLE_LANDFALL);
    expect(row).not.toBeNull();
    expect(row!.recordIdentifier).toBe("L");
    expect(row!.systemStatus).toBe("HU");
    expect(row!.hourUtc).toBe(21);
  });

  it("returns null for storm header lines", () => {
    expect(parseHurdat2TrackLine("AL011851,            UNNAMED,     14,")).toBeNull();
  });

  it("returns null for too few fields", () => {
    expect(parseHurdat2TrackLine("18510816, 0000,  , TS, 13.4N,  48.0W,  40")).toBeNull();
  });
});
