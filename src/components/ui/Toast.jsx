/**
 * Toast.jsx — Точилка UI Kit
 * ─────────────────────────────────────────────────────────────────────────────
 * Лёгкая система уведомлений с поддержкой Undo-паттерна.
 *
 * Использование:
 *   const { showToast } = useToast();
 *   showToast({ message: "Ученик удалён", undoLabel: "Отменить", onUndo: () => restore() });
 *
 * Установи <ToastContainer /> один раз в App.jsx.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { X, CheckCircle2, AlertCircle, Info, Undo2 } from "lucide-react";
import { cn } from "../../utils/cn.js";

/* ─── Context ─────────────────────────────────────────────── */
const ToastContext = createContext(null);

let _toastIdCounter = 0;

// Global reference for outside-of-React usage
export const globalToastRef = {
  showToast: null,
};

export function globalToast({ message, type = "info", duration = 4000 }) {
  if (globalToastRef.showToast) {
    globalToastRef.showToast({ message, type, duration });
  } else {
    console.warn("ToastProvider is not mounted. Toast message:", message);
  }
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /**
   * @param {object} options
   * @param {string}   options.message     — основной текст
   * @param {"info"|"success"|"error"}  [options.type="info"]
   * @param {number}   [options.duration=4000] — мс до авто-скрытия (0 = бесконечно)
   * @param {string}   [options.undoLabel]    — текст кнопки Undo
   * @param {Function} [options.onUndo]       — callback при нажатии Undo
   * @param {Function} [options.onExpire]     — callback когда тост сам закрылся (без Undo)
   */
  const showToast = useCallback(({ message, type = "info", duration = 4000, undoLabel, onUndo, onExpire }) => {
    const id = ++_toastIdCounter;
    setToasts((prev) => [...prev, { id, message, type, duration, undoLabel, onUndo, onExpire }]);
    return id;
  }, []);

  const handleUndo = useCallback((toast) => {
    toast.onUndo?.();
    dismiss(toast.id);
  }, [dismiss]);

  const handleExpire = useCallback((toast) => {
    toast.onExpire?.();
    dismiss(toast.id);
  }, [dismiss]);

  useEffect(() => {
    globalToastRef.showToast = showToast;
    return () => {
      globalToastRef.showToast = null;
    };
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} onUndo={handleUndo} onExpire={handleExpire} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

/* ─── Single Toast Item ───────────────────────────────────── */
const ICONS = {
  success: <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />,
  error:   <AlertCircle  size={16} className="text-red-500 shrink-0" />,
  info:    <Info         size={16} className="text-brand-blue shrink-0" />,
};

function ToastItem({ toast, onUndo, onExpire, onDismiss }) {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(100);
  const timerRef = useRef(null);
  const startRef = useRef(null);
  const remainingRef = useRef(toast.duration);

  // Mount animation
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // Auto-dismiss with progress bar
  useEffect(() => {
    if (!toast.duration) return;

    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.max(0, 100 - (elapsed / toast.duration) * 100);
      setProgress(pct);
      if (pct <= 0) {
        handleExpire();
      } else {
        timerRef.current = requestAnimationFrame(tick);
      }
    };

    startRef.current = Date.now();
    timerRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(timerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExpire = () => {
    setVisible(false);
    setTimeout(() => onExpire(toast), 300);
  };

  const handleDismiss = () => {
    cancelAnimationFrame(timerRef.current);
    setVisible(false);
    setTimeout(() => onDismiss(toast.id), 300);
  };

  const handleUndo = () => {
    cancelAnimationFrame(timerRef.current);
    onUndo(toast);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "relative overflow-hidden flex items-center gap-3",
        "bg-white border border-stone-200/80 rounded-2xl px-4 py-3",
        "shadow-[0_8px_32px_rgba(0,0,0,0.12)] min-w-[280px] max-w-[380px]",
        "transition-all duration-300 ease-out-quart",
        visible
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 translate-y-2 scale-95"
      )}
    >
      {/* Icon */}
      {ICONS[toast.type]}

      {/* Message */}
      <p className="flex-1 text-sm font-medium text-stone-800 leading-snug">
        {toast.message}
      </p>

      {/* Undo button */}
      {toast.undoLabel && toast.onUndo && (
        <button
          onClick={handleUndo}
          className={cn(
            "shrink-0 text-sm font-semibold text-brand-blue",
            "flex items-center gap-1.5 px-2 py-1 rounded-lg",
            "hover:bg-blue-50 transition-colors duration-150",
            "focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-1"
          )}
        >
          <Undo2 size={13} strokeWidth={2.5} />
          {toast.undoLabel}
        </button>
      )}

      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        aria-label="Закрыть уведомление"
        className={cn(
          "shrink-0 p-1 rounded-lg text-stone-400",
          "hover:bg-stone-100 hover:text-stone-600 transition-colors duration-150",
          "focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-1"
        )}
      >
        <X size={14} strokeWidth={2} />
      </button>

      {/* Progress bar */}
      {toast.duration > 0 && (
        <div
          className="absolute bottom-0 left-0 h-[2px] bg-brand-blue/30 transition-none"
          style={{ width: `${progress}%` }}
        />
      )}
    </div>
  );
}

/* ─── Container ───────────────────────────────────────────── */
function ToastContainer({ toasts, onUndo, onExpire, onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Уведомления"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col-reverse gap-2 pointer-events-none"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem
            toast={toast}
            onUndo={onUndo}
            onExpire={onExpire}
            onDismiss={onDismiss}
          />
        </div>
      ))}
    </div>
  );
}
