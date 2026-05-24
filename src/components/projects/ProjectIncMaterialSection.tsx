import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAppData } from "@/contexts/AppDataContext";
import type { Project } from "@/types/project";
import { Package } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ProjectIncMaterialSectionProps {
  project: Project;
}

export function ProjectIncMaterialSection({ project }: ProjectIncMaterialSectionProps) {
  const { updateProject } = useAppData();
  const enabled = Boolean(project.scope?.hasMaterial);

  const toggle = (checked: boolean) => {
    updateProject(project.id, {
      scope: {
        ...project.scope,
        hasMaterial: checked,
        materialSupplyPending: !checked,
      },
    });
    toast({
      title: checked ? "Material supply enabled" : "Material supply disabled",
      description: checked
        ? "Materials Sent tab is now available for this INC project."
        : "Dispatch materials when you are ready to supply from inventory.",
    });
  };

  return (
    <Card className="border-amber-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="h-4 w-4" />
          Material supply
        </CardTitle>
        <CardDescription>
          INC labor is always in scope. Enable when MSS will dispatch materials from inventory.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <Label htmlFor="inc-material">Supply materials from inventory</Label>
          <Switch id="inc-material" checked={enabled} onCheckedChange={toggle} />
        </div>
      </CardContent>
    </Card>
  );
}
