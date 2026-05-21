import type { AppState } from "@/contexts/AppDataContext";
import { canConvertEnquiryOnPipelineWin } from "@/lib/enquiryConversionAtProjectWin";
import { enrichCustomerFromEnquiry, resolveCustomerForEnquiryConversion } from "@/lib/convertEnquiryCustomer";
import type { Customer } from "@/types/finance";
import type { Enquiry, Quotation } from "@/types/project";

function quotationTriggersEnquiryConverted(quotation: Quotation): boolean {
  if (!quotation.enquiryId?.trim()) return false;
  if (quotation.status === "converted_to_project" && quotation.linkedProjectId) {
    return true;
  }
  if (quotation.status === "approved" && quotation.customerId?.trim()) {
    return true;
  }
  return false;
}

/**
 * Repair enquiries left open when their quotation already won the pipeline
 * (approved with customer, or converted to project). Idempotent for converted rows.
 */
export function reconcileEnquiriesConvertedOnProjectLink(state: AppState): AppState {
  const projectById = new Map(state.projects.map((p) => [p.id, p]));
  let enquiries = [...state.enquiries];
  let customers = [...state.customers];
  let changed = false;

  const patchEnquiry = (enquiryId: string, patch: Partial<Enquiry>) => {
    enquiries = enquiries.map((e) => (e.id === enquiryId ? { ...e, ...patch } : e));
    changed = true;
  };

  const upsertCustomer = (customer: Customer) => {
    const idx = customers.findIndex((c) => c.id === customer.id);
    if (idx >= 0) {
      customers = customers.map((c, i) => (i === idx ? { ...c, ...customer } : c));
    } else {
      customers = [...customers, customer];
    }
    changed = true;
  };

  for (const quotation of state.quotations) {
    if (!quotationTriggersEnquiryConverted(quotation)) {
      continue;
    }

    const enquiry = enquiries.find((e) => e.id === quotation.enquiryId);
    if (!enquiry || enquiry.status === "converted") {
      continue;
    }

    if (!canConvertEnquiryOnPipelineWin(enquiry.status)) {
      continue;
    }

    const resolved = resolveCustomerForEnquiryConversion(enquiry, customers);
    let customerId = quotation.customerId ?? resolved.customerId;

    if (resolved.customerCreated && resolved.customer) {
      upsertCustomer(resolved.customer);
      customerId = resolved.customer.id;
    } else {
      const existing = customers.find((c) => c.id === resolved.customerId);
      if (existing) {
        upsertCustomer(enrichCustomerFromEnquiry(existing, enquiry));
        customerId = existing.id;
      }
    }

    const project = projectById.get(quotation.linkedProjectId);
    if (project?.customerId && !quotation.customerId) {
      customerId = project.customerId;
    }

    patchEnquiry(enquiry.id, {
      status: "converted",
      customerId,
      updatedAt: new Date().toISOString(),
    });
  }

  if (!changed) {
    return state;
  }

  return { ...state, enquiries, customers };
}
