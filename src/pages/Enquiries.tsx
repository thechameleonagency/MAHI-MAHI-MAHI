import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  Plus, Phone, Mail, MapPin, Calendar, UserPlus, FileText,
  Send, Eye, Edit, Check, Clock, MessageCircle,
  Building2, IndianRupee, ChevronDown, Zap, Share2, Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getPriorityColor } from "@/lib/statusColors";
import { formatEnquiryDisplayDate, formatEnquiryStatusLabel } from "@/lib/enquiryStatusUi";
import { getEnquiryDisplayStatus } from "@/lib/enquiryStatusReconcile";
import { formatINR } from "@/lib/formatCurrency";
import { cn } from "@/lib/utils";
import { validateContactPhone } from "@/lib/phoneValidators";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { TablePaginationBar, DEFAULT_TABLE_PAGE_SIZE } from "@/components/data-table/TablePaginationBar";
import { dataTableClasses, listTableViewportMaxHeight } from "@/lib/tableConstants";
import { Sheet, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from "@/components/ui/sheet";
import { AppSheetContent } from "@/components/shared/AppSheetLayout";
import { ToastAction } from "@/components/ui/toast";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { useFormDraft } from "@/hooks/useFormDraft";
import { useAppData } from "@/contexts/AppDataContext";
import { useAppSession } from "@/app/providers/AppSessionProvider";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import type { Enquiry, Quotation } from "@/types/project";
import {
  getCurrentEnquiryQuotationId,
  getEnquiryQuotationIds,
} from "@/lib/enquiryQuotationHistory";
import { assertCanLinkNewQuotationToEnquiry } from "@/lib/enquiryQuotationCreateGate";
import { deepLink } from "@/lib/deepLinks";
import {
  executeEnquirySendQuotation,
  getEnquiryViewActions,
} from "@/lib/enquiryViewActions";
import {
  enquiryTerminalReasonRequiredMessage,
  isEnquiryTerminalReasonValid,
  MIN_ENQUIRY_TERMINAL_REASON_LENGTH,
  trimEnquiryReason,
} from "@/lib/enquiryReasonValidation";
import { AgingChip } from "@/components/ui/AgingChip";
import { LifecycleTerminalBanner } from "@/components/ui/LifecycleTerminalBanner";
import { ListEmptyState } from "@/components/ui/ListEmptyState";
import { EntityLink } from "@/components/shared/EntityInfoSheet";
import { getEnquiryFollowUpAging } from "@/lib/agingHelpers";
import { canReopenLostEnquiry } from "@/domain/stateMachines/enquiryStateMachine";
import { useCan } from "@/hooks/useCan";
import { useCeoOperationalReadOnly } from "@/hooks/useCeoOperationalReadOnly";
import { allowOperationalWrite } from "@/lib/ceoOperationalReadOnly";
import { CeoReadOnlySheetBanner } from "@/components/ui/CeoReadOnlySheetBanner";
import { PermissionGatedButton } from "@/components/ui/PermissionGatedButton";
import { PERMISSION_DENIED_HINTS } from "@/lib/permissionDeniedHints";
import { formPrimaryLabel } from "@/lib/formActionLabels";
import { friendlyCommandErrorMessage } from "@/lib/commandErrorMessages";
import {
  EnquiryFilterStrip,
  EnquiryHeaderActionsPanel,
  EnquiryListAssigneeBar,
} from "@/components/enquiries/EnquiryListAssigneeBar";
import {
  clearEnquiryListFilters,
  countEnquiriesHiddenByOpenFilter,
  DEFAULT_ENQUIRY_STATUS_FILTER,
  countEnquiriesByListFilterKey,
  filterEnquiriesForList,
  hasNonDefaultEnquiryListFilters,
  isOnlyDefaultOpenStatusFilters,
  parsePriorityFilterIdsFromSearchParam,
  parseStatusFilterIdsFromSearchParam,
} from "@/lib/enquiryListFilters";
import {
  buildEnquiryAssignmentFromAssignableId,
  buildEnquiryAssignmentFromMemberId,
  enquiryHasAssignee,
  getEnquiryAssignableMembers,
  getEnquiryAssigneeDisplayName,
} from "@/lib/enquiryAssignee";
import {
  buildEnquiryStatusHistory,
  enquiryShouldHidePriorityChip,
  getCurrentLinkedQuotation,
} from "@/lib/enquiryStatusHistory";
import {
  buildAgentToEnquiryDraft,
  buildEnquiryToQuotationDraft,
  parseCreateFromParam,
  resolveCreateFromOrToast,
  stripCreateFromParam,
  stripQuickCreateParam,
  saveCreateDraft,
} from "@/lib/createFromContext";
import {
  buildEnquiryShareActivityNote,
  buildEnquiryShareMessage,
  formatEnquiryShareMethodLabel,
  openEnquiryShareExternalLink,
  type EnquiryShareMethod,
} from "@/lib/enquiryShare";
import { resolveAuditActorUserName } from "@/lib/resolveAuditActorUserName";

const ENQUIRY_CREATE_DRAFT_KEY = "enquiry-create-v1";

type EnquiryCreateFormData = {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  customerType: "individual" | "company";
  source: Enquiry["source"];
  agentId: string;
  systemCapacity: string;
  estimatedBudget: string;
  requirements: string;
  priority: Enquiry["priority"];
  followUpDate: string;
};

const emptyEnquiryCreateForm = (): EnquiryCreateFormData => ({
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  customerAddress: "",
  customerType: "individual",
  source: "phone",
  agentId: "",
  systemCapacity: "",
  estimatedBudget: "",
  requirements: "",
  priority: "medium",
  followUpDate: "",
});

const Enquiries = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    enquiries,
    quotations,
    addEnquiry,
    updateEnquiry,
    transitionEnquiryStatus,
    transitionQuotationStatus,
    convertEnquiryToCustomer,
    employees,
    settingsTeamMembers,
    agents,
    generateId: _generateId,
    customers,
  } = useAppData();
  const { currentRole, sessionUserId, demoUserName, memberId } = useAppSession();
  const ceoReadOnly = useCeoOperationalReadOnly();
  const canCreateEnquiry = useCan("enquiry", "create");
  const canEditEnquiry = useCan("enquiry", "edit");
  const canUpdateEnquiry = useCan("enquiry", "create");
  const canCreateQuotation = useCan("quotation", "create");
  const canReopenLost = canReopenLostEnquiry(currentRole);
  const canWriteEnquiryCreate = allowOperationalWrite(ceoReadOnly, canCreateEnquiry);
  const canWriteEnquiryEdit = allowOperationalWrite(ceoReadOnly, canEditEnquiry);
  const canWriteEnquiryUpdate = allowOperationalWrite(ceoReadOnly, canUpdateEnquiry);
  const canWriteQuotationFromEnquiry = allowOperationalWrite(ceoReadOnly, canCreateQuotation);
  const canWriteReopenLost = allowOperationalWrite(ceoReadOnly, canReopenLost);

  const assignableMembers = useMemo(
    () => getEnquiryAssignableMembers(settingsTeamMembers, employees),
    [settingsTeamMembers, employees],
  );

  const [assigneeFilterIds, setAssigneeFilterIds] = useState<string[]>([]);
  const [assigneeFilterPanelOpen, setAssigneeFilterPanelOpen] = useState(true);
  const [headerSearchExpanded, setHeaderSearchExpanded] = useState(false);

  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("q") ?? "");
  const [statusFilterIds, setStatusFilterIds] = useState(() =>
    parseStatusFilterIdsFromSearchParam(searchParams.get("status")),
  );
  const [priorityFilterIds, setPriorityFilterIds] = useState(() =>
    parsePriorityFilterIdsFromSearchParam(searchParams.get("priority")),
  );
  const salesActorId = memberId.trim() || sessionUserId;
  const [assigneeFilter, setAssigneeFilter] = useState(() => {
    const fromUrl = searchParams.get("assignee");
    if (fromUrl) return fromUrl;
    if (currentRole === "salesperson" && salesActorId) return salesActorId;
    return "all";
  });
  const [followUpFilter, setFollowUpFilter] = useState<"all" | "overdue">(() =>
    searchParams.get("followUp") === "overdue" ? "overdue" : "all",
  );

  useEffect(() => {
    if (currentRole === "salesperson" && salesActorId) {
      setAssigneeFilter(salesActorId);
      return;
    }
    setAssigneeFilter((prev) => {
      if (prev === salesActorId || prev === sessionUserId) return "all";
      return prev;
    });
  }, [currentRole, salesActorId, sessionUserId]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      if (mq.matches) setHeaderSearchExpanded(false);
    };
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        const q = searchQuery.trim();
        if (q) next.set("q", q);
        else next.delete("q");
        if (isOnlyDefaultOpenStatusFilters(statusFilterIds, priorityFilterIds)) {
          next.delete("status");
          next.delete("priority");
        } else {
          if (
            statusFilterIds.length > 0 &&
            !(statusFilterIds.length === 1 && statusFilterIds[0] === DEFAULT_ENQUIRY_STATUS_FILTER)
          ) {
            next.set("status", statusFilterIds.join(","));
          } else {
            next.delete("status");
          }
          if (priorityFilterIds.length > 0) next.set("priority", priorityFilterIds.join(","));
          else next.delete("priority");
        }
        if (assigneeFilter !== "all") next.set("assignee", assigneeFilter);
        else next.delete("assignee");
        if (followUpFilter === "overdue") next.set("followUp", "overdue");
        else next.delete("followUp");
        return next;
      },
      { replace: true },
    );
  }, [searchQuery, statusFilterIds, priorityFilterIds, assigneeFilter, followUpFilter, setSearchParams]);

  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  
  // Modal states
  const [isAddEnquiryOpen, setIsAddEnquiryOpen] = useState(false);
  const [isViewEnquiryOpen, setIsViewEnquiryOpen] = useState(false);
  const [isEditEnquiryOpen, setIsEditEnquiryOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isScheduleMeetingOpen, setIsScheduleMeetingOpen] = useState(false);
  const [meetingSheetMode, setMeetingSheetMode] = useState<"schedule" | "reschedule">("schedule");
  const [isMarkLostReasonOpen, setIsMarkLostReasonOpen] = useState(false);
  const [lostReasonText, setLostReasonText] = useState("");
  const [isReopenEnquiryOpen, setIsReopenEnquiryOpen] = useState(false);
  const [reopenReasonText, setReopenReasonText] = useState("");
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  
  const { value: createFormData, setValue: setCreateFormData, clearDraft: clearCreateDraft } = useFormDraft(
    ENQUIRY_CREATE_DRAFT_KEY,
    emptyEnquiryCreateForm(),
  );
  const [editFormData, setEditFormData] = useState<EnquiryCreateFormData>(emptyEnquiryCreateForm);
  const [assignTo, setAssignTo] = useState("");
  const [noteText, setNoteText] = useState("");
  const [notePersonId, setNotePersonId] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingNotes, setMeetingNotes] = useState("");
  const [shareMethod, setShareMethod] = useState<"whatsapp" | "email">("whatsapp");

  useEffect(() => {
    const cid = searchParams.get("fromCustomer");
    if (!cid) return;
    const c = customers.find((x) => x.id === cid);
    if (!c) {
      toast({ title: "Customer not found", description: "Check the link or pick the customer again.", variant: "destructive" });
      setSearchParams(
        (p) => {
          const n = new URLSearchParams(p);
          n.delete("fromCustomer");
          return n;
        },
        { replace: true },
      );
      return;
    }
    setCreateFormData((fd) => ({
      ...fd,
      customerName: c.name,
      customerPhone: c.phone || "",
      customerEmail: c.email || "",
      customerAddress: c.address || "",
      customerType: c.type === "company" ? "company" : "individual",
    }));
    setIsAddEnquiryOpen(true);
    setSearchParams(
      (p) => {
        const n = new URLSearchParams(p);
        n.delete("fromCustomer");
        return n;
      },
      { replace: true },
    );
  }, [searchParams, customers, setSearchParams]);

  useEffect(() => {
    const parsed = parseCreateFromParam(searchParams.get("createFrom"));
    if (parsed?.kind !== "agent") return;
    const agent = resolveCreateFromOrToast("agent", parsed.id, (entityId) =>
      agents.find((a) => a.id === entityId),
    );
    if (!agent) {
      setSearchParams((p) => {
        const n = new URLSearchParams(p);
        stripCreateFromParam(n);
        return n;
      }, { replace: true });
      return;
    }
    const draft = buildAgentToEnquiryDraft(agent);
    setCreateFormData((fd) => ({
      ...fd,
      agentId: draft.agentId,
      customerPhone: draft.customerPhone || fd.customerPhone,
      source: draft.source,
      requirements: draft.notes ?? fd.requirements,
    }));
    setIsAddEnquiryOpen(true);
    setSearchParams((p) => {
      const n = new URLSearchParams(p);
      stripCreateFromParam(n);
      return n;
    }, { replace: true });
  }, [searchParams, agents, setSearchParams]);

  const resetCreateForm = () => {
    clearCreateDraft();
    setSelectedEnquiry(null);
  };

  useEffect(() => {
    if (searchParams.get("create") !== "1") return;
    const next = new URLSearchParams(searchParams);
    stripQuickCreateParam(next);
    setSearchParams(next, { replace: true });
    if (!canCreateEnquiry) return;
    resetCreateForm();
    setIsAddEnquiryOpen(true);
  }, [searchParams, setSearchParams, canCreateEnquiry]);

  const resetEditForm = () => {
    setEditFormData(emptyEnquiryCreateForm());
    setSelectedEnquiry(null);
  };

  const hiddenByOpenFilterCount = useMemo(
    () => countEnquiriesHiddenByOpenFilter(enquiries),
    [enquiries],
  );

  const filterCounts = useMemo(
    () => countEnquiriesByListFilterKey(enquiries, quotations),
    [enquiries, quotations],
  );

  const onlyDefaultOpenFilters = isOnlyDefaultOpenStatusFilters(statusFilterIds, priorityFilterIds);

  const hasActiveListFilters = hasNonDefaultEnquiryListFilters({
    searchQuery,
    statusFilterIds,
    priorityFilterIds,
    assigneeFilterIds,
    followUpFilter,
  });

  const clearAllEnquiryFilters = useCallback(() => {
    const cleared = clearEnquiryListFilters();
    setSearchQuery(cleared.searchQuery);
    setStatusFilterIds(cleared.statusFilterIds);
    setPriorityFilterIds(cleared.priorityFilterIds);
    setAssigneeFilter(cleared.assigneeFilter);
    setAssigneeFilterIds([]);
    setFollowUpFilter("all");
    setTablePage(1);
  }, []);

  const filteredEnquiries = useMemo(
    () =>
      filterEnquiriesForList(enquiries, {
        searchQuery,
        statusFilterIds,
        priorityFilterIds,
        assigneeFilter,
        assigneeFilterIds,
        followUpFilter,
        quotations,
      }),
    [
      enquiries,
      quotations,
      searchQuery,
      statusFilterIds,
      priorityFilterIds,
      assigneeFilter,
      assigneeFilterIds,
      followUpFilter,
    ],
  );

  const showAllEnquiries = () => {
    setStatusFilterIds(["all"]);
    setPriorityFilterIds([]);
    setTablePage(1);
  };

  const enquiryTotalPages = Math.max(1, Math.ceil(filteredEnquiries.length / tablePageSize) || 1);
  const safeEnquiryPage = Math.min(tablePage, enquiryTotalPages);
  const pagedEnquiries = filteredEnquiries.slice(
    (safeEnquiryPage - 1) * tablePageSize,
    safeEnquiryPage * tablePageSize
  );
  useEffect(() => {
    setTablePage((p) => Math.min(p, enquiryTotalPages));
  }, [enquiryTotalPages]);

  useEffect(() => {
    const stateEnquiryId = (location.state as { focusEnquiryId?: string } | null)?.focusEnquiryId;
    const openId = searchParams.get("open") ?? stateEnquiryId ?? null;
    if (!openId) return;
    const found = enquiries.find((e) => e.id === openId);
    if (!found) {
      if (enquiries.length > 0) {
        if (searchParams.get("open")) {
          setSearchParams(
            (prev) => {
              const next = new URLSearchParams(prev);
              next.delete("open");
              return next;
            },
            { replace: true },
          );
        }
        if (stateEnquiryId) {
          navigate(location.pathname + location.search, { replace: true, state: {} });
        }
        toast({ title: "Enquiry not found", description: `No enquiry matches id ${openId}.`, variant: "destructive" });
      }
      return;
    }
    setSelectedEnquiry(found);
    setIsViewEnquiryOpen(true);
    if (searchParams.get("open")) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("open");
          return next;
        },
        { replace: true },
      );
    }
    if (stateEnquiryId) {
      navigate(location.pathname + location.search, { replace: true, state: {} });
    }
  }, [enquiries, searchParams, setSearchParams, location.pathname, location.search, location.state, navigate]);

  // Keep detail sheet in sync after schedule meeting / notes / status updates.
  useEffect(() => {
    if (!selectedEnquiry) return;
    const fresh = enquiries.find((e) => e.id === selectedEnquiry.id);
    if (fresh) setSelectedEnquiry(fresh);
  }, [enquiries, selectedEnquiry?.id]);

  const isStatusChipActive = useCallback(
    (id: string) =>
      statusFilterIds.length === 0
        ? id === DEFAULT_ENQUIRY_STATUS_FILTER
        : statusFilterIds.includes(id),
    [statusFilterIds],
  );

  const toggleStatusFilterId = useCallback((id: string) => {
    setStatusFilterIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return [...prev, id];
    });
    setTablePage(1);
  }, []);

  const togglePriorityFilterId = useCallback((id: string) => {
    setPriorityFilterIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
    setTablePage(1);
  }, []);

  const enquiryKpiFilterItems = useMemo(
    () => [
      {
        label: "Open",
        value: filterCounts.open,
        active: isStatusChipActive(DEFAULT_ENQUIRY_STATUS_FILTER),
        onClick: () => toggleStatusFilterId(DEFAULT_ENQUIRY_STATUS_FILTER),
      },
      {
        label: "All",
        value: filterCounts.all,
        active: isStatusChipActive("all"),
        onClick: () => toggleStatusFilterId("all"),
      },
      {
        label: "New",
        value: filterCounts.new,
        active: isStatusChipActive("new"),
        onClick: () => toggleStatusFilterId("new"),
      },
      {
        label: "Meeting",
        value: filterCounts.meeting_scheduled,
        active: isStatusChipActive("meeting_scheduled"),
        onClick: () => toggleStatusFilterId("meeting_scheduled"),
      },
      {
        label: "Quote draft",
        value: filterCounts.quotation_draft,
        active: isStatusChipActive("quotation_draft"),
        onClick: () => toggleStatusFilterId("quotation_draft"),
      },
      {
        label: "Quote sent",
        value: filterCounts.quotation_sent,
        active: isStatusChipActive("quotation_sent"),
        onClick: () => toggleStatusFilterId("quotation_sent"),
      },
      {
        label: "Rejected",
        value: filterCounts.quotation_rejected,
        active: isStatusChipActive("quotation_rejected"),
        onClick: () => toggleStatusFilterId("quotation_rejected"),
      },
      {
        label: "Converted",
        value: filterCounts.converted,
        active: isStatusChipActive("converted"),
        onClick: () => toggleStatusFilterId("converted"),
      },
      {
        label: "Lost",
        value: filterCounts.lost,
        active: isStatusChipActive("lost"),
        onClick: () => toggleStatusFilterId("lost"),
      },
      {
        label: "Archived",
        value: filterCounts.archived,
        active: isStatusChipActive("archived"),
        onClick: () => toggleStatusFilterId("archived"),
      },
      {
        label: "High",
        value: enquiries.filter(
          (e) => e.priority === "high" && e.status !== "converted" && e.status !== "lost",
        ).length,
        active: priorityFilterIds.includes("high"),
        onClick: () => togglePriorityFilterId("high"),
      },
      {
        label: "Medium",
        value: enquiries.filter((e) => e.priority === "medium").length,
        active: priorityFilterIds.includes("medium"),
        onClick: () => togglePriorityFilterId("medium"),
      },
      {
        label: "Low",
        value: enquiries.filter((e) => e.priority === "low").length,
        active: priorityFilterIds.includes("low"),
        onClick: () => togglePriorityFilterId("low"),
      },
    ],
    [
      enquiries,
      filterCounts,
      isStatusChipActive,
      priorityFilterIds,
      togglePriorityFilterId,
      toggleStatusFilterId,
    ],
  );

