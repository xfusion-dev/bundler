import { Component, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center px-6">
          <div className="max-w-2xl w-full">
            <div className="border border-white/10 bg-white/5 p-12 text-center">
              <div className="w-24 h-24 bg-red-400/10 border border-red-400/20 flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-12 h-12 text-red-400" />
              </div>
              <h1 className="text-4xl font-bold text-white mb-4">Something went wrong</h1>
              <p className="text-gray-400 mb-8">
                We encountered an unexpected error. Please try refreshing the page.
              </p>
              {this.state.error && (
                <div className="border border-white/10 bg-black/40 p-4 mb-8 text-left">
                  <p className="text-red-400 text-sm font-mono break-all">
                    {this.state.error.message}
                  </p>
                </div>
              )}
              <button
                onClick={() => window.location.reload()}
                className="btn-unique px-8 py-3"
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
