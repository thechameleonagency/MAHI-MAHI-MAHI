import { Navigate, useParams } from "react-router-dom";

type ListPrefixDetailRedirectProps = {
  /** Canonical detail path prefix, e.g. `/vendorship` or `/inc-sources`. */
  detailPrefix: string;
};

/**
 * Redirect `/list-path/:id` bookmarks to the canonical detail route (MD6).
 * Example: `/vendorship-companies/VC1` → `/vendorship/VC1`.
 */
export function ListPrefixDetailRedirect({ detailPrefix }: ListPrefixDetailRedirectProps) {
  const { id } = useParams();
  const base = detailPrefix.replace(/\/+$/, "");
  if (!id?.trim()) {
    return <Navigate to={base} replace />;
  }
  return <Navigate to={`${base}/${encodeURIComponent(id.trim())}`} replace />;
}
