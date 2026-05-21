import type { AppState } from "@/contexts/AppDataContext";
import type { Project, SiteRecord, Task } from "@/types/project";
import type { ProjectTimelineStatus } from "@/types/blockage";
import { WORK_STATUS_STAGES } from "@/types/blockage";
import { inferTransportWorkKind, resolveSiteForMaterialIssue } from "@/lib/materialIssueTransportTask";
import { allowsMaterialDispatch } from "./seedCapabilityAxis";
import { seedId, SEED_ID_PREFIX } from "./seedIdRegistry";
import { seedDayAt, seedDateAt } from "./seedTimeModel";
import { pushAudit } from "./seedHelpers";
import { applyChangeRequestToProject } from "@/lib/changeRequestApproval";
import { panelItem, inverterItem, structureItem, cableItem } from "./seedInventoryCatalog";

export interface BundleContext {
  state: AppState;
  project: Project;
  site: SiteRecord;
  fraction: number;
  index: number;
  richTimeline?: boolean;
}

function buildSiteChecklist(state: AppState, project: Project, fraction: number) {
  const panel = panelItem(state.inventoryItems);
  const inverter = inverterItem(state.inventoryItems);
  const structure = structureItem(state.inventoryItems);
  const cable = cableItem(state.inventoryItems);
  const kw = Number.parseInt(project.capacity, 10) || 5;
  const panelQty = Math.max(4, Math.round(kw * 1000 / 540));

  project.siteChecklist = [
    { id: seedId("CL"), name: panel.name, category: "Panel", unit: "pcs", qtyPlanned: panelQty, qtySent: Math.floor(panelQty * 0.6), qtyReturned: 0, qtyConsumed: Math.floor(panelQty * 0.4), unitPrice: panel.salePrice, source: "quotation" },
    { id: seedId("CL"), name: inverter.name, category: "Inverter", unit: "pcs", qtyPlanned: 1, qtySent: project.lifecycleStatus === "New" ? 0 : 1, qtyReturned: 0, qtyConsumed: 0, unitPrice: inverter.salePrice, source: "quotation" },
    { id: seedId("CL"), name: structure.name, category: "Structure", unit: "pcs", qtyPlanned: panelQty, qtySent: Math.floor(panelQty * 0.5), qtyReturned: 0, qtyConsumed: 0, unitPrice: structure.salePrice, source: "quotation" },
    { id: seedId("CL"), name: cable.name, category: "Cable", unit: "m", qtyPlanned: panelQty * 3, qtySent: panelQty * 2, qtyReturned: 0, qtyConsumed: panelQty, unitPrice: cable.salePrice, source: "quotation" },
  ];

  project.commercialBaseline = {
    id: seedId("CB"),
    quotationId: project.quotationId,
    customerId: project.customerId ?? "",
    capturedAt: seedDateAt(fraction),
    lines: project.siteChecklist.map((cl) => ({
      id: cl.id,
      description: cl.name,
      quantity: cl.qtyPlanned,
      unit: cl.unit,
      rate: cl.unitPrice ?? 0,
      total: (cl.unitPrice ?? 0) * cl.qtyPlanned,
    })),
    materialsTotal: project.siteChecklist.reduce((s, cl) => s + (cl.unitPrice ?? 0) * cl.qtyPlanned, 0),
    servicesTotal: Math.round(project.contractAmount * 0.25),
    basis: "fixed",
  };

  project.executionLineItems = project.siteChecklist.map((cl) => ({
    id: cl.id,
    description: cl.name,
    quantity: cl.qtyPlanned,
    unit: cl.unit,
    rate: cl.unitPrice ?? 0,
    total: (cl.unitPrice ?? 0) * cl.qtyPlanned,
    source: "quotation" as const,
    issuedQty: cl.qtySent,
    baselineLineId: cl.id,
    updatedAt: seedDateAt(fraction + 0.01),
  }));
}

