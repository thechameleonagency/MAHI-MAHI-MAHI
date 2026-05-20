import { useState, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DestructiveConfirmDialogProps {
  /** Controls dialog open state. */
  open: boolean;
  /** Called when the dialog should close (cancel / confirm / overlay click). */
  onOpenChange: (open: boolean) => void;
  /** Dialog title, e.g. "Delete Invoice INV-001?" */
  title: string;
  /** Explanation of what will happen, e.g. "This will permanently remove the invoice and all related payments." */
  description: string | ReactNode;
  /** If provided, the user must type this string exactly to enable the Confirm button. */
  typedConfirmation?: string;
  /** Label shown for the confirm button. Default "Delete". */
  confirmLabel?: string;
  /** Show the standard cannot-undo footer warning. Default true. */
  warnCannotUndo?: boolean;
  /** Called after the user confirms. */
  onConfirm: () => void;
}

/**
 * Standardised destructive-action confirmation dialog.
 *
 * Wraps AlertDialog with:
 *  - "What this does" explanation
 *  - "Cannot be undone" warning
 *  - Optional typed-confirmation for high-stakes actions
 *
 * Replaces `window.confirm()` and ad-hoc confirm dialogs across the app.
 */
export function DestructiveConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  typedConfirmation,
  confirmLabel = "Delete",
  onConfirm,
}: DestructiveConfirmDialogProps) {
  const [typedValue, setTypedValue] = useState("");

  const needsTyping = !!typedConfirmation;
  const canConfirm = !needsTyping || typedValue === typedConfirmation;

  const handleConfirm = () => {
    onConfirm();
    setTypedValue("");
    onOpenChange(false);
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setTypedValue("");
        onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <div>{description}</div>
              {warnCannotUndo ? (
                <p className="text-xs font-semibold text-destructive">
                  ⚠ This action cannot be undone.
                </p>
              ) : null}
              {needsTyping && (
                <div className="pt-2 space-y-1.5">
                  <Label className="text-xs">
                    Type <span className="font-mono font-bold text-foreground">{typedConfirmation}</span> to confirm:
                  </Label>
                  <Input
                    value={typedValue}
                    onChange={(e) => setTypedValue(e.target.value)}
                    placeholder={typedConfirmation}
                    className="font-mono"
                    autoFocus
                  />
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={!canConfirm}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
