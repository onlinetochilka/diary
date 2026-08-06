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
import React, { useState } from "react";
import { ChevronLeft, ChevronRight, CalendarPlus } from "lucide-react";
import Button from "../ui/Button.jsx";
import DayNotesPopover from "./DayNotesPopover.jsx";
import { useDayNotes } from "../../hooks/useDayNotes.js";

const VIEW_LABELS = { month: "Месяц", week: "Неделя", day: "День" };

export function ScheduleNavBar({
  view,
  headerTitle,
  currentDateStr,
  onPrev,
  onNext,
  onToday,
  onViewChange,
  onCreateLesson,
}) {
  const [showNotes, setShowNotes] = useState(false);
  // Загружаем только чтобы знать, есть ли дела, если мы в режиме day
  const { notesRecord } = useDayNotes(view === 'day' ? currentDateStr : null);
  const hasIncompleteNotes = notesRecord?.items?.some(i => !i.done);
  return (
    <>
      <div className="max-w-[1400px] mx-auto w-full flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-4 shrink-0 px-2 sm:px-0">
      {/* Навигация по периоду + заголовок */}
      <div className="flex items-center gap-3">
        <div className="flex p-1 bg-stone-100 rounded-lg shadow-sm ring-1 ring-stone-200 shrink-0">
          <Button
            variant="ghost"
            onClick={onPrev}
            className="w-9 h-9 flex items-center justify-center rounded-md text-stone-500 hover:text-stone-700 hover:bg-white hover:shadow-sm transition-all outline-none p-0 border-none h-auto"
          >
            <ChevronLeft size={20} />
          </Button>
          <Button
            variant="ghost"
            onClick={onToday}
            className="px-4 h-9 flex items-center justify-center rounded-md text-stone-600 font-medium text-sm hover:text-stone-800 hover:bg-white hover:shadow-sm transition-all outline-none border-none h-auto"
          >
            Сегодня
          </Button>
          <Button
            variant="ghost"
            onClick={onNext}
            className="w-9 h-9 flex items-center justify-center rounded-md text-stone-500 hover:text-stone-700 hover:bg-white hover:shadow-sm transition-all outline-none p-0 border-none h-auto"
          >
            <ChevronRight size={20} />
          </Button>
        </div>
        <h2 className="text-xl sm:text-2xl font-semibold text-slate-800 tracking-tight whitespace-nowrap min-w-[140px] flex items-center gap-2">
          {headerTitle}
          {view === "day" && (
            <div 
              className="relative cursor-pointer opacity-40 hover:opacity-100 transition-opacity p-1 group"
              onClick={() => setShowNotes(true)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600 transition-colors">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
              {hasIncompleteNotes && (
                <div className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-slate-600 border-2 border-white" />
              )}
            </div>
          )}
        </h2>
      </div>

      {/* Переключатель видов + кнопка создания */}
      <div className="flex items-center justify-between md:justify-end gap-4 flex-wrap">
        <div className="flex p-1 bg-stone-100 rounded-lg shadow-sm ring-1 ring-stone-200 shrink-0">
          {["month", "week", "day"].map((v) => (
            <Button
              key={v}
              variant="ghost"
              onClick={() => onViewChange(v)}
              className={`px-4 h-9 rounded-md text-sm font-medium transition-all outline-none border-none h-auto ${
                view === v
                  ? "bg-white text-stone-900 shadow-sm font-semibold hover:bg-white hover:text-stone-900"
                  : "text-stone-500 hover:text-stone-700 hover:bg-stone-50"
              }`}
            >
              {VIEW_LABELS[v]}
            </Button>
          ))}
        </div>

        <Button
          variant="filled"
          onClick={onCreateLesson}
          className="ml-2 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium h-auto shadow-sm outline-none active:scale-[0.98]"
        >
          <CalendarPlus size={18} strokeWidth={1.75} />
          Новый урок
        </Button>
      </div>
    </div>
      {showNotes && view === "day" && (
        <DayNotesPopover 
          dateStr={currentDateStr}
          onClose={() => setShowNotes(false)}
        />
      )}
    </>
  );
}