const formatCapacityInput = (capacity: string) => {
  const trimmed = capacity.trim();
  if (!trimmed) return trimmed;
  const numeric = Number.parseFloat(trimmed);
  return Number.isFinite(numeric) && String(numeric) === trimmed ? `${trimmed}kW` : trimmed;
};

  const getStatusBadge = (enquiry: Enquiry) => {
    const displayStatus = getEnquiryDisplayStatus(enquiry, quotations);
    return (
      <StatusBadge status={displayStatus} label={formatEnquiryStatusLabel(displayStatus)} />
    );
  };

  const getPriorityBadge = (priority: Enquiry["priority"]) => (
    <Badge variant="outline" className={`border-0 capitalize ${getPriorityColor(priority)}`}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </Badge>
  );

  // Handlers
  const handleAddEnquiry = async () => {
    if (!createFormData.customerName || !createFormData.customerPhone) {
      toast({ title: "Error", description: "Name and phone are required", variant: "destructive" });
      return;
    }
    const phAdd = validateContactPhone(createFormData.customerPhone);
    if (!phAdd.ok) {
      toast({ title: "Invalid phone", description: (phAdd as { message: string }).message, variant: "destructive" });
      return;
    }

    if (createFormData.source === "referral" && !createFormData.agentId) {
      toast({ title: "Error", description: "Please select an agent for the referral", variant: "destructive" });
      return;
    }

    const finalCapacity = formatCapacityInput(createFormData.systemCapacity);

    const newEnquiry: Enquiry = {
      id: `ENQ-${new Date().getFullYear()}-${String(enquiries.length + 1).padStart(3, '0')}`,
      ...createFormData,
      agentId: createFormData.agentId || undefined,
      systemCapacity: finalCapacity,
      estimatedBudget: parseFloat(createFormData.estimatedBudget) || 0,
      followUpDate: createFormData.followUpDate || undefined,
      status: "new",
      assignedTo: "",
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      notes: [],
    };

    const result = await addEnquiry(newEnquiry);
    if (!result.ok) {
      toast({
        title: "Could not add enquiry",
        description: friendlyCommandErrorMessage(result.error, "Command failed"),
        variant: "destructive",
      });
      return;
    }
    setIsAddEnquiryOpen(false);
    resetCreateForm();
    toast({ title: "Enquiry Added", description: `${newEnquiry.id} has been created` });
  };

  const handleSaveEdit = async () => {
    if (!selectedEnquiry || !editFormData.customerName || !editFormData.customerPhone) {
      toast({ title: "Error", description: "Name and phone are required", variant: "destructive" });
      return;
    }
    const phEdit = validateContactPhone(editFormData.customerPhone);
    if (!phEdit.ok) {
      toast({ title: "Invalid phone", description: (phEdit as { message: string }).message, variant: "destructive" });
      return;
    }
    
    if (editFormData.source === "referral" && !editFormData.agentId) {
      toast({ title: "Error", description: "Please select an agent for the referral", variant: "destructive" });
      return;
    }

    const finalCapacity = formatCapacityInput(editFormData.systemCapacity);

    const result = await updateEnquiry(selectedEnquiry.id, {
      customerName: editFormData.customerName,
      customerPhone: editFormData.customerPhone,
      customerEmail: editFormData.customerEmail,
      customerAddress: editFormData.customerAddress,
      customerType: editFormData.customerType,
      source: editFormData.source,
      agentId: editFormData.agentId || undefined,
      systemCapacity: finalCapacity,
      estimatedBudget: parseFloat(editFormData.estimatedBudget) || 0,
      requirements: editFormData.requirements,
      priority: editFormData.priority,
      followUpDate: editFormData.followUpDate || undefined,
      updatedAt: new Date().toISOString().split('T')[0],
    });
    if (!result.ok) {
      toast({
        title: "Could not save enquiry",
        description: friendlyCommandErrorMessage(result.error, "Update failed"),
        variant: "destructive",
      });
      return;
    }

    setIsEditEnquiryOpen(false);
    resetEditForm();
    toast({ title: "Enquiry Updated", description: "Changes have been saved" });
  };

  const handleOpenEdit = (enquiry: Enquiry) => {
    setSelectedEnquiry(enquiry);
    setEditFormData({
      customerName: enquiry.customerName,
      customerPhone: enquiry.customerPhone,
      customerEmail: enquiry.customerEmail,
      customerAddress: enquiry.customerAddress,
      customerType: enquiry.customerType,
      source: enquiry.source,
      agentId: enquiry.agentId || "",
      systemCapacity: enquiry.systemCapacity,
      estimatedBudget: enquiry.estimatedBudget.toString(),
      requirements: enquiry.requirements,
      priority: enquiry.priority,
      followUpDate: enquiry.followUpDate || "",
    });
    setIsEditEnquiryOpen(true);
  };

  const handleAssign = async () => {
    if (!selectedEnquiry || !assignTo) return;
    
    const result = await updateEnquiry(selectedEnquiry.id, {
      ...buildEnquiryAssignmentFromAssignableId(assignTo, settingsTeamMembers, employees),
      updatedAt: new Date().toISOString().split("T")[0],
    });
    if (!result.ok) {
      toast({
        title: "Could not assign",
        description: friendlyCommandErrorMessage(result.error, "Update failed"),
        variant: "destructive",
      });
      return;
    }

    // Assigning no longer auto-transitions status; "new" stays "new" until a meeting is scheduled,
    // a quotation is sent, or the lead is converted/lost.
    
    setIsAssignOpen(false);
    setAssignTo("");
    const assigneeName = getEnquiryAssigneeDisplayName(
      buildEnquiryAssignmentFromAssignableId(assignTo, settingsTeamMembers, employees),
      settingsTeamMembers,
    );
    toast({ title: "Assigned", description: `Enquiry assigned to ${assigneeName || assignTo}` });
  };

  const handleAddNote = async () => {
    if (!selectedEnquiry || !noteText) return;
    
    const personName = notePersonId 
      ? (notePersonId === "admin" ? "Admin" : employees.find(e => e.id.toString() === notePersonId)?.name || "Unknown")
      : "";
    
    const updatedByName = (() => { try { const p = JSON.parse(localStorage.getItem("mss.settings.profile") || "{}"); return [p.firstName, p.lastName].filter(Boolean).join(" ") || "Admin"; } catch { return "Admin"; } })();
    
    const newNote = {
      date: new Date().toISOString().split('T')[0],
      note: noteText,
      by: personName,
      updatedBy: updatedByName,
    };
    
    const result = await updateEnquiry(selectedEnquiry.id, { 
      notes: [newNote, ...(selectedEnquiry.notes ?? [])], 
      updatedAt: new Date().toISOString().split('T')[0] 
    });
    if (!result.ok) {
      toast({
        title: "Could not add note",
        description: friendlyCommandErrorMessage(result.error, "Update failed"),
        variant: "destructive",
      });
      return;
    }
    
    setIsAddNoteOpen(false);
    setNoteText("");
    setNotePersonId("");
    toast({ title: "Note Added", description: "Follow-up note has been saved" });
  };

  const handleMarkAsLost = () => {
    if (!selectedEnquiry) return;
    if (
      selectedEnquiry.status === "quotation_sent" ||
      selectedEnquiry.status === "quotation_rejected"
    ) {
      setLostReasonText("");
      setIsMarkLostReasonOpen(true);
      return;
    }
    void submitMarkAsLost();
  };

  const submitMarkAsLost = async (reason?: string) => {
    if (!selectedEnquiry) return;
    const result = await transitionEnquiryStatus(selectedEnquiry.id, "lost", reason);
    if (result.ok) {
      if (reason) {
        const lostPatch = await updateEnquiry(selectedEnquiry.id, {
          lostReason: reason,
          updatedAt: new Date().toISOString().split('T')[0],
        });
        if (!lostPatch.ok) {
          toast({
            title: "Status updated; reason not saved",
            description: friendlyCommandErrorMessage(lostPatch.error, "Could not save lost reason"),
            variant: "destructive",
          });
        }
      }
      toast({ title: "Lead Lost", description: "Enquiry marked as lost" });
      setIsMarkLostReasonOpen(false);
      setIsViewEnquiryOpen(false);
    } else {
      toast({
        title: "Could not mark lost",
        description: friendlyCommandErrorMessage(result.error, "Invalid transition"),
        variant: "destructive",
      });
    }
  };

  const handleConfirmLostWithReason = () => {
    const trimmed = trimEnquiryReason(lostReasonText);
    if (!isEnquiryTerminalReasonValid(trimmed)) {
      toast({
        title: "Reason required",
        description: enquiryTerminalReasonRequiredMessage(),
        variant: "destructive",
      });
      return;
    }
    void submitMarkAsLost(trimmed);
  };

  const handleReopenEnquiry = async () => {
    if (!selectedEnquiry) return;
    const trimmed = trimEnquiryReason(reopenReasonText);
    if (!isEnquiryTerminalReasonValid(trimmed)) {
      toast({
        title: "Reason required",
        description: enquiryTerminalReasonRequiredMessage(),
        variant: "destructive",
      });
      return;
    }
    const result = await transitionEnquiryStatus(selectedEnquiry.id, "new", trimmed);
    if (result.ok) {
      toast({ title: "Enquiry Reopened", description: "Lead has been moved back to New." });
      setIsReopenEnquiryOpen(false);
      setReopenReasonText("");
    } else {
      toast({
        title: "Could not reopen",
        description: friendlyCommandErrorMessage(
          result.error,
          "Only admins can reopen lost enquiries.",
        ),
        variant: "destructive",
      });
    }
  };

  const openScheduleMeetingSheet = (mode: "schedule" | "reschedule" = "schedule") => {
    if (!selectedEnquiry) return;
    const existingDate = selectedEnquiry.meetingDate?.trim();
    setMeetingSheetMode(mode);
    setMeetingDate(existingDate ? existingDate.slice(0, 10) : "");
    setMeetingNotes(selectedEnquiry.meetingNotes ?? "");
    setIsScheduleMeetingOpen(true);
  };

  const handleScheduleMeeting = async () => {
    if (!selectedEnquiry || !meetingDate) return;
    
    const meetResult = await updateEnquiry(selectedEnquiry.id, { 
      meetingDate, 
      meetingNotes, 
      updatedAt: new Date().toISOString().split('T')[0] 
    });
    if (!meetResult.ok) {
      toast({
        title: "Could not save meeting",
        description: friendlyCommandErrorMessage(meetResult.error, "Update failed"),
        variant: "destructive",
      });
      return;
    }
    if (selectedEnquiry.status !== "meeting_scheduled") {
      const statusResult = await transitionEnquiryStatus(selectedEnquiry.id, "meeting_scheduled");
      if (!statusResult.ok) {
        toast({
          title: "Meeting saved; status not updated",
          description: friendlyCommandErrorMessage(statusResult.error, "Invalid transition"),
          variant: "destructive",
        });
        return;
      }
    }

    setIsScheduleMeetingOpen(false);
    setMeetingDate("");
    setMeetingNotes("");
    toast({
      title: meetingSheetMode === "reschedule" ? "Meeting rescheduled" : "Meeting scheduled",
      description: `Meeting set for ${meetingDate}`,
    });
  };

  const toggleAssigneeFilterId = (id: string) => {
    setAssigneeFilterIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
    setTablePage(1);
  };

  const handleShare = async () => {
    if (!selectedEnquiry) return;

    if (shareMethod === "whatsapp") {
      const phoneCheck = validateContactPhone(selectedEnquiry.customerPhone);
      if (!phoneCheck.ok) {
        toast({
          title: "Cannot share via WhatsApp",
          description: phoneCheck.message,
          variant: "destructive",
        });
        return;
      }
    } else if (!selectedEnquiry.customerEmail?.trim()) {
      toast({
        title: "Cannot share via email",
        description: "Add a customer email on this enquiry first.",
        variant: "destructive",
      });
      return;
    }

    const shareEntry = {
      method: shareMethod as EnquiryShareMethod,
      contactValue:
        shareMethod === "whatsapp"
          ? selectedEnquiry.customerPhone.trim()
          : selectedEnquiry.customerEmail.trim(),
      sentAt: new Date().toISOString(),
    };

    const actorDisplayName = resolveAuditActorUserName({
      actor: { actorUserId: sessionUserId, actorRole: currentRole },
      settingsTeamMembers,
      demoUserName,
    });

    const activityNote = buildEnquiryShareActivityNote(shareEntry, actorDisplayName);
    const result = await updateEnquiry(selectedEnquiry.id, {
      shareHistory: [...(selectedEnquiry.shareHistory ?? []), shareEntry],
      notes: [activityNote, ...(selectedEnquiry.notes ?? [])],
      updatedAt: new Date().toISOString().split("T")[0],
    });

    if (!result.ok) {
      toast({
        title: "Could not record share",
        description: friendlyCommandErrorMessage(result.error, "Update failed"),
        variant: "destructive",
      });
      return;
    }

    const message = buildEnquiryShareMessage(selectedEnquiry);
    openEnquiryShareExternalLink(selectedEnquiry, shareMethod, message);

    setSelectedEnquiry({
      ...selectedEnquiry,
      shareHistory: [...(selectedEnquiry.shareHistory ?? []), shareEntry],
      notes: [activityNote, ...(selectedEnquiry.notes ?? [])],
      updatedAt: new Date().toISOString().split("T")[0],
    });

    setIsShareOpen(false);
    toast({
      title: "Enquiry shared",
      description: `Logged and opened ${formatEnquiryShareMethodLabel(shareMethod)}`,
    });
  };

  const handleCreateQuotation = (enquiry: Enquiry) => {
    const gate = assertCanLinkNewQuotationToEnquiry(enquiry, currentRole);
    if (!gate.ok) {
      toast({ title: "Cannot create quotation", description: gate.message, variant: "destructive" });
      return;
    }
    const draft = buildEnquiryToQuotationDraft(enquiry);
    saveCreateDraft("quotation-create-draft", draft);
    navigate(`/quotations?createFrom=enq:${enquiry.id}`);
  };

  const handleSendQuotation = async (enquiry: Enquiry) => {
    const result = await executeEnquirySendQuotation(enquiry, {
      transitionEnquiryStatus,
      transitionQuotationStatus,
      quotations,
    });
    if (!result.ok) {
      toast({
        title: "Could not send quotation",
        description: friendlyCommandErrorMessage(result.error, "Invalid transition"),
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Quotation sent",
      description: "Enquiry and linked quotation are marked sent. Mark as Converted once the customer confirms.",
    });
  };

  const selectedEnquiryActions = useMemo(() => {
    if (!selectedEnquiry) return null;
    return getEnquiryViewActions(selectedEnquiry, quotations, currentRole);
  }, [selectedEnquiry, quotations, currentRole]);

  const handleConvertEnquiry = async (enquiry: Enquiry) => {
    const result = await convertEnquiryToCustomer(enquiry.id);
    if (!result.ok) {
      toast({ 
        title: "Conversion Failed", 
        description: friendlyCommandErrorMessage(result.error, "Could not convert enquiry"),
        variant: "destructive" 
      });
      return;
    }
    
    toast({
      title: "Enquiry converted",
      description: result.customerId
        ? `Customer ${result.customerId} linked. Start a project from an approved quotation on the Projects page.`
        : "Marked as converted. Start a project from an approved quotation on the Projects page.",
    });
  };

  const _handleStatusChange = async (enquiryId: string, newStatus: Enquiry["status"]) => {
    const result = await transitionEnquiryStatus(enquiryId, newStatus);
    if (!result.ok) {
      toast({
        title: "Invalid Transition",
        description: friendlyCommandErrorMessage(result.error, "Status change not allowed"),
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Status Updated", description: `Enquiry status changed to ${newStatus}` });
  };

  return (
    <PageShell className="space-y-4 md:space-y-5">
      <StickyPageHeader
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Enquiries" }]}
        subRow={
          <div className="flex w-full min-w-0 items-stretch gap-3">
            <EnquiryFilterStrip
              className={cn("min-h-0 flex-1", headerSearchExpanded && "hidden")}
              assigneePanelOpen={assigneeFilterPanelOpen}
              assigneeSelectedCount={assigneeFilterIds.length}
              onToggleAssigneePanel={() => setAssigneeFilterPanelOpen((o) => !o)}
              assigneeBar={
                <EnquiryListAssigneeBar
                  members={assignableMembers}
                  selectedIds={assigneeFilterIds}
                  onToggle={toggleAssigneeFilterId}
                  onClear={() => {
                    setAssigneeFilterIds([]);
                    setTablePage(1);
                  }}
                  onClearAllFilters={clearAllEnquiryFilters}
                  showClearAllFilters={hasActiveListFilters}
                />
              }
            >
              <InlineKpiStrip
                singleRow
                className="!items-center !overflow-x-visible min-w-0 flex-1 !border-0 !bg-transparent !p-0"
                items={enquiryKpiFilterItems}
              />
            </EnquiryFilterStrip>
            <EnquiryHeaderActionsPanel
              className={cn(
                "ml-auto",
                headerSearchExpanded ? "min-w-0 flex-1" : "w-14 lg:w-64",
              )}
              searchExpanded={headerSearchExpanded}
              onSearchExpand={() => setHeaderSearchExpanded(true)}
              onSearchCollapse={() => setHeaderSearchExpanded(false)}
              searchQuery={searchQuery}
              onSearchChange={(value) => {
                setSearchQuery(value);
                setTablePage(1);
              }}
              onAddEnquiry={() => {
                resetCreateForm();
                setIsAddEnquiryOpen(true);
              }}
              addDisabled={!canWriteEnquiryCreate}
            />
          </div>
        }
      />

        <DataTableShell
            maxHeight={listTableViewportMaxHeight(tablePageSize)}
            scrollResetKey={`${safeEnquiryPage}-${tablePageSize}-${filteredEnquiries.length}`}
            footer={
              <TablePaginationBar
                page={safeEnquiryPage}
                pageSize={tablePageSize}
                total={filteredEnquiries.length}
                onPageChange={setTablePage}
                onPageSizeChange={(n) => {
                  setTablePageSize(n);
                  setTablePage(1);
                }}
              />
            }
          >
            <TableHeader>
              <TableRow className={dataTableClasses.headRow}>
                <TableHead>Customer</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>System (kW)</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead>Meeting</TableHead>
                <TableHead>Follow-up</TableHead>
                <TableHead className="text-right w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedEnquiries.map((enquiry) => (
                <TableRow 
                  key={enquiry.id} 
                  className="hover:bg-muted/40 cursor-pointer"
                  onClick={() => {
                    setSelectedEnquiry(enquiry);
                    setIsViewEnquiryOpen(true);
                  }}
                >
                  <TableCell>
                    <div className="flex items-start gap-2 min-w-0 max-w-[220px]">
                      <Avatar className="h-8 w-8 border border-primary/20 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {enquiry.customerType === "company" ? <Building2 className="h-4 w-4" /> : enquiry.customerName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          {enquiry.customerId ? (
                            <EntityLink
                              entityType="customer"
                              entityId={enquiry.customerId}
                              name={enquiry.customerName}
                              className="truncate"
                            />
                          ) : (
                            <p className="font-medium truncate">{enquiry.customerName}</p>
                          )}
                          <AgingChip signal={getEnquiryFollowUpAging(enquiry)} />
                        </div>
                        {enquiry.customerAddress && (
                          <p className="text-xs text-muted-foreground truncate" title={enquiry.customerAddress}>
                            {enquiry.customerAddress}
                          </p>
                        )}
                        {getEnquiryViewActions(enquiry, quotations, currentRole).showCreateQuotation &&
                          enquiry.status === "quotation_rejected" && (
                          <div
                            className="mt-1.5 flex flex-wrap items-center gap-2 rounded-md border border-orange-200/80 bg-orange-50/90 px-2 py-1 text-xs text-orange-900"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span>Previous quote rejected or withdrawn — re-quote when ready.</span>
                            <PermissionGatedButton
                              allowed={canWriteQuotationFromEnquiry}
                              deniedHint={PERMISSION_DENIED_HINTS.enquiryCreateQuotation}
                              type="button"
                              variant="link"
                              className="h-auto p-0 text-xs font-semibold text-orange-900"
                              onClick={() => handleCreateQuotation(enquiry)}
                            >
                              Create quotation
                            </PermissionGatedButton>
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {enquiry.agentId ? (agents.find(a => a.id === enquiry.agentId)?.name || "Unknown Agent") : "N/A"}
                      </span>
                      {enquiry.agentId && (
                        <span className="text-2xs text-muted-foreground uppercase tracking-wider font-semibold">Agent</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">{enquiry.customerPhone}</TableCell>
                  <TableCell>{getStatusBadge(enquiry)}</TableCell>
                  <TableCell>{getPriorityBadge(enquiry.priority)}</TableCell>
                  <TableCell className="font-medium">{enquiry.systemCapacity || "—"}</TableCell>
                  <TableCell className="text-primary font-medium">{formatINR(enquiry.estimatedBudget)}</TableCell>
                  <TableCell >
                    {getEnquiryAssigneeDisplayName(enquiry, settingsTeamMembers, employees) || (
                      <span className="text-warning">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {enquiry.meetingDate ? (
                      <span className="inline-flex items-center gap-1" title={enquiry.meetingNotes || undefined}>
                        <Calendar className="h-3.5 w-3.5 shrink-0 text-purple-600" aria-hidden />
                        {formatEnquiryDisplayDate(enquiry.meetingDate)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {enquiry.followUpDate
                      ? formatEnquiryDisplayDate(enquiry.followUpDate)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end items-center">
                      <ChevronDown className="h-4 w-4 text-muted-foreground/50" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </DataTableShell>

      {filteredEnquiries.length === 0 && (
        <ListEmptyState
          icon={MessageCircle}
          title={
            enquiries.length === 0
              ? "No enquiries yet"
              : onlyDefaultOpenFilters && hiddenByOpenFilterCount > 0 && !searchQuery.trim()
                ? "No open enquiries in the list"
                : "No enquiries match the current filters"
          }
          description={
            enquiries.length === 0
              ? "Create an enquiry to start the sales pipeline."
              : onlyDefaultOpenFilters && hiddenByOpenFilterCount > 0 && !searchQuery.trim()
                ? `${hiddenByOpenFilterCount} converted or lost ${
                    hiddenByOpenFilterCount === 1 ? "enquiry is" : "enquiries are"
                  } hidden while the Open filter is on. Show all to find them.`
                : "Try clearing filters or adjusting your search."
          }
          actionLabel={
            enquiries.length === 0 && canWriteEnquiryCreate
              ? "Add your first enquiry"
              : enquiries.length === 0
                ? undefined
                : onlyDefaultOpenFilters && hiddenByOpenFilterCount > 0 && !searchQuery.trim()
                  ? "Show all enquiries"
                  : "Clear filters"
          }
          onAction={
            enquiries.length === 0 && canWriteEnquiryCreate
              ? () => {
                  resetCreateForm();
                  setIsAddEnquiryOpen(true);
                }
              : enquiries.length > 0
                ? () => {
                    if (onlyDefaultOpenFilters && hiddenByOpenFilterCount > 0 && !searchQuery.trim()) {
                      showAllEnquiries();
                      return;
                    }
                    clearAllEnquiryFilters();
                    setAssigneeFilterPanelOpen(true);
                  }
                : undefined
          }
        />
      )}

      {/* Add Enquiry Modal */}
      <Sheet open={isAddEnquiryOpen} onOpenChange={setIsAddEnquiryOpen}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle>Add New Enquiry</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer Name *</Label>
                <Input 
                  value={createFormData.customerName} 
                  onChange={(e) => setCreateFormData({ ...createFormData, customerName: e.target.value })} 
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input 
                  value={createFormData.customerPhone} 
                  onChange={(e) => setCreateFormData({ ...createFormData, customerPhone: e.target.value })} 
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                  type="email"
                  value={createFormData.customerEmail} 
                  onChange={(e) => setCreateFormData({ ...createFormData, customerEmail: e.target.value })} 
                  placeholder="email@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select 
                  value={createFormData.customerType} 
                  onValueChange={(v: "individual" | "company") => setCreateFormData({ ...createFormData, customerType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="company">Company</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input 
                value={createFormData.customerAddress} 
                onChange={(e) => setCreateFormData({ ...createFormData, customerAddress: e.target.value })} 
                placeholder="Full address"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Source</Label>
                <Select 
                  value={createFormData.source} 
                  onValueChange={(v: Enquiry["source"]) => setCreateFormData({ ...createFormData, source: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phone">Phone Call</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="walk-in">Walk-in</SelectItem>
                    <SelectItem value="social-media">Social Media</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select 
                  value={createFormData.priority} 
                  onValueChange={(v: Enquiry["priority"]) => setCreateFormData({ ...createFormData, priority: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 max-w-lg">
              <Label>Associated agent</Label>
              <p className="text-xs text-muted-foreground -mt-1">Optional unless source is referral (then pick an agent).</p>
              <Select
                value={createFormData.agentId || "none"}
                onValueChange={(v) =>
                  setCreateFormData({ ...createFormData, agentId: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No agent / direct" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No agent / direct</SelectItem>
                  {agents.filter((a) => (a.status || "").toLowerCase() === "active").map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>System Capacity</Label>
                <Input 
                  value={createFormData.systemCapacity} 
                  onChange={(e) => setCreateFormData({ ...createFormData, systemCapacity: e.target.value })} 
                  placeholder="e.g., 5kW"
                />
              </div>
              <div className="space-y-2">
                <Label>Estimated Budget</Label>
                <Input 
                  type="number"
                  value={createFormData.estimatedBudget} 
                  onChange={(e) => setCreateFormData({ ...createFormData, estimatedBudget: e.target.value })} 
                  placeholder="₹"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Requirements / Notes</Label>
              <Textarea 
                value={createFormData.requirements} 
                onChange={(e) => setCreateFormData({ ...createFormData, requirements: e.target.value })} 
                placeholder="Customer requirements and notes..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Follow-up Date</Label>
              <Input 
                type="date"
                value={createFormData.followUpDate} 
                onChange={(e) => setCreateFormData({ ...createFormData, followUpDate: e.target.value })} 
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsAddEnquiryOpen(false)}>Cancel</Button>
            <Button onClick={handleAddEnquiry}>{formPrimaryLabel("create", "enquiry")}</Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>

      {/* View Enquiry Modal */}
      <Sheet open={isViewEnquiryOpen} onOpenChange={setIsViewEnquiryOpen}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {selectedEnquiry?.id}
              </div>
              <div className="flex items-center gap-1">
                <PermissionGatedButton
                  allowed={canWriteEnquiryUpdate}
                  deniedHint={PERMISSION_DENIED_HINTS.ceoOperationalReadOnly}
                  variant="ghost"
                  size="sm"
                  hideWhenDenied
                  onClick={() => setIsShareOpen(true)}
                >
                  <Share2 className="h-4 w-4 mr-2" />Share
                </PermissionGatedButton>
                {canWriteEnquiryEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (selectedEnquiry) {
                      setIsViewEnquiryOpen(false);
                      handleOpenEdit(selectedEnquiry);
                    }
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                )}
              </div>
            </SheetTitle>
          </SheetHeader>
          <CeoReadOnlySheetBanner className="mt-4 px-1" />
          {selectedEnquiry && (selectedEnquiry.archivedAt || selectedEnquiry.status === "lost") && (
            <div className="mt-4 px-1">
              <LifecycleTerminalBanner
                variant={selectedEnquiry.archivedAt ? "archived" : "terminated"}
                title={selectedEnquiry.archivedAt ? "Enquiry archived" : "Enquiry marked as lost"}
                description={
                  selectedEnquiry.archivedAt
                    ? "This enquiry is archived and hidden from the default pipeline. Unarchive to resume follow-up or create a quotation."
                    : canWriteReopenLost
                      ? "This lead is closed as lost. Reopen it to continue follow-up, or archive it to remove from active lists."
                      : "This lead is closed as lost. Only admin can reopen it; you can archive it to remove from active lists."
                }
                primaryActionLabel={
                  selectedEnquiry.archivedAt
                    ? canWriteEnquiryUpdate
                      ? "Unarchive"
                      : undefined
                    : selectedEnquiry.status === "lost" && canWriteReopenLost
                      ? "Reopen"
                      : undefined
                }
                onPrimaryAction={
                  selectedEnquiry.archivedAt && canWriteEnquiryUpdate
                    ? async () => {
                        const res = await updateEnquiry(selectedEnquiry.id, { archivedAt: null });
                        if (!res.ok) {
                          toast({
                            title: "Could not restore",
                            description: friendlyCommandErrorMessage(res.error, "Update failed"),
                            variant: "destructive",
                          });
                          return;
                        }
                        toast({ title: "Enquiry restored" });
                      }
                    : selectedEnquiry.status === "lost" && canWriteReopenLost
                      ? () => { setReopenReasonText(""); setIsReopenEnquiryOpen(true); }
                      : undefined
                }
                secondaryActionLabel={
                  !selectedEnquiry.archivedAt && selectedEnquiry.status === "lost" && canWriteEnquiryUpdate
                    ? "Archive"
                    : undefined
                }
                onSecondaryAction={
                  !selectedEnquiry.archivedAt && selectedEnquiry.status === "lost" && canWriteEnquiryUpdate
                    ? async () => {
                        const res = await updateEnquiry(selectedEnquiry.id, {
                          archivedAt: new Date().toISOString(),
                        });
                        if (!res.ok) {
                          toast({
                            title: "Could not archive",
                            description: friendlyCommandErrorMessage(res.error, "Update failed"),
                            variant: "destructive",
                          });
                          return;
                        }
                        toast({ title: "Enquiry archived" });
                        setIsViewEnquiryOpen(false);
                      }
                    : undefined
                }
              />
            </div>
          )}
          {selectedEnquiryActions?.showCreateQuotation &&
            selectedEnquiry?.status === "quotation_rejected" && (
            <div className="mt-4 px-1">
              <LifecycleTerminalBanner
                variant="rejected"
                title="Quotation rejected or withdrawn"
                description="The linked quote is no longer active. Create a quotation to re-engage this lead, or mark the enquiry as lost if the opportunity is closed."
                primaryActionLabel={canWriteQuotationFromEnquiry ? "Create quotation" : undefined}
                onPrimaryAction={
                  canWriteQuotationFromEnquiry ? () => handleCreateQuotation(selectedEnquiry) : undefined
                }
              />
            </div>
          )}
          {selectedEnquiry && (
            <div className="flex flex-col h-full">
              <div className="flex-1 space-y-6 pt-6">
                {/* Header Info Card */}
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12 border-2 border-primary/10">
                        <AvatarFallback className="bg-primary/5 text-primary text-lg font-semibold">
                          {selectedEnquiry.customerType === "company" ? <Building2 className="h-6 w-6" /> : selectedEnquiry.customerName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-lg font-semibold leading-tight">{selectedEnquiry.customerName}</h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-2xs uppercase tracking-wider h-5">
                            {selectedEnquiry.customerType}
                          </Badge>
                          {getStatusBadge(selectedEnquiry)}
                          {(() => {
                            const linked = getCurrentLinkedQuotation(selectedEnquiry, quotations);
                            if (linked) {
                              return (
                                <Badge variant="outline" className="text-2xs capitalize">
                                  Quote: {linked.status.replace(/_/g, " ")}
                                </Badge>
                              );
                            }
                            return null;
                          })()}
                          {!enquiryShouldHidePriorityChip(selectedEnquiry, quotations) &&
                            getPriorityBadge(selectedEnquiry.priority)}
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Created {formatEnquiryDisplayDate(selectedEnquiry.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground mb-1 uppercase tracking-tighter">Source</p>
                      <Badge variant="secondary" className="capitalize">{selectedEnquiry.source}</Badge>
                    </div>
                  </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Contact Information */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 group">
                      <div className="p-2 rounded-lg bg-primary/5 text-primary">
                        <Phone className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-2xs text-muted-foreground uppercase tracking-wider">Phone</p>
                        <p className="text-sm font-medium">{selectedEnquiry.customerPhone}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 group">
                      <div className="p-2 rounded-lg bg-primary/5 text-primary">
                        <Mail className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-2xs text-muted-foreground uppercase tracking-wider">Email</p>
                        <p className="text-sm font-medium">{selectedEnquiry.customerEmail || "—"}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 group">
                      <div className="p-2 rounded-lg bg-primary/5 text-primary shrink-0">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-2xs text-muted-foreground uppercase tracking-wider">Address</p>
                        <p className="text-sm font-medium leading-snug">{selectedEnquiry.customerAddress || "—"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Operational Details */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-warning/5 text-warning">
                        <IndianRupee className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-2xs text-muted-foreground uppercase tracking-wider">Budget Estimate</p>
                        <p className="text-sm font-semibold">{formatINR(selectedEnquiry.estimatedBudget)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-accent/5 text-accent-foreground">
                        <Zap className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-2xs text-muted-foreground uppercase tracking-wider">System Capacity</p>
                        <p className="text-sm font-semibold">{selectedEnquiry.systemCapacity || "—"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/5 text-primary">
                        <Filter className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-2xs text-muted-foreground uppercase tracking-wider">Source</p>
                        <p className="text-sm font-medium">
                          {selectedEnquiry.source.charAt(0).toUpperCase() + selectedEnquiry.source.slice(1)}
                          {selectedEnquiry.agentId && (
                            <span className="text-muted-foreground font-normal ml-1">
                              {selectedEnquiry.source === "referral" ? "via " : "— Agent: "}
                              {agents.find((a) => a.id === selectedEnquiry.agentId)?.name ?? "Unknown"}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {(selectedEnquiry.meetingDate || selectedEnquiry.followUpDate) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedEnquiry.meetingDate ? (
                      <div className="p-4 bg-purple-50/80 dark:bg-purple-950/20 rounded-xl border border-purple-200/60 dark:border-purple-800/40 space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-purple-900 dark:text-purple-200 flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5" />
                          Scheduled meeting
                        </h4>
                        <p className="text-sm font-semibold text-purple-950 dark:text-purple-100">
                          {formatEnquiryDisplayDate(selectedEnquiry.meetingDate)}
                        </p>
                        {selectedEnquiry.meetingNotes?.trim() ? (
                          <p className="text-sm text-purple-900/80 dark:text-purple-200/80 leading-relaxed">
                            {selectedEnquiry.meetingNotes}
                          </p>
                        ) : (
                          <p className="text-xs text-purple-800/70 dark:text-purple-300/70 italic">No meeting notes</p>
                        )}
                      </div>
                    ) : null}
                    {selectedEnquiry.followUpDate ? (
                      <div className="p-4 bg-muted/30 rounded-xl border border-border/50 space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5" />
                          Follow-up due
                        </h4>
                        <p className="text-sm font-semibold">{formatEnquiryDisplayDate(selectedEnquiry.followUpDate)}</p>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Requirements */}
                <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                    <FileText className="h-3 w-3" />
                    Customer Requirements
                  </h4>
                  <p className="text-sm text-foreground/80 leading-relaxed italic">
                    "{selectedEnquiry.requirements || "No specific requirements provided."}"
                  </p>
                </div>

                {(selectedEnquiry.shareHistory?.length ?? 0) > 0 ? (
                  <div className="p-4 bg-muted/30 rounded-xl border border-border/50 space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Share2 className="h-3 w-3" />
                      Share history
                    </h4>
                    <ul className="space-y-2">
                      {selectedEnquiry.shareHistory.map((entry, idx) => (
                        <li key={`${entry.sentAt}-${idx}`} className="text-sm flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-2xs capitalize">
                            {formatEnquiryShareMethodLabel(entry.method)}
                          </Badge>
                          {entry.contactValue ? (
                            <span className="text-muted-foreground">{entry.contactValue}</span>
                          ) : null}
                          <time className="text-2xs text-muted-foreground ml-auto">
                            {entry.sentAt.split("T")[0]}
                          </time>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {/* Status History */}
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    Status history
                  </h4>
                  <div className="space-y-4 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1px] before:bg-border/60">
                    {buildEnquiryStatusHistory(selectedEnquiry, quotations).map((e, idx) => {
                      const toneClass: Record<string, string> = {
                        primary: "border-primary/20 text-primary/80",
                        blue: "border-primary/20 text-primary",
                        teal: "border-primary/20 text-primary",
                        green: "border-success/20 text-success",
                        destructive: "border-destructive/20 text-destructive",
                        muted: "border-muted/40 text-muted-foreground",
                        orange: "border-warning/30 text-warning",
                      };
                      return (
                        <div key={`${e.label}-${idx}`} className="relative pl-8 group">
                          <div
                            className={`absolute left-0 top-[6px] h-3 w-3 rounded-full border-2 bg-background z-10 ${toneClass[e.tone] || "border-muted"}`}
                          />
                          <div className="p-3 bg-muted/20 rounded-lg border border-border/40">
                            <div className="flex items-start justify-between mb-1">
                              <p className="text-xs font-medium">{e.label}</p>
                              <time className="text-2xs text-muted-foreground">{e.at}</time>
                            </div>
                            <p className="text-sm text-muted-foreground">{e.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Follow-up Notes Timeline */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <MessageCircle className="h-3 w-3" />
                      Recent Activity & Notes
                    </h4>
                    <PermissionGatedButton
                      allowed={canWriteEnquiryUpdate}
                      deniedHint={PERMISSION_DENIED_HINTS.ceoOperationalReadOnly}
                      variant="ghost"
                      size="sm"
                      className="h-7 text-2xs text-primary"
                      hideWhenDenied
                      onClick={() => setIsAddNoteOpen(true)}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add Note
                    </PermissionGatedButton>
                  </div>
                  
                  <div className="space-y-3 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1px] before:bg-border/60">
                    {(selectedEnquiry.notes ?? []).length === 0 ? (
                      <div className="pl-8 py-4">
                        <p className="text-xs text-muted-foreground italic">No follow-up notes recorded yet.</p>
                      </div>
                    ) : (
                      (selectedEnquiry.notes ?? []).map((note, idx) => (
                        <div key={idx} className="relative pl-8 group">
                          <div className="absolute left-0 top-[6px] h-3 w-3 rounded-full border-2 border-primary/20 bg-background z-10 group-hover:border-primary/50 transition-colors" />
                          <div className="p-3 bg-muted/20 rounded-lg border border-border/40 group-hover:border-border/80 transition-all">
                            <div className="flex items-start justify-between mb-1.6">
                              <p className="text-xs font-medium text-primary/80">{note.updatedBy || "System"}</p>
                              <time className="text-2xs text-muted-foreground">{note.date}</time>
                            </div>
                            <p className="text-sm leading-relaxed">{note.note}</p>
                            {note.by && (
                              <div className="mt-2 pt-2 border-t border-border/40 flex items-center gap-1.5">
                                <Avatar className="h-4 w-4">
                                  <AvatarFallback className="text-2xs bg-secondary text-secondary-foreground uppercase">
                                    {note.by.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-2xs text-muted-foreground font-medium">Status shared by {note.by}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {selectedEnquiry && (() => {
                const linkedQuotationIds = getEnquiryQuotationIds(selectedEnquiry);
                const linkedQuotations = linkedQuotationIds
                  .map((id) => quotations.find((q) => q.id === id))
                  .filter((q): q is Quotation => Boolean(q));
                const currentQuotationId = getCurrentEnquiryQuotationId(selectedEnquiry);
                if (linkedQuotations.length === 0) return null;
                return (
                  <div className="pt-4 border-t space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold">Quotation history</h3>
                      <span className="text-xs text-muted-foreground">
                        {linkedQuotations.length} quote{linkedQuotations.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Number</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                            <TableHead className="text-xs text-right">Amount</TableHead>
                            <TableHead className="text-xs">Created</TableHead>
                            <TableHead className="text-xs w-[72px]" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {linkedQuotations.map((q) => (
                            <TableRow key={q.id}>
                              <TableCell className="text-xs font-medium py-2">
                                {q.quotationNumber}
                                {q.id === currentQuotationId && (
                                  <Badge variant="secondary" className="ml-2 text-2xs capitalize">
                                    Current
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-xs py-2 capitalize">
                                {q.status.replace(/_/g, " ")}
                              </TableCell>
                              <TableCell className="text-xs text-right tabular-nums py-2">
                                {formatINR(q.totalAmount ?? 0)}
                              </TableCell>
                              <TableCell className="text-xs py-2 text-muted-foreground">{q.createdAt}</TableCell>
                              <TableCell className="py-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2"
                                  onClick={() => navigate(deepLink.quotation(q.id))}
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                );
              })()}

              {/* Action Footer */}
              {selectedEnquiryActions && (
              <div className="pt-6 mt-6 border-t bg-background/80 backdrop-blur-sm sticky bottom-0 z-20">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-6">
                  <div className="flex items-center gap-2">
                    {selectedEnquiryActions.showAssignLead && (
                    <PermissionGatedButton
                      allowed={canWriteEnquiryUpdate}
                      deniedHint={PERMISSION_DENIED_HINTS.ceoOperationalReadOnly}
                      variant="outline"
                      size="sm"
                      hideWhenDenied
                      onClick={() => {
                        setAssignTo(selectedEnquiry.assignedToMemberId ?? "");
                        setIsAssignOpen(true);
                      }}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      {enquiryHasAssignee(selectedEnquiry) ? "Reassign" : "Assign lead"}
                    </PermissionGatedButton>
                    )}
                    {selectedEnquiryActions.showScheduleMeeting && (
                      <PermissionGatedButton
                        allowed={canWriteEnquiryUpdate}
                        deniedHint={PERMISSION_DENIED_HINTS.ceoOperationalReadOnly}
                        variant="outline"
                        size="sm"
                        hideWhenDenied
                        onClick={() => openScheduleMeetingSheet("schedule")}
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Schedule meeting
                      </PermissionGatedButton>
                    )}
                    {selectedEnquiryActions.showRescheduleMeeting && (
                      <PermissionGatedButton
                        allowed={canWriteEnquiryUpdate}
                        deniedHint={PERMISSION_DENIED_HINTS.ceoOperationalReadOnly}
                        variant="outline"
                        size="sm"
                        hideWhenDenied
                        onClick={() => openScheduleMeetingSheet("reschedule")}
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Reschedule meeting
                      </PermissionGatedButton>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {selectedEnquiryActions.showCreateQuotation && (
                      <PermissionGatedButton
                        allowed={canWriteQuotationFromEnquiry}
                        deniedHint={PERMISSION_DENIED_HINTS.enquiryCreateQuotation}
                        size="sm"
                        className="bg-primary text-white"
                        hideWhenDenied
                        onClick={() => handleCreateQuotation(selectedEnquiry)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Create quotation
                      </PermissionGatedButton>
                    )}
                    {selectedEnquiryActions.showSendQuotation && (
                      <PermissionGatedButton
                        allowed={canWriteEnquiryUpdate}
                        deniedHint={PERMISSION_DENIED_HINTS.enquiryUpdate}
                        size="sm"
                        variant="outline"
                        className="bg-primary/5 border-primary/20 hover:bg-primary/10 text-primary"
                        hideWhenDenied
                        onClick={() => void handleSendQuotation(selectedEnquiry)}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Send quotation
                      </PermissionGatedButton>
                    )}
                    {selectedEnquiryActions.showMarkAsConverted && (
                      <PermissionGatedButton
                        allowed={canWriteEnquiryUpdate}
                        deniedHint={PERMISSION_DENIED_HINTS.enquiryUpdate}
                        size="sm"
                        className="bg-primary text-white"
                        hideWhenDenied
                        onClick={() => void handleConvertEnquiry(selectedEnquiry)}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Mark as converted
                      </PermissionGatedButton>
                    )}
                    {selectedEnquiryActions.showViewQuotation && selectedEnquiryActions.currentQuotationId && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          navigate(deepLink.quotation(selectedEnquiryActions.currentQuotationId!))
                        }
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        {getEnquiryQuotationIds(selectedEnquiry).length > 1
                          ? "View current quotation"
                          : "View quotation"}
                      </Button>
                    )}
                    {selectedEnquiryActions.showMarkAsLost && (
                      <PermissionGatedButton
                        allowed={canWriteEnquiryUpdate}
                        deniedHint={PERMISSION_DENIED_HINTS.ceoOperationalReadOnly}
                        variant="destructive"
                        size="sm"
                        hideWhenDenied
                        onClick={handleMarkAsLost}
                        className="bg-destructive/5 text-destructive hover:bg-destructive hover:text-white border-destructive/20"
                      >
                        Mark as lost
                      </PermissionGatedButton>
                    )}
                    {selectedEnquiryActions.showReopen && (
                      <PermissionGatedButton
                        allowed={canWriteReopenLost}
                        deniedHint={PERMISSION_DENIED_HINTS.enquiryReopenLost}
                        variant="outline"
                        size="sm"
                        onClick={() => { setReopenReasonText(""); setIsReopenEnquiryOpen(true); }}
                      >
                        Reopen
                      </PermissionGatedButton>
                    )}
                    {selectedEnquiryActions.showUnarchive && (
                      <PermissionGatedButton
                        allowed={canWriteEnquiryUpdate}
                        deniedHint={PERMISSION_DENIED_HINTS.ceoOperationalReadOnly}
                        variant="outline"
                        size="sm"
                        hideWhenDenied
                        onClick={async () => {
                          const res = await updateEnquiry(selectedEnquiry.id, { archivedAt: null });
                          if (!res.ok) {
                            toast({
                              title: "Could not restore",
                              description: friendlyCommandErrorMessage(res.error, "Update failed"),
                              variant: "destructive",
                            });
                            return;
                          }
                          toast({ title: "Enquiry restored" });
                        }}
                      >
                        Unarchive
                      </PermissionGatedButton>
                    )}
                    {selectedEnquiryActions.showArchive && (
                        <PermissionGatedButton
                          allowed={canWriteEnquiryUpdate}
                          deniedHint={PERMISSION_DENIED_HINTS.ceoOperationalReadOnly}
                          variant="outline"
                          size="sm"
                          className="text-muted-foreground"
                          hideWhenDenied
                          onClick={async () => {
                            const res = await updateEnquiry(selectedEnquiry.id, {
                              archivedAt: new Date().toISOString(),
                            });
                            if (!res.ok) {
                              toast({
                                title: "Could not archive",
                                description: friendlyCommandErrorMessage(res.error, "Update failed"),
                                variant: "destructive",
                              });
                              return;
                            }
                            toast({ title: "Enquiry archived" });
                            setIsViewEnquiryOpen(false);
                          }}
                        >
                          Archive
                        </PermissionGatedButton>
                    )}
                  </div>
                </div>
              </div>
              )}
            </div>
          )}
        </AppSheetContent>
      </Sheet>

      <Sheet open={isMarkLostReasonOpen} onOpenChange={setIsMarkLostReasonOpen}>
        <AppSheetContent layout="form" size="xs">
          <SheetHeader>
            <SheetTitle>Reason for marking lost</SheetTitle>
            <SheetDescription>
              After a quotation was sent, record why this enquiry did not convert (at least{" "}
              {MIN_ENQUIRY_TERMINAL_REASON_LENGTH} characters).
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="lost-reason">Reason</Label>
              <Textarea
                id="lost-reason"
                value={lostReasonText}
                onChange={(e) => setLostReasonText(e.target.value)}
                placeholder="e.g., Chose another vendor, budget dropped, no response…"
                rows={4}
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsMarkLostReasonOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmLostWithReason}>
              Mark as lost
            </Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>

      {/* Reopen Lost Enquiry */}
      <Sheet open={isReopenEnquiryOpen} onOpenChange={setIsReopenEnquiryOpen}>
        <AppSheetContent layout="form" size="xs">
          <SheetHeader>
            <SheetTitle>Reopen enquiry</SheetTitle>
            <SheetDescription>
              Admin/super-admin only. Provide a reason for reopening this lost lead (at least{" "}
              {MIN_ENQUIRY_TERMINAL_REASON_LENGTH} characters).
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="reopen-reason">Reason</Label>
              <Textarea
                id="reopen-reason"
                value={reopenReasonText}
                onChange={(e) => setReopenReasonText(e.target.value)}
                placeholder="e.g., Client re-engaged, new budget approved…"
                rows={4}
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsReopenEnquiryOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleReopenEnquiry()}>Reopen</Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>

      {/* Assign Modal */}
      <Sheet open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <AppSheetContent layout="form" size="xs">
          <SheetHeader>
            <SheetTitle>{selectedEnquiry && enquiryHasAssignee(selectedEnquiry) ? "Reassign enquiry" : "Assign enquiry"}</SheetTitle>
            <SheetDescription>
              {selectedEnquiry && enquiryHasAssignee(selectedEnquiry)
                ? `Currently assigned to ${getEnquiryAssigneeDisplayName(selectedEnquiry, settingsTeamMembers, employees) || "—"}.`
                : "Select a salesperson or team member to own this lead."}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Assign to</Label>
              <Select value={assignTo} onValueChange={setAssignTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Select person" />
                </SelectTrigger>
                <SelectContent>
                  {assignableMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {assignableMembers.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Add active salespeople under Settings → Team or Employees (sales role).
                </p>
              )}
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsAssignOpen(false)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={!assignTo}>
              {selectedEnquiry && enquiryHasAssignee(selectedEnquiry) ? "Reassign" : "Assign"}
            </Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>

      {/* Add Note Modal */}
      <Sheet open={isAddNoteOpen} onOpenChange={setIsAddNoteOpen}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle>Add Follow-up Note</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Person who talked to client / Status shared by</Label>
              <Select value={notePersonId} onValueChange={setNotePersonId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select person..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Note</Label>
              <Textarea 
                value={noteText} 
                onChange={(e) => setNoteText(e.target.value)} 
                placeholder="Add your note..."
                rows={4}
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsAddNoteOpen(false)}>Cancel</Button>
            <Button onClick={handleAddNote} disabled={!noteText}>Add Note</Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>

      {/* Schedule Meeting Modal */}
      <Sheet
        open={isScheduleMeetingOpen}
        onOpenChange={(open) => {
          setIsScheduleMeetingOpen(open);
          if (!open) {
            setMeetingDate("");
            setMeetingNotes("");
          }
        }}
      >
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle>{meetingSheetMode === "reschedule" ? "Reschedule meeting" : "Schedule meeting"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Meeting date *</Label>
              <Input 
                type="date" 
                value={meetingDate} 
                onChange={(e) => setMeetingDate(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea 
                value={meetingNotes} 
                onChange={(e) => setMeetingNotes(e.target.value)} 
                placeholder="Meeting agenda, location, etc."
                rows={3}
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsScheduleMeetingOpen(false)}>Cancel</Button>
            <Button onClick={handleScheduleMeeting} disabled={!meetingDate}>
              {meetingSheetMode === "reschedule" ? "Reschedule" : "Schedule"}
            </Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>

      {/* Share Modal */}
      <Sheet open={isShareOpen} onOpenChange={setIsShareOpen}>
        <AppSheetContent layout="form" size="xs">
          <SheetHeader>
            <SheetTitle>Share Enquiry Details</SheetTitle>
            <SheetDescription>
              Opens {shareMethod === "whatsapp" ? "WhatsApp" : "email"} and logs the share on this enquiry
              (same CRM trail as quotation share history).
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Share Via</Label>
              <Select value={shareMethod} onValueChange={(v: "whatsapp" | "email") => setShareMethod(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedEnquiry ? (
              <p className="text-xs text-muted-foreground">
                {shareMethod === "whatsapp"
                  ? `To: ${selectedEnquiry.customerPhone || "— add phone on enquiry"}`
                  : `To: ${selectedEnquiry.customerEmail || "— add email on enquiry"}`}
              </p>
            ) : null}
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsShareOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleShare()}>
              <Send className="h-4 w-4 mr-2" />
              Share
            </Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>

      {/* Edit Enquiry Modal */}
      <Sheet open={isEditEnquiryOpen} onOpenChange={(open) => { setIsEditEnquiryOpen(open); if (!open) resetEditForm(); }}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle>Edit Enquiry - {selectedEnquiry?.id}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer Name *</Label>
                <Input 
                  value={editFormData.customerName} 
                  onChange={(e) => setEditFormData({ ...editFormData, customerName: e.target.value })} 
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input 
                  value={editFormData.customerPhone} 
                  onChange={(e) => setEditFormData({ ...editFormData, customerPhone: e.target.value })} 
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                  type="email"
                  value={editFormData.customerEmail} 
                  onChange={(e) => setEditFormData({ ...editFormData, customerEmail: e.target.value })} 
                  placeholder="email@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select 
                  value={editFormData.customerType} 
                  onValueChange={(v: "individual" | "company") => setEditFormData({ ...editFormData, customerType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="company">Company</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input 
                value={editFormData.customerAddress} 
                onChange={(e) => setEditFormData({ ...editFormData, customerAddress: e.target.value })} 
                placeholder="Full address"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Source</Label>
                <Select 
                  value={editFormData.source} 
                  onValueChange={(v: Enquiry["source"]) => setEditFormData({ ...editFormData, source: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phone">Phone Call</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="walk-in">Walk-in</SelectItem>
                    <SelectItem value="social-media">Social Media</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {selectedEnquiry &&
                !enquiryShouldHidePriorityChip(selectedEnquiry, quotations) && (
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select 
                  value={editFormData.priority} 
                  onValueChange={(v: Enquiry["priority"]) => setEditFormData({ ...editFormData, priority: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              )}
            </div>
            <div className="grid grid-cols-1 gap-2 max-w-lg">
              <Label>Associated agent</Label>
              <p className="text-xs text-muted-foreground -mt-1">Optional unless source is referral (then pick an agent).</p>
              <Select
                value={editFormData.agentId || "none"}
                onValueChange={(v) =>
                  setEditFormData({ ...editFormData, agentId: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No agent / direct" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No agent / direct</SelectItem>
                  {agents.filter((a) => (a.status || "").toLowerCase() === "active").map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>System Capacity</Label>
                <Input 
                  value={editFormData.systemCapacity} 
                  onChange={(e) => setEditFormData({ ...editFormData, systemCapacity: e.target.value })} 
                  placeholder="e.g., 5kW"
                />
              </div>
              <div className="space-y-2">
                <Label>Estimated Budget</Label>
                <Input 
                  type="number"
                  value={editFormData.estimatedBudget} 
                  onChange={(e) => setEditFormData({ ...editFormData, estimatedBudget: e.target.value })} 
                  placeholder="₹"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Requirements / Notes</Label>
              <Textarea 
                value={editFormData.requirements} 
                onChange={(e) => setEditFormData({ ...editFormData, requirements: e.target.value })} 
                placeholder="Customer requirements and notes..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Follow-up Date</Label>
              <Input 
                type="date"
                value={editFormData.followUpDate} 
                onChange={(e) => setEditFormData({ ...editFormData, followUpDate: e.target.value })} 
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsEditEnquiryOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>{formPrimaryLabel("edit")}</Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>
    </PageShell>
  );
};

export default Enquiries;
