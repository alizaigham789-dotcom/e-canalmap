import React from "react";

/**
 * ErrorBoundary — catches render-time errors in its subtree and shows a
 * readable fallback instead of a blank white screen. A "Reload" button
 * lets the user recover without force-refreshing the browser.
 *
 * NOTE: Only a class component can be an error boundary in React.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Surface the full stack in the browser console so it can be diagnosed.
    console.error("[ErrorBoundary] caught:", error, info);
    this.setState({ info });
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, info: null });
    // Hard reload to clear any stale state / bad chunk
    if (typeof window !== "undefined") window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const msg = this.state.error?.message || String(this.state.error || "Unknown error");
      const stack = this.state.error?.stack || "";
      const compStack = this.state.info?.componentStack || "";
      return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0a0f1a] p-4">
          <div className="max-w-lg w-full bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              <h2 className="text-base font-bold text-red-400 font-heading">
                {this.props.label ? `${this.props.label} — ` : ""}Error
              </h2>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed break-words">{msg}</p>
            {(stack || compStack) && (
              <pre className="text-[10px] text-slate-400 bg-slate-950 rounded-lg p-3 overflow-auto max-h-48 whitespace-pre-wrap break-all">
                {stack}
                {compStack}
              </pre>
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={this.handleReload}
                className="px-4 h-9 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}