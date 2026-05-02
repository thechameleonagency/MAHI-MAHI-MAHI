import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { 
  Calendar, 
  IndianRupee, 
  MapPin, 
  Clock, 
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { 
  dummyLeaveRequests, 
  dummyExpenseRequests, 
  dummyBlockageResolutionRequests,
  type LeaveRequest,
  type ExpenseRequest,
  type BlockageResolutionRequest
} from "@/data/notificationsData";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";

// Detail Modal Component
interface DetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "leave" | "expense" | "blockage";
  data: LeaveRequest | ExpenseRequest | BlockageResolutionRequest | null;
  onApprove: () => void;
  onReject: () => void;
}

const DetailModal = ({ open, onOpenChange, type, data, onApprove, onReject }: DetailModalProps) => {
  if (!data) return null;

  const renderContent = () => {
    if (type === "leave") {
      const leave = data as LeaveRequest;
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 bg-primary">
              <AvatarFallback className="text-lg font-bold">{leave.employeeAvatar}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-lg">{leave.employeeName}</h3>
              <Badge variant="outline">{leave.leaveType}</Badge>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">Start Date</p>
              <p className="font-medium">{format(new Date(leave.startDate), "dd MMM yyyy")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">End Date</p>
              <p className="font-medium">{format(new Date(leave.endDate), "dd MMM yyyy")}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">Duration</p>
              <p className="font-medium">
                {leave.leaveType === "Half Day" ? "Half Day" : 
                  `${Math.ceil((new Date(leave.endDate).getTime() - new Date(leave.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} Day(s)`}
              </p>
            </div>
          </div>
          
          <div>
            <p className="text-xs text-muted-foreground mb-1">Reason</p>
            <p className="text-sm bg-muted/30 p-3 rounded-lg">{leave.reason}</p>
          </div>
          
          <div className="text-xs text-muted-foreground">
            Requested on {format(new Date(leave.requestedAt), "dd MMM yyyy, hh:mm a")}
          </div>
        </div>
      );
    }
    
    if (type === "expense") {
      const expense = data as ExpenseRequest;
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 bg-primary">
                <AvatarFallback>{expense.employeeName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">{expense.employeeName}</h3>
                <Badge variant="outline">{expense.category}</Badge>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">₹{expense.amount.toLocaleString()}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="font-medium">{format(new Date(expense.date), "dd MMM yyyy")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Project</p>
              <p className="font-medium text-sm">{expense.projectName}</p>
            </div>
          </div>
          
          <div>
            <p className="text-xs text-muted-foreground mb-1">Description</p>
            <p className="text-sm bg-muted/30 p-3 rounded-lg">{expense.description}</p>
          </div>
          
          <div className="text-xs text-muted-foreground">
            Requested on {format(new Date(expense.requestedAt), "dd MMM yyyy, hh:mm a")}
          </div>
        </div>
      );
    }
    
    if (type === "blockage") {
      const blockage = data as BlockageResolutionRequest;
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <h3 className="font-semibold">{blockage.blockageTitle}</h3>
              <p className="text-sm text-muted-foreground">{blockage.projectName}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">Marked By</p>
              <p className="font-medium">{blockage.markedBy}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Resolution Date</p>
              <p className="font-medium">{format(new Date(blockage.resolutionDate), "dd MMM yyyy")}</p>
            </div>
          </div>
          
          <div>
            <p className="text-xs text-muted-foreground mb-1">Resolution Notes</p>
            <p className="text-sm bg-muted/30 p-3 rounded-lg">{blockage.notes}</p>
          </div>
          
          <div className="text-xs text-muted-foreground">
            Submitted on {format(new Date(blockage.requestedAt), "dd MMM yyyy, hh:mm a")}
          </div>
        </div>
      );
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
        <SheetHeader>
          <SheetTitle>
            {type === "leave" && "Leave Request Details"}
            {type === "expense" && "Expense Request Details"}
            {type === "blockage" && "Blockage Resolution Details"}
          </SheetTitle>
        </SheetHeader>
        
        {renderContent()}
        
        <div className="flex gap-3 mt-4">
          <Button 
            variant="outline" 
            className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={onReject}
          >
            <XCircle className="w-4 h-4 mr-2" />
            Reject
          </Button>
          <Button 
            className="flex-1"
            onClick={onApprove}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Approve
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

const Notifications = () => {
  const [activeTab, setActiveTab] = useState("leave");
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<LeaveRequest | ExpenseRequest | BlockageResolutionRequest | null>(null);
  const [selectedType, setSelectedType] = useState<"leave" | "expense" | "blockage">("leave");
  
  // Local state for notifications (to simulate approve/reject)
  const [leaveRequests, setLeaveRequests] = useState(dummyLeaveRequests.filter(r => r.status === "pending"));
  const [expenseRequests, setExpenseRequests] = useState(dummyExpenseRequests.filter(r => r.status === "pending"));
  const [blockageRequests, setBlockageRequests] = useState(dummyBlockageResolutionRequests.filter(r => r.status === "pending_verification"));

  const handleViewDetails = (type: "leave" | "expense" | "blockage", item: LeaveRequest | ExpenseRequest | BlockageResolutionRequest) => {
    setSelectedType(type);
    setSelectedItem(item);
    setDetailModalOpen(true);
  };

  const handleApprove = () => {
    if (!selectedItem) return;
    
    if (selectedType === "leave") {
      setLeaveRequests(prev => prev.filter(r => r.id !== selectedItem.id));
    } else if (selectedType === "expense") {
      setExpenseRequests(prev => prev.filter(r => r.id !== selectedItem.id));
    } else {
      setBlockageRequests(prev => prev.filter(r => r.id !== selectedItem.id));
    }
    
    setDetailModalOpen(false);
    setSelectedItem(null);
  };

  const handleReject = () => {
    if (!selectedItem) return;
    
    if (selectedType === "leave") {
      setLeaveRequests(prev => prev.filter(r => r.id !== selectedItem.id));
    } else if (selectedType === "expense") {
      setExpenseRequests(prev => prev.filter(r => r.id !== selectedItem.id));
    } else {
      setBlockageRequests(prev => prev.filter(r => r.id !== selectedItem.id));
    }
    
    setDetailModalOpen(false);
    setSelectedItem(null);
  };

  const totalPending = leaveRequests.length + expenseRequests.length + blockageRequests.length;

  const getLeaveTypeBadgeColor = (type: string) => {
    switch (type) {
      case "Sick Leave": return "bg-red-500/10 text-red-500 border-red-500/20";
      case "Casual Leave": return "bg-accent text-foreground border-border/60";
      case "Emergency Leave": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "Paid Leave": return "bg-accent text-foreground border-border/60";
      case "Half Day": return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case "Travel": return "bg-accent text-foreground border-border/60";
      case "Materials": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "Food": return "bg-accent text-foreground border-border/60";
      case "Tools": return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "Fuel": return "bg-red-500/10 text-red-500 border-red-500/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <PageShell>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="space-y-6">
          <StickyPageHeader
            breadcrumbs={[{ label: "Home", to: "/" }, { label: "Notifications" }]}
            subRow={
              <>
                <TabsList className="grid h-9 w-full max-w-md grid-cols-3 sm:w-auto">
                  <TabsTrigger value="leave" className="gap-1.5 text-xs sm:text-sm">
                    Leave
                    {leaveRequests.length > 0 && (
                      <Badge variant="secondary" className="h-5 min-w-[20px] px-1.5 text-xs">
                        {leaveRequests.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="expense" className="gap-1.5 text-xs sm:text-sm">
                    Expenses
                    {expenseRequests.length > 0 && (
                      <Badge variant="secondary" className="h-5 min-w-[20px] px-1.5 text-xs">
                        {expenseRequests.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="blockage" className="gap-1.5 text-xs sm:text-sm">
                    Blockages
                    {blockageRequests.length > 0 && (
                      <Badge variant="secondary" className="h-5 min-w-[20px] px-1.5 text-xs">
                        {blockageRequests.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
                <InlineKpiStrip
                  className="w-full sm:w-auto sm:justify-end"
                  items={[
                    { label: "Leave", value: leaveRequests.length },
                    { label: "Expenses", value: expenseRequests.length },
                    { label: "Blockages", value: blockageRequests.length },
                    { label: "Total pending", value: totalPending },
                  ]}
                />
              </>
            }
          >
            {totalPending > 0 && (
              <Badge variant="destructive" className="px-2 py-0.5 text-xs">{totalPending} pending</Badge>
            )}
          </StickyPageHeader>

          {/* Leave Requests Tab */}
        <TabsContent value="leave" className="mt-0">
          {leaveRequests.length === 0 ? (
            <Card className="bg-card">
              <CardContent className="py-12 text-center">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No pending leave requests</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {leaveRequests.map((request) => (
                <Card key={request.id} className="bg-card hover:shadow-lg transition-all cursor-pointer" onClick={() => handleViewDetails("leave", request)}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-11 w-11 bg-primary/10">
                        <AvatarFallback className="text-primary font-medium">
                          {request.employeeAvatar}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-medium">{request.employeeName}</h4>
                          <Badge className={`text-xs ${getLeaveTypeBadgeColor(request.leaveType)}`}>
                            {request.leaveType}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>
                            {format(new Date(request.startDate), "dd MMM")}
                            {request.startDate !== request.endDate && 
                              ` - ${format(new Date(request.endDate), "dd MMM")}`}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {request.reason}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t flex items-center justify-between">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(request.requestedAt), "dd MMM, hh:mm a")}
                      </span>
                      <Button size="sm" variant="outline">View Details</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Expense Requests Tab */}
        <TabsContent value="expense" className="mt-0">
          {expenseRequests.length === 0 ? (
            <Card className="bg-card">
              <CardContent className="py-12 text-center">
                <IndianRupee className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No pending expense requests</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {expenseRequests.map((request) => (
                <Card key={request.id} className="bg-card hover:shadow-lg transition-all cursor-pointer" onClick={() => handleViewDetails("expense", request)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <Avatar className="h-11 w-11 bg-primary/10">
                          <AvatarFallback className="text-primary font-medium">
                            {request.employeeName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium">{request.employeeName}</h4>
                          <Badge className={`text-xs mt-1 ${getCategoryBadgeColor(request.category)}`}>
                            {request.category}
                          </Badge>
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <MapPin className="w-3.5 h-3.5" />
                            <span className="truncate">{request.projectName}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-primary">₹{request.amount.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(request.date), "dd MMM")}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                      {request.description}
                    </p>
                    <div className="mt-3 pt-3 border-t flex items-center justify-between">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(request.requestedAt), "dd MMM, hh:mm a")}
                      </span>
                      <Button size="sm" variant="outline">View Details</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Blockage Requests Tab */}
        <TabsContent value="blockage" className="mt-0">
          {blockageRequests.length === 0 ? (
            <Card className="bg-card">
              <CardContent className="py-12 text-center">
                <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No pending blockage resolutions to verify</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {blockageRequests.map((request) => (
                <Card key={request.id} className="bg-card hover:shadow-lg transition-all cursor-pointer" onClick={() => handleViewDetails("blockage", request)}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-11 w-11 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium">{request.blockageTitle}</h4>
                        <p className="text-sm text-muted-foreground">{request.projectName}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <span>Resolved by: <span className="font-medium text-foreground">{request.markedBy}</span></span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                      {request.notes}
                    </p>
                    <div className="mt-3 pt-3 border-t flex items-center justify-between">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(request.resolutionDate), "dd MMM yyyy")}
                      </span>
                      <Button size="sm" variant="outline">View Details</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        </div>
      </Tabs>

      <DetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        type={selectedType}
        data={selectedItem}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </PageShell>
  );
};

export default Notifications;
