/**
 * SideDrawer.jsx — Точилка UI Kit
 * ─────────────────────────────────────────────────────────────────────────────
 * Slide-over panel from the right.
 *
 * Props:
 *   isOpen       — boolean
 *   onClose      — () => void
 *   title        — string
 *   children     — ReactNode  (body content)
 *   footer       — ReactNode  (sticky footer; if omitted, no footer renders)
 *   onDelete     — () => Promise<void> | void  (if provided, shows 🗑 in header)
 *   deleteLabel  — string  (label for toast, e.g. "Ученик удалён")
 *   width        — Tailwind max-w class, default "max-w-md"
 *   isDirty      — boolean  (shows "unsaved changes" confirm on close)
 *   className    — string
 */
import { useEffect, useRef } from "react";
import { X, Trash2 } from "lucide-react";
import { cn } from "../../utils/cn.js";
import Button from "./Button.jsx";
import Tooltip from "./Tooltip.jsx";
import { useConfirm } from "../../contexts/ConfirmContext.jsx";
import { useToast } from "./Toast.jsx";

const UNDO_DELAY_MS = 5000;

export default function SideDrawer({
  isOpen,
  onClose,
  title,
  children,
  footer,
  onDelete,
  deleteLabel = "Запись удалена",
  className,
  width = "max-w-md",
  isDirty = false,
}) {
  const dialogRef = useRef(null);
  const confirm = useConfirm();
  const { showToast } = useToast();

  /* ── Open / close dialog ──────────────────────────────── */
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
      document.body.style.overflow = "hidden";
    } else {
      if (dialog.open) dialog.close();
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  /* ── Close attempt (respects isDirty) ────────────────── */
  const handleCloseAttempt = async () => {
    if (isDirty) {
      const proceed = await confirm({
        title: "Несохраненные изменения",
        message: "Вы внесли изменения, но не сохранили их. Закрыть без сохранения?",
        confirmText: "Не сохранять",
        cancelText: "Вернуться к редактированию",
        intent: "danger"
      });
      if (proceed) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  /* ── Backdrop click ───────────────────────────────────── */
  const handleCloseAttemptRef = useRef(handleCloseAttempt);
  useEffect(() => {
    handleCloseAttemptRef.current = handleCloseAttempt;
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleBackdropClick = (e) => {
      const rect = dialog.getBoundingClientRect();
      const isInDialog =
        rect.top    <= e.clientY && e.clientY <= rect.top  + rect.height &&
        rect.left   <= e.clientX && e.clientX <= rect.left + rect.width;
      if (!isInDialog) handleCloseAttemptRef.current();
    };

    dialog.addEventListener("click", handleBackdropClick);
    return () => dialog.removeEventListener("click", handleBackdropClick);
  }, []);

  /* ── Optimistic delete with Undo ──────────────────────── */
  const handleDeleteClick = () => {
    if (!onDelete) return;

    // Optimistically close the drawer
    onClose();

    let undone = false;

    // Show toast with Undo
    showToast({
      message: deleteLabel,
      type: "info",
      duration: UNDO_DELAY_MS,
      undoLabel: "Отменить",
      onUndo: () => {
        undone = true;
        // Caller is responsible for restoring state via the onDelete rejection
        // We just signal "undo was pressed" by NOT calling the real delete
      },
      onExpire: async () => {
        if (undone) return;
        try {
          await onDelete();
        } catch (err) {
          console.error("[SideDrawer] Delete failed:", err);
          showToast({ message: "Не удалось удалить. Попробуйте ещё раз.", type: "error", duration: 4000 });
        }
      },
    });
  };

  /* ── Render ───────────────────────────────────────────── */
  return (
    <>
      <dialog
        ref={dialogRef}
        onClose={onClose}
        onCancel={(e) => {
          e.preventDefault();
          handleCloseAttempt();
        }}
        style={{
          /* Override browser UA stylesheet: <dialog> defaults to `margin: auto` */
          margin: 0,
          marginLeft: "auto",
          height: "100dvh",
          maxHeight: "100dvh",
        }}
        className={cn(
          /* Overlay */
          "backdrop:bg-stone-900/40 backdrop:backdrop-blur-[3px]",
          /* Positioning */
          "fixed inset-0 p-0 w-full max-w-none sm:inset-y-0 sm:right-0 sm:left-auto",
          /* Panel chrome */
          "bg-ivory rounded-none sm:rounded-l-2xl overflow-hidden",
          "shadow-[0_32px_80px_rgba(0,0,0,0.22)]",
          /* Entrance animation */
          "open:animate-in open:slide-in-from-bottom-8 sm:open:slide-in-from-right open:duration-300",
          /* Width applied only on sm+ since max-w-none is used above for mobile */
          `sm:${width}`,
          className
        )}
      >
        <div className="flex flex-col h-full">

          {/* ── Header ────────────────────────────────────── */}
          <header className="shrink-0 flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md border-b border-stone-100">
            <h2 className="text-lg font-semibold text-stone-900 leading-snug">
              {title}
            </h2>
            <div className="flex items-center gap-1">
              {/* Delete button — only when onDelete is provided */}
              {onDelete && (
                <button
                  onClick={handleDeleteClick}
                  aria-label="Удалить запись"
                  className="flex items-center justify-center w-8 h-8 rounded-xl text-stone-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={16} strokeWidth={1.75} />
                </button>
              )}
              {/* Close button */}
              <button
                onClick={handleCloseAttempt}
                aria-label="Закрыть панель"
                className="flex items-center justify-center w-8 h-8 rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>
          </header>

          {/* ── Body ──────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
            {children}
          </div>

          {/* ── Footer (sticky) ───────────────────────────── */}
          {footer && (
            <footer className="shrink-0 border-t border-stone-200/60 px-6 py-4 bg-ivory">
              {typeof footer === 'function' ? footer(handleCloseAttempt) : footer}
            </footer>
          )}

        </div>
      </dialog>
    </>
  );
}
