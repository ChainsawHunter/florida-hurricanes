import { describe, expect, it } from "vitest";
import {
  isHurdat2StormHeaderLine,
  parseHurdat2StormHeaderLine,
  parseHurdat2StormId,
  processFloridaHurricanesFromHurdat2Data,
} from "./hurdat2Storms";

const FL_SAMPLE =
`AL011851,            FL_STORM,     2,
18510625, 2100,  , HU, 28.2N,  81.2W,  80, -999, -999, -999, -999, -999, -999, -999, -999, -999, -999, -999, -999, -999, -999
18510626, 0000,  , HU, 29.0N,  82.0W,  90, -999, -999, -999, -999, -999, -999, -999, -999, -999, -999, -999, -999, -999, -999

AL021851,            TX_STORM,     1,
18510625, 2100,  , HU, 28.2N,  96.8W,  80, -999, -999, -999, -999, -999, -999, -999, -999, -999, -999, -999, -999, -999, -999
`;

describe("isHurdat2StormHeaderLine", () => {
  it("returns true for basin storm id first field", () => {
    expect(isHurdat2StormHeaderLine("AL011851,            UNNAMED,     14,")).toBe(true);
    expect(isHurdat2StormHeaderLine("  EP022020, NAME, 5,")).toBe(true);
  });

  it("returns false for best-track rows (date first)", () => {
    expect(isHurdat2StormHeaderLine("18510625, 0000,  , HU, 28.0N,  94.8W,  80, -999,")).toBe(false);
  });

  it("returns false for empty or non-storm lines", () => {
    expect(isHurdat2StormHeaderLine("")).toBe(false);
    expect(isHurdat2StormHeaderLine("   ")).toBe(false);
    expect(isHurdat2StormHeaderLine("# comment")).toBe(false);
  });
});

describe("parseHurdat2StormId", () => {
  it("parses basin, two-digit cyclone number, and four-digit year", () => {
    expect(parseHurdat2StormId("AL011851")).toEqual({
      basin: "AL",
      cycloneNumber: "01",
      year: 1851,
    });
  });

  it("normalizes basin letters to uppercase", () => {
    expect(parseHurdat2StormId("ep022020")).toEqual({
      basin: "EP",
      cycloneNumber: "02",
      year: 2020,
    });
  });

  it("returns null when the id does not match LLNNYYYY", () => {
    expect(parseHurdat2StormId("AL01185")).toBeNull();
    expect(parseHurdat2StormId("A0118511")).toBeNull();
    expect(parseHurdat2StormId("")).toBeNull();
  });
});

describe("parseHurdat2StormHeaderLine", () => {
  it("parses id, name, entry count, and id parts", () => {
    expect(parseHurdat2StormHeaderLine("AL011851,            UNNAMED,     14,")).toEqual({
      id: "AL011851",
      name: "UNNAMED",
      entryCount: 14,
      idParts: { basin: "AL", cycloneNumber: "01", year: 1851 },
    });
  });

  it("returns null for non-header lines", () => {
    expect(parseHurdat2StormHeaderLine("18510625, 0000,  , HU, 28.0N,  94.8W,  80,")).toBeNull();
  });
});

describe("processFloridaHurricanesFromHurdat2Data", () => {
  it("processes Florida hurricanes from HURDAT2 data", () => {
    const floridaHurricanes = processFloridaHurricanesFromHurdat2Data(FL_SAMPLE);
    expect(floridaHurricanes).toHaveLength(1);
    expect(floridaHurricanes[0].maximumSustainedWindKt).toBe(90);
    expect(floridaHurricanes[0].longitude).toBeLessThan(0);
    expect(floridaHurricanes[0].firstHuInFloridaDateTimeDisplay).toBe("25/06/1851 - 21:00");
  });
});