function buildMaterialsSent(ctx: BundleContext) {
  const { state, project, site, fraction, index } = ctx;
  if (!allowsMaterialDispatch(project.projectKind ?? "SOLO_EPC")) return;
  if (project.lifecycleStatus === "New") return;

  const panel = panelItem(state.inventoryItems);
  const inverter = inverterItem(state.inventoryItems);
  const structure = structureItem(state.inventoryItems);
  const issuances = [
    { itemId: panel.id, itemName: panel.name, quantity: 4 + (index % 3), unitPrice: panel.salePrice, dateIssued: seedDayAt(fraction + 0.05) },
    { itemId: inverter.id, itemName: inverter.name, quantity: 1, unitPrice: inverter.salePrice, dateIssued: seedDayAt(fraction + 0.08) },
    { itemId: structure.id, itemName: structure.name, quantity: 4 + (index % 2), unitPrice: structure.salePrice, dateIssued: seedDayAt(fraction + 0.1) },
  ];

  project.materialsSent = [...(project.materialsSent ?? []), ...issuances];
  project.siteMaterialLedger = issuances.map((m) => ({
    itemId: m.itemId,
    openingQty: 0,
    issuedQty: m.quantity,
    returnedQty: 0,
    scrapAtSiteQty: 0,
    consumedQty: Math.floor(m.quantity * 0.3),
    updatedAt: m.dateIssued,
  }));
  project.materialMovementDedupeIds = issuances.map((m) => `${project.id}:${m.itemId}:${m.dateIssued}`);

  for (const iss of issuances) {
    const kind = inferTransportWorkKind([iss.itemName]);
    const resolved = resolveSiteForMaterialIssue(state.sites, project.id, project.name);
    const task: Task = {
      id: seedId(SEED_ID_PREFIX.task),
      projectId: project.id,
      siteId: resolved.siteId,
      siteName: resolved.siteName,
      workType: kind.workType,
      milestoneId: kind.stageKey,
      notes: `Transport for ${iss.itemName} dispatch`,
      createdDate: iss.dateIssued,
      workDate: iss.dateIssued.slice(0, 10),
      status: index % 5 === 0 ? "done" : index % 4 === 0 ? "started" : "sent",
      createdBy: "Karthik Rao",
      workItems: [{ stageKey: kind.stageKey.split("-")[0] ?? "structure", stageName: kind.workType, subItems: [kind.stageKey] }],
    };
    state.tasks.push(task);

    state.expenses.push({
      id: seedId(SEED_ID_PREFIX.expense),
      date: iss.dateIssued.slice(0, 10),
      amount: 1800 + index * 100,
      mainCategory: "site",
      projectId: project.id,
      projectName: project.name,
      category: "Transport",
      subCategory: "material-transport",
      context: "project",
      paidBy: { type: "company" },
      notes: `Transport for ${iss.itemName}`,
      createdAt: iss.dateIssued,
    });
  }

  site.checklistItems = project.siteChecklist?.map((cl, i) => ({
    id: seedId("SCI"),
    requiresMaterial: true,
    inventoryItemId: state.inventoryItems.find((inv) => inv.name === cl.name)?.id,
    materialName: cl.name,
    requiredQuantity: cl.qtyPlanned,
    status: cl.qtySent >= cl.qtyPlanned ? "dispatched" : cl.qtySent > 0 ? "partially-dispatched" : "pending",
  })) ?? [];
}

function buildTimeline(ctx: BundleContext): ProjectTimelineStatus {
  const { project, fraction, richTimeline, index } = ctx;
  const rich = richTimeline ?? false;
  return {
    projectId: project.id,
    fileLogin: rich ? "submitted" : index % 2 === 0 ? "file-login" : "doc-received",
    fileLoginComplete: rich,
    subsidyType: index % 4 === 0 ? "both" : index % 3 === 0 ? "center-78k" : "not-applicable",
    bankFileType: project.paymentType === "loan" ? "loan" : project.paymentType === "cash-and-loan" ? "cash-and-loan" : "cash",
    loanStage: project.paymentType !== "cash" ? "file-into-bank" : "",
    loanStatus: project.paymentType !== "cash" ? "pending" : "",
    workStatusChecks: rich ? ["structure", "panel", "wiring"] : index % 2 === 0 ? ["structure"] : [],
    workStatusApprovals: index % 6 === 0 ? {
      inverter: {
        status: "requested",
        requestedAt: seedDateAt(fraction + 0.1),
        requestedBy: "INST-001",
        requestedByName: "Karthik Rao",
      },
    } : index % 11 === 0 ? {
      structure: {
        status: "closed",
        photoCount: 2,
        photoUrls: [
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='48'%3E%3Crect fill='%23e2e8f0' width='64' height='48'/%3E%3Ctext x='8' y='28' font-size='10' fill='%2364748b'%3ESeed%3C/text%3E%3C/svg%3E",
        ],
        updatedBy: "admin-001",
        updatedByName: "Anita Deshmukh",
        approvedAt: seedDateAt(fraction + 0.12),
        approvedByName: "Anita Deshmukh",
      },
    } : {},
    discomChecks: rich ? ["meter-file-submit"] : [],
    discomSubsidyStatus: rich ? "pending" : "",
    paymentType: project.paymentType === "cash" ? "cash-to-mahi" : "instalments",
    cashToMahiConfirmed: project.paymentType === "cash",
    firstInstallmentPaid: rich,
    dcrStatus: rich ? "documentation" : "pending",
    updatedAt: seedDateAt(fraction + 0.02),
  };
}

