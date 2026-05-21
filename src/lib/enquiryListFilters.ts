import { getEnquiryFollowUpAging } from "@/lib/agingHelpers";
import type { Enquiry } from "@/types/project";

/** Default list view: active pipeline only (excludes converted + lost). */
export const DEFAULT_ENQUIRY_STATUS_FILTER = "open";

export type EnquiryListFilterInput = {
  searchQuery?: string;
  statusFilter?: string;
  priorityFilter?: string;
  assigneeFilter?: string;
  /** When `overdue`, only enquiries with a past-due follow-up date (dashboard KPI). */
  followUpFilter?: "all" | "overdue";
};

export function matchesEnquiryFollowUpOverdue(enquiry: Enquiry): boolean {
  return getEnquiryFollowUpAging(enquiry) != null;
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

export function filterEnquiriesForList(
  enquiries: Enquiry[],
  input: EnquiryListFilterInput,
): Enquiry[] {
  const searchQuery = input.searchQuery ?? "";
  const statusFilter = input.statusFilter ?? DEFAULT_ENQUIRY_STATUS_FILTER;
  const priorityFilter = input.priorityFilter ?? "all";
  const assigneeFilter = input.assigneeFilter ?? "all";
  const followUpFilter = input.followUpFilter ?? "all";
  const search = searchQuery.toLowerCase();

  return enquiries.filter((e) => {
    const matchesSearch =
      !search ||
      (e.customerName || "").toLowerCase().includes(search) ||
      (e.customerPhone || "").includes(searchQuery) ||
      (e.id || "").toLowerCase().includes(search);
    const matchesStatus = matchesEnquiryStatusFilter(e, statusFilter);
    const matchesPriority = priorityFilter === "all" || e.priority === priorityFilter;
    const matchesAssignee =
      assigneeFilter === "all" ||
      e.assignedToMemberId === assigneeFilter ||
      e.assignedTo === assigneeFilter ||
      (assigneeFilter === "unassigned" && !e.assignedToMemberId && !e.assignedTo?.trim());
    const hideArchived = statusFilter === "all" ? !e.archivedAt : true;
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

/** Converted + lost rows hidden while the default Open pipeline filter is active. */
export function countEnquiriesHiddenByOpenFilter(enquiries: Enquiry[]): number {
  return enquiries.filter(
    (e) => !e.archivedAt && (e.status === "converted" || e.status === "lost"),
  ).length;
}

export function isEnquiryOpenPipelineFilterActive(statusFilter: string): boolean {
  return statusFilter === DEFAULT_ENQUIRY_STATUS_FILTER;
}

export function clearEnquiryListFilters(): {
  searchQuery: string;
  statusFilter: string;
  priorityFilter: string;
  assigneeFilter: string;
} {
  return {
    searchQuery: "",
    statusFilter: "all",
    priorityFilter: "all",
    assigneeFilter: "all",
  };
}
