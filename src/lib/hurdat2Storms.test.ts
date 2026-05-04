import { describe, expect, it } from "vitest";
import {
  groupHurdat2IntoStormCsvChunks,
  hurdat2TrackCsvStrings,
  isHurdat2StormHeaderLine,
  parseHurdat2StormHeaderLine,
} from "./hurdat2Storms";

const SAMPLE = `AL011851,            UNNAMED,     2,
18510625, 0000,  , HU, 28.0N,  94.8W,  80, -999,
18510628, 0000,  , TS, 31.0N, 100.2W,  40, -999,

AL021851,            OTHER_ONE,      1,
18510705, 1200,  , HU, 22.2N,  97.6W,  80, -999,
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

describe("parseHurdat2StormHeaderLine", () => {
  it("parses id, name, and entry count", () => {
    expect(parseHurdat2StormHeaderLine("AL011851,            UNNAMED,     14,")).toEqual({
      id: "AL011851",
      name: "UNNAMED",
      entryCount: 14,
    });
  });

  it("returns null for non-header lines", () => {
    expect(parseHurdat2StormHeaderLine("18510625, 0000,  , HU, 28.0N,  94.8W,  80,")).toBeNull();
  });
});

describe("groupHurdat2IntoStormCsvChunks", () => {
  it("groups track lines under each storm header", () => {
    const chunks = groupHurdat2IntoStormCsvChunks(SAMPLE);
    expect(chunks).toHaveLength(2);

    expect(chunks[0].headerLine).toContain("AL011851");
    expect(chunks[0].trackCsv.split("\n").filter(Boolean)).toHaveLength(2);

    expect(chunks[1].headerLine).toContain("AL021851");
    expect(chunks[1].trackCsv.split("\n").filter(Boolean)).toHaveLength(1);
  });

  it("ignores lines before the first storm header", () => {
    const text = `ignored preamble
${SAMPLE}`;
    const chunks = groupHurdat2IntoStormCsvChunks(text);
    expect(chunks).toHaveLength(2);
    expect(chunks[0].headerLine).toContain("AL011851");
  });

  it("handles CRLF", () => {
    const crlf = SAMPLE.replace(/\n/g, "\r\n");
    const chunks = groupHurdat2IntoStormCsvChunks(crlf);
    expect(chunks).toHaveLength(2);
    expect(chunks[0].trackCsv.split("\n")).toHaveLength(2);
  });
});

describe("hurdat2TrackCsvStrings", () => {
  it("returns only track CSV strings in order", () => {
    const tracks = hurdat2TrackCsvStrings(SAMPLE);
    expect(tracks).toHaveLength(2);
    expect(tracks[0]).toContain("18510625");
    expect(tracks[1]).toContain("18510705");
  });
});
