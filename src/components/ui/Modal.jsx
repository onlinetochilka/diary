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
        "bg-ivory rounded-2xl shadow-neu-xl w-full p-0 overflow-visible",
        "open:animate-in open:fade-in-0 open:zoom-in-95 open:duration-200",
        maxWidth,
        className
      )}
    >
      <div className="flex items-center justify-between p-5 border-b border-stone-100">
        <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Закрыть"
        >
          <X size={18} strokeWidth={2} />
        </Button>
      </div>
      <div className="p-5">
        {children}
      </div>
    </dialog>
  );
}
