#!/usr/bin/env node
/**
 * Input Field Registry Scanner
 * Scans all .tsx files, finds every input field, extracts metadata.
 * Outputs: scripts/output/INPUT_FIELDS.md + scripts/output/input-fields.json
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.resolve(__dirname, "..", "src");
const OUT_DIR = path.resolve(__dirname, "output");

// ── Input component names to detect ──
const INPUT_COMPONENTS = [
  "Input", "Select", "Textarea", "Checkbox", "Switch", "Slider",
  "RadioGroup", "RadioGroupItem", "DatePicker", "Calendar",
  "Combobox", "Toggle", "ToggleGroup",
];
// Wrapper components that internally render inputs
const WRAPPER_CANDIDATES = [
  "SelectTrigger", "SelectContent", "SelectItem", "SelectValue",
];
const ALL_INPUT_LIKE = [...INPUT_COMPONENTS, ...WRAPPER_CANDIDATES];

// ── Modal/Dialog container names ──
const MODAL_CONTAINERS = ["Dialog", "DialogContent", "Sheet", "SheetContent", "Drawer", "DrawerContent", "Popover", "PopoverContent"];

// ── Helpers ──
function walkDir(dir, exts = [".tsx", ".ts"]) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      results.push(...walkDir(full, exts));
    } else if (exts.some(e => entry.name.endsWith(e))) {
      results.push(full);
    }
  }
  return results;
}

function relPath(abs) {
  return path.relative(path.resolve(__dirname, ".."), abs).replace(/\\/g, "/");
}

/**
 * Extract all JSX elements matching target component names.
 * Returns array of { tag, props, line, rawMatch, startIdx }
 */
function extractJsxElements(source, targetTags) {
  const results = [];
  // Match self-closing and opening tags
  // Pattern: <ComponentName prop1="val" prop2={expr} ... /> or <ComponentName ...>
  const tagPattern = new RegExp(
    `<(${targetTags.join("|")})\\b([^>]*?)(\\/?>)`,
    "gs"
  );
  let match;
  while ((match = tagPattern.exec(source)) !== null) {
    const tag = match[1];
    const propsStr = match[2];
    const line = source.substring(0, match.index).split("\n").length;
    const props = parseProps(propsStr);
    results.push({ tag, props, line, rawMatch: match[0], startIdx: match.index });
  }
  return results;
}

/**
 * Parse JSX props from a string like: type="text" placeholder="Enter..." value={foo} onChange={(e) => ...}
 */
function parseProps(propsStr) {
  const props = {};
  if (!propsStr) return props;
  // String props: key="value"
  const strPropRe = /(\w+)="([^"]*)"/g;
  let m;
  while ((m = strPropRe.exec(propsStr)) !== null) {
    props[m[1]] = m[2];
  }
  // Expression props: key={expression}
  // Need to handle nested braces
  const exprPropRe = /(\w+)=\{/g;
  while ((m = exprPropRe.exec(propsStr)) !== null) {
    const key = m[1];
    const startBrace = m.index + m[0].length;
    let depth = 1;
    let i = startBrace;
    while (i < propsStr.length && depth > 0) {
      if (propsStr[i] === "{") depth++;
      else if (propsStr[i] === "}") depth--;
      i++;
    }
    const expr = propsStr.substring(startBrace, i - 1).trim();
    props[key] = `{${expr}}`;
  }
  // Boolean props (just the name, no value): e.g. required, disabled
  const boolRe = /(?:^|\s)(\w+)(?=\s|$|\/>|>)/g;
  while ((m = boolRe.exec(propsStr)) !== null) {
    const key = m[1];
    if (!props[key] && key !== "className" && !["true", "false"].includes(key)) {
      // Only add if not already captured and it's a known boolean prop
      if (["required", "disabled", "readOnly", "autoFocus", "multiple", "checked", "defaultChecked"].includes(key)) {
        props[key] = "true";
      }
    }
  }
  return props;
}

/**
 * Find the nearest Label text above/before an input element.
 * Searches backwards from the input's position for <Label>text</Label> or <Label ...>text</Label>
 */
