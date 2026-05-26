import { getEnquiryFollowUpAging } from "@/lib/agingHelpers";
import { getEnquiryDisplayStatus } from "@/lib/enquiryStatusReconcile";
import type { Enquiry, Quotation } from "@/types/project";

/** Default list view: active pipeline only (excludes converted + lost). */
export const DEFAULT_ENQUIRY_STATUS_FILTER = "open";

export const ENQUIRY_LIST_STATUS_FILTER_KEYS = [
  DEFAULT_ENQUIRY_STATUS_FILTER,
  "all",
  "new",
  "meeting_scheduled",
  "quotation_draft",
  "quotation_sent",
  "quotation_rejected",
  "converted",
  "lost",
  "archived",
] as const;

export type EnquiryListStatusFilterKey = (typeof ENQUIRY_LIST_STATUS_FILTER_KEYS)[number];

export type EnquiryListFilterInput = {
  searchQuery?: string;
  /** Multi-select status chips (OR). Empty → default open pipeline. */
  statusFilterIds?: string[];
  /** Multi-select priority chips (OR). Empty → all priorities. */
  priorityFilterIds?: string[];
  /** @deprecated Use statusFilterIds */
  statusFilter?: string;
  /** @deprecated Use priorityFilterIds */
  priorityFilter?: string;
  assigneeFilter?: string;
  assigneeFilterIds?: string[];
  followUpFilter?: "all" | "overdue";
  quotations?: Quotation[];
};

export function matchesEnquiryFollowUpOverdue(enquiry: Enquiry): boolean {
  return getEnquiryFollowUpAging(enquiry) != null;
}

/** Bucket key for KPI counts and multi-select status matching. */
export function getEnquiryListFilterKey(
  enquiry: Enquiry,
  quotations: Quotation[] = [],
): EnquiryListStatusFilterKey {
  if (enquiry.archivedAt) return "archived";
  const display = getEnquiryDisplayStatus(enquiry, quotations);
  if (display === "quotation_draft") return "quotation_draft";
  return display as EnquiryListStatusFilterKey;
}

export function matchesEnquiryStatusFilter(enquiry: Enquiry, statusFilter: string): boolean {
  if (statusFilter === "all") {
    return true;
  }
  if (statusFilter === "archived") {
    return !!enquiry.archivedAt;
  }
  if (statusFilter === DEFAULT_ENQUIRY_STATUS_FILTER) {
    return (
      !enquiry.archivedAt && enquiry.status !== "converted" && enquiry.status !== "lost"
    );
  }
  return !enquiry.archivedAt && enquiry.status === statusFilter;
}

export function matchesEnquiryStatusFilterIds(
  enquiry: Enquiry,
  statusFilterIds: string[],
  quotations: Quotation[] = [],
): boolean {
  if (statusFilterIds.length === 0) {
    return matchesEnquiryStatusFilter(enquiry, DEFAULT_ENQUIRY_STATUS_FILTER);
  }
  if (statusFilterIds.includes("all")) {
    return true;
  }
  const key = getEnquiryListFilterKey(enquiry, quotations);
  return statusFilterIds.some((id) => {
    if (id === DEFAULT_ENQUIRY_STATUS_FILTER) {
      return (
        !enquiry.archivedAt && enquiry.status !== "converted" && enquiry.status !== "lost"
      );
    }
    if (id === "archived") return !!enquiry.archivedAt;
    return key === id;
  });
}

export function normalizeEnquiryListFilterInput(
  input: EnquiryListFilterInput,
): Required<Pick<EnquiryListFilterInput, "statusFilterIds" | "priorityFilterIds">> & EnquiryListFilterInput {
  const statusFilterIds =
    input.statusFilterIds ??
    (input.statusFilter && input.statusFilter !== "all"
      ? [input.statusFilter]
      : input.statusFilter === "all"
        ? ["all"]
        : []);
  const priorityFilterIds =
    input.priorityFilterIds ??
    (input.priorityFilter && input.priorityFilter !== "all" ? [input.priorityFilter] : []);
  return { ...input, statusFilterIds, priorityFilterIds };
}

