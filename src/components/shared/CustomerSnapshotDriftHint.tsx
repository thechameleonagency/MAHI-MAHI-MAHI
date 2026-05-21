import { cn } from "@/lib/utils";

type CustomerSnapshotDriftHintProps = {
  visible: boolean;
  snapshotClient: string;
  className?: string;
};

/** E1 — project contract snapshot differs from linked customer master. */
export function CustomerSnapshotDriftHint({
  visible,
  snapshotClient,
  className,
}: CustomerSnapshotDriftHintProps) {
  if (!visible) return null;
  return (
    <p
      className={cn(
        "text-2xs leading-snug text-amber-800 dark:text-amber-200/90",
        className,
      )}
      role="status"
    >
      Contract snapshot on project: <span className="font-medium">{snapshotClient}</span>. Customer
      master was updated later — billing documents may still reference the snapshot until revised.
    </p>
  );
}
