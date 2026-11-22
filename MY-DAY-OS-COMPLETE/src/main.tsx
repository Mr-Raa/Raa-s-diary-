import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unexpected rendering error.',
    };
  }

  handleRecover = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {
      // ignore cleanup failures
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100dvh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            backgroundColor: '#0c1118',
            color: '#f7f9ff',
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', sans-serif",
          }}
        >
          <div
            style={{
              maxWidth: 440,
              width: '100%',
              background: 'rgba(22, 33, 44, 0.94)',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              borderRadius: 24,
              padding: 28,
              textAlign: 'center',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, letterSpacing: '-0.02em' }}>
              MY DAY OS — Quick Recovery
            </div>
            <p style={{ fontSize: 13, color: '#9ba9b8', marginBottom: 20, lineHeight: 1.5 }}>
              {this.state.errorMessage}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                type="button"
                onClick={this.handleRecover}
                style={{
                  background: 'linear-gradient(135deg, #38bdf8, #6366f1)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 14,
                  padding: '12px 22px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(56,189,248,0.4)',
                }}
              >
                Clear Cache &amp; Reload / ફરી ચાલુ કરો
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);
