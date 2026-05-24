import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import React from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MemoryRouter } from "react-router-dom";
import Enquiries from "@/pages/Enquiries";
import { AppDataProvider } from "@/contexts/AppDataContext";
import { FoundationProvider } from "@/app/providers/FoundationProvider";
import { AppSessionProvider } from "@/app/providers/AppSessionProvider";
import { RoleMatrixProvider } from "@/contexts/RoleMatrixContext";
import { MastersProvider } from "@/contexts/MastersContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PageHeaderStickyProvider } from "@/contexts/PageHeaderStickyContext";
import { persistAuthenticatedSession, clearAuthenticatedSession } from "@/lib/sessionActorStorage";
import { APP_DATA_STORAGE_KEY, APP_DATA_STORAGE_VERSION_KEY } from "@/lib/appDataStorage";

describe("enquiriesPageWithGeneratorSeed", () => {
  beforeEach(() => {
    localStorage.clear();
    persistAuthenticatedSession({
      memberId: "SA-001",
      email: "rajesh.kulkarni@mss.solar",
      role: "super_admin",
      displayName: "Rajesh Kulkarni",
    });
    const raw = readFileSync(join(process.cwd(), "scripts", "audit-seed.json"), "utf8");
    localStorage.setItem(APP_DATA_STORAGE_KEY, raw);
    localStorage.setItem(APP_DATA_STORAGE_VERSION_KEY, "9");
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: false,
        media: "",
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
    vi.stubGlobal(
      "ResizeObserver",
      class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
  });

  afterEach(() => {
    clearAuthenticatedSession();
    vi.unstubAllGlobals();
  });

  it("renders enquiries list without error boundary", async () => {
    const { container } = render(
      <FoundationProvider>
        <AppSessionProvider>
          <RoleMatrixProvider>
            <AppDataProvider>
              <MastersProvider>
                <TooltipProvider>
                  <PageHeaderStickyProvider>
                    <MemoryRouter initialEntries={["/enquiries"]}>
                      <Enquiries />
                    </MemoryRouter>
                  </PageHeaderStickyProvider>
                </TooltipProvider>
              </MastersProvider>
            </AppDataProvider>
          </RoleMatrixProvider>
        </AppSessionProvider>
      </FoundationProvider>,
    );

    await waitFor(
      () => expect(container.textContent).not.toMatch(/failed to load/i),
      { timeout: 15000 },
    );
  });

  it("opens generator enquiry detail without notes crash", async () => {
    const { container, getByText } = render(
      <FoundationProvider>
        <AppSessionProvider>
          <RoleMatrixProvider>
            <AppDataProvider>
              <MastersProvider>
                <TooltipProvider>
                  <PageHeaderStickyProvider>
                    <MemoryRouter initialEntries={["/enquiries"]}>
                      <Enquiries />
                    </MemoryRouter>
                  </PageHeaderStickyProvider>
                </TooltipProvider>
              </MastersProvider>
            </AppDataProvider>
          </RoleMatrixProvider>
        </AppSessionProvider>
      </FoundationProvider>,
    );

    await waitFor(() => expect(container.textContent).toMatch(/Draft Quote Customer|Enquiries/i), {
      timeout: 15000,
    });

    const row = getByText("Draft Quote Customer");
    row.click();

    await waitFor(
      () => expect(container.textContent).not.toMatch(/failed to load/i),
      { timeout: 5000 },
    );
  });
});
