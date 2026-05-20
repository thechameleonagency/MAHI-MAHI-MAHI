import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, MapPin } from "lucide-react";

export interface DashboardEmployeeCardProps {
  emp: {
    id: number;
    name: string;
    role: string;
    phone: string;
    site: string;
    initial: string;
  };
  onSelect?: (id: number) => void;
}

export function DashboardEmployeeCard({ emp, onSelect }: DashboardEmployeeCardProps) {
  return (
    <Card
      className="cursor-pointer border-border/70 transition-colors hover:bg-muted/40"
      onClick={() => onSelect?.(emp.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-11 w-11">
            <AvatarFallback className="bg-primary/10 font-semibold text-primary">{emp.initial}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-medium">{emp.name}</p>
            <Badge variant="outline" className="text-xs">
              {emp.role}
            </Badge>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="h-3 w-3 shrink-0" />
              {emp.phone}
            </div>
            <div className="flex items-center gap-1 text-xs font-medium text-primary">
              <MapPin className="h-3 w-3 shrink-0" />
              {emp.site}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
