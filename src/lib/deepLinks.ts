/**
 * Deep-link contract (prototype): prefer `?open=<entityId>` on list routes.
 * Legacy params remain supported for bookmarks; new links should use these helpers.
 */
export const deepLink = {
  enquiry: (id: string) => `/enquiries?open=${encodeURIComponent(id)}`,
  quotation: (id: string) => `/quotations?quotation=${encodeURIComponent(id)}`,
  invoice: (id: string) => `/invoices?invoice=${encodeURIComponent(id)}`,
  project: (id: string) => `/projects/${encodeURIComponent(id)}`,
  customer: (id: string) => `/customers/${encodeURIComponent(id)}`,
  employee: (id: string) => `/employees/${encodeURIComponent(id)}`,
  vendor: (id: string) => `/vendors/${encodeURIComponent(id)}`,
  team: (id: string) => `/teams/${encodeURIComponent(id)}`,
  /** Canonical detail path — `/vendorship-companies/:id` redirects here (MD6). */
  vendorship: (id: string) => `/vendorship/${encodeURIComponent(id)}`,
  /** Canonical detail path — `/inc-work-sources/:id` redirects here (MD6). */
  incSource: (id: string) => `/inc-sources/${encodeURIComponent(id)}`,
} as const;
