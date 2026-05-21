/**
 * Design-system justification: this diagram encodes entity *category* with colour
 * (Owner=purple, Partner=rose, MSS=primary, INC=success, etc.). The semantic-token
 * palette only has 3 tones (success/warning/destructive) plus primary/accent — not
 * enough to distinguish 6 entity classes at a glance. Palette literals are kept as
 * a visualization-data encoding, mirroring how charts encode series colours.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Building2, Users, Home, HardHat, Crown, Handshake, Briefcase, Landmark,
  ArrowRight, ArrowDown, ChevronRight, TrendingUp, TrendingDown, Package,
  FileText, Scale, BookOpen, Wallet, ShieldCheck,
 Database, Receipt, Layers, MousePointerClick, Calendar, ClipboardList, AlertTriangle, GitBranch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ListEmptyState } from "@/components/ui/ListEmptyState";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import { VOUCHER_TYPES, LEDGER_ACCOUNTS } from "@/services/finance/chartOfAccounts";
import { ENTITY_POSTING_INVENTORY } from "@/lib/audit/entityInventory";
import {
  ACCOUNTING_REVIEW_DISMISS_HELP,
  ACCOUNTING_REVIEW_RETRY_HELP,
  FINANCE_ACCOUNTING_REVIEW_QUEUE_PATH,
} from "@/lib/accountingReviewQueueGuidance";

// ============ DATA STRUCTURES ============

interface FlowNode {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  children?: FlowNode[];
  description?: string;
  feedsInto?: string[];
}

// ============ EXPENSE FLOW DATA ============

const expenseFlow: FlowNode[] = [
  {
    id: "company",
    label: "Company",
    icon: Building2,
    color: "text-primary dark:text-primary",
    bgColor: "bg-primary/10 border-primary/30",
    description: "Vehicle, marketing, taxes, tools",
    children: [
      { id: "company-vehicle", label: "Company Vehicle", icon: ChevronRight, color: "text-primary", bgColor: "bg-primary/5 border-primary/20",
        children: [
          { id: "vehicle-emi", label: "Vehicle EMI", icon: ChevronRight, color: "text-primary", bgColor: "" },
          { id: "vehicle-fuel", label: "Fuel", icon: ChevronRight, color: "text-primary", bgColor: "" },
          { id: "vehicle-maintenance", label: "Maintenance", icon: ChevronRight, color: "text-primary", bgColor: "" },
          { id: "vehicle-insurance", label: "Insurance", icon: ChevronRight, color: "text-primary", bgColor: "" },
          { id: "vehicle-repair", label: "Repair", icon: ChevronRight, color: "text-primary", bgColor: "" },
          { id: "vehicle-toll", label: "Toll", icon: ChevronRight, color: "text-primary", bgColor: "" },
          { id: "vehicle-parking", label: "Parking", icon: ChevronRight, color: "text-primary", bgColor: "" },
        ]},
      { id: "marketing", label: "Marketing", icon: ChevronRight, color: "text-primary", bgColor: "bg-primary/5 border-primary/20",
        children: [
          { id: "instagram-ads", label: "Instagram Ads", icon: ChevronRight, color: "text-primary", bgColor: "" },
          { id: "google-ads", label: "Google Ads", icon: ChevronRight, color: "text-primary", bgColor: "" },
          { id: "agency-subscription", label: "Agency Subscription", icon: ChevronRight, color: "text-primary", bgColor: "" },
          { id: "service-retainer", label: "Service Retainer", icon: ChevronRight, color: "text-primary", bgColor: "" },
        ]},
      { id: "physical-marketing", label: "Physical Marketing", icon: ChevronRight, color: "text-primary", bgColor: "bg-primary/5 border-primary/20",
        children: [
          { id: "poster", label: "Posters", icon: ChevronRight, color: "text-primary", bgColor: "" },
          { id: "flyer", label: "Flyers", icon: ChevronRight, color: "text-primary", bgColor: "" },
          { id: "banner", label: "Banners", icon: ChevronRight, color: "text-primary", bgColor: "" },
          { id: "printing", label: "Printing", icon: ChevronRight, color: "text-primary", bgColor: "" },
        ]},
      { id: "ca-payments", label: "CA Payments", icon: ChevronRight, color: "text-primary", bgColor: "" },
      { id: "tax-payments", label: "Tax Payments", icon: ChevronRight, color: "text-primary", bgColor: "bg-primary/5 border-primary/20",
        children: [
          { id: "gst", label: "GST", icon: ChevronRight, color: "text-primary", bgColor: "" },
          { id: "income-tax", label: "Income Tax", icon: ChevronRight, color: "text-primary", bgColor: "" },
          { id: "tds", label: "TDS", icon: ChevronRight, color: "text-primary", bgColor: "" },
          { id: "other-tax", label: "Other Tax", icon: ChevronRight, color: "text-primary", bgColor: "" },
        ]},
      { id: "subscriptions", label: "Subscriptions / Software", icon: ChevronRight, color: "text-primary", bgColor: "bg-primary/5 border-primary/20",
        children: [
          { id: "software", label: "Software", icon: ChevronRight, color: "text-primary", bgColor: "" },
          { id: "cloud-hosting", label: "Cloud / Hosting", icon: ChevronRight, color: "text-primary", bgColor: "" },
        ]},
      { id: "company-tools", label: "Tools & Equipment", icon: ChevronRight, color: "text-primary", bgColor: "bg-primary/5 border-primary/20",
        children: [
          { id: "tool-purchase", label: "Tool Purchase", icon: ChevronRight, color: "text-primary", bgColor: "" },
          { id: "tool-repair", label: "Tool Repair", icon: ChevronRight, color: "text-primary", bgColor: "" },
          { id: "equipment-rental", label: "Equipment Rental", icon: ChevronRight, color: "text-primary", bgColor: "" },
        ]},
      { id: "other-company", label: "Other Company Expense", icon: ChevronRight, color: "text-primary", bgColor: "" },
    ],
    feedsInto: ["pl-operating", "expense-audit", "cash-bank"],
  },
  {
    id: "employee",
    label: "Employee",
    icon: Users,
    color: "text-primary dark:text-primary",
    bgColor: "bg-primary/10 border-primary/30",
    description: "Salary, advance, food, transport",
    children: [
      { id: "salary", label: "Salary", icon: ChevronRight, color: "text-primary", bgColor: "bg-primary/5 border-primary/20",
        children: [
          { id: "monthly-salary", label: "Monthly Salary", icon: ChevronRight, color: "text-primary", bgColor: "" },
          { id: "overtime", label: "Overtime", icon: ChevronRight, color: "text-primary", bgColor: "" },
          { id: "bonus", label: "Bonus", icon: ChevronRight, color: "text-primary", bgColor: "" },
        ]},
      { id: "advance", label: "Advance", icon: ChevronRight, color: "text-primary", bgColor: "bg-primary/5 border-primary/20",
        children: [
          { id: "salary-advance", label: "Salary Advance", icon: ChevronRight, color: "text-primary", bgColor: "" },
          { id: "expense-advance", label: "Expense Advance", icon: ChevronRight, color: "text-primary", bgColor: "" },
        ]},
      { id: "employee-food", label: "Food", icon: ChevronRight, color: "text-primary", bgColor: "bg-primary/5 border-primary/20",
        children: [
          { id: "site-food", label: "Site Food", icon: ChevronRight, color: "text-primary", bgColor: "" },
          { id: "team-meal", label: "Team Meal", icon: ChevronRight, color: "text-primary", bgColor: "" },
          { id: "travel-food", label: "Travel Food", icon: ChevronRight, color: "text-primary", bgColor: "" },
        ]},
      { id: "employee-stay", label: "Stay / Accommodation", icon: ChevronRight, color: "text-primary", bgColor: "bg-primary/5 border-primary/20",
        children: [
          { id: "site-stay", label: "Site Stay", icon: ChevronRight, color: "text-primary", bgColor: "" },
          { id: "hotel", label: "Hotel", icon: ChevronRight, color: "text-primary", bgColor: "" },
          { id: "room-rent", label: "Room Rent", icon: ChevronRight, color: "text-primary", bgColor: "" },
        ]},
      { id: "employee-medical", label: "Medical / Injury", icon: ChevronRight, color: "text-primary", bgColor: "bg-primary/5 border-primary/20",
        children: [
          { id: "injury-support", label: "Injury Support", icon: ChevronRight, color: "text-primary", bgColor: "" },
          { id: "treatment", label: "Treatment", icon: ChevronRight, color: "text-primary", bgColor: "" },
          { id: "medicine", label: "Medicine", icon: ChevronRight, color: "text-primary", bgColor: "" },
        ]},
      { id: "employee-tickets", label: "Tickets (Home ↔ Office)", icon: ChevronRight, color: "text-primary", bgColor: "" },
      { id: "employee-transport", label: "Team Transport", icon: ChevronRight, color: "text-primary", bgColor: "" },
      { id: "employee-reimbursement", label: "Reimbursement Payment", icon: ChevronRight, color: "text-primary", bgColor: "bg-primary/5 border-primary/20",
        children: [
          { id: "reimbursement-fuel", label: "Fuel", icon: ChevronRight, color: "text-primary", bgColor: "" },
          { id: "reimbursement-food", label: "Food", icon: ChevronRight, color: "text-primary", bgColor: "" },
          { id: "reimbursement-transport", label: "Transport", icon: ChevronRight, color: "text-primary", bgColor: "" },
        ]},
      { id: "multi-employee-payment", label: "Multi-Employee Shared", icon: ChevronRight, color: "text-primary", bgColor: "" },
    ],
    feedsInto: ["pl-employee", "expense-audit", "cash-bank"],
  },
  {
    id: "office",
    label: "Office",
    icon: Home,
    color: "text-warning dark:text-warning",
    bgColor: "bg-warning/10 border-warning/30",
    description: "Rent, electricity, supplies",
    children: [
      { id: "office-rent", label: "Rent", icon: ChevronRight, color: "text-warning", bgColor: "" },
      { id: "electricity-bill", label: "Electricity Bill", icon: ChevronRight, color: "text-warning", bgColor: "" },
      { id: "water-camper", label: "Water (Pani Camper)", icon: ChevronRight, color: "text-warning", bgColor: "" },
      { id: "office-food", label: "Food", icon: ChevronRight, color: "text-warning", bgColor: "" },
      { id: "office-tea", label: "Tea", icon: ChevronRight, color: "text-warning", bgColor: "" },
      { id: "office-internet", label: "Internet", icon: ChevronRight, color: "text-warning", bgColor: "" },
      { id: "office-phone", label: "Phone", icon: ChevronRight, color: "text-warning", bgColor: "" },
      { id: "office-supplies", label: "Office Supplies", icon: ChevronRight, color: "text-warning", bgColor: "" },
      { id: "office-infrastructure", label: "Infrastructure", icon: ChevronRight, color: "text-warning", bgColor: "" },
      { id: "office-misc", label: "Miscellaneous", icon: ChevronRight, color: "text-warning", bgColor: "" },
    ],
    feedsInto: ["pl-operating", "expense-audit", "cash-bank"],
  },
  {
    id: "site",
    label: "Site / Project",
    icon: HardHat,
    color: "text-warning dark:text-warning",
    bgColor: "bg-warning/10 border-warning/30",
    description: "Commission, transport, outsource",
    children: [
      { id: "commission", label: "Commission", icon: ChevronRight, color: "text-warning", bgColor: "bg-warning/5 border-warning/20",
        children: [
          { id: "agent-commission", label: "Agent", icon: ChevronRight, color: "text-warning", bgColor: "" },
          { id: "discom-commission", label: "DISCOM", icon: ChevronRight, color: "text-warning", bgColor: "" },
          { id: "bank-commission", label: "Bank", icon: ChevronRight, color: "text-warning", bgColor: "" },
          { id: "lineman-commission", label: "Lineman", icon: ChevronRight, color: "text-warning", bgColor: "" },
          { id: "powerhouse-commission", label: "Power House", icon: ChevronRight, color: "text-warning", bgColor: "" },
        ]},
      { id: "material-transport", label: "Material Transport", icon: ChevronRight, color: "text-warning", bgColor: "bg-warning/5 border-warning/20",
        children: [
          { id: "company-vehicle-transport", label: "Company Vehicle", icon: ChevronRight, color: "text-warning", bgColor: "" },
          { id: "employee-vehicle-transport", label: "Employee Vehicle", icon: ChevronRight, color: "text-warning", bgColor: "" },
          { id: "outsource-vehicle-transport", label: "Outsource Vehicle", icon: ChevronRight, color: "text-warning", bgColor: "" },
        ]},
      { id: "site-team-transport", label: "Team Transport", icon: ChevronRight, color: "text-warning", bgColor: "" },
      { id: "pulley-transport", label: "Pulley for Material", icon: ChevronRight, color: "text-warning", bgColor: "" },
      { id: "labour-material-shift", label: "Labour Material Shift", icon: ChevronRight, color: "text-warning", bgColor: "" },
      { id: "machine-rent", label: "Machine Rent", icon: ChevronRight, color: "text-warning", bgColor: "bg-warning/5 border-warning/20",
        children: [
          { id: "machine-hourly", label: "Hourly Rent", icon: ChevronRight, color: "text-warning", bgColor: "" },
          { id: "machine-daily", label: "Daily Rent", icon: ChevronRight, color: "text-warning", bgColor: "" },
        ]},
      { id: "outsource-work", label: "Outsource Work", icon: ChevronRight, color: "text-warning", bgColor: "bg-warning/5 border-warning/20",
        children: [
          { id: "jcb-work", label: "JCB Work", icon: ChevronRight, color: "text-warning", bgColor: "" },
          { id: "crane-work", label: "Crane Work", icon: ChevronRight, color: "text-warning", bgColor: "" },
          { id: "hydra-lifting", label: "Hydra Lifting", icon: ChevronRight, color: "text-warning", bgColor: "" },
          { id: "site-cleaning", label: "Cleaning", icon: ChevronRight, color: "text-warning", bgColor: "" },
          { id: "pani-tanker", label: "Pani Tanker", icon: ChevronRight, color: "text-warning", bgColor: "" },
        ]},
      { id: "site-toll-parking", label: "Tolls & Parking", icon: ChevronRight, color: "text-warning", bgColor: "" },
      { id: "other-site", label: "Other Site Expense", icon: ChevronRight, color: "text-warning", bgColor: "" },
    ],
    feedsInto: ["pl-project-costs", "expense-audit", "cash-bank"],
  },
  {
    id: "owner",
    label: "Owner (MK)",
    icon: Crown,
    color: "text-purple-700 dark:text-purple-400",
    bgColor: "bg-purple-500/10 border-purple-500/30",
    description: "Withdrawals, personal expenses",
    children: [
      { id: "owner-withdrawal", label: "Withdrawals", icon: ChevronRight, color: "text-purple-600", bgColor: "" },
      { id: "owner-personal", label: "Personal Expenses", icon: ChevronRight, color: "text-purple-600", bgColor: "bg-purple-500/5 border-purple-500/20",
        children: [
          { id: "owner-food", label: "Food", icon: ChevronRight, color: "text-purple-500", bgColor: "" },
          { id: "owner-transport", label: "Transport", icon: ChevronRight, color: "text-purple-500", bgColor: "" },
          { id: "owner-emi", label: "EMI Payment", icon: ChevronRight, color: "text-purple-500", bgColor: "" },
          { id: "owner-medical", label: "Medical", icon: ChevronRight, color: "text-purple-500", bgColor: "" },
          { id: "owner-personal-other", label: "Personal", icon: ChevronRight, color: "text-purple-500", bgColor: "" },
        ]},
      { id: "owner-reimbursement", label: "Owner Reimbursements", icon: ChevronRight, color: "text-purple-600", bgColor: "" },
    ],
    feedsInto: ["pl-drawings", "expense-audit", "cash-bank"],
  },
  {
    id: "partner",
    label: "Partner",
    icon: Handshake,
    color: "text-rose-700 dark:text-rose-400",
    bgColor: "bg-rose-500/10 border-rose-500/30",
    description: "Withdrawals, profit sharing",
    children: [
      { id: "partner-withdrawal", label: "Partner Withdrawal", icon: ChevronRight, color: "text-rose-600", bgColor: "bg-rose-500/5 border-rose-500/20",
        children: [
          { id: "partner-withdrawal-company", label: "Company Level", icon: ChevronRight, color: "text-rose-500", bgColor: "" },
          { id: "partner-withdrawal-site", label: "Site Level", icon: ChevronRight, color: "text-rose-500", bgColor: "" },
        ]},
      { id: "partner-profit-payment", label: "Profit Payment", icon: ChevronRight, color: "text-rose-600", bgColor: "" },
      { id: "partner-expense", label: "Partner Expense", icon: ChevronRight, color: "text-rose-600", bgColor: "bg-rose-500/5 border-rose-500/20",
        children: [
          { id: "partner-material-expense", label: "Material", icon: ChevronRight, color: "text-rose-500", bgColor: "" },
          { id: "partner-labour-expense", label: "Labour", icon: ChevronRight, color: "text-rose-500", bgColor: "" },
          { id: "partner-transport-expense", label: "Transport", icon: ChevronRight, color: "text-rose-500", bgColor: "" },
        ]},
    ],
    feedsInto: ["pl-partner", "expense-audit", "cash-bank"],
  },
];

// ============ INCOME FLOW DATA ============

const incomeFlow: FlowNode[] = [
  {
    id: "project-income",
    label: "Project Income",
    icon: Briefcase,
    color: "text-primary dark:text-primary",
    bgColor: "bg-primary/10 border-primary/30",
    description: "Client payments, advances, bank instalments",
    children: [
      { id: "client-payment", label: "Client Payment", icon: ChevronRight, color: "text-primary", bgColor: "bg-primary/5 border-primary/20",
        children: [
          { id: "client-cash", label: "Cash Payment", icon: ChevronRight, color: "text-primary", bgColor: "" },
          { id: "client-advance", label: "Client Advance", icon: ChevronRight, color: "text-primary", bgColor: "" },
          { id: "bank-instalment", label: "Bank Instalment", icon: ChevronRight, color: "text-primary", bgColor: "" },
          { id: "direct-bank-payment", label: "Direct Bank Payment", icon: ChevronRight, color: "text-primary", bgColor: "" },
        ]},
    ],
    feedsInto: ["pl-revenue", "gst-sales", "debtors", "cash-bank"],
  },
  {
    id: "loan-income",
    label: "Loans & Udhar",
    icon: Landmark,
    color: "text-primary dark:text-primary",
    bgColor: "bg-primary/10 border-primary/30",
    description: "Bank loans (formal), Udhar (person-to-person)",
    children: [
      { id: "bank-loan", label: "Bank Loan (Formal)", icon: ChevronRight, color: "text-primary", bgColor: "bg-primary/5 border-primary/20",
        children: [
          { id: "bank-loan-received", label: "Loan Received", icon: ChevronRight, color: "text-primary", bgColor: "" },
          { id: "bank-loan-emi-reference", label: "EMI Reference", icon: ChevronRight, color: "text-primary", bgColor: "" },
        ]},
      { id: "udhar-borrowing", label: "Udhar / Borrowing", icon: ChevronRight, color: "text-primary", bgColor: "bg-primary/5 border-primary/20",
        children: [
          { id: "udhar-received", label: "Udhar Received", icon: ChevronRight, color: "text-primary", bgColor: "" },
          { id: "udhar-given", label: "Udhar Given", icon: ChevronRight, color: "text-primary", bgColor: "" },
          { id: "udhar-repayment-received", label: "Repayment Received", icon: ChevronRight, color: "text-primary", bgColor: "" },
          { id: "udhar-repayment-made", label: "Repayment Made", icon: ChevronRight, color: "text-primary", bgColor: "" },
        ]},
    ],
    feedsInto: ["creditors", "cash-bank"],
  },
  {
    id: "partner-inc",
    label: "Partner Income",
    icon: Handshake,
    color: "text-rose-700 dark:text-rose-400",
    bgColor: "bg-rose-500/10 border-rose-500/30",
    description: "Investments, supply contributions",
    children: [
      { id: "partner-investment", label: "Partner Investment", icon: ChevronRight, color: "text-rose-600", bgColor: "bg-rose-500/5 border-rose-500/20",
        children: [
          { id: "partner-company-investment", label: "To Company", icon: ChevronRight, color: "text-rose-500", bgColor: "" },
          { id: "partner-site-investment", label: "Site Investment", icon: ChevronRight, color: "text-rose-500", bgColor: "" },
        ]},
      { id: "partner-contribution", label: "Partner Contribution", icon: ChevronRight, color: "text-rose-600", bgColor: "bg-rose-500/5 border-rose-500/20",
        children: [
          { id: "partner-material-supply", label: "Material Supplied", icon: ChevronRight, color: "text-rose-500", bgColor: "" },
          { id: "partner-labour-supply", label: "Labour Supplied", icon: ChevronRight, color: "text-rose-500", bgColor: "" },
          { id: "partner-transport-supply", label: "Transport Supplied", icon: ChevronRight, color: "text-rose-500", bgColor: "" },
        ]},
    ],
    feedsInto: ["pl-partner", "cash-bank"],
  },
  {
    id: "employee-payment-inc",
    label: "Employee Payments",
    icon: Users,
    color: "text-warning dark:text-warning",
    bgColor: "bg-warning/10 border-warning/30",
    description: "Employee-paid expenses, reimbursements",
    children: [
      { id: "employee-expense-payment", label: "Employee Paid for Company", icon: ChevronRight, color: "text-warning", bgColor: "bg-warning/5 border-warning/20",
        children: [
          { id: "employee-paid-expense", label: "Employee Paid Expense", icon: ChevronRight, color: "text-warning", bgColor: "" },
          { id: "reimbursement-to-employee", label: "Reimbursement to Employee", icon: ChevronRight, color: "text-warning", bgColor: "" },
        ]},
    ],
    feedsInto: ["pl-employee", "cash-bank"],
  },
  {
    id: "company-inc",
    label: "Company Income",
    icon: Building2,
    color: "text-purple-700 dark:text-purple-400",
    bgColor: "bg-purple-500/10 border-purple-500/30",
    description: "Owner investment, other income",
    children: [
      { id: "owner-investment-inc", label: "Owner Investment", icon: ChevronRight, color: "text-purple-600", bgColor: "" },
      { id: "other-company-income", label: "Other Company Income", icon: ChevronRight, color: "text-purple-600", bgColor: "" },
    ],
    feedsInto: ["pl-capital", "cash-bank"],
  },
];

// ============ AUDIT MODULES ============

const auditModules: { id: string; label: string; icon: React.ElementType; color: string; bgColor: string; description: string; inputs: string[] }[] = [
  { id: "pl-revenue", label: "P&L → Revenue", icon: TrendingUp, color: "text-primary", bgColor: "bg-primary/10 border-primary/30", description: "Sales revenue from invoices & sale bills", inputs: ["Invoices", "Sale Bills", "Client Payments"] },
  { id: "pl-cogs", label: "P&L → COGS", icon: Package, color: "text-warning", bgColor: "bg-warning/10 border-warning/30", description: "Opening Stock + Purchases − Closing Stock", inputs: ["Inventory Items", "Vendor Bills", "Stock Movements"] },
  { id: "pl-operating", label: "P&L → Operating Exp", icon: Building2, color: "text-primary", bgColor: "bg-primary/10 border-primary/30", description: "Company + Office expenses", inputs: ["Company Expenses", "Office Expenses"] },
  { id: "pl-employee", label: "P&L → Employee Costs", icon: Users, color: "text-primary", bgColor: "bg-primary/10 border-primary/30", description: "Salaries, advances, reimbursements", inputs: ["Salary", "Advance", "Food", "Stay", "Medical", "Transport"] },
  { id: "pl-project-costs", label: "P&L → Project Costs", icon: HardHat, color: "text-warning", bgColor: "bg-warning/10 border-warning/30", description: "Commission, transport, outsource work", inputs: ["Commission", "Material Transport", "Machine Rent", "Outsource Work"] },
  { id: "pl-drawings", label: "P&L → Owner Drawings", icon: Crown, color: "text-purple-700", bgColor: "bg-purple-500/10 border-purple-500/30", description: "Owner withdrawals & personal expenses", inputs: ["Withdrawals", "Personal Expenses"] },
  { id: "pl-partner", label: "P&L → Partner", icon: Handshake, color: "text-rose-700", bgColor: "bg-rose-500/10 border-rose-500/30", description: "Partner withdrawals, profit payments", inputs: ["Withdrawals", "Profit Payments", "Investments"] },
  { id: "gst-sales", label: "GST → Sales Register", icon: BookOpen, color: "text-primary", bgColor: "bg-primary/10 border-primary/30", description: "CGST + SGST + IGST from invoices", inputs: ["Invoice Items (HSN)", "Invoice Services (SAC)"] },
  { id: "gst-purchase", label: "GST → Purchase Register", icon: BookOpen, color: "text-primary", bgColor: "bg-primary/10 border-primary/30", description: "Input GST from vendor bills", inputs: ["Vendor Bills", "Bill Items"] },
  { id: "debtors", label: "Debtors (Receivables)", icon: Scale, color: "text-primary", bgColor: "bg-primary/10 border-primary/30", description: "Invoice Total − Amount Received", inputs: ["Unpaid/Partial Invoices"] },
  { id: "creditors", label: "Creditors (Payables)", icon: Scale, color: "text-destructive", bgColor: "bg-destructive/10 border-destructive/30", description: "Vendor Bill Total − Amount Paid", inputs: ["Unpaid/Partial Vendor Bills", "Loans Outstanding"] },
  { id: "cash-bank", label: "Cash & Bank Ledger", icon: Wallet, color: "text-warning", bgColor: "bg-warning/10 border-warning/30", description: "Unified transaction ledger", inputs: ["All Incomes", "All Expenses", "All Payments", "Vendor Payments"] },
  { id: "inventory-audit", label: "Inventory Valuation", icon: Package, color: "text-purple-700", bgColor: "bg-purple-500/10 border-purple-500/30", description: "Stock × Buy Price per item", inputs: ["Inventory Items", "Stock Levels", "Purchase History"] },
  { id: "fixed-assets", label: "Fixed Assets Register", icon: Layers, color: "text-primary", bgColor: "bg-primary/10 border-primary/30", description: "Tools depreciation tracking", inputs: ["Tools", "Purchase Date", "Rate"] },
  { id: "expense-audit", label: "Expense Audit", icon: FileText, color: "text-warning", bgColor: "bg-warning/10 border-warning/30", description: "Category-wise drill-down", inputs: ["All 6 Expense Categories", "mainCategory filter"] },
  { id: "material-reservations", label: "Material Reservations", icon: Package, color: "text-cyan-700", bgColor: "bg-cyan-500/10 border-cyan-500/30", description: "Checklist-driven holds; shortfall pressure", inputs: ["MaterialReservation", "siteChecklist", "ProcurementShortfall"] },
  { id: "site-visits", label: "Site Visits", icon: HardHat, color: "text-warning", bgColor: "bg-warning/10 border-warning/30", description: "Visit log reconciled to checklist", inputs: ["SiteVisit", "Project.siteChecklist"] },
  { id: "scheduled-install", label: "Scheduled Installations", icon: Calendar, color: "text-primary", bgColor: "bg-primary/10 border-primary/30", description: "Team/employee schedule feed", inputs: ["ScheduledInstallation", "Calendar"] },
  { id: "change-requests", label: "Project Change Requests", icon: GitBranch, color: "text-violet-700", bgColor: "bg-violet-500/10 border-violet-500/30", description: "Capacity/add-on deltas → draft invoice", inputs: ["ProjectChangeRequest", "executionLineItems", "commercialBaseline"] },
  { id: "material-damage", label: "Material Damage", icon: AlertTriangle, color: "text-destructive", bgColor: "bg-destructive/10 border-destructive/30", description: "Write-off + inventory movement", inputs: ["MaterialDamage", "InventoryMovement", "P&L damage line"] },
  { id: "agent-accruals", label: "Agent Commission Accruals", icon: ClipboardList, color: "text-warning", bgColor: "bg-warning/10 border-warning/30", description: "pending → payable → paid lifecycle", inputs: ["AgentCommissionAccrual", "Quotation approved", "Project started"] },
];

const operationsFlow: FlowNode[] = [
  {
    id: "ops-hub",
    label: "Project Operations Hub",
    icon: HardHat,
    color: "text-primary",
    bgColor: "bg-primary/10 border-primary/30",
    description: "Post-award execution entities (Phase 1)",
    children: [
      { id: "reservations", label: "Material Reservations", icon: Package, color: "text-cyan-600", bgColor: "bg-cyan-500/5 border-cyan-500/20", feedsInto: ["inventory-audit", "pl-cogs"] },
      { id: "site-visit", label: "Site Visits", icon: HardHat, color: "text-warning", bgColor: "bg-warning/5 border-warning/20", feedsInto: ["pl-project-costs", "expense-audit"] },
      { id: "schedule", label: "Scheduled Installations", icon: Calendar, color: "text-primary", bgColor: "bg-primary/5 border-primary/20", feedsInto: ["cash-bank"] },
      { id: "change-req", label: "Change Requests", icon: GitBranch, color: "text-violet-600", bgColor: "bg-violet-500/5 border-violet-500/20", feedsInto: ["pl-revenue", "gst-sales", "debtors"] },
      { id: "damage", label: "Material Damage", icon: AlertTriangle, color: "text-destructive", bgColor: "bg-destructive/5 border-destructive/20", feedsInto: ["inventory-audit", "pl-cogs"] },
      { id: "accrual", label: "Agent Commission Accruals", icon: ClipboardList, color: "text-warning", bgColor: "bg-warning/5 border-warning/20", feedsInto: ["pl-project-costs", "expense-audit"] },
    ],
    feedsInto: ["inventory-audit", "pl-revenue", "expense-audit"],
  },
];

// ============ TREE NODE COMPONENT ============

const TreeNode = ({ node, depth = 0 }: { node: FlowNode; depth?: number }) => {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasChildren = node.children && node.children.length > 0;
  const isRoot = depth === 0;

  return (
    <div className={cn(isRoot ? "" : "ml-4 md:ml-6")}>
      <div
        className={cn(
          "flex items-center gap-2 py-1.5 px-2 rounded-md transition-colors cursor-pointer select-none",
          isRoot ? `border ${node.bgColor} p-3 mb-1` : "hover:bg-muted/50",
          hasChildren && "font-medium"
        )}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren ? (
          <ChevronRight className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", expanded && "rotate-90")} />
        ) : (
          <div className="w-3.5 h-3.5 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
          </div>
        )}
        {isRoot && <node.icon className={cn("w-4 h-4", node.color)} />}
        <span className={cn(
          "text-sm",
          isRoot ? `font-semibold ${node.color}` : "text-foreground",
          depth >= 2 && "text-muted-foreground text-xs"
        )}>
          {node.label}
        </span>
        {isRoot && node.description && (
          <span className="text-xs text-muted-foreground ml-auto hidden md:inline">{node.description}</span>
        )}
        {isRoot && node.children && (
          <Badge variant="outline" className="text-2xs ml-1 px-1.5 py-0">{node.children.length}</Badge>
        )}
      </div>
      {expanded && hasChildren && (
        <div className={cn(isRoot ? "border-l-2 ml-4 pl-0" : "border-l ml-3 pl-0", "border-muted-foreground/20")}>
          {node.children!.map(child => (
            <TreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

// ============ MAIN PAGE ============

const AuditDataFlow = () => {
  const navigate = useNavigate();
  return (
    <PageShell className="space-y-6">
      <StickyPageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Audit", to: "/audit" },
          { label: "Data flow" },
        ]}
        subRow={
          <InlineKpiStrip
            className="w-full min-w-0 flex-wrap justify-start"
            items={[
              { label: "Voucher types", value: VOUCHER_TYPES.length },
              { label: "Ledger accounts", value: LEDGER_ACCOUNTS.length },
              { label: "DFD layers", value: 4 },
            ]}
          />
        }
      />

      <Alert>
        <AlertTitle>Reference diagram</AlertTitle>
        <AlertDescription>
          Expense and income flow trees below are illustrative. They are not generated from live Settings masters or{" "}
          <code className="text-xs bg-muted px-1 rounded">auditBooksMasters</code> — use Chart of Accounts and Profit
          &amp; Loss for current mappings.
        </AlertDescription>
      </Alert>

      <Alert className="border-warning/30 bg-warning/5">
        <AlertTriangle className="h-4 w-4 text-warning" />
        <AlertTitle className="text-sm">Training: Accounting review queue &amp; project completion</AlertTitle>
        <AlertDescription className="space-y-2 text-sm text-muted-foreground">
          <p>
            When voucher auto-post fails, Finance shows a row in the{" "}
            <button
              type="button"
              className="text-primary underline-offset-2 hover:underline"
              onClick={() => navigate(FINANCE_ACCOUNTING_REVIEW_QUEUE_PATH)}
            >
              accounting review queue
            </button>
            . Projects cannot move to <strong>Completed</strong> while any queue row still touches that project
            (direct <code className="text-xs bg-muted px-1 rounded">projectId</code> or linked invoice / expense /
            income).
          </p>
          <p>{ACCOUNTING_REVIEW_RETRY_HELP}</p>
          <p>{ACCOUNTING_REVIEW_DISMISS_HELP}</p>
          <p>
            Project detail shows the same guidance on the completion banner when blocked. Dismiss is audited as a queue
            removal, not a voucher post.
          </p>
        </AlertDescription>
      </Alert>

      {/* High-level DFD overview */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            High-Level Data Flow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 text-center">
            {/* Layer 1: Operational Sources */}
            <div>
              <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Layer 1 — Operational Modules</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {["Invoices & Sale Bills", "Expenses (6 Categories)", "Incomes (5 Categories)", "Vendor Bills", "Inventory", "Tools", "Material Reservations", "Site Visits", "Scheduled Installations", "Change Requests", "Material Damage", "Agent Accruals"].map(s => (
                  <Badge key={s} variant="outline" className="bg-primary/5 border-primary/30 text-primary text-xs px-3 py-1.5">{s}</Badge>
                ))}
              </div>
            </div>
            <ArrowDown className="w-5 h-5 text-muted-foreground" />

            {/* Layer 2: Voucher Classification */}
            <div className="border border-dashed border-warning/40 rounded-lg p-3 bg-warning/5 w-full max-w-2xl">
              <p className="text-2xs font-semibold text-warning dark:text-warning uppercase tracking-wider mb-2">Layer 2 — Voucher Classification</p>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {VOUCHER_TYPES.map(v => (
                  <Badge key={v.type} variant="outline" className="text-2xs px-2 py-1 border-warning/40 text-warning dark:text-warning">{v.label}</Badge>
                ))}
              </div>
            </div>
            <ArrowDown className="w-5 h-5 text-muted-foreground" />

            {/* Layer 3: Chart of Accounts */}
            <div
              className="border-2 border-primary/30 rounded-lg p-3 bg-primary/5 w-full max-w-2xl cursor-pointer hover:border-primary/60 hover:bg-primary/10 transition-colors group"
              onClick={() => navigate("/audit/chart-of-accounts")}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <p className="text-xs font-semibold text-primary">CHART OF ACCOUNTS (Groups → Ledgers)</p>
                <MousePointerClick className="w-3.5 h-3.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {["Capital Account", "Current Liabilities", "Current Assets", "Fixed Assets", "Sales Accounts", "Purchase Accounts", "Direct Expenses", "Indirect Expenses"].map(p => (
                  <Badge key={p} variant="outline" className="text-2xs px-2 py-1 border-primary/40 text-primary">{p}</Badge>
                ))}
              </div>
            </div>
            <ArrowDown className="w-5 h-5 text-muted-foreground" />

            {/* Layer 4: Financial Reports */}
            <div>
              <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Layer 4 — Financial Reports</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  { label: "Profit & Loss", icon: TrendingUp },
                  { label: "Balance Sheet", icon: Scale },
                  { label: "Trial Balance", icon: BookOpen },
                  { label: "GST Registers", icon: BookOpen },
                  { label: "Debtors & Creditors", icon: Scale },
                  { label: "Cash & Bank Ledger", icon: Wallet },
                  { label: "Stock Summary", icon: Package },
                ].map(m => (
                  <Badge key={m.label} className="bg-accent text-accent-foreground border border-border text-xs px-3 py-1.5 gap-1.5">
                    <m.icon className="w-3 h-3" />
                    {m.label}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="entity-inventory" className="space-y-4">
        <TabsList className="grid grid-cols-6 w-full max-w-3xl">
          <TabsTrigger value="entity-inventory">Entity → Posting</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="incomes">Incomes</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="vouchers">Voucher Types</TabsTrigger>
          <TabsTrigger value="audit-modules">Audit Modules</TabsTrigger>
        </TabsList>

        {/* ENTITY → POSTING (W4: complete entity inventory with calculation method) */}
        <TabsContent value="entity-inventory">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                Entity → Posting Inventory
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Every entity type from <code className="bg-muted/40 px-1 rounded">src/types/*.ts</code> with its voucher pair, Chart-of-Accounts leaves, audit consumer, cash/accrual treatment, and GST impact. Source-of-truth for skill 39 <code className="bg-muted/40 px-1 rounded">auditdataflow-completeness-audit</code>.
              </p>
            </CardHeader>
            <CardContent>
              {ENTITY_POSTING_INVENTORY.length === 0 ? (
                <ListEmptyState
                  icon={Database}
                  title="No entity inventory rows"
                  description="Add entity posting definitions in src/lib/audit/entityInventory.ts."
                />
              ) : (
              <>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 sticky top-0">
                    <tr className="text-left">
                      <th className="px-2 py-2 font-medium">Entity</th>
                      <th className="px-2 py-2 font-medium">Trigger</th>
                      <th className="px-2 py-2 font-medium">Voucher (Dr · Cr)</th>
                      <th className="px-2 py-2 font-medium">CoA Leaves</th>
                      <th className="px-2 py-2 font-medium">Audit Consumer</th>
                      <th className="px-2 py-2 font-medium">Cash / Accrual</th>
                      <th className="px-2 py-2 font-medium">GST</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ENTITY_POSTING_INVENTORY.map((row) => (
                      <tr key={row.entity} className="border-t hover:bg-muted/20">
                        <td className="px-2 py-2 font-medium whitespace-nowrap">
                          {row.entity}
                          <div className="text-2xs text-muted-foreground font-mono">{row.typesFile}</div>
                        </td>
                        <td className="px-2 py-2 text-muted-foreground">{row.trigger}</td>
                        <td className="px-2 py-2 leading-snug">{row.voucher}</td>
                        <td className="px-2 py-2 text-muted-foreground font-mono leading-snug">{row.coaLeaves}</td>
                        <td className="px-2 py-2 leading-snug">{row.auditConsumer}</td>
                        <td className="px-2 py-2">
                          <Badge variant="outline" className="text-2xs capitalize">{row.cashAccrual}</Badge>
                        </td>
                        <td className="px-2 py-2 leading-snug">{row.gstImpact}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-2xs text-muted-foreground mt-3">
                Rows: {ENTITY_POSTING_INVENTORY.length}. Edit at <code>src/lib/audit/entityInventory.ts</code>.
              </p>
              </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* EXPENSE TREE */}
        <TabsContent value="expenses">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-destructive" />
                Expense Categorization (6 Main → Categories → Sub-Categories)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[60vh]">
                <div className="space-y-3 pr-4">
                  {expenseFlow.map(node => (
                    <div key={node.id}>
                      <TreeNode node={node} />
                      {node.feedsInto && (
                        <div className="ml-6 mt-1 mb-2 flex items-center gap-1.5 flex-wrap">
                          <ArrowRight className="w-3 h-3 text-muted-foreground" />
                          <span className="text-2xs text-muted-foreground">Feeds into:</span>
                          {node.feedsInto.map(f => (
                            <Badge key={f} variant="outline" className="text-2xs px-1.5 py-0">{f.replace("pl-", "P&L→").replace("expense-audit", "Expense Audit").replace("cash-bank", "Cash & Bank")}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* INCOME TREE */}
        <TabsContent value="incomes">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Income Categorization (5 Main → Categories → Sub-Categories)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[60vh]">
                <div className="space-y-3 pr-4">
                  {incomeFlow.map(node => (
                    <div key={node.id}>
                      <TreeNode node={node} />
                      {node.feedsInto && (
                        <div className="ml-6 mt-1 mb-2 flex items-center gap-1.5 flex-wrap">
                          <ArrowRight className="w-3 h-3 text-muted-foreground" />
                          <span className="text-2xs text-muted-foreground">Feeds into:</span>
                          {node.feedsInto.map(f => (
                            <Badge key={f} variant="outline" className="text-2xs px-1.5 py-0">{f.replace("pl-", "P&L→").replace("gst-sales", "GST Sales").replace("debtors", "Debtors").replace("creditors", "Creditors").replace("cash-bank", "Cash & Bank")}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operations">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <HardHat className="w-4 h-4 text-primary" />
                Operations → Audit (reservations, visits, schedule, changes, damage, accruals)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[50vh]">
                <div className="space-y-3 pr-4">
                  {operationsFlow.map((node) => (
                    <div key={node.id}>
                      <TreeNode node={node} />
                      {node.feedsInto && (
                        <div className="ml-6 mt-1 mb-2 flex items-center gap-1.5 flex-wrap">
                          <ArrowRight className="w-3 h-3 text-muted-foreground" />
                          <span className="text-2xs text-muted-foreground">Feeds into:</span>
                          {node.feedsInto.map((f) => (
                            <Badge key={f} variant="outline" className="text-2xs px-1.5 py-0">{f}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* VOUCHER TYPES */}
        <TabsContent value="vouchers">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="w-4 h-4 text-primary" />
                Voucher Type Classification
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {VOUCHER_TYPES.map(v => (
                  <div key={v.type} className="border rounded-lg p-4 bg-muted/20">
                    <Badge variant="outline" className="mb-2 text-xs">{v.label}</Badge>
                    <p className="text-xs text-muted-foreground mb-3">{v.description}</p>
                    <div className="space-y-2">
                      <div>
                        <span className="text-2xs font-semibold text-primary dark:text-primary">Debit →</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {v.debitLedgers.map(l => {
                            const ledger = LEDGER_ACCOUNTS.find(la => la.id === l);
                            return <Badge key={l} variant="secondary" className="text-2xs px-1.5 py-0">{ledger?.name || l}</Badge>;
                          })}
                        </div>
                      </div>
                      <div>
                        <span className="text-2xs font-semibold text-rose-600 dark:text-rose-400">Credit →</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {v.creditLedgers.map(l => {
                            const ledger = LEDGER_ACCOUNTS.find(la => la.id === l);
                            return <Badge key={l} variant="secondary" className="text-2xs px-1.5 py-0">{ledger?.name || l}</Badge>;
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-border">
                      <span className="text-2xs text-muted-foreground">Sources:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {v.operationalSources.map(s => (
                          <Badge key={s} variant="outline" className="text-2xs px-1.5 py-0 border-primary/30 text-primary">{s}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AUDIT MODULES MAPPING */}
        <TabsContent value="audit-modules">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                Audit Module Data Sources
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[60vh]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-4">
                  {auditModules.map(mod => (
                    <div key={mod.id} className={cn("border rounded-lg p-3", mod.bgColor)}>
                      <div className="flex items-center gap-2 mb-2">
                        <mod.icon className={cn("w-4 h-4", mod.color)} />
                        <span className={cn("text-sm font-semibold", mod.color)}>{mod.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{mod.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {mod.inputs.map(inp => (
                          <Badge key={inp} variant="secondary" className="text-2xs px-1.5 py-0">{inp}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
};

export default AuditDataFlow;
