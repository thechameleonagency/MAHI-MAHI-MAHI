# MSS — Remaining work (pending only)

Previously completed rows were **removed** after verification against the repo.

**Pending gap rows: 46** — each `| ID |` row in the tables below is one open item. After each implementation round, update this number and delete rows that are done.

**How to use:** Finish phases in order where dependencies exist (e.g. seed polish before Z-wipe), otherwise batch by directory to minimise context switching. When an item is finished, delete its row or move it to your changelog.

---

## Phase 1 — Project module & commercial

| ID | Gap |
| --- | --- |
| F66 | No convert flows beyond enquiry→customer (lead→enquiry, draft-invoice→invoice, draft-PO→PO). |

---

## Phase 2 — Vendors, bills, POs & procurement UI

| ID | Gap |
| --- | --- |
| F33 | No PO entity — vendor bills created without a PO reference. |
| US7 | No service emits low-stock / overdue / blockage notification events. |
| F64 | `Notifications.tsx` has UI but nothing emits low-stock / overdue / blockage / payment-due events. |
| B2.11 | Missing actions: Materials export/print, Vendors quick bill/payment, Partners record payment, Agents commission entry points, Loans list extras as needed. |

---

## Phase 3 — Lists, columns & workspace consistency

| ID | Gap |
| --- | --- |
| V42 | `Partners.tsx` list lacks “earned this fiscal year” vs lifetime; tighten settlement-pending copy if needed. |
| V43 | `Employees.tsx` list lacks “current site” and “hours this month”. |
| V44 | Sites / active-sites list lacks “active checklist items” or “material shortfall” column. |
| UA10 | `VendorshipCompanies` / `INCWorkSources` use card grid instead of table — align with rest of app or document exception. |
| UA11 | Hardcoded category arrays in `Vendors.tsx`, `Tools.tsx`, `Materials.tsx` — centralise (e.g. extend `formCategories`). |

---

## Phase 4 — Forms, validation, dates & drafts

| ID | Gap |
| --- | --- |
| B2.15 | Numeric `parseFloat` / `isNaN` guards still needed across remaining forms. |
| B2.16 | `TeamRosterTab.tsx` / `TaskAssignmentModal.tsx` date guards done; add statement/row date window validation in `BankReconciliationModal.tsx` if product adds explicit ranges. |
| B2.17 | Sum / running-total / profit-share validations in `UnifiedExpenseModal.tsx`, `ClientPaymentHistory.tsx`, `CreateProjectModal.tsx`. |
| V58 | Phone pattern on `Enquiries.tsx` + invoice create sheet; extend to Employees / Vendors / Loans forms where applicable. |
| L35 | `UnifiedExpenseModal.tsx` full prefill does not auto-advance step. |
| L43 | Site checklist saves unknown inventory IDs after warning — orphans persist. |
| L51 | Split entry creation allows duplicate or near-zero values. |
| L52 | Partial reimbursement gap dropped silently — no audit trail. |
| L53 | Split iterates IDs without verifying entities still exist — orphan splits. |
| L57 | `AppDataContext.tsx` `createdAt: new Date().toISOString()` at render — timestamp drift. |
| F70 | `CreateProjectModal` / `UnifiedExpenseModal` lose data on close+reopen — no draft persistence. |
| B3.21 | `Customers.tsx` amounts use `formatINR`; replace remaining `Rs.` / ad-hoc `toLocaleString` on Partner / Agent / Audit / other legacy surfaces. |
| B3.22 | Centralise user-facing date formatting; replace ad-hoc `toDateString()` / `toString()` in `Attendance.tsx`. |

---

## Phase 5 — Attendance, payroll & people money

| ID | Gap |
| --- | --- |
| F59 | `Attendance.tsx` — no monthly summary or payroll calculation UI. |
| F60 | Payroll output does not auto-create salary expense entries. |
| F61 | Leave approval workflow missing vs `permissionMatrix` hints. |
| F62 | No employee advance / wallet ledger. |
| B3.23 | Confirm dynamic period logic in attendance (current / selected period derivation). |

---

## Phase 6 — Income, expenses & audit presentation

| ID | Gap |
| --- | --- |
| F44 | `Incomes` / customer payments separate — no auto-link. |
| F50 | Audit log entries do not show before/after diffs of mutations. |

---

## Phase 7 — Full product QA (prototype)

| ID | Gap |
| --- | --- |
| A2 | Verify every route, nested route, redirect, guard, sidebar link, top action, not-found path. |
| A3 | Verify every page: items, empty states, primary/secondary actions, no dead controls. |
| A4 | Audit every form: required fields, types, options, defaults, validation, cancel/reset, submit state. |
| A5 | Audit flows: enquiries → quotations → projects → finance → attendance → inventory → vendors → partners → agents → loans → audit → settings → notifications. |
| A6 | Audit types, mock DB/context shape, migrations, repository contracts, entity relationships. |
| A7 | Audit design tokens, reusable UI, responsive behaviour, consistency. |
| A8 | Complete realistic frontend prototype; document only true backend-dependent limits. |

---

## Phase 8 — Seed data (pre wipe)

| ID | Gap |
| --- | --- |
| UD7 | `seedSites` checklist items sparse — cannot exercise procurement variety. |

---

## Phase 9 — Data deletion, re-seed & smoke (**run only after all above**)

| ID | Gap |
| --- | --- |
| Z1 | Remove every dummy data entry; leave only super-admin login. |
| Z2 | Delete dummy/seed scripts once replacement strategy is ready. |
| Z3 | Recreate realistic interconnected data (5–10 entries per entity, expense variety, multi-day). |
| Z4 | Include every project kind in seed journeys. |
| Z5 | At least one project per kind reaches `Completed` through correct flow and records. |
| Z6 | Connect attendance, progress, materials, financials, documents, bills, payments, ledgers, loans, audit logs. |
| Z7 | Customer, vendor, partner, bank, loan, payroll, project P&L, audit-log reconciliation must pass. |
| Z8 | Run build/tests and manually smoke every page, modal, form, route, role gate, major action. |
