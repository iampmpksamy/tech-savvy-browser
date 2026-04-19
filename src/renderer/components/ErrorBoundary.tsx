import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-bg-0 text-fg-0 gap-4">
          <p className="text-lg font-semibold">Something went wrong</p>
          <pre className="text-xs text-fg-2 max-w-xl overflow-auto p-4 bg-bg-1 rounded">
            {this.state.error.message}
          </pre>
          <button
            className="px-4 py-2 bg-accent rounded text-sm"
            onClick={() => this.setState({ error: null })}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
