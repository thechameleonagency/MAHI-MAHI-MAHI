import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { MastersProvider, useMasters } from "../contexts/MastersContext";
import React from "react";

describe("MastersContext CRUD operations", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MastersProvider>{children}</MastersProvider>
  );

  it("adds, updates, and deletes a master item", () => {
    const { result } = renderHook(() => useMasters(), { wrapper });

    // Initial check
    const initialTypes = result.current.getProjectTypes();
    const initialCount = initialTypes.length;

    // ADD
    act(() => {
      result.current.addMasterItem("projectTypes", {
        value: "test_project_type",
        label: "Test Project Type",
        isActive: true
      });
    });

    let currentTypes = result.current.getProjectTypes();
    expect(currentTypes.length).toBe(initialCount + 1);
    expect(currentTypes.find(t => t.value === "test_project_type")).toBeDefined();

    // UPDATE
    act(() => {
      result.current.updateMasterItem("projectTypes", "test_project_type", {
        label: "Updated Project Type",
        isActive: false
      });
    });

    currentTypes = result.current.getProjectTypes();
    const updatedItem = currentTypes.find(t => t.value === "test_project_type");
    expect(updatedItem?.label).toBe("Updated Project Type");
    expect(updatedItem?.isActive).toBe(false);

    // DELETE
    act(() => {
      result.current.deleteMasterItem("projectTypes", "test_project_type");
    });

    currentTypes = result.current.getProjectTypes();
    expect(currentTypes.length).toBe(initialCount);
    expect(currentTypes.find(t => t.value === "test_project_type")).toBeUndefined();
  });

  it("retrieves category by id", () => {
    const { result } = renderHook(() => useMasters(), { wrapper });
    
    const categoryInfo = result.current.getCategoryById("projectTypes");
    expect(categoryInfo.label).toBe("Project Types");
    expect(categoryInfo.isEditable).toBe(true);
    expect(categoryInfo.items.length).toBeGreaterThan(0);
  });
});
