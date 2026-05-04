import { useCallback, useState } from "react";
import { parseCsvFile } from "./lib/parseCsv";
import type { ParsedCsv } from "./types/csv";
import "./App.css";

export function App() {
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const onFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    setLoadError(null);
    setParsed(null);
    setFileName(null);
    if (!file) return;
    try {
      const result = await parseCsvFile(file);
      setParsed(result);
      setFileName(file.name);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to read file");
    }
  }, []);

  return (
    <div className="app">
      <h1>CSV parser</h1>
      <p className="lead">
        Choose a CSV file. The first row is treated as column headers; remaining rows are data.
      </p>

      <div className="panel">
        <div className="file-row">
          <label htmlFor="csv-file">File</label>
          <input id="csv-file" type="file" accept=".csv,text/csv,text/plain" onChange={onFile} />
        </div>
        {fileName && <p className="meta">Loaded: {fileName}</p>}
        {loadError && <p className="errors">{loadError}</p>}
        {parsed && parsed.errors.length > 0 && (
          <ul className="errors">
            {parsed.errors.map((err, i) => (
              <li key={i}>
                {err.row != null ? `Row ${err.row}: ` : ""}
                {err.message}
              </li>
            ))}
          </ul>
        )}
      </div>

      {parsed && parsed.headers.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {parsed.headers.map((h, i) => (
                  <th key={i}>{h || `(column ${i + 1})`}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parsed.rows.map((row, ri) => (
                <tr key={ri}>
                  {parsed.headers.map((_, ci) => (
                    <td key={ci}>{row[ci] ?? ""}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {parsed && parsed.headers.length === 0 && !loadError && (
        <p className="empty">No rows found in this file.</p>
      )}
    </div>
  );
}
