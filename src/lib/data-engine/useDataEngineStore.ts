import { create } from "zustand";

export type EngineStatus = "idle" | "running" | "paused" | "error";

export type LogCategory =
  | "session"
  | "bootstrap"
  | "scenario"
  | "entity"
  | "persist"
  | "system";

export interface LogEntry {
  id: string;
  level: "info" | "warn" | "error" | "success";
  message: string;
  timestamp: string;
  category?: LogCategory;
}

export interface EngineCounters {
  enquiries: number;
  quotations: number;
  projects: number;
  invoices: number;
  expenses: number;
  payments: number;
  inventoryLogs: number;
  attendanceLogs: number;
  schedules: number;
  blockages: number;
  tickets: number;
  changeRequests: number;
  vendors: number;
  vendorBills: number;
  vendorPayments: number;
  employees: number;
  agents: number;
  tools: number;
  teams: number;
  loans: number;
  partners: number;
  ownerInvestments: number;
  materialDamage: number;
  siteVisits: number;
  subcontractors: number;
  siteChecklistTemplates: number;
  quotationTemplates: number;
}

interface DataEngineState {
  status: EngineStatus;
  progress: number;
  counters: EngineCounters;
  activeFlow: string | null;
  logs: LogEntry[];
  bannerDismissed: boolean;

  setStatus: (status: EngineStatus) => void;
  setProgress: (progress: number) => void;
  incrementCounter: (key: keyof EngineCounters) => void;
  setActiveFlow: (flowName: string | null) => void;
  addLog: (
    level: LogEntry["level"],
    message: string,
    category?: LogCategory,
  ) => void;
  setBannerDismissed: (dismissed: boolean) => void;
  clearState: () => void;
}

const DATA_ENGINE_LOGS_KEY = "mahi_solar_data_engine_logs";
const MAX_PERSISTED_LOGS = 2000;

const initialCounters: EngineCounters = {
  enquiries: 0,
  quotations: 0,
  projects: 0,
  invoices: 0,
  expenses: 0,
  payments: 0,
  inventoryLogs: 0,
  attendanceLogs: 0,
  schedules: 0,
  blockages: 0,
  tickets: 0,
  changeRequests: 0,
  vendors: 0,
  vendorBills: 0,
  vendorPayments: 0,
  employees: 0,
  agents: 0,
  tools: 0,
  teams: 0,
  loans: 0,
  partners: 0,
  ownerInvestments: 0,
  materialDamage: 0,
  siteVisits: 0,
  subcontractors: 0,
  siteChecklistTemplates: 0,
  quotationTemplates: 0,
};

function loadPersistedLogs(): LogEntry[] {
  try {
    const raw = localStorage.getItem(DATA_ENGINE_LOGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LogEntry[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_PERSISTED_LOGS) : [];
  } catch {
    return [];
  }
}

function persistLogs(logs: LogEntry[]): void {
  try {
    localStorage.setItem(DATA_ENGINE_LOGS_KEY, JSON.stringify(logs.slice(0, MAX_PERSISTED_LOGS)));
  } catch {
    /* ignore quota */
  }
}

export const useDataEngineStore = create<DataEngineState>((set) => ({
  status: "idle",
  progress: 0,
  counters: { ...initialCounters },
  activeFlow: null,
  logs: loadPersistedLogs(),
  bannerDismissed: false,

  setStatus: (status) => set({ status }),
  setProgress: (progress) => set({ progress }),
  incrementCounter: (key) =>
    set((state) => ({
      counters: { ...state.counters, [key]: state.counters[key] + 1 },
    })),
  setActiveFlow: (activeFlow) => set({ activeFlow }),
  addLog: (level, message, category) =>
    set((state) => {
      const logs = [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          level,
          message,
          timestamp: new Date().toISOString(),
          category,
        },
        ...state.logs,
      ].slice(0, MAX_PERSISTED_LOGS);
      persistLogs(logs);
      return { logs };
    }),
  setBannerDismissed: (bannerDismissed) => set({ bannerDismissed }),
  clearState: () => {
    persistLogs([]);
    set({
      status: "idle",
      progress: 0,
      counters: { ...initialCounters },
      activeFlow: null,
      logs: [],
      bannerDismissed: false,
    });
  },
}));

export function clearPersistedDataEngineLogs(): void {
  try {
    localStorage.removeItem(DATA_ENGINE_LOGS_KEY);
  } catch {
    /* ignore */
  }
}
