import React, { useState } from 'react';
import Tooltip from '../ui/Tooltip.jsx';
import DroppableSlot from './DroppableSlot.jsx';
import { LessonCard } from './LessonCard.jsx';
import { ymd, renderStatusIcon } from './scheduleUtils.jsx';
import DayNotesPopover from './DayNotesPopover.jsx';
import { useAllDayNotes } from '../../hooks/useDayNotes.js';

export default function WeekView({
  currentDate,
  lessonsByDate,
  students,
  groups,
  firstUpcomingLessonIdByStudent,
  studentsWithDebt,
  studentsWithFinDebt,
  periodLessons,
  handleOpenDrawer,
  setPopover,
  getLessonDisplayData,
  getLessonTopic,
  onFinClick,
  onHwClick,
  onCreateStudent,
  onGoToProfile,
  selectedEntityId,
  onCardClick,
  onDateClick,
  onDateDoubleClick,
  onQuickModal,
}) {
  const [activeNotesDate, setActiveNotesDate] = useState(null);
  
  const d = new Date(currentDate);
  const dayOfWeek = d.getDay() === 0 ? 6 : d.getDay() - 1;
  d.setDate(d.getDate() - dayOfWeek); // Start of week (Monday)
  
  const weekDays = [];
  const weekDateStrs = [];
  for (let i = 0; i < 7; i++) {
    weekDays.push(new Date(d));
    weekDateStrs.push(ymd(d));
    d.setDate(d.getDate() + 1);
  }

  const allNotes = useAllDayNotes(weekDateStrs);

  const todayStr = ymd(new Date());
  
  // Динамические границы таймлайна: расширяем если уроки выходят за 8–23
  let tlStartH = 8;
  let tlEndH = 23;
  weekDays.forEach(wd => {
    const dStr = ymd(wd);
    (lessonsByDate[dStr] || []).forEach(l => {
      const [sH] = l.startTime.split(':').map(Number);
      const [eH, eM] = l.endTime.split(':').map(Number);
      if (sH < tlStartH) tlStartH = sH;
      const effectiveEnd = eM > 0 ? eH + 1 : eH;
      if (effectiveEnd > tlEndH) tlEndH = Math.min(effectiveEnd, 24);
    });
  });
  const hours = Array.from({ length: tlEndH - tlStartH }, (_, i) => tlStartH + i);
  const hourHeight = 64; // px

  return (
    <div className="flex-1 min-w-0 flex flex-col bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden p-2 sm:p-4">
        {/* Headers */}
        <div className="flex shrink-0 border-b border-slate-100 bg-white z-50 pr-[16px] pb-2 mb-2">
        <div className="w-10 sm:w-12 shrink-0 border-r border-slate-100"></div>
        <div className="flex-1 flex min-w-0">
          {weekDays.map((wd, i) => {
            const dateStr = ymd(wd);
            const isToday = dateStr === todayStr;
            const isPast = dateStr < todayStr;
            const dayName = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'][i];
            const dayLessons = lessonsByDate[dateStr] || [];
            
            const hasHwDebtors = dayLessons.some(l => {
              if (l.type === "individual") {
                return firstUpcomingLessonIdByStudent.get(l.studentId) === l.id && studentsWithDebt.has(l.studentId);
              } else {
                return l.studentIds?.some(id => firstUpcomingLessonIdByStudent.get(id) === l.id && studentsWithDebt.has(id));
              }
            });

            const hasFinDebtors = dayLessons.some(l => {
              if (l.type === "individual") {
                const entity = l.studentId ? students.find(s => s.id === l.studentId) : null;
                return firstUpcomingLessonIdByStudent.get(l.studentId) === l.id && (entity?.balance || 0) < 0;
              } else {
                return l.studentIds?.some(id => {
                  const st = students.find(s => s.id === id);
                  return firstUpcomingLessonIdByStudent.get(id) === l.id && (st?.balance || 0) < 0;
                });
              }
            });
            
            const paidCount = isPast ? dayLessons.filter(l => l.status === "conducted" || l.status === "skipped_paid").length : 0;
            const cancelCount = dayLessons.filter(l => l.status === "cancelled").length;
            const skippedFreeCount = dayLessons.filter(l => l.status === "skipped_free").length;
            const unmarkedCount = isPast ? dayLessons.filter(l => l.status === "scheduled").length : 0;

            return (
              <div 
                key={dateStr} 
                className={`flex-1 min-w-0 flex flex-col items-center justify-center py-2 sm:py-3 border-r border-slate-100 last:border-r-0 relative ${isToday ? "bg-indigo-50/50 rounded-xl z-10" : "bg-transparent hover:bg-slate-50/50 rounded-xl cursor-pointer"} transition-all mx-0.5`}
                onClick={() => onDateClick?.(dateStr)}
                onDoubleClick={() => onDateDoubleClick?.(new Date(dateStr))}
              >
                <div className="absolute top-1 left-1 flex flex-col gap-1">
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
                </div>
                {(cancelCount > 0 || skippedFreeCount > 0 || unmarkedCount > 0) && (
                  <div className="absolute top-1 right-1 flex gap-0.5">
                    {cancelCount > 0 && (
                      <Tooltip text="Отмены уроков" position="bottom-right">
                        <span className="text-[9px] font-bold text-rose-500 bg-rose-50 px-1 rounded-md border border-rose-100/50 shadow-sm">
                          {cancelCount}
                        </span>
                      </Tooltip>
                    )}
                    {skippedFreeCount > 0 && (
                      <Tooltip text="Пропуски без оплаты" position="bottom-right">
                        <span className="text-[9px] font-bold text-stone-500 bg-stone-100 px-1 rounded-md border border-stone-200/50 shadow-sm">
                          {skippedFreeCount}
                        </span>
                      </Tooltip>
                    )}
                    {unmarkedCount > 0 && (
                      <Tooltip text="Без отметки" position="bottom-right">
                        <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1 rounded-md border border-amber-100/50 shadow-sm">
                          {unmarkedCount}
                        </span>
                      </Tooltip>
                    )}
                  </div>
                )}
                <div className={`text-[9px] sm:text-[10px] font-bold tracking-widest uppercase mb-1 ${isToday ? 'text-academic-blue' : 'text-stone-400'}`}>{dayName}</div>
                <div className="relative group">
                  <div className={`text-lg sm:text-2xl font-bold leading-none flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full ${isToday ? 'bg-academic-blue text-white shadow-sm' : 'text-stone-800'}`}>
                    {wd.getDate()}
                  </div>
                  {/* Скрепка для заметок */}
                  <div 
                    className="absolute -top-1 -right-3 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1 z-20"
                    onClick={(e) => { e.stopPropagation(); setActiveNotesDate(dateStr); }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 hover:text-slate-600 transition-colors">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                    </svg>
                    {allNotes[dateStr] && allNotes[dateStr].items?.some(i => !i.done) && (
                      <div className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-slate-600 border border-white" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Body (Scrollable) */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden flex relative scrollbar-thin pb-6 pr-2">
        <div className="w-10 sm:w-12 shrink-0 border-r border-slate-100 bg-white sticky left-0 z-40" style={{ minHeight: hours.length * hourHeight }}>
          <div className="relative" style={{ height: hours.length * hourHeight }}>
            {hours.map(h => (
              <div key={h} className={`absolute w-full text-right pr-2 text-[10px] font-semibold text-slate-600 ${h === tlStartH ? 'translate-y-1' : '-translate-y-1/2'}`} style={{ top: (h - tlStartH) * hourHeight }}>
                {h === tlStartH ? null : `${h}:00`}
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex-1 flex min-w-[500px] relative">
          <div className="absolute left-0 right-0 pointer-events-none z-20" style={{ height: hours.length * hourHeight }}>
            {hours.map(h => (
              <div key={h} className="absolute w-full border-t border-slate-100 border-dashed" style={{ top: (h - tlStartH) * hourHeight }} />
            ))}
          </div>
          
          {weekDays.map((wd) => {
            const dateStr = ymd(wd);
            const isToday = dateStr === todayStr;
            const isPast = dateStr < todayStr;
            const dayLessons = lessonsByDate[dateStr] || [];

            return (
              <div key={dateStr} style={{ height: hours.length * hourHeight }} className={`group flex-1 min-w-0 border-r border-slate-100 last:border-r-0 ${isToday ? "bg-indigo-50/30 rounded-xl z-10" : "bg-transparent"} relative transition-all mx-0.5`}>
                <div 
                  className="w-full relative min-h-full transition-all duration-300"
                  style={{ height: hours.length * hourHeight }}
                >
                  {/* Interactive Background Cells */}
                  <div className="absolute inset-0 flex flex-col z-10">
                    {hours.map(h => (
                      <DroppableSlot
                        key={h}
                        id={`week-slot-${dateStr}-${h}`}
                        date={dateStr}
                        className="w-full cursor-pointer hover:bg-stone-200/40 transition-all"
                        style={{ height: hourHeight }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDrawer({ date: dateStr, startTime: `${String(h).padStart(2, '0')}:00` });
                        }}
                      />
                    ))}
                  </div>
                  {(() => {
                    const sorted = [...dayLessons].map(l => {
                      const [sH, sM] = l.startTime.split(':').map(Number);
                      const [eH, eM] = l.endTime.split(':').map(Number);
                      return { ...l, startMins: sH * 60 + sM, endMins: eH * 60 + eM };
                    }).sort((a, b) => a.startMins - b.startMins || (b.endMins - b.startMins) - (a.endMins - a.startMins));

                    let clusters = [];
                    sorted.forEach(l => {
                      if (clusters.length === 0) {
                        clusters.push([l]);
                      } else {
                        let lastCluster = clusters[clusters.length - 1];
                        let clusterEnd = Math.max(...lastCluster.map(c => c.endMins));
                        if (l.startMins < clusterEnd) {
                          lastCluster.push(l);
                        } else {
                          clusters.push([l]);
                        }
                      }
                    });

                    const positioned = [];
                    clusters.forEach(cluster => {
                      let columns = [];
                      cluster.forEach(l => {
                        let placed = false;
                        for (let i = 0; i < columns.length; i++) {
                          const col = columns[i];
                          const lastInCol = col[col.length - 1];
                          if (l.startMins >= lastInCol.endMins) {
                            col.push(l);
                            placed = true;
                            break;
                          }
                        }
                        if (!placed) {
                          columns.push([l]);
                        }
                      });
                      
                      const numCols = columns.length;
                      columns.forEach((col, colIndex) => {
                        col.forEach(l => {
                          positioned.push({ ...l, colIndex, numCols });
                        });
                      });
                    });

                    return positioned.map(l => {
                      let displayStart = l.startMins;
                      let displayEnd = l.endMins;
                      if (displayStart < tlStartH * 60) displayStart = tlStartH * 60;
                      if (displayEnd > tlEndH * 60) displayEnd = tlEndH * 60;
                      if (displayEnd < displayStart) displayEnd = displayStart;
                      
                      const top = ((displayStart - (tlStartH * 60)) / 60) * hourHeight;
                      const height = Math.max(20, ((displayEnd - displayStart) / 60) * hourHeight);
                      
                      const leftPercent = (l.colIndex / l.numCols) * 100;
                      const widthPercent = 100 / l.numCols;
                      
                      const isSelectedLesson = !selectedEntityId || l.studentId === selectedEntityId || l.groupId === selectedEntityId || l.studentIds?.includes(selectedEntityId);
                      
                      return (
                        <div 
                          key={l.id} 
                          className={`absolute transition-all z-30 hover:z-40 px-[1px] sm:px-[2px] ${!isSelectedLesson ? 'opacity-30 grayscale saturate-50' : ''}`}
                          style={{ 
                            top, 
                            height,
                            left: `${leftPercent}%`,
                            width: `${widthPercent}%`
                          }}
                        >
                          <LessonCard 
                            lesson={l} 
                            displayData={getLessonDisplayData(l)}
                            topic={getLessonTopic(l)}
                            layout={widthPercent < 50 ? "compact" : "vertical"}
                            compact={widthPercent <= 50}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDrawer(l);
                            }}
                            onFinClick={onFinClick}
                            onHwClick={onHwClick}
                            onQuickModalClick={() => onQuickModal?.(l)}
                            onMoreClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              setPopover({ lesson: l, triggerRect: rect });
                            }}
                          />
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Подсказка о перетаскивании */}
      <div className="shrink-0 flex items-center justify-center gap-2 py-2 opacity-50 hover:opacity-70 transition-opacity">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
          <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
          <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
          <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
          <path d="M6 14a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v4a6 6 0 0 0 6 6h2 2a6 6 0 0 0 5-2.68" />
          <path d="M18 11v-1a2 2 0 0 1 2-2v0a2 2 0 0 1 2 2v4a8 8 0 0 1-8 8h-2" />
        </svg>
        <span className="text-[11px] text-slate-400 font-medium select-none">
          Карточки можно перетаскивать, чтобы изменить время
        </span>
        <span className="text-[11px] text-slate-300 select-none">·</span>
        <span className="text-[11px] text-slate-400 font-medium select-none">
          Ctrl / Alt — скопировать
        </span>
      </div>

      {activeNotesDate && (
        <DayNotesPopover 
          dateStr={activeNotesDate} 
          onClose={() => setActiveNotesDate(null)} 
        />
      )}
    </div>
  );
}
