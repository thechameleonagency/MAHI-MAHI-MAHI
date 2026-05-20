/** User-facing hints when an action button is disabled due to role matrix permissions. */
export const PERMISSION_DENIED_HINTS = {
  quotationApprove: "Only admin, management, or CEO can approve quotations.",
  quotationSend: "Your role cannot send quotations.",
  quotationReject: "Your role cannot reject or withdraw quotations.",
  projectFromQuote: "Only admin, management, or CEO can create a project from an approved quotation.",
  enquiryUpdate: "Your role cannot update enquiries.",
  enquiryCreateQuotation: "Your role cannot create quotations.",
  invoiceCreate: "Your role cannot create invoices.",
  changeRequestApprove: "Only admin, management, or CEO can approve commercial change requests.",
  customerCreateQuotation: "Your role cannot create quotations for this customer.",
  customerCreateProject: "Your role cannot create projects from the customer page.",
} as const;
