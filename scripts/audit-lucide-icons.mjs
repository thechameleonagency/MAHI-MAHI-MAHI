/**
 * JSX uses `lucide-react` Export when name matches `<Icon />` usage but is missing from import line(s).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as Lucide from "lucide-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, "..", "src");

const LUCIDE_EXPORTS = new Set(
  Object.keys(Lucide).filter((k) => /^[A-Z][a-zA-Z0-9]*$/.test(k)),
);

/** lucide exposes icons whose names collide with Radix/react-router/UI primitives — ignore for this check */
const EXPORT_NAME_COLLISIONS = new Set([
  "Badge",
  "Bell",
  "Calendar",
  "Check",
  "ChevronDown",
  "ChevronLeft",
  "ChevronRight",
  "ChevronUp",
  "Circle",
  "Command",
  "ContextMenu",
  "Dialog",
  "Form",
  "Icon",
  "Image",
  "Input",
  "Label",
  "Link",
  "Menu",
  "NavigationMenu",
  "BarChart",
  "LineChart",
  "Legend",
  "PieChart",
  "Radio",
  "Select",
  "Separator",
  "Sheet",
  "Sidebar",
  "Skeleton",
  "Table",
  "Text",
]);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === "dist") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith(".tsx")) out.push(p);
  }
  return out;
}

function parseLucideImports(txt) {
  const imported = new Set();
  const re = /import\s*\{([^}]+)\}\s*from\s*["']lucide-react["']/g;
  let m;
  while ((m = re.exec(txt))) {
    m[1].split(",").forEach((partRaw) => {
      const segment = partRaw.trim();
      if (!segment) return;
      const parts = segment.split(/\s+as\s+/).map((s) => s.trim());
      const local = (parts[1] ?? parts[0]).split(/\s|,|\{/)[0].trim();
      if (local) imported.add(local);
    });
  }
  return imported;
}

/** Opening JSX-like uses of PascalCase identifiers in TSX (<Name ... or </Name>). */
function usedJsxIdentifiers(txt) {
  const used = new Set();
  const re = /<(?:\/)?([A-Z][A-Za-z0-9]*)[\s>\/\.{]/g;
  let mm;
  while ((mm = re.exec(txt))) {
    used.add(mm[1]);
  }
  return used;
}

const issues = [];
for (const f of walk(SRC)) {
  const txt = fs.readFileSync(f, "utf8");
  if (!txt.includes('lucide-react')) continue;
  const imported = parseLucideImports(txt);

  for (const name of usedJsxIdentifiers(txt)) {
    if (!LUCIDE_EXPORTS.has(name)) continue;
    if (EXPORT_NAME_COLLISIONS.has(name)) continue;
    if (!imported.has(name)) {
      issues.push(`${path.relative(SRC, f)}: '${name}' is a lucide-react export — add to import (used as <${name}>)`);
    }
  }
}

issues.sort().forEach((msg) => console.log(msg));

if (!issues.length) console.log("(lucide JSX vs import audit: OK)");
