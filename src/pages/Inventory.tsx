import { useMemo, useState } from "react";
import { Plus, RotateCcw, AlertTriangle, Edit, Wrench, Package, History, ArrowRight, Trash2, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { TablePaginationBar } from "@/components/data-table/TablePaginationBar";
import { dataTableClasses, listTableViewportMaxHeight, DEFAULT_TABLE_PAGE_SIZE } from "@/lib/tableConstants";
import { usePagedSlice } from "@/hooks/usePagedSlice";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useMasters } from "@/hooks/useMasters";
import { toast } from "@/hooks/use-toast";
import { useAppData } from "@/contexts/AppDataContext";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";

const sites = [
  { id: 1, name: "Sharma Residency" },
  { id: 2, name: "Apex Industries" },
  { id: 3, name: "Gupta Farmhouse" },
];

const employees = [
  { id: 1, name: "Rajesh Kumar" },
  { id: 2, name: "Amit Singh" },
  { id: 3, name: "Suresh Patel" },
  { id: 4, name: "Vikram Malhotra" },
];

// Complete inventory items including all 49 materials from the PDF
const inventoryItems = [
  // Existing items
  { id: 1, name: "Waaree 540W Mono Perc", category: "Panel", stock: 120, unit: "pcs", value: 1320000, buyPrice: 11000, salePrice: 13000, hsn: "8541", notes: "Tier-1 panels", minStock: 10 },
  { id: 2, name: "Growatt 5kW Inverter", category: "Inverter", stock: 5, unit: "pcs", value: 175000, buyPrice: 35000, salePrice: 42000, hsn: "8504", notes: "", minStock: 3 },
  { id: 3, name: "DC Cable 4sqmm", category: "Cable", stock: 500, unit: "m", value: 17500, buyPrice: 35, salePrice: 45, hsn: "8544", notes: "Red & Black", minStock: 100 },
  { id: 4, name: "Structure GI Rail", category: "Structure", stock: 450, unit: "kg", value: 38250, buyPrice: 85, salePrice: 110, hsn: "7308", notes: "", minStock: 50 },
  { id: 5, name: "Drill Machine Bosch", category: "Tools", stock: 1, unit: "pcs", value: 4500, buyPrice: 4500, salePrice: 5500, hsn: "8467", notes: "Professional grade", minStock: 1, alert: true },
  { id: 6, name: "Luminous 150Ah Battery", category: "Battery", stock: 12, unit: "pcs", value: 144000, buyPrice: 12000, salePrice: 15000, hsn: "8507", notes: "", minStock: 5 },
  { id: 7, name: "MC4 Connectors", category: "Misc", stock: 200, unit: "pair", value: 5000, buyPrice: 25, salePrice: 35, hsn: "8536", notes: "", minStock: 50 },
  
  // Structure Materials (from PDF)
  { id: 101, name: "Thread Rod M10x8inch", category: "Structure", stock: 100, unit: "pcs", value: 5000, buyPrice: 50, salePrice: 65, hsn: "7318", notes: "", minStock: 20 },
  { id: 102, name: "Nut & Washer & Bolt M10", category: "Structure", stock: 500, unit: "set", value: 5000, buyPrice: 10, salePrice: 15, hsn: "7318", notes: "M10 thread", minStock: 100 },
  { id: 103, name: "Wall Support Anchor Fastener M10", category: "Structure", stock: 200, unit: "pcs", value: 6000, buyPrice: 30, salePrice: 40, hsn: "7318", notes: "", minStock: 50 },
  { id: 104, name: "Lock Fix Chemical", category: "Structure", stock: 20, unit: "pcs", value: 6000, buyPrice: 300, salePrice: 400, hsn: "3506", notes: "", minStock: 5 },
  { id: 105, name: "Leg with Base Plate 75x75mm", category: "Structure", stock: 50, unit: "pcs", value: 15000, buyPrice: 300, salePrice: 400, hsn: "7308", notes: "", minStock: 10 },
  { id: 106, name: "Raftor 60x40mm", category: "Structure", stock: 100, unit: "pcs", value: 25000, buyPrice: 250, salePrice: 350, hsn: "7308", notes: "", minStock: 20 },
  { id: 107, name: "Nut & Washer & Bolt M10x6inch", category: "Structure", stock: 300, unit: "set", value: 4500, buyPrice: 15, salePrice: 20, hsn: "7318", notes: "", minStock: 50 },
  { id: 108, name: "Perline Channel 40x40mm", category: "Structure", stock: 100, unit: "pcs", value: 20000, buyPrice: 200, salePrice: 280, hsn: "7308", notes: "", minStock: 20 },
  { id: 109, name: "Nut & Washer & Bolt M10x4inch", category: "Structure", stock: 400, unit: "set", value: 4800, buyPrice: 12, salePrice: 18, hsn: "7318", notes: "", minStock: 80 },
  { id: 110, name: "Two Support C-Channel 40x40mm", category: "Structure", stock: 80, unit: "pcs", value: 16000, buyPrice: 200, salePrice: 280, hsn: "7308", notes: "", minStock: 15 },
  { id: 111, name: "Structure Jointer", category: "Structure", stock: 100, unit: "pcs", value: 5000, buyPrice: 50, salePrice: 70, hsn: "7308", notes: "", minStock: 20 },
  { id: 112, name: "L Hook", category: "Structure", stock: 200, unit: "pcs", value: 4000, buyPrice: 20, salePrice: 30, hsn: "7318", notes: "", minStock: 40 },
  { id: 113, name: "Walkway", category: "Structure", stock: 20, unit: "set", value: 40000, buyPrice: 2000, salePrice: 2800, hsn: "7308", notes: "", minStock: 5 },

  // Panel/Module Materials
  { id: 114, name: "Rope", category: "Panel/Module", stock: 500, unit: "m", value: 2500, buyPrice: 5, salePrice: 8, hsn: "5607", notes: "", minStock: 100 },
  { id: 115, name: "Modules 550W-620W", category: "Panel/Module", stock: 100, unit: "pcs", value: 1400000, buyPrice: 14000, salePrice: 16500, hsn: "8541", notes: "Bifacial", minStock: 20 },
  { id: 116, name: "Mid Clamp", category: "Panel/Module", stock: 500, unit: "pcs", value: 10000, buyPrice: 20, salePrice: 28, hsn: "7616", notes: "", minStock: 100 },
  { id: 117, name: "End Clamp", category: "Panel/Module", stock: 400, unit: "pcs", value: 10000, buyPrice: 25, salePrice: 35, hsn: "7616", notes: "", minStock: 80 },
  { id: 118, name: "Spring Nut & Bolt M10x25mm", category: "Panel/Module", stock: 600, unit: "set", value: 9000, buyPrice: 15, salePrice: 22, hsn: "7318", notes: "", minStock: 100 },
  { id: 119, name: "Nut Bolt for Module", category: "Panel/Module", stock: 800, unit: "set", value: 8000, buyPrice: 10, salePrice: 15, hsn: "7318", notes: "", minStock: 150 },
  { id: 120, name: "J Hook 8mmx45mm", category: "Panel/Module", stock: 300, unit: "pcs", value: 6000, buyPrice: 20, salePrice: 28, hsn: "7318", notes: "", minStock: 60 },
  { id: 121, name: "Nut & Washer for J Hook 8mm", category: "Panel/Module", stock: 300, unit: "set", value: 1500, buyPrice: 5, salePrice: 8, hsn: "7318", notes: "", minStock: 60 },

  // Wiring Materials
  { id: 122, name: "Inverter (Various)", category: "Wiring", stock: 10, unit: "pcs", value: 500000, buyPrice: 50000, salePrice: 65000, hsn: "8504", notes: "Multiple sizes", minStock: 3 },
  { id: 123, name: "AC DB", category: "Wiring", stock: 15, unit: "pcs", value: 52500, buyPrice: 3500, salePrice: 4500, hsn: "8537", notes: "", minStock: 5 },
  { id: 124, name: "DC DB", category: "Wiring", stock: 15, unit: "pcs", value: 37500, buyPrice: 2500, salePrice: 3500, hsn: "8537", notes: "", minStock: 5 },
  { id: 125, name: "PVC Cable Tray 25x25mm", category: "Wiring", stock: 100, unit: "m", value: 5000, buyPrice: 50, salePrice: 70, hsn: "3925", notes: "", minStock: 20 },
  { id: 126, name: "PVC Cable Tray 45x45mm", category: "Wiring", stock: 80, unit: "m", value: 6400, buyPrice: 80, salePrice: 100, hsn: "3925", notes: "", minStock: 15 },
  { id: 127, name: "PVC Conduit Pipe 20mm", category: "Wiring", stock: 200, unit: "m", value: 6000, buyPrice: 30, salePrice: 42, hsn: "3917", notes: "", minStock: 50 },
  { id: 128, name: "L Band 20mm", category: "Wiring", stock: 300, unit: "pcs", value: 1500, buyPrice: 5, salePrice: 8, hsn: "3917", notes: "", minStock: 50 },
  { id: 129, name: "T Band 20mm", category: "Wiring", stock: 200, unit: "pcs", value: 1400, buyPrice: 7, salePrice: 10, hsn: "3917", notes: "", minStock: 40 },
  { id: 130, name: "Shuddle 20mm", category: "Wiring", stock: 200, unit: "pcs", value: 1000, buyPrice: 5, salePrice: 8, hsn: "3917", notes: "", minStock: 40 },
  { id: 131, name: "DC Wire 4sqmm Copper", category: "Wiring", stock: 500, unit: "m", value: 22500, buyPrice: 45, salePrice: 58, hsn: "8544", notes: "", minStock: 100 },
  { id: 132, name: "MC4 Connector", category: "Wiring", stock: 300, unit: "pair", value: 10500, buyPrice: 35, salePrice: 48, hsn: "8536", notes: "", minStock: 60 },
  { id: 133, name: "AC Wire 6sqmm", category: "Wiring", stock: 400, unit: "m", value: 22000, buyPrice: 55, salePrice: 72, hsn: "8544", notes: "", minStock: 80 },
  { id: 134, name: "Flexible Pipe 20mm", category: "Wiring", stock: 200, unit: "m", value: 4000, buyPrice: 20, salePrice: 28, hsn: "3917", notes: "", minStock: 40 },
  { id: 135, name: "AC Armoured Cable 6x2sqmm", category: "Wiring", stock: 200, unit: "m", value: 30000, buyPrice: 150, salePrice: 195, hsn: "8544", notes: "", minStock: 40 },
  { id: 136, name: "AC Armoured Cable 10x4sqmm", category: "Wiring", stock: 100, unit: "m", value: 25000, buyPrice: 250, salePrice: 325, hsn: "8544", notes: "", minStock: 20 },
  { id: 137, name: "Gitti Screw", category: "Wiring", stock: 1000, unit: "pcs", value: 1000, buyPrice: 1, salePrice: 2, hsn: "7318", notes: "", minStock: 200 },
  { id: 138, name: "Self Screw", category: "Wiring", stock: 1000, unit: "pcs", value: 2000, buyPrice: 2, salePrice: 3, hsn: "7318", notes: "", minStock: 200 },

  // Earthing Materials
  { id: 139, name: "LA (Lightning Arrestor) 1m", category: "Earthing", stock: 20, unit: "pcs", value: 50000, buyPrice: 2500, salePrice: 3200, hsn: "8535", notes: "", minStock: 5 },
  { id: 140, name: "Earthing Rod 1m", category: "Earthing", stock: 30, unit: "pcs", value: 22500, buyPrice: 750, salePrice: 980, hsn: "7217", notes: "", minStock: 8 },
  { id: 141, name: "Earthing Chemical 1 Bag", category: "Earthing", stock: 20, unit: "bag", value: 10000, buyPrice: 500, salePrice: 680, hsn: "3824", notes: "", minStock: 5 },
  { id: 142, name: "Earthing Wire 6sqmm", category: "Earthing", stock: 200, unit: "m", value: 12000, buyPrice: 60, salePrice: 82, hsn: "8544", notes: "", minStock: 50 },
  { id: 143, name: "Copper Lug, Aluminium Lug", category: "Earthing", stock: 100, unit: "pcs", value: 3000, buyPrice: 30, salePrice: 42, hsn: "8536", notes: "", minStock: 20 },
  { id: 144, name: "Earthing Chamber", category: "Earthing", stock: 15, unit: "pcs", value: 15000, buyPrice: 1000, salePrice: 1350, hsn: "3925", notes: "", minStock: 3 },

  // Meter Materials
  { id: 145, name: "Net Meter Single Phase", category: "Meter", stock: 10, unit: "pcs", value: 60000, buyPrice: 6000, salePrice: 7800, hsn: "9028", notes: "", minStock: 3 },
  { id: 146, name: "Net Meter 3 Phase", category: "Meter", stock: 8, unit: "pcs", value: 80000, buyPrice: 10000, salePrice: 13000, hsn: "9028", notes: "", minStock: 2 },
  { id: 147, name: "Solar Meter Single Phase", category: "Meter", stock: 10, unit: "pcs", value: 40000, buyPrice: 4000, salePrice: 5200, hsn: "9028", notes: "", minStock: 3 },
  { id: 148, name: "Solar Meter 3 Phase", category: "Meter", stock: 8, unit: "pcs", value: 64000, buyPrice: 8000, salePrice: 10400, hsn: "9028", notes: "", minStock: 2 },

  // Civil Materials
  { id: 149, name: "Rodi", category: "Civil", stock: 50, unit: "bag", value: 5000, buyPrice: 100, salePrice: 130, hsn: "2517", notes: "", minStock: 10 },
  { id: 150, name: "Bajri", category: "Civil", stock: 50, unit: "bag", value: 3500, buyPrice: 70, salePrice: 95, hsn: "2517", notes: "", minStock: 10 },
  { id: 151, name: "Cement", category: "Civil", stock: 30, unit: "bag", value: 10500, buyPrice: 350, salePrice: 420, hsn: "2523", notes: "", minStock: 10 },
  { id: 152, name: "Farma", category: "Civil", stock: 10, unit: "set", value: 8000, buyPrice: 800, salePrice: 1000, hsn: "4418", notes: "", minStock: 2 },
  { id: 153, name: "Farma Rassi & Wire", category: "Civil", stock: 20, unit: "set", value: 2000, buyPrice: 100, salePrice: 140, hsn: "5607", notes: "", minStock: 5 },
];

