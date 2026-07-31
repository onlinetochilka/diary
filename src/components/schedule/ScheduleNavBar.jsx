/**
 * ScheduleNavBar.jsx
 * ────────────────────────────────────────────────────────────────────────────
 * Панель навигации по периодам расписания:
 *   - Кнопки «пред / Сегодня / след»
 *   - Заголовок текущего периода (день / неделя / месяц)
 *   - Переключатель видов (Месяц / Неделя / День)
 *   - Кнопка «Новый урок»
 *
 * Props:
 *   view            — 'month' | 'week' | 'day'
 *   headerTitle     — строка заголовка периода
 *   onPrev          — () => void
 *   onNext          — () => void
 *   onToday         — () => void
 *   onViewChange    — (view) => void
 *   onCreateLesson  — () => void
 */
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

const VIEW_LABELS = { month: "Месяц", week: "Неделя", day: "День" };

export function ScheduleNavBar({
  view,
  headerTitle,
  onPrev,
  onNext,
  onToday,
  onViewChange,
  onCreateLesson,
}) {
  return (
    <div className="max-w-[1400px] mx-auto w-full flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-4 shrink-0 px-2 sm:px-0">
      {/* Навигация по периоду + заголовок */}
      <div className="flex items-center gap-3">
        <div className="flex p-1 bg-stone-100 rounded-lg shadow-sm ring-1 ring-stone-200 shrink-0">
          <button
            onClick={onPrev}
            className="w-9 h-9 flex items-center justify-center rounded-md text-stone-500 hover:text-stone-700 hover:bg-white hover:shadow-sm transition-all outline-none focus-visible:ring-2 focus-visible:ring-academic-blue"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={onToday}
            className="px-4 h-9 flex items-center justify-center rounded-md text-stone-600 font-medium text-sm hover:text-stone-800 hover:bg-white hover:shadow-sm transition-all outline-none focus-visible:ring-2 focus-visible:ring-academic-blue"
          >
            Сегодня
          </button>
          <button
            onClick={onNext}
            className="w-9 h-9 flex items-center justify-center rounded-md text-stone-500 hover:text-stone-700 hover:bg-white hover:shadow-sm transition-all outline-none focus-visible:ring-2 focus-visible:ring-academic-blue"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <h2 className="text-xl sm:text-2xl font-semibold text-slate-800 tracking-tight whitespace-nowrap min-w-[140px]">
          {headerTitle}
        </h2>
      </div>

      {/* Переключатель видов + кнопка создания */}
      <div className="flex items-center justify-between md:justify-end gap-4 flex-wrap">
        <div className="flex p-1 bg-stone-100 rounded-lg shadow-sm ring-1 ring-stone-200 shrink-0">
          {["month", "week", "day"].map((v) => (
            <button
              key={v}
              onClick={() => onViewChange(v)}
              className={`px-4 h-9 rounded-md text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-academic-blue ${
                view === v
                  ? "bg-white text-stone-900 shadow-sm font-semibold"
                  : "text-stone-500 hover:text-stone-700 hover:bg-stone-50"
              }`}
            >
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>

        <button
          onClick={onCreateLesson}
          className="ml-2 flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1B4F72] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1B4F72] active:scale-[0.98]"
        >
          <Plus size={18} strokeWidth={2} />
          Новый урок
        </button>
      </div>
    </div>
  );
}
