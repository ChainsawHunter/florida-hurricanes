import Papa from "papaparse";
import type { ParsedCsv } from "../types/csv";

const defaultOptions: Papa.ParseConfig = {
  header: false,
  skipEmptyLines: "greedy",
  dynamicTyping: false,
};

/**
 * Parses CSV text into headers (first row) and data rows.
 * Empty lines are skipped; malformed rows surface in `errors`.
 */
export function parseCsvText(text: string): ParsedCsv {
  const result = Papa.parse<string[]>(text, {
    ...defaultOptions,
  });

  const allRows = result.data.filter((row) => row.some((cell) => cell.trim() !== ""));
  const errors = (result.errors ?? []).map((e) => ({
    row: e.row,
    message: e.message,
  }));

  if (allRows.length === 0) {
    return { headers: [], rows: [], errors };
  }

  const [headerRow, ...body] = allRows;
  const headers = headerRow.map((h) => h.trim());
  const rows = body.map((r) => r.map((c) => c.trim()));

  return { headers, rows, errors };
}

export function parseCsvFile(file: File): Promise<ParsedCsv> {
  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(file, {
      ...defaultOptions,
      complete: (r) => {
        const allRows = r.data.filter((row) => row.some((cell) => cell.trim() !== ""));
        const errors = (r.errors ?? []).map((e) => ({
          row: e.row,
          message: e.message,
        }));
        if (allRows.length === 0) {
          resolve({ headers: [], rows: [], errors });
          return;
        }
        const [headerRow, ...body] = allRows;
        resolve({
          headers: headerRow.map((h) => h.trim()),
          rows: body.map((row) => row.map((c) => c.trim())),
          errors,
        });
      },
      error: (err) => reject(err),
    });
  });
}