export function filterEnquiriesForList(
  enquiries: Enquiry[],
  input: EnquiryListFilterInput,
): Enquiry[] {
  const normalized = normalizeEnquiryListFilterInput(input);
  const searchQuery = normalized.searchQuery ?? "";
  const statusFilterIds = normalized.statusFilterIds;
  const priorityFilterIds = normalized.priorityFilterIds;
  const assigneeFilter = normalized.assigneeFilter ?? "all";
  const assigneeFilterIds = normalized.assigneeFilterIds ?? [];
  const followUpFilter = normalized.followUpFilter ?? "all";
  const quotations = normalized.quotations ?? [];
  const search = searchQuery.toLowerCase();

  return enquiries.filter((e) => {
    const matchesSearch =
      !search ||
      (e.customerName || "").toLowerCase().includes(search) ||
      (e.customerPhone || "").includes(searchQuery) ||
      (e.id || "").toLowerCase().includes(search);
    const matchesStatus = matchesEnquiryStatusFilterIds(e, statusFilterIds, quotations);
    const matchesPriority =
      priorityFilterIds.length === 0 || priorityFilterIds.includes(e.priority);
    const matchesAssignee = (() => {
      if (assigneeFilterIds.length > 0) {
        const unassigned = !e.assignedToMemberId?.trim();
        if (assigneeFilterIds.includes("__unassigned__") && unassigned) return true;
        return assigneeFilterIds.some(
          (id) => id !== "__unassigned__" && e.assignedToMemberId === id,
        );
      }
      return (
        assigneeFilter === "all" ||
        e.assignedToMemberId === assigneeFilter ||
        e.assignedTo === assigneeFilter ||
        (assigneeFilter === "unassigned" && !e.assignedToMemberId?.trim())
      );
    })();
    const hideArchived =
      statusFilterIds.includes("all") && !statusFilterIds.includes("archived")
        ? !e.archivedAt
        : true;
    const matchesFollowUp =
      followUpFilter !== "overdue" || matchesEnquiryFollowUpOverdue(e);
    return (
      matchesSearch &&
      matchesStatus &&
      matchesPriority &&
      matchesAssignee &&
      hideArchived &&
      matchesFollowUp
    );
  });
}

export function countEnquiriesByListFilterKey(
  enquiries: Enquiry[],
  quotations: Quotation[] = [],
): Record<EnquiryListStatusFilterKey, number> {
  const counts = Object.fromEntries(
    ENQUIRY_LIST_STATUS_FILTER_KEYS.map((k) => [k, 0]),
  ) as Record<EnquiryListStatusFilterKey, number>;

  for (const e of enquiries) {
    counts.all += 1;
    if (e.archivedAt) {
      counts.archived += 1;
      continue;
    }
    const key = getEnquiryListFilterKey(e, quotations);
    if (key in counts) counts[key] += 1;
    if (e.status !== "converted" && e.status !== "lost") {
      counts.open += 1;
    }
  }
  return counts;
}

/** Converted + lost rows hidden while only the default Open pipeline filter is active. */
export function countEnquiriesHiddenByOpenFilter(enquiries: Enquiry[]): number {
  return enquiries.filter(
    (e) => !e.archivedAt && (e.status === "converted" || e.status === "lost"),
  ).length;
}

export function isEnquiryOpenPipelineFilterActive(statusFilter: string): boolean {
  return statusFilter === DEFAULT_ENQUIRY_STATUS_FILTER;
}

export function isOnlyDefaultOpenStatusFilters(
  statusFilterIds: string[],
  priorityFilterIds: string[],
): boolean {
  return (
    (statusFilterIds.length === 0 ||
      (statusFilterIds.length === 1 && statusFilterIds[0] === DEFAULT_ENQUIRY_STATUS_FILTER)) &&
    priorityFilterIds.length === 0
  );
}

export function hasNonDefaultEnquiryListFilters(input: {
  searchQuery?: string;
  statusFilterIds?: string[];
  priorityFilterIds?: string[];
  assigneeFilterIds?: string[];
  followUpFilter?: "all" | "overdue";
}): boolean {
  const statusFilterIds = input.statusFilterIds ?? [];
  const priorityFilterIds = input.priorityFilterIds ?? [];
  const assigneeFilterIds = input.assigneeFilterIds ?? [];
  return (
    Boolean(input.searchQuery?.trim()) ||
    input.followUpFilter === "overdue" ||
    assigneeFilterIds.length > 0 ||
    priorityFilterIds.length > 0 ||
    !isOnlyDefaultOpenStatusFilters(statusFilterIds, priorityFilterIds)
  );
}

export function parseStatusFilterIdsFromSearchParam(value: string | null): string[] {
  if (!value?.trim()) return [DEFAULT_ENQUIRY_STATUS_FILTER];
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

export function parsePriorityFilterIdsFromSearchParam(value: string | null): string[] {
  if (!value?.trim() || value === "all") return [];
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

export function clearEnquiryListFilters(): {
  searchQuery: string;
  statusFilterIds: string[];
  priorityFilterIds: string[];
  assigneeFilter: string;
} {
  return {
    searchQuery: "",
    statusFilterIds: [DEFAULT_ENQUIRY_STATUS_FILTER],
    priorityFilterIds: [],
    assigneeFilter: "all",
  };
}
