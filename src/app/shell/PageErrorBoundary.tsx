import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const isDev = import.meta.env.DEV;

type Props = { children: ReactNode };
type State = { hasError: boolean; error: Error | null };

/**
 * Isolates per-route render failures so one bad page does not blank the whole app shell.
 */
export class PageErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("PageErrorBoundary", { error, errorInfo });
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="space-y-4 p-4">
          <h1 className="text-lg font-semibold">This page failed to load</h1>
          <p className="text-sm text-muted-foreground">
            Try{" "}
            <Button variant="link" className="h-auto p-0" onClick={() => window.location.reload()}>
              refreshing
            </Button>{" "}
            or return to the dashboard.
          </p>
          {isDev && (
            <pre className="mt-2 max-h-40 overflow-auto rounded-md border border-border bg-muted/50 p-2 text-left text-xs">
              {this.state.error.message}
            </pre>
          )}
          <Button asChild variant="outline" size="sm">
            <Link to="/">Back to dashboard</Link>
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
