import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
  isPermissionError: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      message: "",
      isPermissionError: false,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let message = error.message || "An unexpected error occurred.";
    let isPermissionError = false;

    try {
      const parsed = JSON.parse(error.message) as {
        error?: string;
        operationType?: string;
        path?: string;
      };
      if (parsed && typeof parsed.error === "string") {
        isPermissionError = parsed.error
          .toLowerCase()
          .includes("permission");
        message = `${parsed.error}${
          parsed.path ? ` (Path: ${parsed.path})` : ""
        }`;
      }
    } catch {
      isPermissionError = message.toLowerCase().includes("permission");
    }

    return {
      hasError: true,
      message,
      isPermissionError,
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Application ErrorBoundary caught error:", error, info);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-md bg-rose-50 border border-rose-200 text-rose-700 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h1 className="text-base font-bold text-slate-900">
                  {this.state.isPermissionError
                    ? "Database Access Error"
                    : "Workspace Error"}
                </h1>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {this.state.isPermissionError
                    ? "Your session could not complete a protected database operation. Please ensure you are signed in with a verified Google account."
                    : "NEXUS Venture Studio encountered an unexpected error while syncing your workspace."}
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs font-mono text-slate-700 break-words">
              {this.state.message}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reload Studio</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
