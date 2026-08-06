/**
 * StatusPopover.jsx
 * ────────────────────────────────────────────────────────────────────────────
 * Попап быстрого изменения статуса урока.
 * Рендерится через createPortal в document.body.
 *
 * Props:
 *   popover        — { lesson, triggerRect } | null
 *   onClose        — () => void
 *   onQuickStatus  — (lesson, newStatus) => void
 */
import { createPortal } from "react-dom";
import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import Button from "../ui/Button.jsx";

const STATUS_OPTIONS = [
  { status: "conducted",    label: "Проведён",            Icon: CheckCircle2, colors: { active: "bg-emerald-100 text-emerald-800 font-bold", idle: "text-emerald-700 hover:bg-emerald-50" } },
  { status: "skipped_paid", label: "Оплаченный пропуск",  Icon: AlertCircle,  colors: { active: "bg-amber-100 text-amber-800 font-bold",   idle: "text-amber-700 hover:bg-amber-50"   } },
  { status: "skipped_free", label: "Неоплаченный пропуск",Icon: AlertCircle,  colors: { active: "bg-stone-200 text-stone-800 font-bold",   idle: "text-stone-700 hover:bg-stone-50"   } },
  { status: "cancelled",    label: "Отменён",             Icon: XCircle,      colors: { active: "bg-red-100 text-red-800 font-bold",        idle: "text-red-700 hover:bg-red-50"       } },
];

export function StatusPopover({ popover, onClose, onQuickStatus }) {
  if (!popover) return null;

  const { lesson, triggerRect: rect } = popover;
  const currentStatus = lesson.status || "scheduled";

  // Умное позиционирование: показываем снизу или сверху
  const popoverEstimatedHeight = 350;
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;
  const showAbove  = spaceBelow < popoverEstimatedHeight && spaceAbove > spaceBelow;

  const style = {
    left: Math.max(16, Math.min(rect.left, window.innerWidth - 240)),
  };

  if (showAbove) {
    style.bottom    = window.innerHeight - rect.top + 4;
    style.maxHeight = `calc(100vh - ${window.innerHeight - rect.top + 20}px)`;
  } else {
    style.top       = rect.bottom + 4;
    style.maxHeight = `calc(100vh - ${rect.bottom + 20}px)`;
  }

  return createPortal(
    <>
      {/* Backdrop для закрытия по клику мимо */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div
        className="fixed z-50 bg-white rounded-xl shadow-lg ring-1 ring-slate-200 p-2 w-56 animate-in fade-in zoom-in duration-200 overflow-y-auto"
        style={style}
      >
        <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1 px-2 pt-1">
          Изменить статус
        </div>

        {STATUS_OPTIONS.map(({ status, label, Icon, colors }) => {
          const isActive = currentStatus === status;
          const toggledStatus = isActive ? "scheduled" : status;
          return (
            <Button
              key={status}
              variant="ghost"
              className={`w-full text-left px-3 py-1.5 h-auto border-none justify-start font-normal text-sm rounded-lg flex items-center gap-2 ${isActive ? colors.active : colors.idle}`}
              onClick={() => onQuickStatus(lesson, toggledStatus)}
            >
              <Icon size={14} />
              {label}
            </Button>
          );
        })}
      </div>
    </>,
    document.body
  );
}
