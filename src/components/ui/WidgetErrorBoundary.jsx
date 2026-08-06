import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class WidgetErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("WidgetErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className={`flex flex-col items-center justify-center p-6 bg-stone-50 border border-stone-200/60 rounded-2xl text-center space-y-3 ${this.props.className || ''}`}>
          <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
            <AlertTriangle size={20} strokeWidth={2} />
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-700">Не удалось загрузить блок</p>
            <p className="text-xs text-stone-500 mt-1">Что-то пошло не так при отображении</p>
          </div>
          <button
            onClick={this.handleReset}
            className="mt-2 flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-stone-600 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 hover:text-stone-900 transition-colors shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
          >
            <RefreshCw size={14} />
            Попробовать снова
          </button>
        </div>
      );
    }

    const { className, children } = this.props;
    return className ? <div className={className}>{children}</div> : children;
  }
}
