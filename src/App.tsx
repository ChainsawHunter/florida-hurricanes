import { useCallback, useState } from "react";
import {
  processFloridaHurricanesFromHurdat2Data,
  type FloridaHurricane,
} from "./lib/hurdat2Storms";
import "./App.css";

export function App() {
  const [hurricanes, setHurricanes] = useState<FloridaHurricane[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const landfallRowEventCount = hurricanes.reduce(
    (sum, h) => sum + h.landfallRowEvents.length,
    0,
  );

  const onFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    setLoadError(null);
    setHurricanes([]);
    setFileName(null);
    if (!file) return;
    try {
      const text = await file.text();
      setHurricanes(processFloridaHurricanesFromHurdat2Data(text));
      setFileName(file.name);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to read file");
    }
  }, []);

  return (
    <div className="app">
      <h1>Florida hurricanes</h1>
      <p className="lead">
        Choose a HURDAT2-format text file. The app lists Atlantic storms that had at least one best-track
        point with status <code>HU</code> whose center lies inside the Florida polygon (no reliance on the
        HURDAT2 record-identifier field).
      </p>

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

      {hurricanes.length > 0 && (
        <p className="meta">
          {landfallRowEventCount} landfall row event
          {landfallRowEventCount === 1 ? "" : "s"} ({hurricanes.length} storm
          {hurricanes.length === 1 ? "" : "s"})
        </p>
      )}

      {hurricanes.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Hurricane Name</th>
                <th>Landfall rows</th>
                <th>Max Wind in Knots</th>
                <th>Landfall Event Dates and Times</th>
              </tr>
            </thead>
            <tbody>
              {hurricanes.map((h, i) => (
                <tr key={i}>
                  <td>{h.name}</td>
                  <td>{h.landfallRowEvents.length}</td>
                  <td>{h.maximumSustainedWindKt}</td>
                  <td>
                    <ul className="landfall-list">
                      {h.landfallRowEvents.map((event, eventIndex) => (
                        <li key={eventIndex}>{event.landfallDateTimeDisplay}</li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hurricanes.length === 0 && fileName && !loadError && (
        <p className="empty">No Florida hurricanes found in this file.</p>
      )}
    </div>
  );
}
