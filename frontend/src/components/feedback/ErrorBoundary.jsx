import { Component } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import { Card } from '../ui/Card.jsx';
import { Tag } from '../ui/Tag.jsx';

/**
 * Global ErrorBoundary component.
 * Catches unhandled React render errors and displays a friendly recovery UI with a RELOAD button.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // eslint-disable-next-line no-console
    console.error('Unhandled application error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-paper text-ink flex items-center justify-center p-4 md:p-8 font-sans">
          <div className="max-w-lg w-full text-center">
            <div className="mb-4 flex justify-center">
              <Tag tone="danger">APPLICATION ERROR</Tag>
            </div>

            <Card className="p-6 md:p-8 border-2 border-ink bg-surface shadow-lg text-center space-y-5">
              <div className="w-14 h-14 mx-auto border-2 border-ink bg-state-missing text-ink flex items-center justify-center shadow-sm">
                <AlertTriangle size={28} />
              </div>

              <div>
                <h1 className="font-display uppercase text-2xl md:text-3xl text-ink tracking-tight">
                  SOMETHING UNEXPECTED HAPPENED
                </h1>
                <p className="text-sm text-muted font-sans mt-2">
                  We encountered an unexpected problem loading this part of SkillGraph.
                  Please reload the page or return to the main dashboard.
                </p>
              </div>

              {this.state.error?.message && (
                <div className="p-3 bg-paper border-2 border-ink text-left font-mono text-xs text-ink overflow-x-auto max-h-32">
                  <span className="font-bold uppercase text-state-missing block mb-1">Error:</span>
                  {this.state.error.message}
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={this.handleReload}
                  icon={<RotateCcw size={16} />}
                >
                  RELOAD
                </Button>

                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => {
                    window.location.href = '/app/dashboard';
                  }}
                >
                  GO TO DASHBOARD
                </Button>
              </div>
            </Card>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
