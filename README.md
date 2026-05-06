# florida-hurricanes

Small Vite + React app that parses **HURDAT2** best-track data and identifies **Florida entry (“landfall”) events** using a Florida polygon.

## How “landfall” events are determined

For each Atlantic (`AL`) storm in the HURDAT2 file, the app:

1. Parses each best-track row into latitude/longitude and system status.
2. Checks whether the storm center is **inside** the Florida polygon.
3. Records a “landfall/entry” event on the *first* inside-Florida row where the immediately previous row was **outside** Florida.
4. Only keeps entry events whose inside row has `systemStatus === "HU"` (hurricane intensity).

## Prerequisites

- Node.js (>= 18)
- npm

## Quick start

First, install all required packages. Then run the simple web app:

```bash
npm install
npm run dev
```     

## Data options (recommended)

### Option A: Use the included small sample file (fastest)

Upload `samples/hurdat2.sample.txt` in the UI.

### Option B: Download the official HURDAT2 dataset locally (one command)

This downloads the dataset into `.data/hurdat2.txt` (gitignored):

```bash
npm run download:hurdat2
```

Then upload `.data/hurdat2.txt` in the UI.

- **Source**: the script defaults to NOAA/NHC’s published HURDAT2 Atlantic file (1851–2025), e.g. `https://www.nhc.noaa.gov/data/hurdat/`
- **Override URL**: `npm run download:hurdat2 -- <url>`

### Option C: Upload a file you already have

If you already have a HURDAT2 `.txt` file, just upload it in the UI.

## Key files to review

- `src/lib/hurdat2Track.ts`: parses HURDAT2 best-track rows into typed objects.
- `src/lib/hurdat2Storms.ts`: groups rows into storms and applies the Florida landfall logic.
- `src/lib/isPointInFlorida.ts`: point-in-polygon test with a buffered Florida coastline.
- `src/App.tsx`: simple React UI for uploading a file and displaying detected hurricanes/landfalls.
- `src/lib/hurdat2Track.test.ts` and `src/lib/hurdat2Storms.test.ts`: unit tests that cover parsing and landfall detection behavior.

## Attribution

- Florida GeoJSON sourced from `https://github.com/glynnbird/usstatesgeojson`

## Technology choices

- **React + TypeScript**: simple, type-safe UI for loading files and rendering tabular results.
- **Vite**: fast dev server and build tooling with minimal config overhead.
- **Turf.js** (`@turf/boolean-point-in-polygon`, `@turf/buffer`): robust geographic operations for point-in-polygon tests and coastline buffering.
- **Vitest**: lightweight test runner for the parsing and landfall-detection logic.
- **Node.js scripts**: small utilities for downloading HURDAT2 data and running tests/builds.

## Possible future improvements

- **Refine landfall definition**: current entry logic could be potentially tightened to account for fast-moving storms (missed between timesteps), very tight double landfalls (≤6 hours apart), or early-era storms (less precise tracks)
- **Add a map visualization**: render storm tracks and Florida polygon on an interactive map (e.g., Leaflet or Mapbox GL) and visually highlight landfall segments.
- **Support other regions/states**: parameterize the polygon and allow switching to other U.S. states or basins (e.g., Gulf Coast, specific counties, or custom-uploaded GeoJSON).
- **Richer storm metadata**: surface additional HURDAT2 fields (pressure, wind radii, status changes) alongside landfall events.
- **Performance and UX polish**: stream results for large files, add basic filters (year range, intensity), and provide download/export of the derived landfall events.
