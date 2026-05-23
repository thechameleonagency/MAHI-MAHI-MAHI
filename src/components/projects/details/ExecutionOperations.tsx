import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HardHat, Users, Truck, Clock, AlertTriangle } from "lucide-react";
import type { Project } from "@/types/project";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface ExecutionOperationsProps {
  project: Project;
}

export function ExecutionOperations({ project }: ExecutionOperationsProps) {
  
  const isOutsourced = project.dealOrigin === "OUTSOURCED_INC";
  const hasExecutionScope = ["DIRECT", "PARTNER", "OUTSOURCED_INC"].includes(project.dealOrigin || "") || 
    (project.dealOrigin === "INC_TAKEN" && project.executionScope !== "none"); // simplified axiom logic

  if (!hasExecutionScope) {
    return (
      <Alert className="bg-slate-50 border-slate-200">
        <AlertTriangle className="h-5 w-5 text-slate-600" />
        <AlertTitle>Execution Out of Scope</AlertTitle>
        <AlertDescription>
          Based on the Deal Structure, MSS has no execution responsibilities for this project.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Tracking */}
        <div className="lg:col-span-2 space-y-6">
          {isOutsourced ? (
            <Card className="border-emerald-200">
              <CardHeader className="bg-emerald-50/50 pb-4 border-b border-emerald-100">
                <CardTitle className="flex items-center gap-2 text-emerald-900">
                  <Truck className="h-5 w-5" />
                  Outsourced Work Log
                  <Badge className="ml-auto bg-emerald-100 text-emerald-800 hover:bg-emerald-200">Subcontractor</Badge>
                </CardTitle>
                <CardDescription>
                  Track progress reported by the subcontractor. MSS internal attendance is disabled for this project.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-center p-8 border border-dashed rounded-lg text-muted-foreground">
                  <Truck className="h-8 w-8 mx-auto mb-3 opacity-50" />
                  No subcontractor work logs recorded yet.
                  <Button variant="outline" className="mt-4 block mx-auto">Log Subcontractor Progress</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Internal MSS Execution */}
              <Card>
                <CardHeader className="pb-4 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-600" />
                    Timeline & Progress
                  </CardTitle>
                  <CardDescription>Internal milestone tracking.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                   <div className="space-y-4">
                     {/* Simplified Timeline UI */}
                     <div className="flex gap-4 items-center">
                        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">1</div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">Site Survey</p>
                          <p className="text-xs text-muted-foreground">Pending</p>
                        </div>
                     </div>
                     <div className="w-0.5 h-6 bg-border ml-4"></div>
                     <div className="flex gap-4 items-center opacity-50">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">2</div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">Material Dispatch</p>
                          <p className="text-xs text-muted-foreground">Locked</p>
                        </div>
                     </div>
                   </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-4 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <HardHat className="h-5 w-5 text-amber-600" />
                    Field Operations (Internal)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="text-center p-6 border border-dashed rounded-lg text-muted-foreground text-sm">
                    No field tasks assigned.
                    <Button variant="outline" size="sm" className="mt-3 block mx-auto">Assign Task</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Right Column: Roster & Logistics Summary */}
        <div className="space-y-6">
          {!isOutsourced && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4" />
                  Team Roster
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground text-center py-4">
                  No internal teams assigned.
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
             <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Truck className="h-4 w-4" />
                  Logistics Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Materials Sent</span>
                    <span className="font-medium">0 items</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Site Status</span>
                    <span className="font-medium text-amber-600">Pending Prep</span>
                  </div>
                </div>
                <Button className="w-full mt-4" variant="secondary" size="sm">Open Full Logistics</Button>
              </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