const toolsData = [
  { id: 1, name: "Drill Machine", assignedTo: "Rajesh Kumar", site: "Sharma Residency", status: "In Use", lastUpdated: "18 Dec 2024", condition: "Good", category: "Power Tool", purchaseRate: 4500, purchaseDate: "2024-01-15" },
  { id: 2, name: "Grinder Machine", assignedTo: "-", site: "Warehouse", status: "Available", lastUpdated: "17 Dec 2024", condition: "Good", category: "Power Tool", purchaseRate: 3500, purchaseDate: "2024-01-20" },
  { id: 3, name: "Abrasive Wheel (Tile/RCC/Metal)", assignedTo: "-", site: "Warehouse", status: "Available", lastUpdated: "15 Dec 2024", condition: "Good", category: "Hand Tool", purchaseRate: 250, purchaseDate: "2024-02-10" },
  { id: 4, name: "Extension Board with Surge Protection", assignedTo: "Amit Singh", site: "Sharma Residency", status: "In Use", lastUpdated: "18 Dec 2024", condition: "Good", category: "Others", purchaseRate: 800, purchaseDate: "2024-02-15" },
  { id: 5, name: "Hilti Gun + Chemical", assignedTo: "-", site: "Warehouse", status: "Available", lastUpdated: "10 Dec 2024", condition: "Good", category: "Power Tool", purchaseRate: 15000, purchaseDate: "2024-03-01" },
  { id: 6, name: "Cement Mixture Machine", assignedTo: "-", site: "Warehouse", status: "Available", lastUpdated: "12 Dec 2024", condition: "Good", category: "Machinery", purchaseRate: 25000, purchaseDate: "2024-01-10" },
  { id: 7, name: "RCC Bit Set (6,8,10,12,14mm)", assignedTo: "Suresh Patel", site: "Apex Industries", status: "In Use", lastUpdated: "16 Dec 2024", condition: "Good", category: "Hand Tool", purchaseRate: 1200, purchaseDate: "2024-02-20" },
  { id: 8, name: "Iron Bit Set (5,6,7,8,10,12mm)", assignedTo: "-", site: "Warehouse", status: "Available", lastUpdated: "14 Dec 2024", condition: "Good", category: "Hand Tool", purchaseRate: 800, purchaseDate: "2024-02-22" },
  { id: 9, name: "Wire Stripper", assignedTo: "-", site: "Warehouse", status: "Available", lastUpdated: "13 Dec 2024", condition: "Good", category: "Hand Tool", purchaseRate: 350, purchaseDate: "2024-03-05" },
  { id: 10, name: "Nose Plier", assignedTo: "-", site: "Warehouse", status: "Available", lastUpdated: "13 Dec 2024", condition: "Good", category: "Hand Tool", purchaseRate: 200, purchaseDate: "2024-03-05" },
  { id: 11, name: "Plier/Cutter", assignedTo: "-", site: "Warehouse", status: "Available", lastUpdated: "13 Dec 2024", condition: "Good", category: "Hand Tool", purchaseRate: 250, purchaseDate: "2024-03-05" },
  { id: 12, name: "Screw Driver Set", assignedTo: "-", site: "Warehouse", status: "Available", lastUpdated: "13 Dec 2024", condition: "Good", category: "Hand Tool", purchaseRate: 500, purchaseDate: "2024-03-08" },
  { id: 13, name: "Measuring Tape (5m + 15m)", assignedTo: "Rajesh Kumar", site: "Sharma Residency", status: "In Use", lastUpdated: "18 Dec 2024", condition: "Good", category: "Measuring Tool", purchaseRate: 400, purchaseDate: "2024-03-10" },
  { id: 14, name: "Hammer", assignedTo: "-", site: "Warehouse", status: "Available", lastUpdated: "12 Dec 2024", condition: "Good", category: "Hand Tool", purchaseRate: 300, purchaseDate: "2024-03-12" },
  { id: 15, name: "Air Pump", assignedTo: "-", site: "Warehouse", status: "Available", lastUpdated: "11 Dec 2024", condition: "Good", category: "Hand Tool", purchaseRate: 600, purchaseDate: "2024-03-15" },
  { id: 16, name: "Torque Wrench", assignedTo: "-", site: "Warehouse", status: "Available", lastUpdated: "11 Dec 2024", condition: "Good", category: "Hand Tool", purchaseRate: 2500, purchaseDate: "2024-03-18" },
  { id: 17, name: "Hilti Brush + Extension", assignedTo: "-", site: "Warehouse", status: "Available", lastUpdated: "10 Dec 2024", condition: "Good", category: "Hand Tool", purchaseRate: 800, purchaseDate: "2024-03-20" },
  { id: 18, name: "Spirit Level", assignedTo: "-", site: "Warehouse", status: "Available", lastUpdated: "10 Dec 2024", condition: "Good", category: "Measuring Tool", purchaseRate: 450, purchaseDate: "2024-03-22" },
  { id: 19, name: "Ratchet Set", assignedTo: "-", site: "Warehouse", status: "Available", lastUpdated: "09 Dec 2024", condition: "Good", category: "Hand Tool", purchaseRate: 1500, purchaseDate: "2024-03-25" },
  { id: 20, name: "Crimping Tool (AC/DC)", assignedTo: "-", site: "Warehouse", status: "Available", lastUpdated: "09 Dec 2024", condition: "Good", category: "Hand Tool", purchaseRate: 1200, purchaseDate: "2024-03-28" },
  { id: 21, name: "Clamp Meter", assignedTo: "Suresh Patel", site: "Apex Industries", status: "In Use", lastUpdated: "17 Dec 2024", condition: "Good", category: "Measuring Tool", purchaseRate: 2500, purchaseDate: "2024-04-01" },
  { id: 22, name: "Silicon Gun", assignedTo: "-", site: "Warehouse", status: "Available", lastUpdated: "08 Dec 2024", condition: "Good", category: "Hand Tool", purchaseRate: 350, purchaseDate: "2024-04-05" },
  { id: 23, name: "Shuta/Line Doori", assignedTo: "-", site: "Warehouse", status: "Available", lastUpdated: "08 Dec 2024", condition: "Good", category: "Others", purchaseRate: 200, purchaseDate: "2024-04-08" },
  { id: 24, name: "Permanent Marker Set", assignedTo: "-", site: "Warehouse", status: "Available", lastUpdated: "07 Dec 2024", condition: "Good", category: "Others", purchaseRate: 100, purchaseDate: "2024-04-10" },
  { id: 25, name: "Chisel", assignedTo: "-", site: "Warehouse", status: "Available", lastUpdated: "07 Dec 2024", condition: "Good", category: "Hand Tool", purchaseRate: 250, purchaseDate: "2024-04-12" },
  { id: 26, name: "Magnetic Bit for SDS", assignedTo: "-", site: "Warehouse", status: "Available", lastUpdated: "06 Dec 2024", condition: "Good", category: "Hand Tool", purchaseRate: 400, purchaseDate: "2024-04-15" },
  { id: 27, name: "Base Plate (Dummy)", assignedTo: "-", site: "Warehouse", status: "Available", lastUpdated: "06 Dec 2024", condition: "Good", category: "Others", purchaseRate: 500, purchaseDate: "2024-04-18" },
  { id: 28, name: "Allen Key Set", assignedTo: "-", site: "Warehouse", status: "Available", lastUpdated: "05 Dec 2024", condition: "Good", category: "Hand Tool", purchaseRate: 350, purchaseDate: "2024-04-20" },
  { id: 29, name: "Wrench Set (Spanner)", assignedTo: "-", site: "Warehouse", status: "Available", lastUpdated: "05 Dec 2024", condition: "Good", category: "Hand Tool", purchaseRate: 800, purchaseDate: "2024-04-22" },
  { id: 30, name: "Hexa Blade", assignedTo: "-", site: "Warehouse", status: "Available", lastUpdated: "04 Dec 2024", condition: "Good", category: "Hand Tool", purchaseRate: 150, purchaseDate: "2024-04-25" },
  { id: 31, name: "Breaker Machine", assignedTo: "-", site: "Warehouse", status: "Available", lastUpdated: "04 Dec 2024", condition: "Good", category: "Machinery", purchaseRate: 18000, purchaseDate: "2024-05-01" },
  { id: 32, name: "Ladder 6ft", assignedTo: "-", site: "Warehouse", status: "Available", lastUpdated: "03 Dec 2024", condition: "Good", category: "Safety Equipment", purchaseRate: 3000, purchaseDate: "2024-05-05" },
  { id: 33, name: "Ladder 8ft", assignedTo: "-", site: "Warehouse", status: "Available", lastUpdated: "03 Dec 2024", condition: "Good", category: "Safety Equipment", purchaseRate: 4000, purchaseDate: "2024-05-05" },
  { id: 34, name: "Ladder 10ft", assignedTo: "Vikram Malhotra", site: "Gupta Farmhouse", status: "In Use", lastUpdated: "19 Dec 2024", condition: "Good", category: "Safety Equipment", purchaseRate: 5000, purchaseDate: "2024-05-05" },
  { id: 35, name: "Jhula (Safety Swing)", assignedTo: "-", site: "Warehouse", status: "Available", lastUpdated: "02 Dec 2024", condition: "Good", category: "Safety Equipment", purchaseRate: 2500, purchaseDate: "2024-05-10" },
  { id: 36, name: "Farma (300x300x300)", assignedTo: "-", site: "Warehouse", status: "Available", lastUpdated: "02 Dec 2024", condition: "Good", category: "Others", purchaseRate: 1500, purchaseDate: "2024-05-12" },
  { id: 37, name: "Scaffolding Set", assignedTo: "-", site: "Warehouse", status: "Available", lastUpdated: "01 Dec 2024", condition: "Good", category: "Safety Equipment", purchaseRate: 15000, purchaseDate: "2024-05-15" },
  { id: 38, name: "Tagadi, Favda, Sabbal Set", assignedTo: "-", site: "Warehouse", status: "Available", lastUpdated: "01 Dec 2024", condition: "Good", category: "Digging Tool", purchaseRate: 1200, purchaseDate: "2024-05-18" },
  { id: 39, name: "Tool Bag", assignedTo: "Rajesh Kumar", site: "Sharma Residency", status: "In Use", lastUpdated: "18 Dec 2024", condition: "Good", category: "Others", purchaseRate: 800, purchaseDate: "2024-05-20" },
  { id: 40, name: "T Spanner", assignedTo: "-", site: "Warehouse", status: "Available", lastUpdated: "30 Nov 2024", condition: "Good", category: "Hand Tool", purchaseRate: 250, purchaseDate: "2024-05-22" },
  { id: 41, name: "Cable Cutter", assignedTo: "-", site: "Warehouse", status: "Available", lastUpdated: "30 Nov 2024", condition: "Good", category: "Hand Tool", purchaseRate: 1500, purchaseDate: "2024-05-25" },
  { id: 42, name: "Water Tube Level", assignedTo: "-", site: "Warehouse", status: "Available", lastUpdated: "29 Nov 2024", condition: "Good", category: "Measuring Tool", purchaseRate: 300, purchaseDate: "2024-05-28" },
  { id: 43, name: "Rivet Gun", assignedTo: "-", site: "Warehouse", status: "Available", lastUpdated: "29 Nov 2024", condition: "Good", category: "Power Tool", purchaseRate: 1800, purchaseDate: "2024-06-01" },
  { id: 44, name: "Air Blower/Heat Gun", assignedTo: "-", site: "Warehouse", status: "Available", lastUpdated: "28 Nov 2024", condition: "Good", category: "Power Tool", purchaseRate: 2200, purchaseDate: "2024-06-05" },
  { id: 45, name: "Line Tester", assignedTo: "-", site: "Warehouse", status: "Available", lastUpdated: "28 Nov 2024", condition: "Good", category: "Measuring Tool", purchaseRate: 150, purchaseDate: "2024-06-08" },
  { id: 46, name: "Portable Welding Machine", assignedTo: "-", site: "Warehouse", status: "Available", lastUpdated: "27 Nov 2024", condition: "Good", category: "Machinery", purchaseRate: 12000, purchaseDate: "2024-06-10" },
  { id: 47, name: "Safety Rope/Lanyard", assignedTo: "Amit Singh", site: "Sharma Residency", status: "In Use", lastUpdated: "18 Dec 2024", condition: "Good", category: "Safety Equipment", purchaseRate: 1500, purchaseDate: "2024-06-12" },
  { id: 48, name: "Multimeter Fluke", assignedTo: "Suresh Patel", site: "Apex Industries", status: "In Use", lastUpdated: "17 Dec 2024", condition: "Good", category: "Measuring Tool", purchaseRate: 2500, purchaseDate: "2024-06-15" },
  { id: 49, name: "Safety Harness Set", assignedTo: "Vikram Malhotra", site: "Gupta Farmhouse", status: "In Use", lastUpdated: "19 Dec 2024", condition: "Fair", category: "Safety Equipment", purchaseRate: 3500, purchaseDate: "2024-06-18" },
];


