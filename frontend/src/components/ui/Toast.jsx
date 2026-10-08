import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

/**
 * Toast notification provider and container.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idCounter = useRef(0);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type = 'info', message, duration = 4000 }) => {
      const id = ++idCounter.current;
      const newToast = { id, type, message };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }

      return id;
    },
    [dismissToast],
  );

  const toast = useMemo(
    () => ({
      success: (message, duration) => showToast({ type: 'success', message, duration }),
      error: (message, duration) => showToast({ type: 'error', message, duration }),
      info: (message, duration) => showToast({ type: 'info', message, duration }),
    }),
    [showToast],
  );

  // Global event listener for toast events from services
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = (event) => {
      const detail = event.detail;
      if (detail && detail.message) {
        showToast({
          type: detail.type || 'info',
          message: detail.message,
          duration: detail.duration || 4000,
        });
      }
    };

    window.addEventListener('app:toast', handler);
    window.addEventListener('toast:show', handler);

    return () => {
      window.removeEventListener('app:toast', handler);
      window.removeEventListener('toast:show', handler);
    };
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, toast, dismissToast }}>
      {children}
      <div
        role="region"
        aria-label="Notifications"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 md:px-0"
      >
        {toasts.map((t) => (
          <ToastCard
            key={t.id}
            type={t.type}
            message={t.message}
            onClose={() => dismissToast(t.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Hook to trigger toast notifications.
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: () => {},
      dismissToast: () => {},
      toast: {
        success: () => {},
        error: () => {},
        info: () => {},
      },
    };
  }
  return context;
}

/**
 * Individual Toast card.
 */
export function ToastCard({ type = 'info', message, onClose, className = '' }) {
  const iconConfig = {
    success: {
      icon: <CheckCircle2 size={16} />,
      badgeClass: 'bg-state-mastered text-ink',
    },
    error: {
      icon: <AlertCircle size={16} />,
      badgeClass: 'bg-state-missing text-ink',
    },
    info: {
      icon: <Info size={16} />,
      badgeClass: 'bg-brand text-white',
    },
  };

  const { icon, badgeClass } = iconConfig[type] || iconConfig.info;

  return (
    <div
      role="status"
      className={`pointer-events-auto border-2 border-ink bg-surface shadow-md p-3.5 flex items-start gap-3 rounded-none w-full transition-all duration-120 ${className}`}
    >
      <div
        className={`w-6 h-6 shrink-0 border-2 border-ink flex items-center justify-center ${badgeClass}`}
      >
        {icon}
      </div>

      <div className="font-sans text-xs md:text-sm font-semibold text-ink flex-1 pt-0.5 leading-snug">
        {message}
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close notification"
          className="text-ink p-0.5 border border-transparent hover:border-ink hover:bg-paper cursor-pointer transition-colors"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

export default ToastProvider;
