import fs from "fs";
const path = "src/pages/Finance.tsx";
const text = fs.readFileSync(path, "utf8");
const startMarker = "      <Tabs value={activeTab}";
const endMarker = "      </Tabs>";
const start = text.indexOf(startMarker);
const end = text.indexOf(endMarker, start);
if (start < 0 || end < 0) {
  console.error("markers not found", start, end);
  process.exit(1);
}
const endClose = end + endMarker.length;
const inner = text.slice(start, endClose);
const dashOpen = inner.indexOf('<TabsContent value="dashboard"');
const dashClose = inner.indexOf("</TabsContent>", dashOpen);
const afterOpenTag = inner.indexOf(">", dashOpen) + 1;
const dashboardInner = inner.slice(afterOpenTag, dashClose);
const newBlock = `      <div className="mt-4 space-y-4 md:mt-6 md:space-y-6">${dashboardInner}      </div>`;
const newText = text.slice(0, start) + newBlock + text.slice(endClose);
fs.writeFileSync(path, newText);
console.log("Replaced Tabs block, new length", newText.length);
