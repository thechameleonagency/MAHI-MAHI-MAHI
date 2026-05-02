#!/usr/bin/env node
/**
 * Design System Extractor
 * Scans CSS files, UI components, and usage patterns to generate a living design system document.
 * Outputs: scripts/output/DESIGN_SYSTEM.md + scripts/output/design-tokens.json
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.resolve(__dirname, "..", "src");
const OUT_DIR = path.resolve(__dirname, "output");

// ── Helpers ──
function walkDir(dir, exts) {
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

// ══════════════════════════════════════════════
// 1. CSS TOKENS
// ══════════════════════════════════════════════
function scanCssTokens() {
  const cssFiles = walkDir(SRC_DIR, [".css"]);
  const tokens = { colors: {}, radii: {}, fonts: [], animations: [], other: {} };

  for (const file of cssFiles) {
    const source = fs.readFileSync(file, "utf-8");
    const rel = relPath(file);

    // Extract CSS custom properties
    const varRe = /--([a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
    let m;
    while ((m = varRe.exec(source)) !== null) {
      const name = `--${m[1]}`;
      const value = m[2].trim();
      // Categorize
      if (name.match(/color|bg|foreground|background|primary|secondary|muted|accent|destructive|border|ring|card|popover|chart/i)) {
        tokens.colors[name] = value;
      } else if (name.match(/radius/i)) {
        tokens.radii[name] = value;
      } else {
        tokens.other[name] = value;
      }
    }

    // Extract font-family declarations
    const fontRe = /font-family\s*:\s*([^;]+);/g;
    while ((m = fontRe.exec(source)) !== null) {
      const font = m[1].trim();
      if (!tokens.fonts.includes(font)) tokens.fonts.push(font);
    }

    // Extract @keyframes
    const keyframeRe = /@keyframes\s+(\w[\w-]*)/g;
    while ((m = keyframeRe.exec(source)) !== null) {
      if (!tokens.animations.includes(m[1])) tokens.animations.push(m[1]);
    }

    // Extract Google Fonts imports
    const importRe = /@import\s+url\(['"]([^'"]+)['"]\)/g;
    while ((m = importRe.exec(source)) !== null) {
      const fontMatch = m[1].match(/family=([^&:]+)/);
      if (fontMatch) {
        const fontName = decodeURIComponent(fontMatch[1]).replace(/\+/g, " ");
        if (!tokens.fonts.includes(fontName)) tokens.fonts.push(fontName);
      }
    }
  }

  return tokens;
}

// ══════════════════════════════════════════════
// 2. UI COMPONENT INVENTORY
// ══════════════════════════════════════════════
function scanUIComponents() {
  const uiDir = path.join(SRC_DIR, "components", "ui");
  const components = [];

  if (!fs.existsSync(uiDir)) return components;

  const files = walkDir(uiDir, [".tsx"]);
  for (const file of files) {
    const source = fs.readFileSync(file, "utf-8");
    const fileName = path.basename(file, ".tsx");
    const rel = relPath(file);

    // Find exported components
    const exports = [];
    const exportRe = /export\s+(?:const|function)\s+(\w+)/g;
    let m;
    while ((m = exportRe.exec(source)) !== null) {
      exports.push(m[1]);
    }

    // Find cva variants
    const variants = [];
    const cvaRe = /variants\s*:\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/gs;
    while ((m = cvaRe.exec(source)) !== null) {
      const variantBlock = m[1];
      // Extract variant names and their options
      const varNameRe = /(\w+)\s*:\s*\{([^}]+)\}/g;
      let vm;
      while ((vm = varNameRe.exec(variantBlock)) !== null) {
        const varName = vm[1];
        const optionsStr = vm[2];
        const options = [];
        const optRe = /(\w+)\s*:/g;
        let om;
        while ((om = optRe.exec(optionsStr)) !== null) {
          options.push(om[1]);
        }
        variants.push({ name: varName, options });
      }
    }

    // Find props interface
    const propsTypes = [];
    const propsRe = /interface\s+(\w*Props\w*)\s*(?:extends\s+([^{]+))?\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/gs;
    while ((m = propsRe.exec(source)) !== null) {
      const propLines = m[3].split("\n").filter(l => l.trim().length > 0);
      propsTypes.push({
        name: m[1],
        extends: m[2]?.trim() || null,
        propCount: propLines.length,
      });
    }

    // Count lines
    const lineCount = source.split("\n").length;

    components.push({
      file: rel,
      name: fileName,
      exports,
      variants,
      propsTypes,
      lineCount,
    });
  }

  return components;
}

// ══════════════════════════════════════════════
// 3. ICON USAGE
// ══════════════════════════════════════════════
function scanIconUsage() {
  const files = walkDir(SRC_DIR, [".tsx"]);
  const iconUsage = {}; // iconName -> { count, files: Set }

  for (const file of files) {
    const source = fs.readFileSync(file, "utf-8");
    const rel = relPath(file);

    // Find lucide-react imports
    const importRe = /from\s+["']lucide-react["']/;
    if (!importRe.test(source)) continue;

    // Extract imported icon names
    const iconImportRe = /import\s*\{([^}]+)\}\s*from\s*["']lucide-react["']/g;
    let m;
    while ((m = iconImportRe.exec(source)) !== null) {
      const icons = m[1].split(",").map(s => s.trim()).filter(Boolean);
      for (const icon of icons) {
        if (!iconUsage[icon]) iconUsage[icon] = { count: 0, files: new Set() };
        // Count actual usages in JSX (not just imports)
        const usageRe = new RegExp(`<${icon}[\\s/>]`, "g");
        const usageCount = (source.match(usageRe) || []).length;
        iconUsage[icon].count += usageCount || 1; // At least 1 for import
        iconUsage[icon].files.add(rel);
      }
    }
  }

  // Convert Sets to arrays for JSON
  const result = {};
  for (const [icon, data] of Object.entries(iconUsage)) {
    result[icon] = { count: data.count, files: [...data.files], fileCount: data.files.size };
  }
  return result;
}

// ══════════════════════════════════════════════
// 4. LAYOUT PATTERN USAGE
// ══════════════════════════════════════════════
function scanLayoutPatterns() {
  const files = walkDir(SRC_DIR, [".tsx"]);
  const patterns = {};
  const targetPatterns = [
    "PageShell", "StickyPageHeader", "InlineKpiStrip",
    "TabCard", "MiniMetric", "DataTableShell",
    "TablePaginationBar", "Dialog", "Sheet",
    "Tabs", "Card", "Badge", "Button",
    "DropdownMenu", "Popover", "Collapsible",
    "Tooltip", "Avatar", "Progress",
  ];

  for (const file of files) {
    const source = fs.readFileSync(file, "utf-8");
    const rel = relPath(file);

    for (const pattern of targetPatterns) {
      const re = new RegExp(`<${pattern}[\\s/>]`, "g");
      const matches = source.match(re);
      if (matches && matches.length > 0) {
        if (!patterns[pattern]) patterns[pattern] = { count: 0, files: [] };
        patterns[pattern].count += matches.length;
        patterns[pattern].files.push(rel);
      }
    }
  }

  return patterns;
}

// ══════════════════════════════════════════════
// 5. TYPOGRAPHY PATTERNS
// ══════════════════════════════════════════════
function scanTypography() {
  const files = walkDir(SRC_DIR, [".tsx", ".css"]);
  const fontSizes = {};
  const fontWeights = {};

  for (const file of files) {
    const source = fs.readFileSync(file, "utf-8");

    // Tailwind font size classes
    const sizeRe = /text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|\[[\d.]+(?:px|rem)\])/g;
    let m;
    while ((m = sizeRe.exec(source)) !== null) {
      const size = `text-${m[1]}`;
      fontSizes[size] = (fontSizes[size] || 0) + 1;
    }

    // Font weight classes
    const weightRe = /font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)/g;
    while ((m = weightRe.exec(source)) !== null) {
      const weight = `font-${m[1]}`;
      fontWeights[weight] = (fontWeights[weight] || 0) + 1;
    }
  }

  return { fontSizes, fontWeights };
}

// ══════════════════════════════════════════════
// 6. COLOR USAGE IN TAILWIND CLASSES
// ══════════════════════════════════════════════
function scanTailwindColors() {
  const files = walkDir(SRC_DIR, [".tsx"]);
  const colors = {};

  for (const file of files) {
    const source = fs.readFileSync(file, "utf-8");

    // Match color utility classes: bg-X, text-X, border-X
    const colorRe = /(?:bg|text|border|ring|shadow|from|to|via)-((?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|primary|secondary|muted|accent|destructive|foreground|background|card|popover)(?:-\d+)?(?:\/\d+)?)/g;
    let m;
    while ((m = colorRe.exec(source)) !== null) {
      const color = m[1].split("/")[0]; // Remove opacity
      colors[color] = (colors[color] || 0) + 1;
    }
  }

  return colors;
}

// ══════════════════════════════════════════════
// 7. SPACING PATTERNS
// ══════════════════════════════════════════════
function scanSpacing() {
  const files = walkDir(SRC_DIR, [".tsx"]);
  const spacing = {};

  for (const file of files) {
    const source = fs.readFileSync(file, "utf-8");

    // gap, p, px, py, m, mx, my, space patterns
    const spaceRe = /(?:gap|p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|space-[xy])-([\d.]+|\[[\d.]+(?:px|rem)\])/g;
    let m;
    while ((m = spaceRe.exec(source)) !== null) {
      const val = m[0];
      spacing[val] = (spacing[val] || 0) + 1;
    }
  }

  return spacing;
}

// ── Main scan ──
export function scanDesignSystem() {
  console.log("  → Scanning CSS tokens...");
  const cssTokens = scanCssTokens();
  console.log("  → Scanning UI components...");
  const uiComponents = scanUIComponents();
  console.log("  → Scanning icon usage...");
  const iconUsage = scanIconUsage();
  console.log("  → Scanning layout patterns...");
  const layoutPatterns = scanLayoutPatterns();
  console.log("  → Scanning typography...");
  const typography = scanTypography();
  console.log("  → Scanning Tailwind colors...");
  const tailwindColors = scanTailwindColors();
  console.log("  → Scanning spacing...");
  const spacing = scanSpacing();

  return {
    cssTokens,
    uiComponents,
    iconUsage,
    layoutPatterns,
    typography,
    tailwindColors,
    spacing,
  };
}

// ── Markdown generation ──
function generateMarkdown(data) {
  const { cssTokens, uiComponents, iconUsage, layoutPatterns, typography, tailwindColors, spacing } = data;
  const now = new Date().toISOString().split("T")[0];

  let md = `# 🎨 Design System\n\n`;
  md += `> Auto-generated on **${now}**\n\n`;

  // ── 1. Color Tokens ──
  md += `## 1. Color Tokens (CSS Custom Properties)\n\n`;
  const colorEntries = Object.entries(cssTokens.colors);
  if (colorEntries.length > 0) {
    md += `| Token | Value |\n|-------|-------|\n`;
    for (const [name, value] of colorEntries.sort((a, b) => a[0].localeCompare(b[0]))) {
      md += `| \`${name}\` | \`${value}\` |\n`;
    }
  } else {
    md += `_No CSS custom color properties found._\n`;
  }
  md += `\n`;

  // ── 2. Border Radii ──
  md += `## 2. Border Radii\n\n`;
  const radiiEntries = Object.entries(cssTokens.radii);
  if (radiiEntries.length > 0) {
    md += `| Token | Value |\n|-------|-------|\n`;
    for (const [name, value] of radiiEntries) {
      md += `| \`${name}\` | \`${value}\` |\n`;
    }
  } else {
    md += `_No radius tokens found._\n`;
  }
  md += `\n`;

  // ── 3. Fonts ──
  md += `## 3. Fonts\n\n`;
  if (cssTokens.fonts.length > 0) {
    for (const font of cssTokens.fonts) {
      md += `- \`${font}\`\n`;
    }
  } else {
    md += `_No font-family declarations found._\n`;
  }
  md += `\n`;

  // ── 4. Animations ──
  if (cssTokens.animations.length > 0) {
    md += `## 4. Animations (@keyframes)\n\n`;
    for (const anim of cssTokens.animations) {
      md += `- \`${anim}\`\n`;
    }
    md += `\n`;
  }

  // ── 5. Typography Usage ──
  md += `## 5. Typography Usage\n\n`;
  md += `### Font Sizes\n\n`;
  md += `| Class | Usage Count |\n|-------|-------------|\n`;
  for (const [cls, count] of Object.entries(typography.fontSizes).sort((a, b) => b[1] - a[1])) {
    md += `| \`${cls}\` | ${count} |\n`;
  }
  md += `\n### Font Weights\n\n`;
  md += `| Class | Usage Count |\n|-------|-------------|\n`;
  for (const [cls, count] of Object.entries(typography.fontWeights).sort((a, b) => b[1] - a[1])) {
    md += `| \`${cls}\` | ${count} |\n`;
  }
  md += `\n`;

  // ── 6. Tailwind Color Palette Usage ──
  md += `## 6. Color Palette Usage (Top 30)\n\n`;
  md += `| Color Token | Usage Count |\n|-------------|-------------|\n`;
  const sortedColors = Object.entries(tailwindColors).sort((a, b) => b[1] - a[1]).slice(0, 30);
  for (const [color, count] of sortedColors) {
    md += `| \`${color}\` | ${count} |\n`;
  }
  md += `\n`;

  // ── 7. UI Component Inventory ──
  md += `## 7. UI Component Inventory\n\n`;
  md += `| Component | Exports | Variants | Lines |\n`;
  md += `|-----------|---------|----------|-------|\n`;
  for (const comp of uiComponents.sort((a, b) => a.name.localeCompare(b.name))) {
    const variantStr = comp.variants.length > 0
      ? comp.variants.map(v => `${v.name}: ${v.options.join(", ")}`).join("; ")
      : "—";
    md += `| **${comp.name}** | ${comp.exports.join(", ")} | ${variantStr} | ${comp.lineCount} |\n`;
  }
  md += `\n`;

  // ── 8. Layout Patterns ──
  md += `## 8. Layout Pattern Usage\n\n`;
  md += `| Pattern | Usage Count | Files |\n`;
  md += `|---------|-------------|-------|\n`;
  for (const [pattern, data] of Object.entries(layoutPatterns).sort((a, b) => b[1].count - a[1].count)) {
    md += `| \`<${pattern}>\` | ${data.count} | ${data.files.length} |\n`;
  }
  md += `\n`;

  // ── 9. Icon Usage ──
  md += `## 9. Icon Usage (Top 40)\n\n`;
  md += `| Icon | JSX Uses | Files |\n`;
  md += `|------|----------|-------|\n`;
  const sortedIcons = Object.entries(iconUsage).sort((a, b) => b[1].count - a[1].count).slice(0, 40);
  for (const [icon, data] of sortedIcons) {
    md += `| \`${icon}\` | ${data.count} | ${data.fileCount} |\n`;
  }
  md += `\n`;

  // ── 10. Spacing ──
  md += `## 10. Spacing Patterns (Top 25)\n\n`;
  md += `| Class | Usage Count |\n|-------|-------------|\n`;
  const sortedSpacing = Object.entries(spacing).sort((a, b) => b[1] - a[1]).slice(0, 25);
  for (const [cls, count] of sortedSpacing) {
    md += `| \`${cls}\` | ${count} |\n`;
  }
  md += `\n`;

  // ── 11. Other CSS Tokens ──
  const otherEntries = Object.entries(cssTokens.other);
  if (otherEntries.length > 0) {
    md += `## 11. Other CSS Tokens\n\n`;
    md += `| Token | Value |\n|-------|-------|\n`;
    for (const [name, value] of otherEntries.sort((a, b) => a[0].localeCompare(b[0]))) {
      md += `| \`${name}\` | \`${value}\` |\n`;
    }
    md += `\n`;
  }

  return md;
}

// ── Run ──
export function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log("🎨 Scanning design system...");
  const data = scanDesignSystem();
  // Write JSON
  const jsonPath = path.join(OUT_DIR, "design-tokens.json");
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
  // Write Markdown
  const mdPath = path.join(OUT_DIR, "DESIGN_SYSTEM.md");
  fs.writeFileSync(mdPath, generateMarkdown(data));

  const iconCount = Object.keys(data.iconUsage).length;
  const compCount = data.uiComponents.length;
  const colorCount = Object.keys(data.cssTokens.colors).length;
  console.log(`✅ Design system extracted: ${colorCount} color tokens, ${compCount} UI components, ${iconCount} icons`);
  console.log(`   → ${jsonPath}`);
  console.log(`   → ${mdPath}`);
  return data;
}

// Run if executed directly
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  run();
}
