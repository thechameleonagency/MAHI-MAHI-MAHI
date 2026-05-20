/** Minimum length for name-only preset ↔ material matching (avoids "solar" ↔ "solar cable"). */
export const PRESET_NAME_SUBSTRING_MIN_LENGTH = 6;

export type InventoryMatchable = {
  id: number | string;
  name: string;
};

/**
 * Name fallback: full equality or mutual substring only when the contained segment is long enough.
 */
export function namesMatchBySubstring(
  a: string,
  b: string,
  minLength: number = PRESET_NAME_SUBSTRING_MIN_LENGTH,
): boolean {
  const left = a.trim().toLowerCase();
  const right = b.trim().toLowerCase();
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.length >= minLength && right.includes(left)) return true;
  if (right.length >= minLength && left.includes(right)) return true;
  return false;
}

/** Prefer exact inventory id; otherwise safe name substring match. */
export function matchMaterialToPreset(
  material: InventoryMatchable,
  preset: InventoryMatchable,
): boolean {
  if (String(material.id) === String(preset.id)) return true;
  return namesMatchBySubstring(material.name, preset.name);
}

export function findPresetForMaterial<T extends InventoryMatchable>(
  material: InventoryMatchable,
  presets: T[],
): T | undefined {
  return presets.find((preset) => matchMaterialToPreset(material, preset));
}

/** Resolve a catalog row for grouping/display — id first, then guarded name match. */
export function findInventoryItemForMaterial<T extends InventoryMatchable>(
  material: InventoryMatchable,
  catalog: T[],
): T | undefined {
  const byId = catalog.find((item) => String(item.id) === String(material.id));
  if (byId) return byId;
  return catalog.find((item) => namesMatchBySubstring(item.name, material.name));
}
