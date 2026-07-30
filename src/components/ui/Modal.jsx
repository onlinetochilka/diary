/**
 * Modal.jsx — Точилка UI Kit
 * ─────────────────────────────────────────────────────────────────────────────
 * Native <dialog> modal to avoid overflow:hidden clipping issues.
 */
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "../../utils/cn.js";
import Button from "./Button.jsx";

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  className,
  maxWidth = "max-w-md",
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  // Handle click outside to close
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleBackdropClick = (e) => {
      const rect = dialog.getBoundingClientRect();
      const isInDialog =
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width;
      
      if (!isInDialog) {
        onClose();
      }
    };

    dialog.addEventListener('click', handleBackdropClick);
    return () => dialog.removeEventListener('click', handleBackdropClick);
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className={cn(
        "backdrop:bg-stone-900/40 backdrop:backdrop-blur-sm",
        "bg-white rounded-[24px] shadow-2xl ring-1 ring-slate-200/50 w-full p-0 overflow-visible",
        "open:animate-in open:fade-in-0 open:zoom-in-95 open:duration-200",
        maxWidth,
        className
      )}
    >
      <div className="flex items-center justify-between p-6 pb-2">
        <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
        <button
          onClick={onClose}
          aria-label="Закрыть"
          className="flex items-center justify-center w-8 h-8 rounded-full border border-stone-200/80 text-stone-400 hover:text-stone-700 hover:bg-stone-50 transition-colors"
        >
          <X size={16} strokeWidth={2} />
        </button>
      </div>
      <div className="p-6 pt-4">
        {children}
      </div>
    </dialog>
  );
}
