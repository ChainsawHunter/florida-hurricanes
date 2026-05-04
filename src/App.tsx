import { useCallback, useState } from "react";
import {
  groupHurdat2IntoStormCsvChunks,
  type Hurdat2StormCsvChunk,
} from "./lib/hurdat2Storms";
import "./App.css";

export function App() {
  const [chunks, setChunks] = useState<Hurdat2StormCsvChunk[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const onFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    setLoadError(null);
    setChunks([]);
    setFileName(null);
    if (!file) return;
    try {
      const text = await file.text();
      setChunks(groupHurdat2IntoStormCsvChunks(text));
      setFileName(file.name);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to read file");
    }
  }, []);

  return (
    <div className="app">
      <h1>HURDAT2 storms</h1>
      <p className="lead">Choose a HURDAT2-format text file (storm header lines plus best-track rows).</p>

      <div className="panel">
        <div className="file-row">
          <label htmlFor="hurdat-file">File</label>
          <input
            id="hurdat-file"
            type="file"
            accept=".txt,text/plain,.dat"
            onChange={onFile}
          />
        </div>
        {fileName && <p className="meta">Loaded: {fileName}</p>}
        {loadError && <p className="errors">{loadError}</p>}
      </div>

      {chunks.length > 0 && (
        <p className="meta">{chunks.length} storm{chunks.length === 1 ? "" : "s"} found</p>
      )}

      {chunks.length > 0 && (
        <ul className="storm-list">
          {chunks.map((c, i) => {
            const trackRows = c.trackCsv.split("\n").filter((line) => line.trim() !== "");
            const label = c.headerParsed?.id ?? c.headerLine.slice(0, 12);
            return (
              <li key={i} className="storm-list__item">
                <span className="storm-list__id">{label}</span>
                <span className="storm-list__meta">
                  {c.headerParsed?.name ?? "—"} · {trackRows.length} track row{trackRows.length === 1 ? "" : "s"}
                  {c.entryCountMismatch ? " · header count mismatch" : ""}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {chunks.length === 0 && fileName && !loadError && (
        <p className="empty">No storm blocks found (expected basin id header lines such as AL011851,…).</p>
      )}
    </div>
  );
}
