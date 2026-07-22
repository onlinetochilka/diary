/**
 * SideDrawer.jsx — Точилка UI Kit
 * ─────────────────────────────────────────────────────────────────────────────
 * Slide-over panel from the right.
 */
import { useEffect, useRef, useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import { cn } from "../../utils/cn.js";
import Button from "./Button.jsx";
import Modal from "./Modal.jsx";

export default function SideDrawer({
  isOpen,
  onClose,
  title,
  children,
  className,
  width = "max-w-md",
  isDirty = false,
}) {
  const dialogRef = useRef(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
        setShowConfirm(false); // Reset confirm state on open
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);
  
  const handleCloseAttempt = () => {
    if (isDirty) {
      setShowConfirm(true);
    } else {
      onClose();
    }
  };

  const handleConfirmClose = () => {
    setShowConfirm(false);
    onClose();
  };

  // Close on backdrop click
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleBackdropClick = (e) => {
      // If the confirm modal is open, we don't process backdrop clicks on the drawer
      if (showConfirm) return;

      const rect = dialog.getBoundingClientRect();
      const isInDialog =
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width;
      
      if (!isInDialog) {
        handleCloseAttemptRef.current();
      }
    };

    dialog.addEventListener('click', handleBackdropClick);
    return () => dialog.removeEventListener('click', handleBackdropClick);
  }, [showConfirm]); // depend on showConfirm to update the closure if needed

  const handleCloseAttemptRef = useRef(handleCloseAttempt);
  useEffect(() => {
    handleCloseAttemptRef.current = handleCloseAttempt;
  }, [handleCloseAttempt]);

  return (
    <>
      <dialog
        ref={dialogRef}
        onClose={onClose}
        className={cn(
          "backdrop:bg-stone-900/40 backdrop:backdrop-blur-sm",
          "fixed inset-y-0 left-auto right-0 ml-auto m-0 h-full max-h-none overflow-y-auto",
          "bg-ivory shadow-neu-xl p-0 w-full sm:rounded-l-2xl",
          "open:animate-in open:slide-in-from-right open:duration-300",
          width,
          className
        )}
      >
        <div className="flex flex-col h-full">
          <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md border-b border-stone-100">
            <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCloseAttempt}
              aria-label="Закрыть панель"
            >
              <X size={20} strokeWidth={2} className="text-stone-500" />
            </Button>
          </header>
          <div className="flex-1 overflow-y-auto p-6">
            {children}
          </div>
        </div>
      </dialog>

      <Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)} title="Несохраненные изменения">
        <div className="text-center mb-6">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-amber-100 mb-4">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
          </div>
          <p className="text-stone-600 text-sm">
            Вы внесли изменения, но не сохранили их. Закрыть без сохранения?
          </p>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowConfirm(false)}>
            Вернуться к редактированию
          </Button>
          <Button variant="primary" className="bg-red-600 hover:bg-red-700 focus:ring-red-500/20 border-transparent text-white" onClick={handleConfirmClose}>
            Не сохранять
          </Button>
        </div>
      </Modal>
    </>
  );
}
