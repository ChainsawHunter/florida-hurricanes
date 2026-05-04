import Papa from "papaparse";
import type { ParsedCsv } from "../types/csv";

const defaultOptions: Papa.ParseConfig = {
  header: false,
  skipEmptyLines: "greedy",
  dynamicTyping: false,
};

function parseResultToParsed(result: Papa.ParseResult<string[]>): ParsedCsv {
  const allRows = result.data.filter((row) => row.some((cell) => cell.trim() !== ""));
  const errors = (result.errors ?? []).map((e) => ({
    row: e.row,
    message: e.message,
  }));

  if (allRows.length === 0) {
    return { headers: [], rows: [], errors };
  }

  const [headerRow, ...body] = allRows;
  return {
    headers: headerRow.map((h) => h.trim()),
    rows: body.map((row) => row.map((c) => c.trim())),
    errors,
  };
}

/**
 * Parses CSV text into headers (first row) and data rows.
 * Empty lines are skipped; malformed rows surface in `errors`.
 */
export function parseCsvText(text: string): ParsedCsv {
  return parseResultToParsed(Papa.parse<string[]>(text, { ...defaultOptions }));
}

export async function parseCsvFile(file: File): Promise<ParsedCsv> {
  const result = await new Promise<Papa.ParseResult<string[]>>((resolve, reject) => {
    Papa.parse<string[]>(file, {
      ...defaultOptions,
      complete: resolve,
      error: reject,
    });
  });
  return parseResultToParsed(result);
}
