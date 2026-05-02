#!/usr/bin/env node
/**
 * Auto-watch script — re-runs both scanners when .tsx/.css files change.
 * Usage: node scripts/scan-watch.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { run as runInputs } from "./scan-inputs.mjs";
import { run as runDesign } from "./scan-design.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.resolve(__dirname, "..", "src");

let debounceTimer = null;
let isRunning = false;

function runBoth() {
  if (isRunning) return;
  isRunning = true;
  console.log(`\n${"═".repeat(60)}`);
  console.log(`🔄 Change detected — re-scanning at ${new Date().toLocaleTimeString()}`);
  console.log(`${"═".repeat(60)}\n`);
  try {
    runInputs();
    console.log("");
    runDesign();
  } catch (err) {
    console.error("❌ Scan error:", err.message);
  }
  isRunning = false;
}

// Initial run
console.log("🚀 Running initial scan...\n");
runBoth();

// Watch for changes
console.log(`\n👀 Watching ${SRC_DIR} for changes...\n`);
console.log("   Press Ctrl+C to stop.\n");

try {
  fs.watch(SRC_DIR, { recursive: true }, (eventType, filename) => {
    if (!filename) return;
    if (!filename.endsWith(".tsx") && !filename.endsWith(".ts") && !filename.endsWith(".css")) return;
    if (filename.includes("node_modules")) return;

    // Debounce: wait 500ms after last change before re-scanning
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      runBoth();
    }, 500);
  });
} catch (err) {
  console.error("⚠️  fs.watch failed, falling back to polling...");
  // Fallback: poll every 5 seconds
  let lastMtime = Date.now();
  setInterval(() => {
    // Check if any file changed
    const check = (dir) => {
      if (!fs.existsSync(dir)) return false;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === "node_modules") continue;
          if (check(full)) return true;
        } else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".css")) {
          const stat = fs.statSync(full);
          if (stat.mtimeMs > lastMtime) {
            lastMtime = Date.now();
            return true;
          }
        }
      }
      return false;
    };
    if (check(SRC_DIR)) runBoth();
  }, 5000);
}
