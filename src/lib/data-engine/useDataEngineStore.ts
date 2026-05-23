import { create } from "zustand";

export type EngineStatus = "idle" | "running" | "paused" | "error";

export interface LogEntry {
  id: string;
  level: "info" | "warn" | "error" | "success";
  message: string;
  timestamp: string;
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
}

interface DataEngineState {
  status: EngineStatus;
  progress: number;
  counters: EngineCounters;
  activeFlow: string | null;
  logs: LogEntry[];
  
  // Actions
  setStatus: (status: EngineStatus) => void;
  setProgress: (progress: number) => void;
  incrementCounter: (key: keyof EngineCounters) => void;
  setActiveFlow: (flowName: string | null) => void;
  addLog: (level: LogEntry["level"], message: string) => void;
  clearState: () => void;
}

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
};

export const useDataEngineStore = create<DataEngineState>((set) => ({
  status: "idle",
  progress: 0,
  counters: { ...initialCounters },
  activeFlow: null,
  logs: [],

  setStatus: (status) => set({ status }),
  setProgress: (progress) => set({ progress }),
  incrementCounter: (key) =>
    set((state) => ({
      counters: { ...state.counters, [key]: state.counters[key] + 1 },
    })),
  setActiveFlow: (activeFlow) => set({ activeFlow }),
  addLog: (level, message) =>
    set((state) => ({
      logs: [
        {
          id: Math.random().toString(36).substring(2, 9),
          level,
          message,
          timestamp: new Date().toISOString(),
        },
        ...state.logs,
      ].slice(0, 100), // keep last 100 logs
    })),
  clearState: () =>
    set({
      status: "idle",
      progress: 0,
      counters: { ...initialCounters },
      activeFlow: null,
      logs: [],
    }),
}));
