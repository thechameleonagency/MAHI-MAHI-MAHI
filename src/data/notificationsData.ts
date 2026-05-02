export interface LeaveRequest {
  id: string;
  employeeId: number;
  employeeName: string;
  employeeAvatar: string;
  leaveType: "Sick Leave" | "Casual Leave" | "Paid Leave" | "Emergency Leave" | "Half Day";
  startDate: string;
  endDate: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
}

export interface ExpenseRequest {
  id: string;
  employeeId: number;
  employeeName: string;
  category: "Travel" | "Materials" | "Food" | "Tools" | "Fuel" | "Miscellaneous";
  amount: number;
  date: string;
  projectId: string;
  projectName: string;
  description: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
}

export interface BlockageResolutionRequest {
  id: string;
  blockageId: string;
  blockageTitle: string;
  projectId: string;
  projectName: string;
  markedBy: string;
  markedById: number;
  resolutionDate: string;
  notes: string;
  status: "pending_verification" | "verified" | "rejected";
  requestedAt: string;
}

export interface WorkLog {
  id: string;
  employeeId: number;
  employeeName: string;
  date: string;
  projectId: string;
  projectName: string;
  workType:
    | "Earthing"
    | "Structure Setup"
    | "Panel Mounting"
    | "Inverter Setup"
    | "Wiring"
    | "Commissioned"
    | "Documentation"
    | "Site Survey"
    | "Material Collection"
    | "Delivery"
    | "Maintenance";
  description: string;
  duration: number;
  startTime: string;
  endTime: string;
}

// ============ PURGED: All notification seed data removed ============

export const dummyLeaveRequests: LeaveRequest[] = [];
export const dummyExpenseRequests: ExpenseRequest[] = [];
export const dummyBlockageResolutionRequests: BlockageResolutionRequest[] = [];
export const dummyWorkLogs: WorkLog[] = [];

export const WORK_TYPE_CATEGORIES = {
  solar: ["Earthing", "Structure Setup", "Panel Mounting", "Inverter Setup", "Wiring", "Commissioned"],
  general: ["Documentation", "Site Survey", "Material Collection", "Delivery", "Maintenance"],
};

export const ALL_WORK_TYPES = [...WORK_TYPE_CATEGORIES.solar, ...WORK_TYPE_CATEGORIES.general];
