import { readFileSync } from "node:fs";
const d = JSON.parse(readFileSync("scripts/audit-seed.json", "utf8"));
const badDue = (d.vendorBills ?? []).filter((b) => b.dueDate != null && typeof b.dueDate !== "string");
console.log("bad vendorBill dueDate:", badDue.length, badDue[0]?.dueDate, typeof badDue[0]?.dueDate);
const badTasks = d.tasks.filter((t) => t.siteId != null && typeof t.siteId !== "string");
console.log("bad task siteId:", badTasks.length, badTasks[0]);
