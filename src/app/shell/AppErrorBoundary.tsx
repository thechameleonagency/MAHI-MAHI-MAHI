import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

const isDev = import.meta.env.DEV;

export class AppErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Keep a console breadcrumb for prototype debugging
    console.error("AppErrorBoundary captured an error", { error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-md text-center space-y-3">
            <h1 className="text-xl font-semibold">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              Please refresh the page. If this repeats, use <strong>Settings → Reset demo data</strong> to restore the built-in sample dataset.
            </p>
            {isDev && this.state.error && (
              <pre className="mt-3 max-h-36 overflow-auto rounded-md border border-border bg-muted/40 p-2 text-left text-xs text-muted-foreground">
                {this.state.error.message}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
