
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const ErrorFallback = ({ error }: { error: Error }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      padding: '20px',
      textAlign: 'center',
    }}
  >
    <h1 style={{ color: '#dc2f02', marginBottom: '20px' }}>
      Something went wrong
    </h1>

    <p
      style={{
        color: '#666',
        marginBottom: '8px',
        fontFamily: 'monospace',
        fontSize: '14px',
      }}
    >
      {error.message}
    </p>

    <button
      onClick={() => window.location.reload()}
      style={{
        marginTop: '20px',
        padding: '10px 24px',
        backgroundColor: '#2d6a4f',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '16px',
        fontWeight: 600,
      }}
    >
      Reload Page
    </button>
  </div>
);

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return <ErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}

function dismissLoadingScreen() {
  document.body.classList.add('app-loaded');

  const root = document.getElementById('root');
  if (root) {
    root.classList.add('loaded');
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

requestAnimationFrame(() => {
  requestAnimationFrame(dismissLoadingScreen);
});