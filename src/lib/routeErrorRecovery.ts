export type PageErrorRecovery = {
  title: string;
  backTo: string;
  backLabel: string;
};

const DEFAULT_RECOVERY: PageErrorRecovery = {
  title: "This page failed to load",
  backTo: "/",
  backLabel: "Back to dashboard",
};

/** Contextual recovery links for the single AppLayout page error boundary. */
export function resolvePageErrorRecovery(pathname: string): PageErrorRecovery {
  if (/^\/projects\/[^/]+$/.test(pathname)) {
    return {
      title: "Project page failed to load",
      backTo: "/projects",
      backLabel: "Back to projects",
    };
  }
  return DEFAULT_RECOVERY;
}
