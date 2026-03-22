'use client';

import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[FamFi ErrorBoundary]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-surface border border-border rounded-xl p-8 text-center">
            <div className="inline-flex p-3 bg-danger/10 rounded-full mb-4">
              <AlertTriangle size={24} className="text-danger" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-2">
              出了点问题
            </h2>
            <p className="text-sm text-foreground-secondary mb-1">
              页面遇到了意外错误，请尝试刷新。
            </p>
            {this.state.error && (
              <p className="text-xs text-foreground-secondary/60 mb-6 font-mono break-all">
                {this.state.error.message}
              </p>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary/15 text-primary-light border border-primary/30 rounded-md text-sm font-medium hover:bg-primary/25 transition-colors duration-200"
              >
                <RefreshCw size={14} />
                重试
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2.5 bg-surface-elevated text-foreground border border-border rounded-md text-sm font-medium hover:border-border-strong transition-colors duration-200"
              >
                刷新页面
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
