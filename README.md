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

## Attribution

- Florida GeoJSON sourced from `https://github.com/glynnbird/usstatesgeojson`