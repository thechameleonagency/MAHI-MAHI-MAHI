/** Trimmed audit reason when a project was created via direct-exception (no quotation). */
export function projectDirectExceptionReason(project: {
  directCreationReason?: string | null;
}): string | null {
  const trimmed = project.directCreationReason?.trim();
  return trimmed || null;
}

/** True when the project bypassed the quotation → convert path. */
export function isDirectExceptionProject(project: {
  directCreationReason?: string | null;
}): boolean {
  return projectDirectExceptionReason(project) != null;
}
