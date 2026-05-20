import type { AppRepositoryContext } from "@/infrastructure/repositories/contracts";
import type { EnquiryStatus } from "@/domain/stateMachines/enquiryStateMachine";
import type { Quotation } from "@/types/project";

const TERMINAL_ENQUIRY_STATUSES = new Set<EnquiryStatus>(["lost", "converted"]);

/**
 * When a quotation is rejected or withdrawn, mark the linked enquiry as
 * `quotation_rejected` so the pipeline no longer shows "quote in flight".
 * Skips enquiries already terminal (`lost` / `converted`).
 */
export function propagateQuotationDeathToEnquiry(
  repositories: AppRepositoryContext,
  quotation: Quotation,
): boolean {
  const enquiryId = quotation.enquiryId?.trim();
  if (!enquiryId) return false;

  const enquiry = repositories.enquiryRepository.getById(enquiryId);
  if (!enquiry) return false;
  if (TERMINAL_ENQUIRY_STATUSES.has(enquiry.status as EnquiryStatus)) return false;

  repositories.enquiryRepository.update(enquiryId, {
    status: "quotation_rejected",
    updatedAt: new Date().toISOString(),
  });
  return true;
}
