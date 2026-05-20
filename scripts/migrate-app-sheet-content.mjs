/**
 * One-off codemod: replace legacy SheetContent width class strings with AppSheetContent.
 * Run: node scripts/migrate-app-sheet-content.mjs
 */
import fs from "fs";
import path from "path";

const SRC = path.join(process.cwd(), "src");

const REPLACEMENTS = [
  {
    from: /<SheetContent className="w-full sm:max-w-4xl sm:w-\[90vw\] p-0 overflow-hidden overflow-y-auto custom-scrollbar"/g,
    to: '<AppSheetContent layout="scroll" size="xl"',
  },
  {
    from: /<SheetContent className="w-full sm:max-w-4xl sm:w-\[90vw\] h-full overflow-y-auto custom-scrollbar"/g,
    to: '<AppSheetContent layout="scroll" size="xl"',
  },
  {
    from: /<SheetContent className="w-full sm:max-w-4xl sm:w-\[90vw\] overflow-y-auto custom-scrollbar"/g,
    to: '<AppSheetContent layout="scroll" size="xl"',
  },
  {
    from: /<SheetContent className="w-full sm:max-w-4xl sm:w-\[90vw\] border-l-destructive\/30 overflow-y-auto custom-scrollbar"/g,
    to: '<AppSheetContent layout="scroll" size="xl" className="border-l-destructive/30"',
  },
  {
    from: /<SheetContent className="w-full sm:max-w-3xl sm:w-\[85vw\] p-0 overflow-y-auto custom-scrollbar"/g,
    to: '<AppSheetContent layout="scroll" size="lg"',
  },
  {
    from: /<SheetContent className="w-full sm:max-w-md overflow-y-auto custom-scrollbar"/g,
    to: '<AppSheetContent layout="form" size="md"',
  },
  {
    from: /<SheetContent className="w-full sm:max-w-md overflow-y-auto"/g,
    to: '<AppSheetContent layout="form" size="md"',
  },
  {
    from: /<SheetContent className="w-full sm:max-w-md"/g,
    to: '<AppSheetContent layout="form" size="md"',
  },
  {
    from: /<SheetContent className="max-w-sm overflow-y-auto custom-scrollbar"/g,
    to: '<AppSheetContent layout="form" size="xs"',
  },
  {
    from: /<SheetContent className="max-w-sm text-center overflow-y-auto custom-scrollbar"/g,
    to: '<AppSheetContent layout="form" size="xs" className="text-center"',
  },
  {
    from: /<SheetContent className="w-full sm:max-w-lg overflow-y-auto custom-scrollbar"/g,
    to: '<AppSheetContent layout="form" size="lg"',
  },
  {
    from: /<SheetContent className="w-full sm:max-w-lg overflow-y-auto"/g,
    to: '<AppSheetContent layout="form" size="lg"',
  },
  {
    from: /<SheetContent className="w-full sm:max-w-xl overflow-y-auto"/g,
    to: '<AppSheetContent layout="form" size="md"',
  },
];

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else if (ent.name.endsWith(".tsx")) files.push(p);
  }
  return files;
}

function ensureImport(content) {
  if (!content.includes("AppSheetContent")) return content;
  if (content.includes("@/components/shared/AppSheetLayout")) return content;
  const sheetImport = /import\s*\{([^}]+)\}\s*from\s*"@\/components\/ui\/sheet";/;
  const m = content.match(sheetImport);
  if (m) {
    const names = m[1].split(",").map((s) => s.trim()).filter(Boolean);
    const kept = names.filter((n) => n !== "SheetContent");
    const importLine = kept.length
      ? `import { ${kept.join(", ")} } from "@/components/ui/sheet";`
      : "";
    let next = content.replace(sheetImport, importLine);
    next = next.replace(
      /(import\s*\{[^}]+\}\s*from\s*"@\/components\/ui\/sheet";?\n)/,
      `$1import { AppSheetContent } from "@/components/shared/AppSheetLayout";\n`,
    );
    if (!next.includes('AppSheetContent } from "@/components/shared/AppSheetLayout"')) {
      next = `import { AppSheetContent } from "@/components/shared/AppSheetLayout";\n${next}`;
    }
    return next.replace(/\n\n\n+/g, "\n\n");
  }
  return `import { AppSheetContent } from "@/components/shared/AppSheetLayout";\n${content}`;
}

function migrateFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  if (!content.includes("SheetContent className=")) return false;
  let changed = false;
  for (const { from, to } of REPLACEMENTS) {
    if (from.test(content)) {
      content = content.replace(from, to);
      changed = true;
    }
  }
  if (!changed) return false;
  if (content.includes("<AppSheetContent")) {
    content = content.replace(/<\/SheetContent>/g, "</AppSheetContent>");
    content = ensureImport(content);
  }
  fs.writeFileSync(filePath, content);
  return true;
}

const files = walk(SRC);
let n = 0;
for (const f of files) {
  if (migrateFile(f)) {
    n++;
    console.log("migrated", path.relative(process.cwd(), f));
  }
}
console.log(`Done. ${n} files updated.`);
