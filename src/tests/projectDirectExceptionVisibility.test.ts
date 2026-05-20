import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("direct exception reason visibility (T7)", () => {
  const projectsSource = readFileSync(
    resolve(process.cwd(), "src/pages/Projects.tsx"),
    "utf8",
  );
  const projectDetailSource = readFileSync(
    resolve(process.cwd(), "src/pages/ProjectDetail.tsx"),
    "utf8",
  );
  const dashboardRowSource = readFileSync(
    resolve(process.cwd(), "src/components/dashboard/DashboardProjectRow.tsx"),
    "utf8",
  );

  it("Projects create flow passes reason in toast and navigation state", () => {
    expect(projectsSource).toContain("Direct exception project created");
    expect(projectsSource).toMatch(/navigate\(`\/projects\/\$\{res\.projectId\}`/);
    expect(projectsSource).toContain("directExceptionReason: reason");
  });

  it("Projects list surfaces exception reason in table and grid", () => {
    expect(projectsSource).toContain("projectDirectExceptionReason(project)");
    expect(projectsSource).toMatch(/Exception:/);
    expect(projectsSource).toContain("Direct exception");
  });

  it("ProjectDetail shows DirectExceptionProjectBanner with navigation flash fallback", () => {
    expect(projectDetailSource).toContain("DirectExceptionProjectBanner");
    expect(projectDetailSource).toContain("directExceptionFlash");
    expect(projectDetailSource).toContain("reasonOverride={directExceptionFlash}");
  });

  it("Dashboard project row shows direct exception badge and reason snippet", () => {
    expect(dashboardRowSource).toContain("isDirectExceptionProject");
    expect(dashboardRowSource).toContain("projectDirectExceptionReason");
    expect(dashboardRowSource).toMatch(/Exception:/);
  });
});
