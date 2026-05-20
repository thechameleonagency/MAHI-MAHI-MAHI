import { useState } from "react";
import {
  Check,
  Building2,
  Handshake,
  Users,
  FileText,
  MapPin,
  User,
  Phone,
  IndianRupee,
  Calendar,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateInput } from "@/components/ui/DateInput";
import { formatINR } from "@/lib/formatCurrency";
import type { ProjectTeamAssignmentDraft, ProjectConfirmationViewModel } from "@/lib/projectTeamAssignment";

export type { ProjectConfirmationViewModel as ProjectConfirmationData };

export interface ProjectConfirmationEmployeeOption {
  id: string;
  name: string;
}

interface ProjectConfirmationScreenProps {
  data: ProjectConfirmationViewModel;
  employees: ProjectConfirmationEmployeeOption[];
  onConfirm: (team: ProjectTeamAssignmentDraft) => void;
  onEdit: () => void;
}

export default function ProjectConfirmationScreen({
  data,
  employees,
  onConfirm,
  onEdit,
}: ProjectConfirmationScreenProps) {
  const [primaryAssigneeId, setPrimaryAssigneeId] = useState<string>("");
  const [targetEndDate, setTargetEndDate] = useState("");

  const getOwnerTypeBadge = () => {
    switch (data.ownerType) {
      case "partnership":
        return (
          <Badge className="bg-warning/10 text-warning border-warning/20">
            <Handshake className="w-3 h-3 mr-1" />
            Partnership
          </Badge>
        );
      case "outsourced":
        return (
          <Badge className="bg-primary/10 text-primary border-primary/20">
            <Users className="w-3 h-3 mr-1" />
            Outsourced
          </Badge>
        );
      default:
        return (
          <Badge className="bg-primary/10 text-primary border-primary/20">
            <Building2 className="w-3 h-3 mr-1" />
            Solo
          </Badge>
        );
    }
  };

  const handleConfirm = () => {
    onConfirm({
      primaryAssigneeId: primaryAssigneeId && primaryAssigneeId !== "__none__" ? primaryAssigneeId : undefined,
      targetEndDate: targetEndDate.trim() || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Confirm Project Details</h2>
        <p className="text-muted-foreground mt-1">Review details and optionally assign a lead before creating the project</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{data.name}</CardTitle>
            {getOwnerTypeBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Type</p>
              <div className="flex gap-2">
                <Badge variant="outline">{data.type}</Badge>
                <Badge variant="outline">{data.projectType}</Badge>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <User className="w-3 h-3" />
                Client
              </p>
              <p className="font-medium">{data.client}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Location
              </p>
              <p className="font-medium">{data.location}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Capacity</p>
              <p className="font-medium">{data.capacity}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <IndianRupee className="w-3 h-3" />
                Contract Value
              </p>
              <p className="font-semibold text-primary text-lg tabular-nums">{formatINR(data.contractAmount)}</p>
            </div>
            {data.referredBy && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Referred By</p>
                <p className="font-medium">{data.referredBy}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {data.quotationId && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Linked Quotation</p>
              <p className="font-semibold">{data.quotationNumber || data.quotationId}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-warning/30 bg-warning/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-warning" />
            Team &amp; schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Assign a primary lead and target end date now, or skip — the project will show an &quot;Assign team&quot; reminder until someone is assigned.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Primary assignee (optional)</Label>
              <Select value={primaryAssigneeId || "__none__"} onValueChange={setPrimaryAssigneeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Assign later" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Assign later</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Target end date (optional)</Label>
              <DateInput value={targetEndDate} onChange={setTargetEndDate} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onEdit}>
          Edit Details
        </Button>
        <Button className="flex-1 bg-primary text-primary-foreground" onClick={handleConfirm}>
          <Check className="w-4 h-4 mr-2" />
          Confirm &amp; Create
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
        <Calendar className="w-3 h-3" />
        Project will be created with today&apos;s date as start date
      </p>
    </div>
  );
}
