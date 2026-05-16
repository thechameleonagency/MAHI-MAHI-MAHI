/**
 * Phase 3.5 — Consistent action button roles mapped to shadcn variants.
 * One primary CTA per surface; supporting = secondary; auxiliary = outline/ghost; delete = destructive.
 */
export const buttonRoles = {
  primary: { variant: "default" as const, size: "sm" as const },
  secondary: { variant: "secondary" as const, size: "sm" as const },
  tertiary: { variant: "outline" as const, size: "sm" as const },
  ghost: { variant: "ghost" as const, size: "sm" as const },
  destructive: { variant: "destructive" as const, size: "sm" as const },
};
