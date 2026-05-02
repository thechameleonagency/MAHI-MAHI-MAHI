import fs from "fs";
const path = "src/pages/Finance.tsx";
let s = fs.readFileSync(path, "utf8");
const needle = `      </Dialog>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>`;
const a = s.indexOf(needle);
const b = s.lastIndexOf("      {/* Unified Expense Modal */}");
if (a < 0 || b < 0) {
  console.error("markers", a, b);
  process.exit(1);
}
const afterUnified = s.slice(b);
const closeIdx = afterUnified.indexOf("/>") + 2;
const endPos = b + closeIdx;
const out = s.slice(0, a + "      </Dialog>\n".length) + s.slice(endPos);
fs.writeFileSync(path, out);
console.log("removed", endPos - (a + "      </Dialog>\n".length), "chars");
