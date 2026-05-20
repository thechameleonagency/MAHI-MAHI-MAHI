/**
 * @deprecated This module is a back-compat shim. New code should import from
 * `@/application/services/ProjectTypeService` directly.
 *
 * The class formerly defined here (`ProjectKindService`) has been replaced by
 * `ProjectTypeService`, which validates intake against the resolver-based capability model
 * rather than the legacy 8-kind registry. The class name is re-exported so the (many)
 * existing consumers do not have to change in lockstep with the rename.
 */
export { ProjectTypeService as ProjectKindService } from "@/application/services/ProjectTypeService";
export type { ProjectIntakePayload } from "@/application/services/ProjectTypeService";