function buildWorkStatusTasks(ctx: BundleContext) {
  const { state, project, site, fraction, index } = ctx;
  if (project.projectKind === "VENDORSHIP_ONLY") return;

  const stages = WORK_STATUS_STAGES.slice(0, 3 + (index % 4));
  for (const stage of stages) {
    const sub = stage.subItems[0];
    if (!sub) continue;
    state.tasks.push({
      id: seedId(SEED_ID_PREFIX.task),
      projectId: project.id,
      siteId: site.id,
      siteName: site.name,
      workType: stage.label,
      milestoneId: sub.value,
      notes: `${stage.label} — ${sub.label}`,
      createdDate: seedDayAt(fraction + 0.03),
      workDate: index % 7 === 0 ? "2026-05-10" : seedDayAt(fraction + 0.04).slice(0, 10),
      status: (["created", "sent", "checked", "started", "done"] as const)[index % 5],
      createdBy: "Karthik Rao",
      workItems: [{ stageKey: stage.value, stageName: stage.label, subItems: [sub.value] }],
      delayHistory: index % 9 === 0 ? [{ from: seedDayAt(fraction + 0.03), to: seedDayAt(fraction + 0.04), reason: "Rain delay", at: seedDateAt(fraction + 0.04) }] : undefined,
    });
  }
}

