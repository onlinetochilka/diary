/**
 * ThemeRow.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Атомарная строка темы с поддержкой @dnd-kit/sortable.
 *
 * Отвечает за:
 *   • Рендер одной темы: порядковый номер, название, статус завершения
 *   • DnD-хэндл (GripVertical), появляющийся при hover
 *   • Все 8 состояний интерактива через CSS-классы .pe-theme-row.*
 *   • Корректный truncate длинных названий (line-clamp-2)
 *
 * НЕ управляет данными — только отображение и события.
 */
import { GripVertical, CheckCircle2, Circle } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "../../utils/cn.js";

/**
 * @param {object}   props
 * @param {object}   props.theme         — объект темы { id, title, order, isCompleted, homeworkBank }
 * @param {number}   props.index         — порядковый номер внутри раздела (1-based)
 * @param {boolean}  props.isSelected    — выделена ли тема в Инспекторе
 * @param {Function} props.onSelect      — (themeId) => void
 * @param {Function} props.onToggleComplete — (themeId, current) => void
 * @param {boolean}  [props.isDragOverlay] — true когда рендерится в DragOverlay
 */
export default function ThemeRow({
  theme,
  index,
  isSelected,
  onSelect,
  onToggleComplete,
  isDragOverlay = false,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
    isSorting,
  } = useSortable({
    id: theme.id,
    data: { type: "theme", theme },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isSorting ? transition : undefined,
  };

  const hwCount = theme.homeworkBank?.length ?? 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      // Клик по строке = выбор в Инспекторе
      onClick={() => !isDragging && onSelect?.(theme.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.(theme.id);
        }
      }}
      role="option"
      aria-selected={isSelected}
      tabIndex={0}
      className={cn(
        "pe-theme-row group/row",
        isSelected && "is-selected",
        isDragging && "opacity-0",          // оригинал скрываем — виден только Overlay
        isDragOverlay && "pe-drag-overlay", // Overlay получает стиль «в полёте»
      )}
    >
      {/* ── DnD Grip ─────────────────────────────────────────────── */}
      <button
        ref={setActivatorNodeRef}
        {...listeners}
        type="button"
        aria-label="Перетащить тему"
        tabIndex={-1}                        // не попадает в Tab-order страницы
        className="pe-grip touch-none"
        onClick={(e) => e.stopPropagation()} // не выбирать тему при захвате
      >
        <GripVertical size={14} strokeWidth={2} />
      </button>

      {/* ── Порядковый номер ─────────────────────────────────────── */}
      <span className="text-xs tabular-nums text-stone-400 flex-shrink-0 w-6 text-right select-none">
        {index}
      </span>

      {/* ── Название темы ────────────────────────────────────────── */}
      <span
        className={cn(
          // line-clamp-2: обрезает после 2 строк, не ломает ширину колонки
          "flex-1 min-w-0 text-sm leading-snug line-clamp-2",
          theme.isCompleted
            ? "text-stone-400 line-through"
            : "text-stone-800",
        )}
        title={theme.title} // полный текст в tooltip браузера
      >
        {theme.title}
      </span>

      {/* ── Правая зона: статус ДЗ + чекбокс завершения ─────────── */}
      <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
        {/* Бейдж банка ДЗ */}
        {hwCount > 0 && (
          <span
            title={`${hwCount} задани${hwCount === 1 ? "е" : hwCount < 5 ? "я" : "й"} в банке`}
            className={cn(
              "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
              "bg-[#1B4F72]/10 text-[#1B4F72]",
              "opacity-0 group-hover/row:opacity-100",
              "transition-opacity duration-150",
            )}
          >
            {hwCount}
          </span>
        )}

        {/* Кнопка завершения */}
        <button
          type="button"
          aria-label={theme.isCompleted ? "Отметить как незавершённую" : "Отметить как завершённую"}
          onClick={(e) => {
            e.stopPropagation();
            onToggleComplete?.(theme.id, theme.isCompleted);
          }}
          className={cn(
            "p-0.5 rounded-md transition-all duration-150",
            "opacity-0 group-hover/row:opacity-100",
            "focus-visible:opacity-100 focus-visible:outline-none",
            "focus-visible:ring-2 focus-visible:ring-[#1B4F72]",
            "active:scale-[0.90]",
            theme.isCompleted
              ? "text-emerald-500 hover:text-emerald-600"
              : "text-stone-300 hover:text-stone-500",
          )}
        >
          {theme.isCompleted
            ? <CheckCircle2 size={14} strokeWidth={2} />
            : <Circle size={14} strokeWidth={2} />
          }
        </button>
      </div>
    </div>
  );
}

/**
 * ThemeRowOverlay — клон темы для DragOverlay.
 * Рендерится вне SortableContext, поэтому useSortable не нужен.
 */
export function ThemeRowOverlay({ theme, index }) {
  const hwCount = theme.homeworkBank?.length ?? 0;
  return (
    <div className="pe-theme-row pe-drag-overlay">
      <span className="pe-grip text-stone-400 opacity-100">
        <GripVertical size={14} strokeWidth={2} />
      </span>
      <span className="text-xs tabular-nums text-stone-400 flex-shrink-0 w-6 text-right select-none">
        {index}
      </span>
      <span className="flex-1 min-w-0 text-sm leading-snug line-clamp-2 text-stone-800">
        {theme.title}
      </span>
      {hwCount > 0 && (
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#1B4F72]/10 text-[#1B4F72]">
          {hwCount}
        </span>
      )}
    </div>
  );
}
