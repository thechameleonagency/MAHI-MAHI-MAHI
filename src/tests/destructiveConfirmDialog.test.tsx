import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DestructiveConfirmDialog } from "@/components/ui/DestructiveConfirmDialog";

describe("DestructiveConfirmDialog", () => {
  it("renders without ReferenceError when open (warnCannotUndo destructured)", () => {
    render(
      <DestructiveConfirmDialog
        open
        onOpenChange={vi.fn()}
        title="Delete item?"
        description="This removes the row permanently."
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByText("Delete item?")).toBeTruthy();
    expect(screen.getByText(/cannot be undone/i)).toBeTruthy();
  });

  it("hides cannot-undo warning when warnCannotUndo is false", () => {
    render(
      <DestructiveConfirmDialog
        open
        onOpenChange={vi.fn()}
        title="Archive?"
        description="Archives the record."
        warnCannotUndo={false}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.queryByText(/cannot be undone/i)).toBeNull();
  });
});
