import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "mss.pageHeaderSticky";

type Breadcrumb = { label: string; to?: string };

type PageHeaderStickyValue = {
  /** When true (default), `StickyPageHeader` pins under the app bar; when false it scrolls with the page */
  stickyPageHeader: boolean;
  setStickyPageHeader: (value: boolean) => void;
  breadcrumbs: Breadcrumb[];
  setBreadcrumbs: (crumbs: Breadcrumb[]) => void;
};

const PageHeaderStickyContext = createContext<PageHeaderStickyValue | null>(null);

export function PageHeaderStickyProvider({ children }: { children: ReactNode }) {
  const [stickyPageHeader, setStickyState] = useState(true);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === "false") setStickyState(false);
      if (raw === "true") setStickyState(true);
    } catch {
      /* ignore */
    }
  }, []);

  const setStickyPageHeader = useCallback((next: boolean) => {
    setStickyState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "true" : "false");
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({ stickyPageHeader, setStickyPageHeader, breadcrumbs, setBreadcrumbs }),
    [stickyPageHeader, setStickyPageHeader, breadcrumbs, setBreadcrumbs],
  );

  return <PageHeaderStickyContext.Provider value={value}>{children}</PageHeaderStickyContext.Provider>;
}

export function usePageHeaderSticky(): PageHeaderStickyValue {
  const ctx = useContext(PageHeaderStickyContext);
  if (!ctx) {
    throw new Error("usePageHeaderSticky must be used within PageHeaderStickyProvider");
  }
  return ctx;
}

/** For `StickyPageHeader` outside the provider edge case (Storybook/tests): sticky by default */
export function useStickyPageHeaderActive(): boolean {
  const ctx = useContext(PageHeaderStickyContext);
  return ctx?.stickyPageHeader ?? true;
}
