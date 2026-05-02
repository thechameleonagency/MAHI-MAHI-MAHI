import { useState, useEffect } from "react";
import { Users, TrendingUp, Wallet, Plus, ArrowUpRight, ArrowDownRight, Package, Briefcase, FileText, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { TablePaginationBar } from "@/components/data-table/TablePaginationBar";
import { dataTableClasses, listTableViewportMaxHeight, DEFAULT_TABLE_PAGE_SIZE } from "@/lib/tableConstants";
import { usePagedSlice } from "@/hooks/usePagedSlice";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

interface Partner {
  partnerId: string;
  partnerName: string;
  investmentPercent: number;
  profitSharePercent: number;
  investedAmount: number;
  partnershipModel?: "profit_share" | "fixed_backend";
  customerContractAmount?: number;
  mssFixedOrBackendAmount?: number;
  partnerPassThroughOrMargin?: number;
}

interface Transaction {
  id: string;
  date: string;
  type: "investment" | "withdrawal";
  subType?: "money" | "inventory" | "labour" | "other";
  partnerId: string;
  partnerName: string;
  amount: number;
  notes: string;
  inventoryItem?: string;
  inventoryQuantity?: number;
  labourDays?: number;
  labourRate?: number;
}

interface PartnerDistributionCardProps {
  partners: Partner[];
  totalProjectCost: number;
  projectProfit: number;
  /** Sum of invoice + sale bill totals posted against this project — revenue basis for derived share. */
  documentedProjectRevenue?: number;
  /** First partner row preview from invoiced revenue minus attributed cost (prototype). */
  derivedPartnerSharePreview?: number;
  transactions?: Transaction[];
  inventoryItems?: { id: number; name: string; quantity: number; unitPrice: number }[];
  onAddTransaction?: (transaction: Omit<Transaction, "id">) => void;
}

export default function PartnerDistributionCard({
  partners,
  totalProjectCost,
  projectProfit,
  documentedProjectRevenue,
  derivedPartnerSharePreview,
  transactions = [],
  inventoryItems = [],
  onAddTransaction,
}: PartnerDistributionCardProps) {
  const [isInvestmentModalOpen, setIsInvestmentModalOpen] = useState(false);
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [isViewTransactionsOpen, setIsViewTransactionsOpen] = useState(false);
  
  // Investment form state
  const [investmentSubType, setInvestmentSubType] = useState<"money" | "inventory" | "labour" | "other">("money");
  const [investmentAmount, setInvestmentAmount] = useState("");
  const [investmentNotes, setInvestmentNotes] = useState("");
  const [selectedInventoryItem, setSelectedInventoryItem] = useState("");
  const [inventoryQuantity, setInventoryQuantity] = useState("");
  const [labourDays, setLabourDays] = useState("");
  const [labourRate, setLabourRate] = useState("");
  const [otherDescription, setOtherDescription] = useState("");
  
  // Withdrawal form state
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [withdrawalNotes, setWithdrawalNotes] = useState("");

  const totalInvested = partners.reduce((sum, p) => sum + p.investedAmount, 0);

  const resetForms = () => {
    setInvestmentSubType("money");
    setInvestmentAmount("");
    setInvestmentNotes("");
    setSelectedInventoryItem("");
    setInventoryQuantity("");
    setLabourDays("");
    setLabourRate("");
    setOtherDescription("");
    setWithdrawalAmount("");
    setWithdrawalNotes("");
    setSelectedPartner(null);
  };

  const calculateInvestmentAmount = (): number => {
    switch (investmentSubType) {
      case "money":
        return parseFloat(investmentAmount) || 0;
      case "inventory":
        const item = inventoryItems.find(i => i.id.toString() === selectedInventoryItem);
        return item ? item.unitPrice * (parseInt(inventoryQuantity) || 0) : 0;
      case "labour":
        return (parseFloat(labourDays) || 0) * (parseFloat(labourRate) || 0);
      case "other":
        return parseFloat(investmentAmount) || 0;
      default:
        return 0;
    }
  };
  
  const handleAddInvestment = () => {
    if (!selectedPartner) {
      toast({
        title: "Error",
        description: "Please select a partner",
        variant: "destructive"
      });
      return;
    }

    const amount = calculateInvestmentAmount();
    if (amount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive"
      });
      return;
    }

    const item = inventoryItems.find(i => i.id.toString() === selectedInventoryItem);

    onAddTransaction?.({
      date: new Date().toISOString().split("T")[0],
      type: "investment",
      subType: investmentSubType,
      partnerId: selectedPartner.partnerId,
      partnerName: selectedPartner.partnerName,
      amount,
      notes: investmentSubType === "other" ? otherDescription : investmentNotes,
      inventoryItem: investmentSubType === "inventory" ? item?.name : undefined,
      inventoryQuantity: investmentSubType === "inventory" ? parseInt(inventoryQuantity) : undefined,
      labourDays: investmentSubType === "labour" ? parseFloat(labourDays) : undefined,
      labourRate: investmentSubType === "labour" ? parseFloat(labourRate) : undefined,
    });

    toast({
      title: "Investment Added",
      description: `₹${amount.toLocaleString()} ${investmentSubType} investment added for ${selectedPartner.partnerName}`,
    });

    resetForms();
    setIsInvestmentModalOpen(false);
  };

  const handleAddWithdrawal = () => {
    if (!selectedPartner) {
      toast({
        title: "Error",
        description: "Please select a partner",
        variant: "destructive"
      });
      return;
    }

    const amount = parseFloat(withdrawalAmount);
    if (!amount || amount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive"
      });
      return;
    }

    onAddTransaction?.({
      date: new Date().toISOString().split("T")[0],
      type: "withdrawal",
      partnerId: selectedPartner.partnerId,
      partnerName: selectedPartner.partnerName,
      amount,
      notes: withdrawalNotes
    });

    toast({
      title: "Withdrawal Recorded",
      description: `₹${amount.toLocaleString()} withdrawal recorded for ${selectedPartner.partnerName}`,
    });

    resetForms();
    setIsWithdrawalModalOpen(false);
  };

  const partnerTransactions = selectedPartner 
    ? transactions.filter(t => t.partnerId === selectedPartner.partnerId)
    : transactions;

  const [txnPage, setTxnPage] = useState(1);
  const [txnPageSize, setTxnPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const { pagedItems: pagedPartnerTx, safePage: safeTxnPage } = usePagedSlice(partnerTransactions, txnPage, txnPageSize);

  useEffect(() => {
    setTxnPage(1);
  }, [selectedPartner?.partnerId, partnerTransactions.length]);

  const getSubTypeIcon = (subType?: string) => {
    switch (subType) {
      case "inventory": return <Package className="w-3 h-3" />;
      case "labour": return <Briefcase className="w-3 h-3" />;
      case "other": return <FileText className="w-3 h-3" />;
      default: return <Wallet className="w-3 h-3" />;
    }
  };

  return (
    <>
      <Card className="bg-card border-amber-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-500" />
            Partnership Distribution
          </CardTitle>
          <CardDescription>
            Margin math uses internal attributed cost (<code className="text-xs">totalCost</code> roll-up). Partner/customer-visible
            contract lines do not override internal cost as the profitability source.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-muted/30 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Internal cost (basis)</p>
              <p className="text-lg font-semibold">₹{totalProjectCost.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-primary/5 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Total Invested</p>
              <p className="text-lg font-semibold text-primary">₹{totalInvested.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-blue-500/5 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Profit (customer contract − internal cost)</p>
              <p className="text-lg font-semibold text-blue-600">₹{projectProfit.toLocaleString()}</p>
            </div>
          </div>

          {(documentedProjectRevenue != null && documentedProjectRevenue > 0) || derivedPartnerSharePreview != null ? (
            <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-3 text-sm">
              <p className="text-xs font-medium text-muted-foreground">
                Partner economics preview from invoiced (customer-facing) amounts — settlement remains manual.
              </p>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                {documentedProjectRevenue != null ? (
                  <span>
                    Documented on project: <strong>₹{documentedProjectRevenue.toLocaleString()}</strong>
                  </span>
                ) : null}
                {derivedPartnerSharePreview != null ? (
                  <span>
                    First partner share preview: <strong>₹{Math.round(derivedPartnerSharePreview).toLocaleString()}</strong>
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Partner Cards */}
          <div className="space-y-2">
            {partners.map((partner) => {
              const profitShare = (projectProfit * partner.profitSharePercent) / 100;
              return (
                <div 
                  key={partner.partnerId}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => {
                    setSelectedPartner(partner);
                    setIsViewTransactionsOpen(true);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <span className="font-semibold text-amber-600">
                        {partner.partnerName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{partner.partnerName}</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {partner.investmentPercent}% Investment
                        </Badge>
                        <Badge variant="outline" className="text-xs text-blue-600">
                          {partner.profitSharePercent}% Profit
                        </Badge>
                        {partner.partnershipModel === "fixed_backend" && (
                          <Badge variant="secondary" className="text-xs">
                            Fixed backend
                          </Badge>
                        )}
                      </div>
                      {partner.partnershipModel === "fixed_backend" &&
                        (partner.customerContractAmount != null || partner.mssFixedOrBackendAmount != null) && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Sell: ₹{(partner.customerContractAmount ?? 0).toLocaleString()} · MSS fixed: ₹
                          {(partner.mssFixedOrBackendAmount ?? 0).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Invested</p>
                    <p className="font-semibold text-primary">₹{partner.investedAmount.toLocaleString()}</p>
                    <p className="text-xs text-blue-600">+₹{profitShare.toLocaleString()} profit</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Owner Investment */}
          <div className="p-3 border border-primary/20 rounded-lg bg-primary/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Owner Investment</p>
                  <p className="text-xs text-muted-foreground">Balance to be invested</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-primary">
                  ₹{(totalProjectCost - totalInvested).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Remaining</p>
              </div>
            </div>
          </div>

          {/* Two CTA Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button 
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setIsInvestmentModalOpen(true)}
            >
              <ArrowDownRight className="w-4 h-4 mr-2" />
              Record Investment
            </Button>
            <Button 
              size="sm"
              variant="outline"
              className="border-red-500/30 text-red-600 hover:bg-red-500/10"
              onClick={() => setIsWithdrawalModalOpen(true)}
            >
              <ArrowUpRight className="w-4 h-4 mr-2" />
              Record Withdrawal
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Record Investment Modal */}
      <Sheet open={isInvestmentModalOpen} onOpenChange={setIsInvestmentModalOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ArrowDownRight className="w-5 h-5 text-blue-600" />
              Record Investment
            </SheetTitle>
            <SheetDescription>
              Add investment from partner - can be money, inventory, labour, or other contributions
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Partner *</Label>
              <Select 
                value={selectedPartner?.partnerId || ""} 
                onValueChange={(val) => setSelectedPartner(partners.find(p => p.partnerId === val) || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select partner" />
                </SelectTrigger>
                <SelectContent>
                  {partners.map((partner) => (
                    <SelectItem key={partner.partnerId} value={partner.partnerId}>
                      {partner.partnerName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Investment Type *</Label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: "money", label: "Money", icon: <Wallet className="w-4 h-4" /> },
                  { value: "inventory", label: "Inventory", icon: <Package className="w-4 h-4" /> },
                  { value: "labour", label: "Labour", icon: <Briefcase className="w-4 h-4" /> },
                  { value: "other", label: "Other", icon: <FileText className="w-4 h-4" /> },
                ].map((type) => (
                  <label 
                    key={type.value}
                    className={`flex flex-col items-center justify-center gap-1 p-3 border-2 rounded-lg cursor-pointer transition-colors text-center ${
                      investmentSubType === type.value 
                        ? "border-blue-600 bg-blue-500/10" 
                        : "hover:border-blue-600/50"
                    }`}
                  >
                    <input 
                      type="radio" 
                      value={type.value} 
                      checked={investmentSubType === type.value}
                      onChange={() => setInvestmentSubType(type.value as any)}
                      className="sr-only"
                    />
                    {type.icon}
                    <span className="text-xs font-medium">{type.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Money Type */}
            {investmentSubType === "money" && (
              <div className="space-y-2">
                <Label>Amount (₹) *</Label>
                <Input 
                  type="number" 
                  placeholder="Enter amount"
                  value={investmentAmount}
                  onChange={(e) => setInvestmentAmount(e.target.value)}
                />
              </div>
            )}

            {/* Inventory Type */}
            {investmentSubType === "inventory" && (
              <>
                <div className="space-y-2">
                  <Label>Select Item *</Label>
                  <Select value={selectedInventoryItem} onValueChange={setSelectedInventoryItem}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select inventory item" />
                    </SelectTrigger>
                    <SelectContent>
                      {inventoryItems.map((item) => (
                        <SelectItem key={item.id} value={item.id.toString()}>
                          {item.name} (₹{item.unitPrice.toLocaleString()}/unit)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quantity *</Label>
                  <Input 
                    type="number" 
                    placeholder="Enter quantity"
                    value={inventoryQuantity}
                    onChange={(e) => setInventoryQuantity(e.target.value)}
                  />
                </div>
                {selectedInventoryItem && inventoryQuantity && (
                  <div className="p-3 bg-blue-500/10 rounded-lg">
                    <div className="flex justify-between">
                      <span className="text-sm">Total Value:</span>
                      <span className="font-semibold text-blue-600">₹{calculateInvestmentAmount().toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Labour Type */}
            {investmentSubType === "labour" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Days *</Label>
                    <Input 
                      type="number" 
                      placeholder="e.g. 5"
                      value={labourDays}
                      onChange={(e) => setLabourDays(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rate per Day (₹) *</Label>
                    <Input 
                      type="number" 
                      placeholder="e.g. 800"
                      value={labourRate}
                      onChange={(e) => setLabourRate(e.target.value)}
                    />
                  </div>
                </div>
                {labourDays && labourRate && (
                  <div className="p-3 bg-blue-500/10 rounded-lg">
                    <div className="flex justify-between">
                      <span className="text-sm">Total Value:</span>
                      <span className="font-semibold text-blue-600">₹{calculateInvestmentAmount().toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Other Type */}
            {investmentSubType === "other" && (
              <>
                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Textarea 
                    placeholder="Describe the contribution..."
                    value={otherDescription}
                    onChange={(e) => setOtherDescription(e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Equivalent Value (₹) *</Label>
                  <Input 
                    type="number" 
                    placeholder="Enter value"
                    value={investmentAmount}
                    onChange={(e) => setInvestmentAmount(e.target.value)}
                  />
                </div>
              </>
            )}

            {investmentSubType === "money" && (
              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Input 
                  placeholder="Transaction notes"
                  value={investmentNotes}
                  onChange={(e) => setInvestmentNotes(e.target.value)}
                />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => { resetForms(); setIsInvestmentModalOpen(false); }}>Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleAddInvestment}>
              <Check className="w-4 h-4 mr-2" />
              Add Investment
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Record Withdrawal Modal */}
      <Sheet open={isWithdrawalModalOpen} onOpenChange={setIsWithdrawalModalOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-red-600" />
              Record Withdrawal
            </SheetTitle>
            <SheetDescription>
              Record a withdrawal for partner from the project
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Partner *</Label>
              <Select 
                value={selectedPartner?.partnerId || ""} 
                onValueChange={(val) => setSelectedPartner(partners.find(p => p.partnerId === val) || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select partner" />
                </SelectTrigger>
                <SelectContent>
                  {partners.map((partner) => (
                    <SelectItem key={partner.partnerId} value={partner.partnerId}>
                      {partner.partnerName} (Invested: ₹{partner.investedAmount.toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Withdrawal Amount (₹) *</Label>
              <Input 
                type="number" 
                placeholder="Enter amount"
                value={withdrawalAmount}
                onChange={(e) => setWithdrawalAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea 
                placeholder="Reason for withdrawal..."
                value={withdrawalNotes}
                onChange={(e) => setWithdrawalNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => { resetForms(); setIsWithdrawalModalOpen(false); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleAddWithdrawal}>
              <ArrowUpRight className="w-4 h-4 mr-2" />
              Record Withdrawal
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* View Transactions Modal */}
      <Sheet open={isViewTransactionsOpen} onOpenChange={setIsViewTransactionsOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] h-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {selectedPartner ? `${selectedPartner.partnerName}'s Transactions` : "All Transactions"}
            </SheetTitle>
          </SheetHeader>
          <div className="py-4">
            {partnerTransactions.length > 0 ? (
              <DataTableShell
                maxHeight={listTableViewportMaxHeight(txnPageSize)}
                scrollResetKey={`${safeTxnPage}-${txnPageSize}-${partnerTransactions.length}-${selectedPartner?.partnerId ?? "all"}`}
                footer={
                  <TablePaginationBar
                    page={safeTxnPage}
                    pageSize={txnPageSize}
                    total={partnerTransactions.length}
                    onPageChange={setTxnPage}
                    onPageSizeChange={(n) => {
                      setTxnPageSize(n);
                      setTxnPage(1);
                    }}
                  />
                }
              >
                <TableHeader>
                  <TableRow className={dataTableClasses.headRow}>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    {!selectedPartner && <TableHead>Partner</TableHead>}
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedPartnerTx.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-muted-foreground">{tx.date}</TableCell>
                      <TableCell>
                        <Badge className={`${tx.type === "investment" ? "bg-blue-500/10 text-blue-600" : "bg-red-500/10 text-red-600"} flex w-fit items-center gap-1`}>
                          {getSubTypeIcon(tx.subType)}
                          {tx.type}
                          {tx.subType && tx.subType !== "money" && ` (${tx.subType})`}
                        </Badge>
                      </TableCell>
                      {!selectedPartner && <TableCell>{tx.partnerName}</TableCell>}
                      <TableCell className={`text-right font-medium ${tx.type === "investment" ? "text-blue-600" : "text-red-600"}`}>
                        {tx.type === "investment" ? "+" : "-"}₹{tx.amount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </DataTableShell>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No transactions recorded yet</p>
              </div>
            )}
          </div>
          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setIsViewTransactionsOpen(false)}>Close</Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
