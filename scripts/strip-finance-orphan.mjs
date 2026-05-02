import fs from "fs";
const path = "src/pages/Finance.tsx";
let s = fs.readFileSync(path, "utf8");
const marker = "      </Dialog>\n                <div className=\"grid grid-cols-2 gap-4\">";
const idx = s.indexOf(marker);
if (idx < 0) {
  console.error("marker not found");
  process.exit(1);
}
const unified2 = "\n      {/* Unified Expense Modal */}";
const u2 = s.indexOf(unified2, idx + 10);
if (u2 < 0) {
  console.error("second unified not found");
  process.exit(1);
}
// remove from start of orphan through end of UnifiedExpenseModal block before PageShell
const blockEnd = s.indexOf("    </PageShell>", u2);
const segment = s.slice(u2, blockEnd);
const modalEnd = segment.indexOf("</UnifiedExpenseModal>");
if (modalEnd < 0) {
  console.error("no closing tag");
  process.exit(1);
}
// find /> after UnifiedExpenseModal
const closeTag = segment.indexOf("/>", modalEnd) + 2;
const removeEnd = u2 + closeTag;
s = s.slice(0, idx + "      </Dialog>\n".length) + s.slice(removeEnd);
fs.writeFileSync(path, s);
console.log("removed bytes", removeEnd - (idx + "      </Dialog>\n".length));
