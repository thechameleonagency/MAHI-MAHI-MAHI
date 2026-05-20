import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { RoleMatrixProvider, useRoleMatrix } from "../contexts/RoleMatrixContext";
import { DEFAULT_FEATURE_PERMISSIONS } from "../domain/policies/featurePermissions";
import React from "react";

const STORAGE_KEY = "mss.roleMatrix.v1";

describe("RoleMatrixContext & LocalStorage Persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <RoleMatrixProvider>{children}</RoleMatrixProvider>
  );

  it("loads default matrix when no override exists", () => {
    const { result } = renderHook(() => useRoleMatrix(), { wrapper });
    expect(result.current.hasOverride).toBe(false);
    expect(result.current.override).toBeUndefined();
    expect(result.current.effectiveMatrix.project.view).toEqual(DEFAULT_FEATURE_PERMISSIONS.project.view);
  });

  it("persists override to localStorage and updates effectiveMatrix", () => {
    const { result } = renderHook(() => useRoleMatrix(), { wrapper });

    act(() => {
      result.current.saveOverride({
        project: { view: ["super_admin"], create: ["super_admin"], edit: ["super_admin"], delete: ["super_admin"] },
      });
    });

    expect(result.current.hasOverride).toBe(true);
    expect(result.current.override?.project?.view).toEqual(["super_admin"]);
    
    // Check localStorage
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    expect(stored.overrides.project.view).toEqual(["super_admin"]);
    expect(stored.version).toBe(1);

    // Check effective matrix
    expect(result.current.effectiveMatrix.project.view).toEqual(["super_admin"]);
    // Other features should remain default
    expect(result.current.effectiveMatrix.customer.view).toEqual(DEFAULT_FEATURE_PERMISSIONS.customer.view);
  });

  it("resets to defaults when saveOverride is called with undefined", () => {
    const { result } = renderHook(() => useRoleMatrix(), { wrapper });

    act(() => {
      result.current.saveOverride({
        project: { view: ["super_admin"], create: ["super_admin"], edit: ["super_admin"], delete: ["super_admin"] },
      });
    });
    expect(result.current.hasOverride).toBe(true);

    act(() => {
      result.current.saveOverride(undefined);
    });

    expect(result.current.hasOverride).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(result.current.effectiveMatrix.project.view).toEqual(DEFAULT_FEATURE_PERMISSIONS.project.view);
  });

  it("resets to defaults when resetToDefaults is called", () => {
    const { result } = renderHook(() => useRoleMatrix(), { wrapper });

    act(() => {
      result.current.saveOverride({
        project: { view: ["super_admin"], create: ["super_admin"], edit: ["super_admin"], delete: ["super_admin"] },
      });
    });
    
    act(() => {
      result.current.resetToDefaults();
    });

    expect(result.current.hasOverride).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