const itemMovementHistory = [
  { date: "18 Dec 2024", action: "Issued to Site", site: "Sharma Residency", quantity: 10, by: "Admin" },
  { date: "15 Dec 2024", action: "Returned to Stock", site: "Apex Industries", quantity: 5, by: "Rajesh Kumar" },
  { date: "10 Dec 2024", action: "Issued to Site", site: "Apex Industries", quantity: 15, by: "Admin" },
  { date: "05 Dec 2024", action: "Added to Stock", site: "-", quantity: 50, by: "Admin" },
];

const sitesWithIssuedItems = [
  { 
    id: 1, 
    name: "Sharma Residency", 
    items: [
      { id: 1, name: "Waaree 540W Panel", issuedQty: 10, returnableQty: 10 },
      { id: 2, name: "DC Cable 4sqmm", issuedQty: 50, returnableQty: 30 },
    ]
  },
  { 
    id: 2, 
    name: "Apex Industries", 
    items: [
      { id: 3, name: "Structure GI Rail", issuedQty: 100, returnableQty: 50 },
    ]
  },
];

const toolCategories = [
  { value: "earthing-item", label: "Earthing Item" },
  { value: "digging-tool", label: "Digging Tool" },
  { value: "machinery", label: "Machinery" },
  { value: "safety-equipment", label: "Safety Equipment" },
  { value: "measuring-tool", label: "Measuring Tool" },
  { value: "others", label: "Others" },
];

