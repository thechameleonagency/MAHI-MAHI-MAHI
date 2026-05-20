import type { ExecutionLineItem, Project } from "@/types/project";

/**
 * Resolve BOQ execution rows: use persisted lines, else derive from commercial baseline, else `[]`.
 * Keeps downstream readers (`MaterialsSentTab`, Need-to-Get, inventory issue) from hitting `undefined`.
 */
export function resolveProjectExecutionLineItems(project: Project): ExecutionLineItem[] {
  if (project.executionLineItems?.length) {
    return project.executionLineItems;
  }
  const baselineLines = project.commercialBaseline?.lines;
  if (baselineLines?.length) {
    return baselineLines.map(
      (line): ExecutionLineItem => ({
        ...line,
        source: project.quotationId ? "quotation" : "intake",
        issuedQty: project.status === "Completed" ? line.quantity : 0,
      }),
    );
  }
  return [];
}

/** Apply {@link resolveProjectExecutionLineItems} for persistence and hydration. */
export function withResolvedExecutionLineItems(project: Project): Project {
  return {
    ...project,
    executionLineItems: resolveProjectExecutionLineItems(project),
  };
}
