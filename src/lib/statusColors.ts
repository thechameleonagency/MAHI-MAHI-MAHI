/**
 * Shared Tailwind classes for status chips (`<Badge variant="outline" className={...} />`).
 * Use `getStatusColor` / `getPriorityColor` everywhere so the same domain status maps to the same colors.
 */
const STATUS_MAP: Record<string, string> = {
  // Enquiry
  new: "bg-blue-100 text-primary border-blue-200",
  meeting_scheduled: "bg-purple-100 text-purple-700 border-purple-200",
  quotation_sent: "bg-amber-100 text-amber-700 border-amber-200",
  quotation_draft: "bg-slate-100 text-slate-700 border-slate-200",
  quotation_rejected: "bg-orange-100 text-orange-800 border-orange-200",
  converted: "bg-green-100 text-green-700 border-green-200",
  lost: "bg-red-100 text-red-700 border-red-200",

  // Quotation
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  sent: "bg-blue-100 text-primary border-blue-200",
  approved: "bg-teal-100 text-teal-700 border-teal-200",
  converted_to_project: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",

  // Project lifecycle (canonical + legacy labels)
  New: "bg-blue-100 text-primary border-blue-200",
  "In Progress": "bg-amber-100 text-amber-700 border-amber-200",
  Ongoing: "bg-amber-100 text-amber-700 border-amber-200",
  "On Hold": "bg-slate-100 text-slate-600 border-slate-200",
  Completed: "bg-green-100 text-green-700 border-green-200",
  Closed: "bg-purple-100 text-purple-700 border-purple-200",
  Cancelled: "bg-red-100 text-red-700 border-red-200",

  // Invoice / vendor bill payment state
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  partial: "bg-blue-100 text-primary border-blue-200",
  paid: "bg-green-100 text-green-700 border-green-200",
  disputed: "bg-rose-100 text-rose-800 border-rose-200",
  overdue: "bg-red-100 text-red-700 border-red-200",
  overpaid: "bg-violet-100 text-violet-800 border-violet-200",
  voided: "bg-slate-100 text-slate-500 border-slate-200",
  cancelled: "bg-slate-100 text-slate-500 border-slate-200",

  // Employee / agent
  active: "bg-green-100 text-green-700 border-green-200",
  inactive: "bg-slate-100 text-slate-500 border-slate-200",
  "on-leave": "bg-amber-100 text-amber-700 border-amber-200",
  Active: "bg-green-100 text-green-700 border-green-200",
  Inactive: "bg-slate-100 text-slate-500 border-slate-200",

  // Attendance
  present: "bg-green-100 text-green-700 border-green-200",
  absent: "bg-red-100 text-red-700 border-red-200",
  "paid_leave": "bg-blue-100 text-primary border-blue-200",
  half_day: "bg-amber-100 text-amber-700 border-amber-200",
  holiday: "bg-slate-100 text-slate-600 border-slate-200",
  "half-day": "bg-amber-100 text-amber-700 border-amber-200",

  // Loan
  "closed-loan": "bg-slate-100 text-slate-500 border-slate-200",
  defaulted: "bg-red-100 text-red-700 border-red-200",

  // Tool / Inventory
  available: "bg-green-100 text-green-700 border-green-200",
  "in-use": "bg-amber-100 text-amber-700 border-amber-200",
  "under-maintenance": "bg-orange-100 text-orange-700 border-orange-200",
  damaged: "bg-red-100 text-red-700 border-red-200",
  retired: "bg-slate-100 text-slate-500 border-slate-200",
  "In Use": "bg-amber-100 text-amber-700 border-amber-200",
  Available: "bg-green-100 text-green-700 border-green-200",
  "Under Repair": "bg-orange-100 text-orange-700 border-orange-200",

  // Approvals
  requested: "bg-blue-100 text-primary border-blue-200",
  "approved-approval": "bg-green-100 text-green-700 border-green-200",
  "rejected-approval": "bg-red-100 text-red-700 border-red-200",

  // Partner
  "active-partner": "bg-green-100 text-green-700 border-green-200",
  "inactive-partner": "bg-slate-100 text-slate-500 border-slate-200",

  // Misc domain
  EMI: "bg-primary/10 text-primary border-primary/20",
  emi: "bg-primary/10 text-primary border-primary/20",
  "One-Time": "bg-amber-100 text-amber-800 border-amber-200",
  "one-time": "bg-amber-100 text-amber-800 border-amber-200",
  Reminder: "bg-slate-100 text-slate-600 border-slate-200",
  "reminder-only": "bg-slate-100 text-slate-600 border-slate-200",
  Extra: "bg-primary/10 text-primary border-primary/20",
  Low: "bg-red-100 text-red-700 border-red-200",
  Pending: "bg-amber-100 text-amber-800 border-amber-200",
};

const PRIORITY_MAP: Record<string, string> = {
  low: "bg-blue-100 text-primary border-blue-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  urgent: "bg-red-100 text-red-800 border-red-200",
};

const DEFAULT_STATUS = "bg-slate-100 text-slate-600 border-slate-200";

function resolveMapKey(map: Record<string, string>, raw: string): string | undefined {
  const s = raw?.trim();
  if (!s) return undefined;
  if (map[s]) return map[s];
  const lower = s.toLowerCase();
  for (const [k, v] of Object.entries(map)) {
    if (k.toLowerCase() === lower) return v;
  }
  return undefined;
}

export function getStatusColor(status: string): string {
  return resolveMapKey(STATUS_MAP, status) ?? DEFAULT_STATUS;
}

export function getPriorityColor(priority: string): string {
  return resolveMapKey(PRIORITY_MAP, priority) ?? DEFAULT_STATUS;
}
