import React from 'react';
import Tooltip from '../ui/Tooltip.jsx';
import DroppableSlot from './DroppableSlot.jsx';
import ScheduleSidebar from './ScheduleSidebar.jsx';
import { getDaysInMonth, getFirstDayOfMonth, getLessonWord, ymd } from './scheduleUtils.jsx';

export default function MonthView({
  currentDate,
  year,
  lessonsByDate,
  students,
  groups,
  firstUpcomingLessonIdByStudent,
  studentsWithDebt,
  studentsWithFinDebt,
  setCurrentDate,
  setView,
  setNavigatedFromMonth,
  periodLessons,
  onCreateStudent,
  handleOpenDrawer,
  onGoToProfile,
  selectedEntityId,
  onCardClick,
  selectedDateStr,
  onDateClick,
  onDateDoubleClick,
}) {
  const daysInMonth = getDaysInMonth(year, currentDate.getMonth());
  const firstDay = getFirstDayOfMonth(year, currentDate.getMonth());
  const days = [];
  
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  while (days.length % 7 !== 0) days.push(null);

  const todayStr = ymd(new Date());

  return (
    <div className="flex gap-4 sm:gap-6 w-full flex-1 min-h-0">
      <div className="flex-1 min-w-0 bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden flex flex-col p-4 sm:p-6">
        <div className="grid grid-cols-7 shrink-0 border-b border-slate-200/60 pb-2 mb-2">
          {['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'].map(d => (
            <div key={d} className="py-2 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
              {d}
            </div>
          ))}
        </div>
        <div 
          className="grid grid-cols-7 flex-1 overflow-hidden"
          style={{ gridTemplateRows: `repeat(${Math.ceil(days.length / 7)}, minmax(0, 1fr))` }}
        >
          {days.map((day, idx) => {
          if (!day) return <div key={idx} className="min-w-0 border-r border-b border-slate-200/60 bg-slate-50/40 p-1" />;
          
          const dateStr = ymd(new Date(year, currentDate.getMonth(), day));
          let dayLessons = lessonsByDate[dateStr] || [];
          
          if (selectedEntityId) {
            dayLessons = dayLessons.filter(l => l.studentId === selectedEntityId || l.groupId === selectedEntityId || l.studentIds?.includes(selectedEntityId));
          }

          const isToday = dateStr === todayStr;
          const isPast = dateStr < todayStr;

          const lessonCount = dayLessons.length;
          
          const hasHwDebtors = dayLessons.some(l => {
            if (l.type === "individual") {
              return firstUpcomingLessonIdByStudent.get(l.studentId) === l.id && studentsWithDebt.has(l.studentId);
            }
            if (l.type === "group" && l.groupId) {
              const g = groups.find(gr => gr.id === l.groupId);
              return g?.studentIds?.some(id => firstUpcomingLessonIdByStudent.get(id) === l.id && studentsWithDebt.has(id));
            }
            return false;
          });
          const hasFinDebtors = dayLessons.some(l => {
            if (l.type === "individual") {
              return firstUpcomingLessonIdByStudent.get(l.studentId) === l.id && studentsWithFinDebt.has(l.studentId);
            }
            if (l.type === "group" && l.groupId) {
              const g = groups.find(gr => gr.id === l.groupId);
              return g?.studentIds?.some(id => firstUpcomingLessonIdByStudent.get(id) === l.id && studentsWithFinDebt.has(id));
            }
            return false;
          });
          
          const cancelledCount = dayLessons.filter(l => l.status === "cancelled").length;
          const skippedFreeCount = dayLessons.filter(l => l.status === "skipped_free").length;
          const unmarkedCount = isPast ? dayLessons.filter(l => l.status === "scheduled").length : 0;
          const paidCount = isPast ? dayLessons.filter(l => l.status === "conducted" || l.status === "skipped_paid").length : 0;

          return (
            <DroppableSlot 
              key={idx} 
              id={`month-slot-${dateStr}`} 
              date={dateStr}
              className={`group/day min-w-0 border-r border-b border-slate-200/60 p-2 flex flex-col min-h-0 cursor-pointer ${isToday ? "bg-[#F4F7FB] z-10" : "bg-transparent hover:bg-slate-50/50"} relative transition-all duration-300 ${selectedDateStr === dateStr ? 'ring-2 ring-inset ring-indigo-400 bg-indigo-50/50' : ''}`}
              onClick={() => onDateClick?.(dateStr)}
              onDoubleClick={() => onDateDoubleClick?.(new Date(year, currentDate.getMonth(), day))}
            >
              <div className="flex-1 flex flex-col h-full">
                {/* Top Header */}
                <div className="flex items-start justify-between w-full">
                  <div className="flex flex-col gap-1.5 mt-1">
                    {!isPast && hasHwDebtors && (
                      <Tooltip text="Не сдано ДЗ" position="bottom-left">
                        <div className="w-2 h-2 rounded-full bg-[#006584] shadow-sm cursor-help" />
                      </Tooltip>
                    )}
                    {!isPast && hasFinDebtors && (
                      <Tooltip text="Задолженность" position="bottom-left">
                        <div className="w-2 h-2 rounded-full bg-[#B71234] shadow-sm cursor-help" />
                      </Tooltip>
                    )}
                    {(cancelledCount > 0 || skippedFreeCount > 0 || unmarkedCount > 0) && (
                      <div className="flex flex-col gap-1 mt-1">
                        {cancelledCount > 0 && (
                          <Tooltip text="Отмены уроков" position="bottom-left">
                            <span className="text-[9px] font-bold text-rose-500 bg-rose-50 px-1 rounded-md border border-rose-100/50 shadow-sm flex items-center justify-center w-fit">
                              {cancelledCount}
                            </span>
                          </Tooltip>
                        )}
                        {skippedFreeCount > 0 && (
                          <Tooltip text="Пропуски без оплаты" position="bottom-left">
                            <span className="text-[9px] font-bold text-stone-500 bg-stone-100 px-1 rounded-md border border-stone-200/50 shadow-sm flex items-center justify-center w-fit">
                              {skippedFreeCount}
                            </span>
                          </Tooltip>
                        )}
                        {unmarkedCount > 0 && (
                          <Tooltip text="Без отметки" position="bottom-left">
                            <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-100/50 shadow-sm flex items-center justify-center w-fit whitespace-nowrap">
                              {unmarkedCount} без отметки
                            </span>
                          </Tooltip>
                        )}
                      </div>
                    )}
                  </div>
                  {isToday ? (
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-academic-blue text-white text-sm font-bold shadow-sm shrink-0">
                      {day}
                    </span>
                  ) : (
                    <span className={`text-sm sm:text-base font-bold leading-none shrink-0 mt-1 mr-1 ${isPast ? "text-stone-400" : "text-stone-700 group-hover/day:text-stone-900 transition-colors"}`}>
                      {day}
                    </span>
                  )}
                </div>
                
                {/* Bottom Content */}
                <div className="flex-1 flex flex-col justify-end items-start pb-1 mt-1">
                  {(isPast ? paidCount : lessonCount) > 0 && (
                    <div className="flex items-baseline gap-1">
                      <span className={`text-2xl md:text-3xl font-black leading-none ${isPast ? "text-stone-400" : "text-stone-800"}`}>
                        {isPast ? paidCount : lessonCount}
                      </span>
                      <span className={`text-[10px] md:text-xs font-medium ${isPast ? "text-stone-400" : "text-stone-500"}`}>
                        {getLessonWord(isPast ? paidCount : lessonCount)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </DroppableSlot>
          );
        })}
      </div>

        {/* Подсказка про двойной клик */}
        <div className="shrink-0 flex items-center justify-center gap-2 pt-3 pb-1 opacity-50 hover:opacity-70 transition-opacity">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
            <rect x="5" y="2" width="14" height="20" rx="7" />
            <path d="M12 6v4" />
          </svg>
          <span className="text-[11px] text-slate-400 font-medium select-none">
            Двойной клик по дате — открыть день
          </span>
        </div>
      </div>
    </div>
  );
}
