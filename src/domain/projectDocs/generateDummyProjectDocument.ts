import { format } from "date-fns";
import type { Project, ProjectGeneratedDocument, Quotation } from "@/types/project";

export const DOCUMENT_KIND_LABELS: Record<string, string> = {
  proposal: "Proposal / offer",
  agreement: "Agreement",
  feasibility: "Feasibility / shadow analysis",
  meter_application: "DISCOM meter application",
  dcr: "DCR — drawing change register",
  wcr: "WCR — work completion request",
  handover: "Handover dossier",
  external_invoice_ref: "External invoice reference",
  commission_doc: "Commission / channel letter",
  site_photo: "Site photo pack (INC)",
  work_completion: "Work completion (INC)",
  full_epc_document_set: "Full EPC document index",
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function buildDummyProjectHtml(
  docKey: string,
  project: Project,
  quotation?: Pick<Quotation, "quotationNumber" | "clientName"> | null,
): { title: string; bodyHtml: string } {
  const client = quotation?.clientName ?? project.client;
  const qref = quotation?.quotationNumber ?? project.quotationId ?? "—";
  const cap = project.capacity || "—";
  const addr = project.clientAddress ?? project.location ?? "—";
  const amt = project.contractAmount ? project.contractAmount.toLocaleString("en-IN") : "—";

  const header = `
    <p style="margin:0 0 16px;line-height:1.5;"><strong>${esc("MAHI SOLA SOLUTIONS")}</strong><br/>
    Operational office — Jaipur, Rajasthan • CIN/UIN — on request<br/>
    Project ref.: <strong>${esc(project.id)}</strong></p>
    <p style="font-size:11px;color:#555;margin:0 0 16px;padding-bottom:12px;border-bottom:1px solid #e5e7eb;">
    Printed: ${format(new Date(), "d MMMM yyyy, HH:mm")} • Controlled copy • Doc key <code>${esc(docKey)}</code>
    </p>`;

  const label = DOCUMENT_KIND_LABELS[docKey] ?? docKey.replace(/_/g, " ");

  const blocks: Record<string, string> = {
    proposal: `<h2 style="font-size:15px;margin:0 0 12px;">Commercial proposal</h2>
      <p>Customer: ${esc(client)}</p><p>Site / address: ${esc(addr)}</p><p>System: ${esc(cap)} rooftop/interconnection …</p>
      <p>Reference quotation: ${esc(String(qref))}. Indicative contract value aligned to customer agreement pack: ₹${esc(
        amt,
      )} (exclusive of statutory variations).</p>
      <p>Scope (summary): Detailed engineering, BOM as per BOM register, procurement, HSE, installation & commissioning incl. liaising with DISCOM for net metering.</p>
      <p><em>Note: This is an internal-draft dossier for demo; numbering follows MSS internal series.</em></p>`,
    agreement: `<h2 style="font-size:15px;margin:0 0 12px;">EPC / Supply work order — boilerplate excerpt</h2>
      <p>This agreement sits between MSS and ${esc(client)} covering project “${esc(project.name)}”. Scope split into milestones: advance mobilisation … structure completion … AC/DC energisation … STU handover.</p>
      <p>Payments linked to quotations / invoicing milestones. LD &amp; SLA per schedule A (attach).</p>`,
    feasibility: `<h2 style="font-size:15px;margin:0 0 12px;">Shadow &amp; irradiation workbook (summary sheet)</h2>
      <p>Irradiation zone: _____ kWh/kWp/year (indicative). Grid availability &amp; export assumptions recorded in annex.</p>`,
    meter_application: `<h2 style="font-size:15px;margin:0 0 12px;">Net metering / rooftop connection draft</h2>
      <p>Applicant: ${esc(client)} — Sanctioned load / capacity: ${esc(cap)} — Site: ${esc(addr)}.</p>`,
    dcr: `<h2 style="font-size:15px;margin:0 0 12px;">Drawing change register</h2>
      <table style="width:100%;border-collapse:collapse;font-size:11px;"><tr style="border-bottom:1px solid #eee;">
      <th style="text-align:left;padding:8px;">Rev</th><th style="text-align:left;padding:8px;">Change</th><th style="text-align:left;padding:8px;">Sign-off</th></tr>
      <tr><td style="padding:8px;">R0</td><td style="padding:8px;">As-built preliminary</td><td style="padding:8px;">MSS Proj Eng</td></tr></table>`,
    wcr: `<h2 style="font-size:15px;margin:0 0 12px;">Work completion checklist</h2>
      <p>Structural: ☐ Rooftop civil sign-off • ☐ Earthing pits • AC/DC cabling megger readings attached.</p>`,
    handover: `<h2 style="font-size:15px;margin:0 0 12px;">Customer acceptance &amp; O&amp;M handover</h2>
      <p>Inverter OEM warranty registrations, BOM sign-off &amp; O&amp;M first-year schedule communicated.</p>`,
    commission_doc: `<h2 style="font-size:15px;margin:0 0 12px;">Channel / partner commission acknowledgement</h2>
      <p>Channel partner payouts tied to disbursement milestones for ${esc(project.name)} — net of TDS/GST mechanics.</p>`,
    external_invoice_ref: `<h2 style="font-size:15px;margin:0 0 12px;">External OEM invoice reconciliation</h2>
      <table style="font-size:11px;"><tr><td>INV-______</td><td>₹____________</td><td>GST____________</td></tr></table>`,
    site_photo: `<h2 style="font-size:15px;margin:0 0 12px;">Site photo appendix</h2><p>Rooftop before/after panorama — numbering per shoot log sheet.</p>`,
    work_completion: `<h2 style="font-size:15px;margin:0 0 12px;">Work completion certificate (INC scope)</h2>`,
    full_epc_document_set: `<h2 style="font-size:15px;margin:0 0 12px;">Master index — full EPC dossier</h2>
      <ol><li>Proposal</li><li>Agreement</li><li>Feasibility</li><li>DISCOM pack</li><li>SAT / handshake</li></ol>`,
  };

  const body = blocks[docKey] ?? `<p>${esc(label)} — standard template body for MSS internal preview.</p>
    <p>Project ${esc(project.name)} • Customer ${esc(client)}.</p>`;

  return {
    title: `${label} — ${project.name}`,
    bodyHtml: header + body,
  };
}

export function createGeneratedDocumentRow(
  id: string,
  docKey: string,
  project: Project,
  quotation?: Pick<Quotation, "quotationNumber" | "clientName"> | null,
): ProjectGeneratedDocument {
  const { title, bodyHtml } = buildDummyProjectHtml(docKey, project, quotation);
  return {
    id,
    docKey,
    title,
    createdAt: new Date().toISOString(),
    bodyHtml,
  };
}
