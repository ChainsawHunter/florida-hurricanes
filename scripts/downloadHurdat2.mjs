import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import { fileURLToPath } from "node:url";

const DEFAULT_URL = "https://www.nhc.noaa.gov/data/hurdat/hurdat2-1851-2025-02272026.txt";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const url = process.argv[2] ?? DEFAULT_URL;
const outDir = path.join(repoRoot, ".data");
const outFile = path.join(outDir, "hurdat2.txt");

fs.mkdirSync(outDir, { recursive: true });

function downloadToFile(downloadUrl, filePath) {
  return new Promise((resolve, reject) => {
    https
      .get(downloadUrl, (res) => {
        // Follow redirects (common on NOAA endpoints)
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          res.resume();
          resolve(downloadToFile(res.headers.location, filePath));
          return;
        }

        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`Download failed: HTTP ${res.statusCode ?? "unknown"}`));
          return;
        }

        const tmpPath = `${filePath}.tmp`;
        const out = fs.createWriteStream(tmpPath);
        res.pipe(out);

        out.on("finish", () => {
          out.close(() => {
            fs.renameSync(tmpPath, filePath);
            resolve();
          });
        });
        out.on("error", (err) => reject(err));
      })
      .on("error", reject);
  });
}

await downloadToFile(url, outFile);

const stats = fs.statSync(outFile);
console.log(`Saved HURDAT2 to ${outFile} (${Math.round(stats.size / 1024)} KB)`);