const Inventory = () => {
  const masters = useMasters();
  const { inventoryItems: contextInventoryItems, tools: contextTools } = useAppData();
  
  // Use context data with fallback to local arrays for compatibility
  const inventoryItemsData = contextInventoryItems.length > 0 ? contextInventoryItems : inventoryItems;
  const toolsDataList = contextTools.length > 0 ? contextTools : toolsData;
  
  const [activeTab, setActiveTab] = useState("stock");
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isIssueToSiteOpen, setIsIssueToSiteOpen] = useState(false);
  const [isReturnFromSiteOpen, setIsReturnFromSiteOpen] = useState(false);
  const [isItemHistoryOpen, setIsItemHistoryOpen] = useState(false);
  const [isEditItemOpen, setIsEditItemOpen] = useState(false);
  const [isAddToolOpen, setIsAddToolOpen] = useState(false);
  const [isIssueToolOpen, setIsIssueToolOpen] = useState(false);
  const [isReturnToolOpen, setIsReturnToolOpen] = useState(false);
  const [isToolHistoryOpen, setIsToolHistoryOpen] = useState(false);
  const [isEditToolOpen, setIsEditToolOpen] = useState(false);
  const [selectedToolForHistory, setSelectedToolForHistory] = useState<typeof toolsData[0] | null>(null);
  const [selectedToolForEdit, setSelectedToolForEdit] = useState<typeof toolsData[0] | null>(null);
  const [issueToolAction, setIssueToolAction] = useState<"new" | "transfer">("new");
  
  // Confirmation states
  const [isAddItemConfirmOpen, setIsAddItemConfirmOpen] = useState(false);
  const [isEditItemConfirmOpen, setIsEditItemConfirmOpen] = useState(false);
  const [isIssueConfirmOpen, setIsIssueConfirmOpen] = useState(false);
  const [isReturnConfirmOpen, setIsReturnConfirmOpen] = useState(false);
  const [isAddToolConfirmOpen, setIsAddToolConfirmOpen] = useState(false);
  const [isIssueToolConfirmOpen, setIsIssueToolConfirmOpen] = useState(false);
  const [isReturnToolConfirmOpen, setIsReturnToolConfirmOpen] = useState(false);
  
  // Delete confirmation states
  const [isDeleteItemConfirmOpen, setIsDeleteItemConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<typeof inventoryItems[0] | null>(null);
  
  const [selectedItemForHistory, setSelectedItemForHistory] = useState<typeof inventoryItems[0] | null>(null);
  const [selectedItemForEdit, setSelectedItemForEdit] = useState<typeof inventoryItems[0] | null>(null);
  const [selectedSiteForReturn, setSelectedSiteForReturn] = useState("");
  const [selectedItemsToIssue, setSelectedItemsToIssue] = useState<Record<number, number>>({});
  const [returnAction, setReturnAction] = useState<"return" | "transfer">("return");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Return quantity validation
  const [returnQuantities, setReturnQuantities] = useState<Record<number, string>>({});
  const [returnErrors, setReturnErrors] = useState<Record<number, string>>({});
  
  // Selected tool for issue modal
  const [selectedToolId, setSelectedToolId] = useState("");

  const [stockPage, setStockPage] = useState(1);
  const [stockPageSize, setStockPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [toolsSearchQuery, setToolsSearchQuery] = useState("");
  const [toolsStatusFilter, setToolsStatusFilter] = useState("all");
  const [toolsPage, setToolsPage] = useState(1);
  const [toolsPageSize, setToolsPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);

  const handleItemHistoryClick = (item: any) => {
    setSelectedItemForHistory(item);
    setIsItemHistoryOpen(true);
  };

  const handleEditItemClick = (item: any) => {
    setSelectedItemForEdit(item);
    setIsEditItemOpen(true);
  };

  const handleItemSelectForIssue = (itemId: number, checked: boolean) => {
    if (checked) {
      setSelectedItemsToIssue(prev => ({ ...prev, [itemId]: 1 }));
    } else {
      const newSelected = { ...selectedItemsToIssue };
      delete newSelected[itemId];
      setSelectedItemsToIssue(newSelected);
    }
  };

  const handleQuantityChange = (itemId: number, qty: number) => {
    setSelectedItemsToIssue(prev => ({ ...prev, [itemId]: qty }));
  };

  // Return quantity change with validation
  const handleReturnQuantityChange = (itemId: number, value: string) => {
    const siteItems = sitesWithIssuedItems.find(s => s.name === selectedSiteForReturn)?.items || [];
    const item = siteItems.find(i => i.id === itemId);
    const numValue = parseInt(value) || 0;
    
    setReturnQuantities(prev => ({ ...prev, [itemId]: value }));
    
    if (item && numValue > item.issuedQty) {
      setReturnErrors(prev => ({ ...prev, [itemId]: "Can't return what wasn't issued" }));
    } else {
      setReturnErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[itemId];
        return newErrors;
      });
    }
  };

  const filteredItems = useMemo(
    () =>
      inventoryItemsData.filter(
        (item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.category.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [inventoryItemsData, searchQuery],
  );

  const filteredToolsList = useMemo(
    () =>
      toolsDataList.filter((t) => {
        const q = toolsSearchQuery.toLowerCase();
        const matchesSearch =
          !q ||
          t.name.toLowerCase().includes(q) ||
          t.site.toLowerCase().includes(q) ||
          (t.assignedTo !== "-" && t.assignedTo.toLowerCase().includes(q));
        const matchesStatus =
          toolsStatusFilter === "all" ||
          (toolsStatusFilter === "available" && t.status === "Available") ||
          (toolsStatusFilter === "in-use" && t.status === "In Use");
        return matchesSearch && matchesStatus;
      }),
    [toolsDataList, toolsSearchQuery, toolsStatusFilter],
  );

  const { pagedItems: pagedStockItems, safePage: safeStockPage } = usePagedSlice(
    filteredItems,
    stockPage,
    stockPageSize,
  );
  const { pagedItems: pagedToolsRows, safePage: safeToolsPage } = usePagedSlice(
    filteredToolsList,
    toolsPage,
    toolsPageSize,
  );

  const toolsInUse = toolsDataList.filter(t => t.status === "In Use");
  const toolsAvailableCount = toolsDataList.filter((t) => t.status === "Available").length;
  const lowStockCount = filteredItems.filter(
    (item) => item.alert === true || (item.minStock != null && item.stock <= item.minStock),
  ).length;
  const stockValueTotal = filteredItems.reduce((sum, item) => sum + (item.value || 0), 0);

  // Get selected tool's condition for issue modal
  const getSelectedToolCondition = () => {
    if (!selectedToolId) return null;
    const tool = toolsDataList.find(t => t.id.toString() === selectedToolId);
    return tool?.condition || null;
  };

  const handleAddItemSave = () => {
    setIsAddItemOpen(false);
    setIsAddItemConfirmOpen(true);
  };

  const handleEditItemSave = () => {
    setIsEditItemOpen(false);
    setIsEditItemConfirmOpen(true);
  };

  const handleIssueSave = () => {
    setIsIssueToSiteOpen(false);
    setIsIssueConfirmOpen(true);
  };

  const handleReturnSave = () => {
    // Check for any errors before saving
    if (Object.keys(returnErrors).length > 0) return;
    setIsReturnFromSiteOpen(false);
    setIsReturnConfirmOpen(true);
  };

  const handleAddToolSave = () => {
    setIsAddToolOpen(false);
    setIsAddToolConfirmOpen(true);
  };

  const handleIssueToolSave = () => {
    setIsIssueToolOpen(false);
    setIsIssueToolConfirmOpen(true);
  };

  const handleReturnToolSave = () => {
    setIsReturnToolOpen(false);
    setIsReturnToolConfirmOpen(true);
  };

  return (
    <PageShell className="space-y-4 px-2 md:space-y-6 md:px-0">
      <StickyPageHeader
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Inventory" }]}
        subRow={
          <>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
              <TabsList className="h-9 w-full bg-secondary sm:w-auto">
                <TabsTrigger value="stock" className="flex-1 gap-1 text-xs sm:flex-none sm:text-sm">
                  <Package className="h-4 w-4" />
                  <span className="hidden sm:inline">Stock</span>
                </TabsTrigger>
                <TabsTrigger value="tools" className="flex-1 gap-1 text-xs sm:flex-none sm:text-sm">
                  <Wrench className="h-4 w-4" />
                  <span className="hidden sm:inline">Tools</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <InlineKpiStrip
              className="w-full sm:w-auto sm:justify-end"
              items={
                activeTab === "stock"
                  ? [
                      { label: "Line items", value: filteredItems.length },
                      { label: "Low / alert", value: lowStockCount },
                      { label: "Stock value", value: `₹${Math.round(stockValueTotal).toLocaleString("en-IN")}` },
                    ]
                  : [
                      { label: "Tools", value: toolsDataList.length },
                      { label: "In use", value: toolsInUse.length },
                      { label: "Available", value: toolsAvailableCount },
                    ]
              }
            />
          </>
        }
      />

      {/* Stock Tab */}
      {activeTab === "stock" && (
        <>
          {/* Filters & Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:gap-4">
            <div className="relative flex-1 max-w-sm">
              <Input 
                placeholder="Search inventory..." 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setStockPage(1);
                }}
              />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {masters.getInventoryCategories().map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex-1" />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="text-sm" onClick={() => setIsIssueToSiteOpen(true)}>
                <ArrowRight className="w-4 h-4 mr-2" />
                Issue to Site
              </Button>
              <Button variant="outline" className="text-sm" onClick={() => setIsReturnFromSiteOpen(true)}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Return from Site
              </Button>
              <Button className="bg-primary text-primary-foreground text-sm" onClick={() => setIsAddItemOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>
          </div>

          {/* Stock Table */}
          <DataTableShell
            maxHeight={listTableViewportMaxHeight(stockPageSize)}
            scrollResetKey={`${safeStockPage}-${stockPageSize}-${filteredItems.length}`}
            footer={
              <TablePaginationBar
                page={safeStockPage}
                pageSize={stockPageSize}
                total={filteredItems.length}
                onPageChange={setStockPage}
                onPageSizeChange={(n) => {
                  setStockPageSize(n);
                  setStockPage(1);
                }}
              />
            }
          >
            <TableHeader>
              <TableRow className={dataTableClasses.headRow}>
                <TableHead className="min-w-[180px]">Item Name</TableHead>
                <TableHead className="min-w-[100px]">Category</TableHead>
                <TableHead className="text-right min-w-[80px]">Qty</TableHead>
                <TableHead className="text-right min-w-[100px]">Purchase Rate</TableHead>
                <TableHead className="text-right min-w-[100px]">Sale Rate</TableHead>
                <TableHead className="min-w-[80px]">HSN</TableHead>
                <TableHead className="min-w-[120px]">Notes</TableHead>
                <TableHead className="min-w-[60px]">Unit</TableHead>
                <TableHead className="text-right min-w-[120px]">Total Value</TableHead>
                <TableHead className="text-center min-w-[100px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {pagedStockItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {item.alert && <AlertTriangle className="w-4 h-4 text-destructive" />}
                        <span className="text-primary font-medium text-sm">{item.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{item.category}</TableCell>
                    <TableCell className="text-right font-medium text-sm">{item.stock}</TableCell>
                    <TableCell className="text-right text-sm">₹{item.buyPrice.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-sm">₹{item.salePrice?.toLocaleString() || "-"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{item.hsn || "-"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm truncate max-w-[120px]" title={item.notes}>{item.notes || "-"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{item.unit}</TableCell>
                    <TableCell className="text-right text-sm">₹{item.value.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleItemHistoryClick(item)}
                          title="View History"
                        >
                          <History className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleEditItemClick(item)}
                          title="Edit Item"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
          </DataTableShell>
        </>
      )}

      {/* Tools Tab */}
      {activeTab === "tools" && (
        <>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:gap-4">
            <div className="relative flex-1 max-w-sm">
              <Input
                placeholder="Search tools..."
                value={toolsSearchQuery}
                onChange={(e) => {
                  setToolsSearchQuery(e.target.value);
                  setToolsPage(1);
                }}
              />
            </div>
            <Select
              value={toolsStatusFilter}
              onValueChange={(v) => {
                setToolsStatusFilter(v);
                setToolsPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="in-use">In Use</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex-1" />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="text-sm" onClick={() => setIsIssueToolOpen(true)}>
                <ArrowRight className="w-4 h-4 mr-2" />
                Issue Tool to Site
              </Button>
              <Button variant="outline" className="text-sm" onClick={() => setIsReturnToolOpen(true)}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Return to Warehouse
              </Button>
              <Button className="bg-primary text-primary-foreground" onClick={() => setIsAddToolOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Tool
              </Button>
            </div>
          </div>

          <DataTableShell
            maxHeight={listTableViewportMaxHeight(toolsPageSize)}
            scrollResetKey={`${safeToolsPage}-${toolsPageSize}-${filteredToolsList.length}`}
            footer={
              <TablePaginationBar
                page={safeToolsPage}
                pageSize={toolsPageSize}
                total={filteredToolsList.length}
                onPageChange={setToolsPage}
                onPageSizeChange={(n) => {
                  setToolsPageSize(n);
                  setToolsPage(1);
                }}
              />
            }
          >
            <TableHeader>
              <TableRow className={dataTableClasses.headRow}>
                <TableHead className="min-w-[180px]">Tool Name</TableHead>
                <TableHead className="min-w-[120px]">Assigned To</TableHead>
                <TableHead className="min-w-[120px]">Site</TableHead>
                <TableHead className="min-w-[100px]">Status</TableHead>
                <TableHead className="min-w-[100px]">Condition</TableHead>
                <TableHead className="min-w-[100px]">Last Updated</TableHead>
                <TableHead className="min-w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {pagedToolsRows.map((tool) => (
                  <TableRow key={tool.id}>
                    <TableCell className="font-medium text-sm">{tool.name}</TableCell>
                    <TableCell className={tool.assignedTo === "-" ? "text-muted-foreground text-sm" : "text-sm"}>
                      {tool.assignedTo}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{tool.site}</TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${tool.status === "Available" 
                        ? "bg-primary/10 text-primary border-0" 
                        : "bg-amber-500/10 text-amber-600 border-0"}`}
                      >
                        {tool.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {tool.condition}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{tool.lastUpdated}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7" 
                          title="Movement History"
                          onClick={() => {
                            setSelectedToolForHistory(tool);
                            setIsToolHistoryOpen(true);
                          }}
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7" 
                          title="Edit"
                          onClick={() => {
                            setSelectedToolForEdit(tool);
                            setIsEditToolOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
          </DataTableShell>
        </>
      )}


      {/* Add Item Modal */}
      <Sheet open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle>Add Inventory Item</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Item Name</Label>
              <Input placeholder="e.g., Waaree 540W Panel" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {masters.getInventoryCategories().map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pcs">Pieces</SelectItem>
                    <SelectItem value="m">Meters</SelectItem>
                    <SelectItem value="kg">Kilograms</SelectItem>
                    <SelectItem value="set">Set</SelectItem>
                    <SelectItem value="pair">Pair</SelectItem>
                    <SelectItem value="bag">Bag</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Purchase Rate (₹)</Label>
                <Input type="number" placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Sale Rate (₹)</Label>
                <Input type="number" placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Initial Quantity</Label>
                <Input type="number" placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>HSN Code</Label>
                <Input placeholder="e.g., 8541" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>GST Rate (%) *</Label>
                <Select defaultValue="18">
                  <SelectTrigger>
                    <SelectValue placeholder="Select GST Rate" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0%</SelectItem>
                    <SelectItem value="5">5%</SelectItem>
                    <SelectItem value="12">12%</SelectItem>
                    <SelectItem value="18">18%</SelectItem>
                    <SelectItem value="28">28%</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Required for invoicing</p>
              </div>
              <div className="space-y-2">
                <Label>Min. Stock Alert</Label>
                <Input type="number" placeholder="0" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea placeholder="Additional notes..." />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsAddItemOpen(false)}>Cancel</Button>
            <Button onClick={handleAddItemSave}>Add Item</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Add Item Confirmation */}
      <Sheet open={isAddItemConfirmOpen} onOpenChange={setIsAddItemConfirmOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-primary" />
              Item Added Successfully
            </SheetTitle>
          </SheetHeader>
          <p className="text-muted-foreground">The inventory item has been added successfully.</p>
          <SheetFooter>
            <Button onClick={() => setIsAddItemConfirmOpen(false)}>Done</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Edit Item Modal */}
      <Sheet open={isEditItemOpen} onOpenChange={setIsEditItemOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle>Edit Item: {selectedItemForEdit?.name}</SheetTitle>
          </SheetHeader>
          {selectedItemForEdit && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Item Name</Label>
                <Input defaultValue={selectedItemForEdit.name} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select defaultValue={selectedItemForEdit.category.toLowerCase()}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {masters.getInventoryCategories().map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select defaultValue={selectedItemForEdit.unit}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pcs">Pieces</SelectItem>
                      <SelectItem value="m">Meters</SelectItem>
                      <SelectItem value="kg">Kilograms</SelectItem>
                      <SelectItem value="set">Set</SelectItem>
                      <SelectItem value="pair">Pair</SelectItem>
                      <SelectItem value="bag">Bag</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Purchase Rate (₹)</Label>
                  <Input type="number" defaultValue={selectedItemForEdit.buyPrice} />
                </div>
                <div className="space-y-2">
                  <Label>Sale Rate (₹)</Label>
                  <Input type="number" defaultValue={selectedItemForEdit.salePrice} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Current Stock</Label>
                  <Input type="number" defaultValue={selectedItemForEdit.stock} />
                </div>
                <div className="space-y-2">
                  <Label>HSN Code</Label>
                  <Input defaultValue={selectedItemForEdit.hsn} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Min. Stock Alert</Label>
                <Input type="number" defaultValue={selectedItemForEdit.minStock} />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea defaultValue={selectedItemForEdit.notes} />
              </div>
              
              {/* Delete Button Section */}
              <div className="pt-4 border-t mt-4">
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="w-full"
                  onClick={() => {
                    setItemToDelete(selectedItemForEdit);
                    setIsEditItemOpen(false);
                    setIsDeleteItemConfirmOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Item
                </Button>
              </div>
            </div>
          )}
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsEditItemOpen(false)}>Cancel</Button>
            <Button onClick={handleEditItemSave}>Save Changes</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Edit Item Confirmation */}
      <Sheet open={isEditItemConfirmOpen} onOpenChange={setIsEditItemConfirmOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-primary" />
              Changes Saved
            </SheetTitle>
          </SheetHeader>
          <p className="text-muted-foreground">Item details have been updated successfully.</p>
          <SheetFooter>
            <Button onClick={() => setIsEditItemConfirmOpen(false)}>Done</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Item Confirmation Modal */}
      <Sheet open={isDeleteItemConfirmOpen} onOpenChange={setIsDeleteItemConfirmOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Delete Item
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Are you sure you want to delete <span className="font-semibold text-foreground">{itemToDelete?.name}</span>?
            </p>
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive font-medium">
                This action cannot be undone. All history and records for this item will be permanently removed.
              </p>
            </div>
          </div>
          <SheetFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => {
              setIsDeleteItemConfirmOpen(false);
              setItemToDelete(null);
            }}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                toast({ 
                  title: "Item Deleted", 
                  description: `${itemToDelete?.name} has been removed from inventory.` 
                });
                setIsDeleteItemConfirmOpen(false);
                setItemToDelete(null);
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Item
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Item History Modal */}
      <Sheet open={isItemHistoryOpen} onOpenChange={setIsItemHistoryOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle>Movement History: {selectedItemForHistory?.name}</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {itemMovementHistory.map((record, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div>
                  <p className="font-medium text-sm">{record.action}</p>
                  <p className="text-xs text-muted-foreground">{record.site} • By {record.by}</p>
                </div>
                <div className="text-right">
                  <p className={`font-medium text-sm ${record.action.includes("Added") || record.action.includes("Returned") ? "text-primary" : "text-amber-600"}`}>
                    {record.action.includes("Added") || record.action.includes("Returned") ? "+" : "-"}{record.quantity}
                  </p>
                  <p className="text-xs text-muted-foreground">{record.date}</p>
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Issue to Site Modal */}
      <Sheet open={isIssueToSiteOpen} onOpenChange={setIsIssueToSiteOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle>Issue Items to Site</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Site</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Choose site" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id.toString()}>{site.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Select Items</Label>
              <div className="border rounded-lg max-h-[300px] overflow-y-auto">
                {inventoryItems.slice(0, 15).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <Checkbox 
                        checked={selectedItemsToIssue[item.id] !== undefined}
                        onCheckedChange={(checked) => handleItemSelectForIssue(item.id, checked as boolean)}
                      />
                      <div>
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground">Available: {item.stock} {item.unit}</p>
                      </div>
                    </div>
                    {selectedItemsToIssue[item.id] !== undefined && (
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Qty:</Label>
                        <Input 
                          type="number" 
                          className="w-20 h-8" 
                          value={selectedItemsToIssue[item.id]}
                          onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                          max={item.stock}
                          min={1}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsIssueToSiteOpen(false)}>Cancel</Button>
            <Button onClick={handleIssueSave} disabled={Object.keys(selectedItemsToIssue).length === 0}>
              Issue Items
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Issue Confirmation */}
      <Sheet open={isIssueConfirmOpen} onOpenChange={setIsIssueConfirmOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-primary" />
              Items Issued Successfully
            </SheetTitle>
          </SheetHeader>
          <p className="text-muted-foreground">
            {Object.keys(selectedItemsToIssue).length} item(s) have been issued to the selected site.
          </p>
          <SheetFooter>
            <Button onClick={() => { setIsIssueConfirmOpen(false); setSelectedItemsToIssue({}); }}>Done</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Return from Site Modal */}
      <Sheet open={isReturnFromSiteOpen} onOpenChange={setIsReturnFromSiteOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle>Return Items from Site</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Site</Label>
              <Select value={selectedSiteForReturn} onValueChange={setSelectedSiteForReturn}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose site" />
                </SelectTrigger>
                <SelectContent>
                  {sitesWithIssuedItems.map((site) => (
                    <SelectItem key={site.id} value={site.name}>{site.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedSiteForReturn && (
              <>
                <div className="space-y-2">
                  <Label>Action</Label>
                  <Select value={returnAction} onValueChange={(v) => setReturnAction(v as "return" | "transfer")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="return">Return to Warehouse</SelectItem>
                      <SelectItem value="transfer">Transfer to Another Site</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Items at this Site</Label>
                  <div className="border rounded-lg">
                    {sitesWithIssuedItems.find(s => s.name === selectedSiteForReturn)?.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 border-b last:border-0">
                        <div>
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-muted-foreground">Issued: {item.issuedQty}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-2">
                            <Label className="text-xs">Return Qty:</Label>
                            <Input 
                              type="number" 
                              className={`w-20 h-8 ${returnErrors[item.id] ? 'border-destructive' : ''}`}
                              value={returnQuantities[item.id] || ""}
                              onChange={(e) => handleReturnQuantityChange(item.id, e.target.value)}
                              max={item.issuedQty}
                              min={0}
                            />
                          </div>
                          {returnErrors[item.id] && (
                            <p className="text-xs text-destructive flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {returnErrors[item.id]}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsReturnFromSiteOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleReturnSave} 
              disabled={!selectedSiteForReturn || Object.keys(returnErrors).length > 0}
            >
              Confirm Return
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Return Confirmation */}
      <Sheet open={isReturnConfirmOpen} onOpenChange={setIsReturnConfirmOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-primary" />
              Items Returned Successfully
            </SheetTitle>
          </SheetHeader>
          <p className="text-muted-foreground">
            Items have been {returnAction === "return" ? "returned to warehouse" : "transferred"} successfully.
          </p>
          <SheetFooter>
            <Button onClick={() => { setIsReturnConfirmOpen(false); setSelectedSiteForReturn(""); setReturnQuantities({}); }}>Done</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Add Tool Modal */}
      <Sheet open={isAddToolOpen} onOpenChange={setIsAddToolOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle>Add New Tool</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tool Name</Label>
              <Input placeholder="e.g., Drill Machine" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {toolCategories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Purchase Rate (₹)</Label>
                <Input type="number" placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Purchase Date</Label>
                <Input type="date" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Condition</Label>
              <Select defaultValue="good">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Needs Repair</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsAddToolOpen(false)}>Cancel</Button>
            <Button onClick={handleAddToolSave}>Add Tool</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Add Tool Confirmation */}
      <Sheet open={isAddToolConfirmOpen} onOpenChange={setIsAddToolConfirmOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-primary" />
              Tool Added Successfully
            </SheetTitle>
          </SheetHeader>
          <p className="text-muted-foreground">The tool has been added to the inventory.</p>
          <SheetFooter>
            <Button onClick={() => setIsAddToolConfirmOpen(false)}>Done</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Issue Tool Modal */}
      <Sheet open={isIssueToolOpen} onOpenChange={setIsIssueToolOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle>Issue Tool to Site</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Action</Label>
              <Select value={issueToolAction} onValueChange={(v) => setIssueToolAction(v as "new" | "transfer")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Issue from Warehouse</SelectItem>
                  <SelectItem value="transfer">Transfer from Another Site</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Select Tool</Label>
              <Select value={selectedToolId} onValueChange={setSelectedToolId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose tool" />
                </SelectTrigger>
                <SelectContent>
                  {issueToolAction === "new" 
                    ? toolsData.filter(t => t.status === "Available").map((tool) => (
                        <SelectItem key={tool.id} value={tool.id.toString()}>{tool.name}</SelectItem>
                      ))
                    : toolsData.filter(t => t.status === "In Use").map((tool) => (
                        <SelectItem key={tool.id} value={tool.id.toString()}>
                          {tool.name} - {tool.site} ({tool.assignedTo})
                        </SelectItem>
                      ))
                  }
                </SelectContent>
              </Select>
            </div>
            {selectedToolId && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">Condition: <span className="font-medium text-foreground">{getSelectedToolCondition()}</span></p>
                {issueToolAction === "transfer" && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Current Location: <span className="font-medium text-foreground">
                      {toolsData.find(t => t.id.toString() === selectedToolId)?.site}
                    </span>
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label>{issueToolAction === "transfer" ? "Transfer to Site" : "Assign to Site"}</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Choose site" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id.toString()}>{site.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assign to Person</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Choose person" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsIssueToolOpen(false)}>Cancel</Button>
            <Button onClick={handleIssueToolSave}>{issueToolAction === "transfer" ? "Transfer Tool" : "Issue Tool"}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Tool Movement History Modal */}
      <Sheet open={isToolHistoryOpen} onOpenChange={setIsToolHistoryOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Movement History - {selectedToolForHistory?.name}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted/30 rounded-lg flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Status</p>
                <p className="font-medium">{selectedToolForHistory?.status}</p>
              </div>
              <Badge variant="outline">{selectedToolForHistory?.condition}</Badge>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Movement Log</h4>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {/* Current location */}
                <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {selectedToolForHistory?.status === "Available" 
                        ? "Returned to Warehouse" 
                        : `Issued to ${selectedToolForHistory?.site}`}
                    </p>
                    <p className="text-xs text-muted-foreground">{selectedToolForHistory?.lastUpdated}</p>
                    {selectedToolForHistory?.status === "In Use" && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Assigned to: {selectedToolForHistory?.assignedTo}
                      </p>
                    )}
                    <Badge variant="outline" className="mt-1 text-xs">
                      Condition: {selectedToolForHistory?.condition}
                    </Badge>
                  </div>
                </div>
                {/* Sample history entries */}
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Issued to Site</p>
                    <p className="text-xs text-muted-foreground">10 Dec 2024</p>
                    <Badge variant="outline" className="mt-1 text-xs">Condition: Good</Badge>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <RotateCcw className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Returned to Warehouse</p>
                    <p className="text-xs text-muted-foreground">05 Dec 2024</p>
                    <Badge variant="outline" className="mt-1 text-xs">Condition: Good</Badge>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Added to Inventory</p>
                    <p className="text-xs text-muted-foreground">{selectedToolForHistory?.purchaseDate}</p>
                    <p className="text-xs text-muted-foreground">Purchase Rate: ₹{selectedToolForHistory?.purchaseRate?.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsToolHistoryOpen(false)}>Close</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Edit Tool Modal */}
      <Sheet open={isEditToolOpen} onOpenChange={setIsEditToolOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle>Edit Tool</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tool Name</Label>
              <Input defaultValue={selectedToolForEdit?.name} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select defaultValue={selectedToolForEdit?.category?.toLowerCase().replace(" ", "-")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {toolCategories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Purchase Rate (₹)</Label>
                <Input type="number" defaultValue={selectedToolForEdit?.purchaseRate} />
              </div>
              <div className="space-y-2">
                <Label>Purchase Date</Label>
                <Input type="date" defaultValue={selectedToolForEdit?.purchaseDate} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Condition</Label>
              <Select defaultValue={selectedToolForEdit?.condition?.toLowerCase()}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Needs Repair</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="pt-4 border-t">
              <Button 
                variant="destructive" 
                size="sm" 
                className="w-full"
                onClick={() => {
                  setIsEditToolOpen(false);
                  // In real app, would delete the tool
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Tool
              </Button>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsEditToolOpen(false)}>Cancel</Button>
            <Button onClick={() => setIsEditToolOpen(false)}>Save Changes</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Issue Tool Confirmation */}
      <Sheet open={isIssueToolConfirmOpen} onOpenChange={setIsIssueToolConfirmOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-primary" />
              Tool Issued Successfully
            </SheetTitle>
          </SheetHeader>
          <p className="text-muted-foreground">The tool has been issued to the selected site and person.</p>
          <SheetFooter>
            <Button onClick={() => { setIsIssueToolConfirmOpen(false); setSelectedToolId(""); }}>Done</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Return Tool Modal */}
      <Sheet open={isReturnToolOpen} onOpenChange={setIsReturnToolOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle>Return Tool to Warehouse</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Tool (Currently In Use)</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Choose tool" />
                </SelectTrigger>
                <SelectContent>
                  {toolsInUse.map((tool) => (
                    <SelectItem key={tool.id} value={tool.id.toString()}>
                      {tool.name} - {tool.site} ({tool.assignedTo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Condition on Return</Label>
              <Select defaultValue="good">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Needs Repair</SelectItem>
                  <SelectItem value="damaged">Damaged</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea placeholder="Any remarks about the tool condition..." />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsReturnToolOpen(false)}>Cancel</Button>
            <Button onClick={handleReturnToolSave}>Return Tool</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Return Tool Confirmation */}
      <Sheet open={isReturnToolConfirmOpen} onOpenChange={setIsReturnToolConfirmOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-primary" />
              Tool Returned Successfully
            </SheetTitle>
          </SheetHeader>
          <p className="text-muted-foreground">The tool has been returned to the warehouse.</p>
          <SheetFooter>
            <Button onClick={() => setIsReturnToolConfirmOpen(false)}>Done</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
};

export default Inventory;
