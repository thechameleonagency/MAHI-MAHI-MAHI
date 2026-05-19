import type { UserRole } from "@/domain/entities/identity";

/** Role-aware inventory section entry (avoids salesperson `/inventory` → materials redirect loop). */
export function getInventoryHubPath(role: UserRole): string {
  return role === "salesperson" ? "/templates" : "/inventory/materials";
}
