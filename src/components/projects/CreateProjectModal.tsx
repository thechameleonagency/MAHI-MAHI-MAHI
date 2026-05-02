import { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, User, MapPin, IndianRupee, Zap, Plus, Info, Users } from "lucide-react";
import { useAppData } from "@/contexts/AppDataContext";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import type { Project, ProjectPartnerType } from "@/types/project";
import type { ProjectIntakePayload } from "@/application/services/ProjectKindService";
import { projectKindConfigSnapshot } from "@/lib/projectNormalize";
import { useNavigate } from "react-router-dom";

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateProjectModal = ({ open, onOpenChange }: CreateProjectModalProps) => {
  const navigate = useNavigate();
  const { 
    partners, 
    customers, 
    getProjectEligibleQuotations, 
    createProjectIntake, 
    generateId 
  } = useAppData();

  const [step, setStep] = useState(1);
  const [dealType, setDealType] = useState<Project["dealType"]>("Solo");
  
  // Basic Info
  const [projectName, setProjectName] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [projectType, setProjectType] = useState<Project["projectType"]>("Residential");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("");
  const [contractAmount, setContractAmount] = useState("");
  
  // Quotation Link
  const [selectedQuotationId, setSelectedQuotationId] = useState<string | undefined>();
  
  // Partner Info
  const [selectedPartnerId, setSelectedPartnerId] = useState("");
  const [partnerType, setPartnerType] = useState<ProjectPartnerType>("profit");
  const [partnerShare, setPartnerShare] = useState(""); // percentage, fixed amount, or fee

  const eligibleQuotations = useMemo(() => getProjectEligibleQuotations(), [getProjectEligibleQuotations]);

  const resetForm = () => {
    setStep(1);
    setDealType("Solo");
    setProjectName("");
    setSelectedCustomerId("");
    setProjectType("Residential");
    setLocation("");
    setCapacity("");
    setContractAmount("");
    setSelectedQuotationId(undefined);
    setSelectedPartnerId("");
    setPartnerType("profit");
    setPartnerShare("");
  };

  const handleQuotationSelect = (qId: string) => {
    const q = eligibleQuotations.find(x => x.id === qId);
    if (q) {
      setSelectedQuotationId(q.id);
      setProjectName(`${q.clientName} - ${q.systemCapacity}kW`);
      setSelectedCustomerId(q.customerId);
      setCapacity(q.systemCapacity || "");
      setContractAmount(String(q.clientAgreedAmount || q.totalAmount || ""));
      setStep(2);
    }
  };

  const handleCreate = async () => {
    if (!projectName || !selectedCustomerId || !capacity) {
      toast({ title: "Missing fields", description: "Please fill in project name, customer and capacity.", variant: "destructive" });
      return;
    }

    const projectId = generateId("P");
    const customer = customers.find(c => c.id === selectedCustomerId);
    
    const kindMap: Record<Project["dealType"], Project["projectKind"]> = {
      Solo: "SOLO_EPC",
      Partner: "PARTNER_EPC",
      Fixed: "FIXED_EPC",
      Vendorship: "VENDOR_NETWORK",
      INC: "INC"
    };
    const mappedKind = kindMap[dealType];

    const projectData: Project = {
      id: projectId,
      name: projectName,
      dealType,
      projectKind: mappedKind,
      projectKindConfigSnapshot: projectKindConfigSnapshot(mappedKind),
      type: dealType === "INC" ? "INC" : "EPC",
      projectType,
      projectCategory: "solar",
      ownerType: dealType === "Solo" ? "solo" : "partnership",
      lifecycleStatus: "Active",
      status: "Ongoing",
      client: customer?.name || "Unknown Customer",
      customerId: selectedCustomerId,
      capacity,
      location,
      contractAmount: parseFloat(contractAmount) || 0,
      totalCost: 0,
      amountReceived: 0,
      startDate: new Date().toISOString().split("T")[0],
      endDate: null,
      createdAt: new Date().toISOString(),
      assignees: [],
      onSite: 0,
      photos: 0,
      quotationId: selectedQuotationId,
    };

    if (dealType !== "Solo" && selectedPartnerId) {
      const partner = partners.find(p => p.id === selectedPartnerId);
      if (partner) {
        projectData.partners = [{
          partnerId: partner.id,
          partnerName: partner.name,
          partnerType: partnerType,
          sharePercentage: partnerType === "profit" ? parseFloat(partnerShare) : undefined,
          fixedAmount: partnerType === "fixed" ? parseFloat(partnerShare) : undefined,
          feeAmount: partnerType === "vendorship" ? parseFloat(partnerShare) : undefined,
          calculatedEarning: 0,
          settlementDirection: "company_pays_partner"
        }];
      }
    }

    const intakePayload: ProjectIntakePayload = {
      kind: mappedKind,
      parties: {
        customer: customer?.name || "Unknown Customer",
        vendorOrDiscom: "TBD"
      },
      commercial: {
        contractAmount: parseFloat(contractAmount) || 0,
        paymentType: "cash",
        internalCostEstimate: 0
      }
    };

    const res = await createProjectIntake({
      project: projectData,
      intake: intakePayload,
      quotationId: selectedQuotationId
    });

    if (res.ok) {
      toast({ title: "Project Created", description: `${projectName} has been successfully created.` });
      onOpenChange(false);
      resetForm();
      navigate(`/projects/${res.projectId || projectId}`);
    } else {
      toast({ title: "Error", description: res.error, variant: "destructive" });
    }
  };

  const dealTypes: { id: Project["dealType"]; label: string; icon: any; desc: string }[] = [
    { id: "Solo", label: "Solo", icon: User, desc: "Direct deal. No partners." },
    { id: "Partner", label: "Partner", icon: Users, desc: "Profit sharing deal." },
    { id: "Fixed", label: "Fixed", icon: IndianRupee, desc: "Fixed backend margin deal." },
    { id: "Vendorship", label: "Vendorship", icon: ShieldCheck, desc: "Usage of license fee deal." },
    { id: "INC", label: "INC", icon: Zap, desc: "Labour / Service only work." },
  ];

  return (
    <Sheet open={open} onOpenChange={(v) => { if(!v) resetForm(); onOpenChange(v); }}>
      <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] p-0 overflow-hidden bg-background border-none shadow-2xl overflow-y-auto custom-scrollbar">
        <SheetHeader className="p-6 bg-primary/5 border-b">
          <SheetTitle className="flex items-center gap-2 text-xl">
            <Briefcase className="h-6 w-6 text-primary" />
            Launch New Project
          </SheetTitle>
          <SheetDescription>
            {step === 1 ? "Select the scenario for this deal." : "Configure project details and commercials."}
          </SheetDescription>
        </SheetHeader>

        <div className="p-6">
          {step === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {dealTypes.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setDealType(t.id); setStep(2); }}
                    className={`flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all hover:shadow-md ${
                      dealType === t.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${dealType === t.id ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                      <t.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{t.label}</p>
                      <p className="text-xs text-muted-foreground">{t.desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              {dealType === "Solo" && eligibleQuotations.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Or Convert Existing Quotation</Label>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                    {eligibleQuotations.map(q => (
                      <div 
                        key={q.id} 
                        className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors flex justify-between items-center group"
                        onClick={() => handleQuotationSelect(q.id)}
                      >
                        <div>
                          <p className="text-sm font-medium">{q.clientName}</p>
                          <p className="text-xs text-muted-foreground">{q.quotationNumber} • {q.systemCapacity}kW • ₹{q.clientAgreedAmount?.toLocaleString()}</p>
                        </div>
                        <Plus className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>Project Name</Label>
                  <Input 
                    placeholder="e.g., Sharma Residency 5kW" 
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Customer</Label>
                  <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Project Type</Label>
                  <Select value={projectType} onValueChange={(v: any) => setProjectType(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Residential">Residential</SelectItem>
                      <SelectItem value="Commercial">Commercial</SelectItem>
                      <SelectItem value="Industrial">Industrial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input 
                    placeholder="City / Site Area" 
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Capacity (kW)</Label>
                  <Input 
                    placeholder="e.g., 5" 
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Contract Value (₹)</Label>
                  <Input 
                    type="number"
                    placeholder="Total deal amount" 
                    value={contractAmount}
                    onChange={(e) => setContractAmount(e.target.value)}
                  />
                </div>
              </div>

              {dealType !== "Solo" && dealType !== "INC" && (
                <div className="p-4 rounded-xl bg-muted/30 border border-dashed space-y-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold uppercase tracking-wider">Partner Economics</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Select Partner</Label>
                      <Select value={selectedPartnerId} onValueChange={setSelectedPartnerId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Which partner?" />
                        </SelectTrigger>
                        <SelectContent>
                          {partners.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Earning Model</Label>
                      <Select value={partnerType} onValueChange={(v: any) => setPartnerType(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="profit">Profit Sharing (%)</SelectItem>
                          <SelectItem value="fixed">Fixed Share (₹)</SelectItem>
                          <SelectItem value="vendorship">Vendorship Fee (₹)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 col-span-2">
                      <Label>
                        {partnerType === "profit" ? "Profit Percentage (%)" : partnerType === "fixed" ? "Fixed Margin / Share (₹)" : "Vendorship Fee (₹)"}
                      </Label>
                      <Input 
                        type="number"
                        placeholder="Enter value" 
                        value={partnerShare}
                        onChange={(e) => setPartnerShare(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-muted/50 p-2 rounded">
                <Info className="h-3 w-3" />
                <span>
                  {dealType === "Solo" ? "Full project control and revenue goes to company." : 
                   dealType === "Partner" ? "Profit is shared with the partner after all costs." :
                   dealType === "Fixed" ? "Partner takes margin above fixed backend amount." :
                   dealType === "Vendorship" ? "Partner pays a flat fee for using your credentials." :
                   "Focus is strictly on execution and labour management."}
                </span>
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="p-6 bg-muted/20 border-t flex items-center justify-between">
          {step === 2 && (
            <Button variant="ghost" onClick={() => setStep(1)}>
              Back to Type
            </Button>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            {step === 2 && (
              <Button onClick={handleCreate} className="bg-primary hover:bg-primary/90">
                Confirm & Create
              </Button>
            )}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

function ShieldCheck(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}
