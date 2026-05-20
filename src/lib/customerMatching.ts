import { normalizePhoneDigits } from "@/lib/phoneNormalize";

/** Salutations stripped before name comparison (M/s, Mr, Shri, etc.). */
const NAME_PREFIX_RE = /^(m\/s\.?|mr\.?|mrs\.?|ms\.?|shri\.?|smt\.?|dr\.?)\s+/i;

export type CustomerIdentityFields = {
  name?: string | null;
  phone?: string | null;
};

/** Normalize customer / client display name for identity comparison. */
export function normalizeCustomerName(name: string | undefined | null): string {
  if (!name?.trim()) return "";
  let s = name.trim().toLowerCase();
  while (NAME_PREFIX_RE.test(s)) {
    s = s.replace(NAME_PREFIX_RE, "").trim();
  }
  return s.replace(/\s+/g, " ").trim();
}

export function customerNamesMatch(
  a: string | undefined | null,
  b: string | undefined | null,
): boolean {
  const na = normalizeCustomerName(a);
  const nb = normalizeCustomerName(b);
  if (!na || !nb) return false;
  return na === nb;
}

/** Compare phones by digits; last 10 digits match handles +91 / spacing. */
export function customerPhonesMatch(
  a: string | undefined | null,
  b: string | undefined | null,
): boolean {
  const da = normalizePhoneDigits(a);
  const db = normalizePhoneDigits(b);
  if (da.length < 10 || db.length < 10) return false;
  const tail = (d: string) => (d.length > 10 ? d.slice(-10) : d);
  return tail(da) === tail(db);
}

/** True when normalized name or phone (≥10 digits) matches. */
export function customerIdentityMatches(
  a: CustomerIdentityFields,
  b: CustomerIdentityFields,
): boolean {
  return customerNamesMatch(a.name, b.name) || customerPhonesMatch(a.phone, b.phone);
}

export function findCustomerByIdentity<T extends { name: string; phone: string }>(
  customers: T[],
  identity: CustomerIdentityFields,
): T | undefined {
  return customers.find((c) => customerIdentityMatches(c, identity));
}

export function projectMatchesCustomer(
  project: {
    customerId?: string | null;
    client?: string | null;
    clientPhone?: string | null;
  },
  customer: { id: string; name: string; phone: string },
): boolean {
  if (project.customerId && project.customerId === customer.id) return true;
  return customerIdentityMatches(
    { name: project.client, phone: project.clientPhone },
    customer,
  );
}

export function quotationMatchesCustomer(
  quotation: { clientName: string; clientPhone: string },
  customer: { name: string; phone: string },
): boolean {
  return customerIdentityMatches(
    { name: quotation.clientName, phone: quotation.clientPhone },
    customer,
  );
}

export function findProjectForCustomer<
  T extends { id: string | number; customerId?: string | null; client?: string | null; clientPhone?: string | null },
>(projects: T[], customer: { id: string; name: string; phone: string }): T | undefined {
  return projects.find((p) => projectMatchesCustomer(p, customer));
}

export function findQuotationForCustomer<
  T extends { id: string; clientName: string; clientPhone: string },
>(quotations: T[], customer: { name: string; phone: string }): T | undefined {
  return quotations.find((q) => quotationMatchesCustomer(q, customer));
}
