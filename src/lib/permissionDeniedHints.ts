/** User-facing hints when an action button is disabled due to role matrix permissions. */
export const PERMISSION_DENIED_HINTS = {
  quotationApprove: "Only admin, management, or CEO can approve quotations.",
  quotationSend: "Your role cannot send quotations.",
  quotationReject: "Your role cannot reject quotations (client declined / deal lost).",
  quotationWithdraw: "Your role cannot withdraw quotations (retract offer without a client decline).",
  projectFromQuote: "Only admin, management, or CEO can create a project from an approved quotation.",
  enquiryUpdate: "Your role cannot update enquiries.",
  enquiryReopenLost: "Only admin or super-admin can reopen a lost enquiry.",
  enquiryCreateQuotation: "Your role cannot create quotations.",
  invoiceCreate: "Your role cannot create invoices.",
  changeRequestApprove: "Only admin, management, or CEO can approve commercial change requests.",
  customerCreateQuotation: "Your role cannot create quotations for this customer.",
  customerCreateProject: "Your role cannot create projects from the customer page.",
  expenseReimbursementApprove: "Only admin, management, or CEO can approve expense reimbursements.",
  inventoryMovementReverse:
    "Only admin, super-admin, or installation team can reverse inventory movements.",
  toolMovementReverse:
    "Only admin, super-admin, or installation team can reverse tool movements.",
  ceoOperationalReadOnly:
    "CEO role is read-only here. Approve quotations or convert approved quotes to projects where your role allows.",
} as const;