function findNearestLabel(source, inputIdx) {
  // Look backwards up to 500 chars for a Label
  const searchStart = Math.max(0, inputIdx - 500);
  const chunk = source.substring(searchStart, inputIdx);
  // Find all labels in this chunk, take the last one (nearest)
  const labelRe = /<Label[^>]*>([^<]*)<\/Label>/g;
  let lastLabel = null;
  let m;
  while ((m = labelRe.exec(chunk)) !== null) {
    lastLabel = m[1].trim();
  }
  // Also check htmlFor-based labels
  if (!lastLabel) {
    const htmlForRe = /<Label[^>]*htmlFor="[^"]*"[^>]*>([^<]*)<\/Label>/g;
    while ((m = htmlForRe.exec(chunk)) !== null) {
      lastLabel = m[1].trim();
    }
  }
  // Check for label in div>Label pattern
  if (!lastLabel) {
    const divLabelRe = /<Label[^>]*>\s*([^<{]+)/g;
    while ((m = divLabelRe.exec(chunk)) !== null) {
      const text = m[1].trim();
      if (text.length > 0 && text.length < 100) lastLabel = text;
    }
  }
  return lastLabel || null;
}

/**
 * Detect if an input is inside a Dialog/Modal context.
 * Returns the modal title if found, or null.
 */
