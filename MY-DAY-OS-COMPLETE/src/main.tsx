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
            backgroundColor: '#0b0e16',
            color: '#f7f9ff',
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', sans-serif",
          }}
        >
          <div
            style={{
              maxWidth: 420,
              width: '100%',
              background: 'rgba(22, 29, 46, 0.88)',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              borderRadius: 22,
              padding: 24,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              Raa&apos;s Diary — Safe Recovery
            </div>
            <p style={{ fontSize: 13, color: '#a5aec0', marginBottom: 18 }}>
              {this.state.errorMessage}
            </p>
            <button
              type="button"
              onClick={this.handleRecover}
              style={{
                background: 'linear-gradient(135deg, #6b9cff, #a78bfa)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 14,
                padding: '10px 18px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Reload App / ફરીથી ચાલુ કરો
            </button>
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
