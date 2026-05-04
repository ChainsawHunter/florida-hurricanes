/** Result of parsing a CSV string or file into rows of string cells. */
export type ParsedCsv = {
  headers: string[];
  rows: string[][];
  errors: { row?: number; message: string }[];
};