function findModalContext(source, inputIdx) {
  // Search backwards for DialogTitle or DialogHeader
  const searchStart = Math.max(0, inputIdx - 3000);
  const chunk = source.substring(searchStart, inputIdx);

  // Check if we're inside a Dialog by counting open/close Dialog tags
  const dialogOpens = (chunk.match(/<Dialog[\s>]/g) || []).length;
  const dialogCloses = (chunk.match(/<\/Dialog>/g) || []).length;
  if (dialogOpens <= dialogCloses) return null; // Not inside a dialog

  // Find the nearest DialogTitle
  const titleRe = /<DialogTitle[^>]*>([^<]*)<\/DialogTitle>/g;
  let lastTitle = null;
  let m;
  while ((m = titleRe.exec(chunk)) !== null) {
    lastTitle = m[1].trim();
  }
  // Also check for titles with children JSX
  if (!lastTitle) {
    const titleRe2 = /<DialogTitle[^>]*>[^<]*?([A-Z][^<{]*)/g;
    while ((m = titleRe2.exec(chunk)) !== null) {
      const text = m[1].trim();
      if (text.length > 0 && text.length < 100) lastTitle = text;
    }
  }
  return lastTitle || "Dialog";
}

/**
 * Find the React component that contains a given position.
 */
function findParentComponent(source, idx) {
  const before = source.substring(0, idx);
  // Match: function ComponentName( or const ComponentName = ( or export function ComponentName
  const compRe = /(?:export\s+)?(?:function|const)\s+([A-Z]\w+)\s*(?:=\s*(?:\([^)]*\)\s*(?::\s*\w+(?:<[^>]*>)?\s*)?=>|function)|[\s(])/g;
  let lastComp = null;
  let m;
  while ((m = compRe.exec(before)) !== null) {
    lastComp = m[1];
  }
  return lastComp || "Unknown";
}

/**
 * Trace .map() data sources to find dynamically rendered inputs.
 * Looks for patterns like: {items.map((item) => <Input ... />)}
 */
function findMapDataSources(source) {
  const results = [];
  const mapRe = /(\w+(?:\.\w+)*)\.map\s*\(\s*(?:\(([^)]*)\)|(\w+))\s*=>/g;
  let m;
  while ((m = mapRe.exec(source)) !== null) {
    const dataSource = m[1];
    const paramName = m[2] || m[3];
    const mapStart = m.index;
    // Find the extent of the map callback (approximate)
    let depth = 0;
    let i = source.indexOf("=>", mapStart) + 2;
    const startI = i;
    // Skip to opening paren/brace
    while (i < source.length && source[i] !== "(" && source[i] !== "{" && source[i] !== "<") i++;
    if (i < source.length) {
      const opener = source[i];
      const closer = opener === "(" ? ")" : opener === "{" ? "}" : ">";
      depth = 1;
      i++;
      while (i < source.length && depth > 0) {
        if (source[i] === opener) depth++;
        else if (source[i] === closer) depth--;
        i++;
      }
    }
    const mapBody = source.substring(startI, i);
    results.push({ dataSource, paramName, mapBody, mapStart, mapEnd: i });
  }
  return results;
}

/**
 * Build component wrapper graph.
 * Find custom components that wrap input primitives.
 */
function buildWrapperGraph(files) {
  const graph = {}; // componentName -> [inputTags it wraps]
  for (const file of files) {
    const source = fs.readFileSync(file, "utf-8");
    // Find component definitions
    const compRe = /(?:export\s+)?(?:function|const)\s+([A-Z]\w+)/g;
    let m;
    while ((m = compRe.exec(source)) !== null) {
      const compName = m[1];
      // Check if this component renders any input primitives
      const compBody = source.substring(m.index);
      const wrappedInputs = [];
      for (const inputTag of INPUT_COMPONENTS) {
        if (new RegExp(`<${inputTag}[\\s/>]`).test(compBody)) {
          wrappedInputs.push(inputTag);
        }
      }
      if (wrappedInputs.length > 0 && !INPUT_COMPONENTS.includes(compName)) {
        graph[compName] = wrappedInputs;
      }
    }
  }
  return graph;
}

/**
 * Resolve expression to a readable value.
 */
function resolveExpr(expr) {
  if (!expr) return null;
  if (expr.startsWith("{") && expr.endsWith("}")) {
    const inner = expr.slice(1, -1).trim();
    // Ternary: condition ? "a" : "b" -> "a | b"
    const ternaryRe = /^.+\?\s*"([^"]*)"\s*:\s*"([^"]*)"$/;
    const tm = inner.match(ternaryRe);
    if (tm) return `${tm[1]} | ${tm[2]}`;
    // Simple string literal
    if (inner.startsWith('"') && inner.endsWith('"')) return inner.slice(1, -1);
    // Variable reference
    return inner;
  }
  return expr;
}

// ── Main scan ──
export function scanInputs() {
  const files = walkDir(SRC_DIR, [".tsx"]);
  const wrapperGraph = buildWrapperGraph(files);
  const allWrapperNames = Object.keys(wrapperGraph);
  const allTargetTags = [...new Set([...INPUT_COMPONENTS, ...allWrapperNames])];

  const registry = [];
  const byPage = {};

  for (const file of files) {
    const source = fs.readFileSync(file, "utf-8");
    const rel = relPath(file);
    const fileName = path.basename(file);

    // Find all input elements
    const elements = extractJsxElements(source, allTargetTags);
    // Also find inputs from .map() calls
    const mapSources = findMapDataSources(source);

    for (const el of elements) {
      const label = findNearestLabel(source, el.startIdx);
      const modalContext = findModalContext(source, el.startIdx);
      const parentComponent = findParentComponent(source, el.startIdx);

      // Check if inside a .map()
      let mapDataSource = null;
      for (const ms of mapSources) {
        if (el.startIdx >= ms.mapStart && el.startIdx <= ms.mapEnd) {
          mapDataSource = ms.dataSource;
          break;
        }
      }

      // Determine if this is a wrapper - resolve to underlying inputs
      const isWrapper = allWrapperNames.includes(el.tag);
      const underlyingInputs = isWrapper ? wrapperGraph[el.tag] : [el.tag];

      const entry = {
        file: rel,
        fileName,
        line: el.line,
        component: parentComponent,
        tag: el.tag,
        isWrapper,
        underlyingInputs,
        type: el.props.type || (el.tag === "Textarea" ? "textarea" : el.tag === "Checkbox" ? "checkbox" : el.tag === "Select" ? "select" : el.tag === "Switch" ? "switch" : "text"),
        label: label,
        placeholder: el.props.placeholder || null,
        name: el.props.name || null,
        id: el.props.id || null,
        value: resolveExpr(el.props.value) || resolveExpr(el.props.defaultValue) || null,
        onChange: el.props.onChange || el.props.onValueChange ? true : false,
        required: el.props.required === "true" || (el.props.className || "").includes("required"),
        disabled: el.props.disabled ? resolveExpr(el.props.disabled) : false,
        className: el.props.className || null,
        modalContext,
        mapDataSource,
        allProps: Object.keys(el.props),
      };

      registry.push(entry);

      // Group by page
      const pageKey = rel;
      if (!byPage[pageKey]) byPage[pageKey] = [];
      byPage[pageKey].push(entry);
    }
  }

  return { registry, byPage, wrapperGraph, totalFiles: files.length };
}

// ── Output generation ──
function generateMarkdown(data) {
  const { registry, byPage, wrapperGraph } = data;
  const now = new Date().toISOString().split("T")[0];

  // Count by tag type
  const tagCounts = {};
  for (const r of registry) {
    tagCounts[r.tag] = (tagCounts[r.tag] || 0) + 1;
  }

  // Count by input type
  const typeCounts = {};
  for (const r of registry) {
    typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
  }

  let md = `# 📋 Input Field Registry\n\n`;
  md += `> Auto-generated on **${now}** — ${registry.length} fields across ${Object.keys(byPage).length} files\n\n`;

  // Summary
  md += `## Summary\n\n`;
  md += `| Metric | Value |\n|--------|-------|\n`;
  md += `| Total input fields | **${registry.length}** |\n`;
  md += `| Files with inputs | **${Object.keys(byPage).length}** |\n`;
  md += `| Fields in modals | **${registry.filter(r => r.modalContext).length}** |\n`;
  md += `| Dynamic (.map) fields | **${registry.filter(r => r.mapDataSource).length}** |\n`;
  md += `| Wrapper components | **${Object.keys(wrapperGraph).length}** |\n\n`;

  // By component type
  md += `## By Component Type\n\n`;
  md += `| Component | Count |\n|-----------|-------|\n`;
  for (const [tag, count] of Object.entries(tagCounts).sort((a, b) => b[1] - a[1])) {
    md += `| \`<${tag}>\` | ${count} |\n`;
  }
  md += `\n`;

  // By input type
  md += `## By Input Type\n\n`;
  md += `| Type | Count |\n|------|-------|\n`;
  for (const [type, count] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
    md += `| ${type} | ${count} |\n`;
  }
  md += `\n`;

  // Wrapper graph
  if (Object.keys(wrapperGraph).length > 0) {
    md += `## Component Wrapper Graph\n\n`;
    md += `These custom components wrap input primitives:\n\n`;
    for (const [wrapper, inputs] of Object.entries(wrapperGraph)) {
      md += `- \`<${wrapper}>\` → ${inputs.map(i => `\`<${i}>\``).join(", ")}\n`;
    }
    md += `\n`;
  }

  // By page (grouped)
  md += `## Fields By File\n\n`;
  const sortedPages = Object.entries(byPage).sort((a, b) => b[1].length - a[1].length);

  for (const [pageFile, fields] of sortedPages) {
    const fileName = path.basename(pageFile);
    md += `### ${fileName}\n`;
    md += `📁 \`${pageFile}\` — ${fields.length} field(s)\n\n`;
    md += `| # | Component | Type | Label | Placeholder | Modal/Context | Line |\n`;
    md += `|---|-----------|------|-------|-------------|---------------|------|\n`;
    fields.forEach((f, i) => {
      const label = f.label || "—";
      const placeholder = f.placeholder ? `"${f.placeholder}"` : "—";
      const modal = f.modalContext || (f.mapDataSource ? `🔄 .map(${f.mapDataSource})` : "—");
      md += `| ${i + 1} | \`<${f.tag}>\` | ${f.type} | ${label} | ${placeholder} | ${modal} | ${f.line} |\n`;
    });
    md += `\n`;
  }

  return md;
}

// ── Run ──
export function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log("🔍 Scanning input fields...");
  const data = scanInputs();
  // Write JSON
  const jsonPath = path.join(OUT_DIR, "input-fields.json");
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
  // Write Markdown
  const mdPath = path.join(OUT_DIR, "INPUT_FIELDS.md");
  fs.writeFileSync(mdPath, generateMarkdown(data));
  console.log(`✅ Found ${data.registry.length} input fields across ${Object.keys(data.byPage).length} files`);
  console.log(`   → ${jsonPath}`);
  console.log(`   → ${mdPath}`);
  return data;
}

// Run if executed directly
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  run();
}
