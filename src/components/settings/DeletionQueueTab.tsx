import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, ExternalLink, Trash2, XCircle } from "lucide-react";
import { useAppData } from "@/contexts/AppDataContext";
import { useAppSession } from "@/app/providers/AppSessionProvider";
import { useCan } from "@/hooks/useCan";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { dataTableClasses, listTableViewportMaxHeight } from "@/lib/tableConstants";
import { ListEmptyState } from "@/components/ui/ListEmptyState";
import { formatUiDate } from "@/lib/formatUiDate";
import { toast } from "@/hooks/use-toast";
import { friendlyCommandErrorMessage } from "@/lib/commandErrorMessages";
import type { DeletionRequest } from "@/types/blockage";
import {
  deletionRequestEntityHref,
  formatDeletionEntityType,
} from "@/lib/deletionRequestResolution";

type StatusFilter = "pending" | "all" | "approved" | "rejected";

function statusBadge(status: DeletionRequest["status"]) {
  switch (status) {
    case "pending":
      return (
        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
          Pending
        </Badge>
      );
    case "approved":
      return (
        <Badge variant="outline" className="bg-accent text-foreground border-border/80">
          Approved
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
          Rejected
        </Badge>
      );
  }
}

export function DeletionQueueTab() {
  const { deletionRequests, approveDeletionRequest, rejectDeletionRequest } = useAppData();
  const { demoUserName } = useAppSession();
  const canResolve = useCan("settingsDeletionQueue", "edit");

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [rejectTarget, setRejectTarget] = useState<DeletionRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const pendingCount = useMemo(
    () => (deletionRequests ?? []).filter((r) => r.status === "pending").length,
    [deletionRequests],
  );

  const filtered = useMemo(() => {
    const rows = [...(deletionRequests ?? [])].sort(
      (a, b) => b.requestedAt.localeCompare(a.requestedAt),
    );
    if (statusFilter === "all") return rows;
    return rows.filter((r) => r.status === statusFilter);
  }, [deletionRequests, statusFilter]);

  const handleApprove = (req: DeletionRequest) => {
    const result = approveDeletionRequest(req.id, demoUserName || "Admin");
    if (!result.ok) {
      // DS7: route raw command errors through `friendlyCommandErrorMessage` so users see
      // human-readable copy instead of bare codes like `QUOTATION_NOT_FOUND`.
      toast({
        title: "Cannot approve deletion",
        description: friendlyCommandErrorMessage(result.error ?? "Approval failed"),
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Deletion approved",
      description: `${req.entityName} was removed after admin approval.`,
    });
  };

  const submitReject = () => {
    if (!rejectTarget) return;
    const reason = rejectReason.trim();
    if (!reason) {
      toast({
        title: "Rejection reason required",
        description: "Explain why this deletion request was denied.",
        variant: "destructive",
      });
      return;
    }
    rejectDeletionRequest(rejectTarget.id, reason, demoUserName || "Admin");
    toast({
      title: "Deletion rejected",
      description: `${rejectTarget.entityName} will be retained.`,
    });
    setRejectTarget(null);
    setRejectReason("");
  };

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Deletion queue
            {pendingCount > 0 ? (
              <Badge variant="secondary" className="tabular-nums">
                {pendingCount} pending
              </Badge>
            ) : null}
          </CardTitle>
          <CardDescription>
            Review field and ops deletion requests before records are purged. Pending items also
            appear under Notifications.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending only</SelectItem>
                  <SelectItem value="all">All requests</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <ListEmptyState
              icon={Trash2}
              title={statusFilter === "pending" ? "No pending deletions" : "No matching requests"}
              description={
                statusFilter === "pending"
                  ? "New requests from the pipeline will appear here for admin review."
                  : "Change the status filter to see historical decisions."
              }
            />
          ) : (
            <DataTableShell variant="inline" maxHeight={listTableViewportMaxHeight(10)}>
              <TableHeader>
                <TableRow className={dataTableClasses.headRow}>
                  <TableHead>Entity</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium max-w-[12rem]">
                      <div className="space-y-0.5">
                        <span className="line-clamp-2">{req.entityName}</span>
                        <span className="text-2xs text-muted-foreground font-mono">{req.entityId}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{formatDeletionEntityType(req.entityType)}</TableCell>
                    <TableCell className="max-w-[14rem] text-sm text-muted-foreground">
                      <p className="line-clamp-2">{req.reason}</p>
                      {req.relatedEntities.length > 0 ? (
                        <p className="text-2xs mt-1 text-muted-foreground/80">
                          {req.relatedEntities.length} linked row(s)
                        </p>
                      ) : null}
                      {req.rejectionReason ? (
                        <p className="text-2xs mt-1 text-destructive">Denied: {req.rejectionReason}</p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      <div>{req.requestedBy}</div>
                      <div className="text-2xs">{formatUiDate(req.requestedAt, "dd MMM yyyy")}</div>
                    </TableCell>
                    <TableCell>{statusBadge(req.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-8" asChild>
                          <Link to={deletionRequestEntityHref(req)}>
                            <ExternalLink className="h-3.5 w-3.5 mr-1" />
                            Open
                          </Link>
                        </Button>
                        {req.status === "pending" && canResolve ? (
                          <>
                            <Button
                              size="sm"
                              className="h-8"
                              onClick={() => handleApprove(req)}
                            >
                              <Check className="h-3.5 w-3.5 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 border-destructive/40 text-destructive"
                              onClick={() => {
                                setRejectTarget(req);
                                setRejectReason("");
                              }}
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              Reject
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </DataTableShell>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject deletion request</DialogTitle>
            <DialogDescription>
              {rejectTarget
                ? `${formatDeletionEntityType(rejectTarget.entityType)} ${rejectTarget.entityName} will be kept.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Reason</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Retain for audit trail / linked project still active"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={submitReject}>
              Reject request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
