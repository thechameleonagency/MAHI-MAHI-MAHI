import { TableCell, TableRow } from "@/components/ui/table";
import { ListEmptyState } from "@/components/ui/ListEmptyState";
import type { ComponentProps } from "react";

type TableEmptyRowProps = {
  colSpan: number;
} & Pick<
  ComponentProps<typeof ListEmptyState>,
  "icon" | "title" | "description" | "actionLabel" | "onAction"
>;

/** Standard empty row for data tables (DS2). */
export function TableEmptyRow({
  colSpan,
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: TableEmptyRowProps) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="p-0">
        <ListEmptyState
          density="compact"
          icon={icon}
          title={title}
          description={description}
          actionLabel={actionLabel}
          onAction={onAction}
        />
      </TableCell>
    </TableRow>
  );
}