/** §15 — attach full per-project child bundle. */
export function attachProjectBundle(ctx: BundleContext): void {
  const { state, project, site, fraction, index } = ctx;

  if (allowsMaterialDispatch(project.projectKind ?? "SOLO_EPC")) {
    buildSiteChecklist(state, project, fraction);
    buildMaterialsSent(ctx);
  }

  state.projectTimelineByProjectId[project.id] = buildTimeline(ctx);
  buildWorkStatusTasks(ctx);

  if (project.lifecycleStatus === "New") {
    project.siteReadiness = {
      ready: false,
      markedAt: seedDateAt(fraction + 0.01),
      markedBy: "ADM-001",
      note: "Awaiting roof access survey and client NOC",
    };
  } else if (project.lifecycleStatus === "In Progress" || project.lifecycleStatus === "Completed") {
    project.siteReadiness = {
      ready: true,
      markedAt: seedDateAt(fraction + 0.02),
      markedBy: "ADM-001",
      note: "Roof access and client NOC received",
    };
    project.startedAt = seedDateAt(fraction + 0.025);
    const team = state.teams[index % state.teams.length];
    project.teamAssignments = [{
      id: seedId(SEED_ID_PREFIX.teamAssignment),
      teamId: team?.id ?? "",
      teamName: team?.name ?? "",
      startDate: seedDayAt(fraction + 0.02),
      endDate: seedDayAt(fraction + 0.5),
    }];
    project.assignees = team?.memberIds?.length ? [...team.memberIds] : [];

    state.scheduledInstallations.push({
      id: seedId(SEED_ID_PREFIX.installation),
      projectId: project.id,
      scheduledDate: seedDayAt(fraction + 0.06),
      teamId: team?.id,
      employeeIds: team?.memberIds?.slice(0, 2),
      status: index % 4 === 0 ? "completed" : index % 3 === 0 ? "in_progress" : "scheduled",
      createdAt: seedDateAt(fraction + 0.05),
      doubleBookingOverrideReason: index % 13 === 0 ? "Client insisted on festival week slot" : undefined,
      pastDateOverrideReason: index % 17 === 0 ? "Retroactive schedule for missed entry" : undefined,
    });

    state.siteVisits.push({
      id: seedId(SEED_ID_PREFIX.siteVisit),
      projectId: project.id,
      visitedBy: "Karthik Rao",
      visitDate: seedDayAt(fraction + 0.01),
      items: [{ name: "Roof condition survey", requiredQty: 1, unit: "visit" }],
      blockers: index % 8 === 0 ? "Water tank shadow on south corner" : undefined,
      reconciledChecklistAt: index % 3 !== 0 ? seedDateAt(fraction + 0.03) : undefined,
      createdAt: seedDateAt(fraction + 0.01),
    });
  }

  if (project.lifecycleStatus === "On Hold") {
    state.blockages.push({
      id: seedId(SEED_ID_PREFIX.blockage),
      projectId: project.id,
      title: "Structural reinforcement pending",
      reason: "Client delayed structural reinforcement work",
      status: "active",
      projectStage: "work-in-progress",
      timelineStage: "work-status",
      timelineSubStage: "panel",
      createdAt: seedDateAt(fraction + 0.02),
      startDate: seedDayAt(fraction + (index % 2 === 0 ? 0.12 : 0.25)),
    });
  }

  if (index % 2 === 0) {
    const emp = state.employees[index % state.employees.length];
    state.operationalTickets.push({
      id: seedId(SEED_ID_PREFIX.ticket),
      projectId: project.id,
      taskType: (["work", "call", "visit", "meeting", "custom"] as const)[index % 5],
      description: "Follow up on DISCOM meter file submission",
      assignedTo: emp ? [emp.id] : [],
      dueDate: seedDayAt(fraction + 0.15),
      priority: "medium",
      location: project.id,
      status: (["pending", "in-progress", "completed", "cancelled"] as const)[index % 4],
      createdAt: seedDateAt(fraction + 0.01),
    });
  }

  if (allowsMaterialDispatch(project.projectKind ?? "SOLO_EPC") && index % 3 === 0) {
    const panel = panelItem(state.inventoryItems);
    state.materialReservations.push({
      id: seedId(SEED_ID_PREFIX.reservation),
      itemId: panel.id,
      qty: 4,
      projectId: project.id,
      source: index % 2 === 0 ? "auto-from-checklist" : "manual",
      createdAt: seedDateAt(fraction + 0.01),
      linkedChecklistItemId: project.siteChecklist?.[0]?.id,
    });
  }

  if (allowsMaterialDispatch(project.projectKind ?? "SOLO_EPC") && index % 5 === 0) {
    state.materialDamageRecords.push({
      id: seedId(SEED_ID_PREFIX.damage),
      itemId: panelItem(state.inventoryItems).id,
      qty: index % 10 === 0 ? 6 : 2,
      stage: (["transport", "installation", "storage"] as const)[index % 3],
      projectId: project.id,
      notes: index % 10 === 0 ? "Corner chip on two modules during unloading — vendor notified" : "Minor scratch",
      costImpact: index % 10 === 0 ? 7200 : 800,
      reportedAt: seedDateAt(fraction + 0.07),
      reportedBy: "Karthik Rao",
    });
  }

  if (index % 4 === 0 && project.projectKind !== "VENDORSHIP_ONLY") {
    const crType = (["capacity", "panels", "addon-work"] as const)[index % 3];
    const isApproved = index % 2 === 0;
    const cr = {
      id: seedId(SEED_ID_PREFIX.changeRequest),
      projectId: project.id,
      type: crType,
      deltaKw: crType === "capacity" ? 1 : undefined,
      deltaPanels: crType === "panels" ? 2 : undefined,
      deltaAmount: 25000,
      status: isApproved ? ("approved" as const) : ("rejected" as const),
      requestedAt: seedDateAt(fraction + 0.08),
      approvedAt: isApproved ? seedDateAt(fraction + 0.09) : undefined,
      notes: isApproved ? "Client requested extra panel row" : "Client declined addon cost",
    };
    if (isApproved && project.customerId) {
      const inventoryLookup = state.inventoryItems.map((i) => ({
        id: i.id,
        name: i.name,
        unit: i.unit,
      }));
      const { projectPatch, reservations, deltaAmount } = applyChangeRequestToProject(
        project,
        cr,
        inventoryLookup,
      );
      Object.assign(project, projectPatch);
      for (const r of reservations) {
        state.materialReservations.push({
          id: seedId(SEED_ID_PREFIX.reservation),
          itemId: r.itemId,
          qty: r.qty,
          projectId: r.projectId,
          reason: r.reason,
          createdAt: seedDateAt(fraction + 0.09),
          source: "manual",
        });
      }
      state.projectChangeRequests.push({ ...cr, deltaAmount: deltaAmount || cr.deltaAmount });
    } else {
      state.projectChangeRequests.push(cr);
    }
  }

  if (index % 3 === 0) {
    project.photoGallery = [
      { id: seedId("PHO"), url: "/placeholder-site.jpg", caption: "Roof survey", uploadedAt: seedDateAt(fraction + 0.02) },
      { id: seedId("PHO"), url: "/placeholder-panel.jpg", caption: "Panel layout mark-up", uploadedAt: seedDateAt(fraction + 0.04) },
    ];
    project.photos = project.photoGallery.length;
  }

  if (project.vendorshipOwner === "MSS" && project.executionScope === "full" && project.projectMode !== "INC_GIVEN_TO_US") {
    project.generatedDocuments = [
      { id: seedId("DOC"), docKey: "proposal", title: "Solar Proposal", createdAt: seedDateAt(fraction + 0.01), bodyHtml: "<p>Proposal for client review</p>" },
      { id: seedId("DOC"), docKey: "agreement", title: "Installation Agreement", createdAt: seedDateAt(fraction + 0.02), bodyHtml: "<p>Agreement terms</p>" },
    ];
  }

  pushAudit(state, {
    action: "create",
    entityType: "Project",
    entityId: project.id,
    entityName: project.name,
    fraction,
    role: "admin",
  });
}
