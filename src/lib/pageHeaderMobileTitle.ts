export type PageHeaderBreadcrumb = { label: string; to?: string };

/** Last visible crumb label — used as the compact mobile title in TopHeader (MR2). */
export function mobilePageTitleFromBreadcrumbs(crumbs: PageHeaderBreadcrumb[]): string | null {
  const visible = crumbs.filter((b) => b.label?.trim());
  if (visible.length === 0) return null;
  return visible[visible.length - 1].label.trim();
}
