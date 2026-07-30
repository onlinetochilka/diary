import React from 'react';
import { Tooltip } from '../ui/index.js';
import DroppableSlot from './DroppableSlot.jsx';
import { ArrowLeft, XCircle, MoreVertical } from 'lucide-react';
import { ymd, renderStatusIcon } from './scheduleUtils.jsx';

export default function DayView({
  currentDate,
  lessonsByDate,
  students,
  groups,
  firstUpcomingLessonIdByStudent,
  studentsWithDebt,
  studentsWithFinDebt,
  handleOpenDrawer,
  setPopover,
  setView,
  setNavigatedFromMonth,
  navigatedFromMonth,
  getLessonDisplayData,
  getLessonTopic
}) {
  const dateStr = ymd(currentDate);
  const dayLessons = lessonsByDate[dateStr] || [];
  const formattedDate = currentDate.toLocaleString("ru", { weekday: 'long' });
  
  const getPlural = (num, forms) => {
    const n = Math.abs(num) % 100;
    const n1 = n % 10;
    if (n > 10 && n < 20) return forms[2];
    if (n1 > 1 && n1 < 5) return forms[1];
    if (n1 === 1) return forms[0];
    return forms[2];
  };
  const formatMoney = (num) => new Intl.NumberFormat('ru-RU').format(num) + ' ₽';
  
  const revenue = dayLessons
    .filter(l => l.status !== 'cancelled' && l.status !== 'skipped_free')
    .reduce((sum, l) => sum + (Number(l.price) || 0), 0);
  const lessonCount = dayLessons.length;
  
  const todayStr = ymd(new Date());
  const isToday = dateStr === todayStr;
  
  const tlStartH = 8;
  const tlEndH = 23;
  const hours = Array.from({ length: tlEndH - tlStartH }, (_, i) => tlStartH + i);
  const hourHeight = 120; // px
  
  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin pb-8 px-4 sm:px-6 lg:px-8 -mx-4 sm:-mx-6 lg:-mx-8">
      <div className="max-w-[1400px] mx-auto flex flex-col h-full space-y-6">
        <div className="shrink-0 sticky top-0 backdrop-blur-md bg-white/80 z-50 border-b border-slate-100 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {navigatedFromMonth && (
              <Tooltip text="Назад к месяцу" position="bottom">
                <button 
                  onClick={() => {
                    setView("month");
                    setNavigatedFromMonth(false);
                  }}
                  className="p-1.5 hover:bg-slate-50 text-slate-500 rounded-lg transition-colors"
                >
                  <ArrowLeft size={18} />
                </button>
              </Tooltip>
            )}
            <h3 className="text-base font-semibold text-slate-800 capitalize">
              {formattedDate}
            </h3>
          </div>
          {lessonCount > 0 && (
            <div className="text-slate-600 bg-white/60 px-4 py-1.5 rounded-xl text-sm font-semibold shadow-sm ring-1 ring-slate-200 flex items-center gap-2">
              <span>{lessonCount} {getPlural(lessonCount, ["урок", "урока", "уроков"])}</span>
              {revenue > 0 && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="text-emerald-600">{formatMoney(revenue)}</span>
                </>
              )}
            </div>
          )}
        </div>
        
        <div className="flex-1 flex bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden mb-4 relative min-h-[600px] max-w-[1400px] mx-auto w-full p-2 sm:p-4">
          {/* Y-axis timeline */}
          <div className="w-12 sm:w-16 shrink-0 border-r border-slate-100 bg-white z-40">
            <div className="relative" style={{ height: hours.length * hourHeight }}>
              {hours.map(h => (
                <div key={h} className="absolute w-full text-right pr-2 text-[10px] font-semibold text-slate-600 -translate-y-1/2" style={{ top: (h - tlStartH) * hourHeight }}>
                  {h}:00
                </div>
              ))}
            </div>
          </div>
          
          {/* Grid Body */}
          <div className="flex-1 relative min-w-[300px]">
            {/* Horizontal Grid Lines */}
            <div className="absolute inset-0 pointer-events-none z-0">
              {hours.map(h => (
                <div key={h} className="absolute w-full border-t border-slate-100 border-dashed" style={{ top: (h - tlStartH) * hourHeight }} />
              ))}
            </div>

            {/* Current Time Indicator */}
            {isToday && currentMins >= tlStartH * 60 && currentMins <= tlEndH * 60 && (
              <div 
                className="absolute left-0 right-0 z-30 pointer-events-none"
                style={{ top: ((currentMins - tlStartH * 60) / 60) * hourHeight }}
              >
                <div className="h-[2px] bg-indigo-500 w-full relative shadow-[0_0_8px_rgba(99,102,241,0.5)]">
                  <div className="absolute left-0 -translate-y-1/2 w-2.5 h-2.5 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.8)]">
                    <div className="absolute inset-0 rounded-full bg-indigo-400 animate-ping opacity-75"></div>
                  </div>
                </div>
              </div>
            )}

            <div 
              className="absolute inset-0 z-10"
            >
              {/* Background Clickable Area (to add lesson) */}
              <div className="absolute inset-0 flex flex-col z-10">
                {hours.map(h => (
                  <DroppableSlot
                    key={h}
                    id={`day-slot-${dateStr}-${h}`}
                    date={dateStr}
                    className="w-full hover:bg-stone-200/40 hover:shadow-neu-sm-inset transition-all cursor-pointer"
                    style={{ height: hourHeight }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDrawer({ date: dateStr, startTime: `${String(h).padStart(2, '0')}:00` });
                    }}
                  />
                ))}
              </div>

              {/* Lessons */}
              {(() => {
                const sorted = [...dayLessons].map(l => {
                  const [sH, sM] = l.startTime.split(':').map(Number);
                  const [eH, eM] = l.endTime.split(':').map(Number);
                  let startMins = sH * 60 + sM;
                  let endMins = eH * 60 + eM;
                  if (endMins - startMins < 30) {
                    endMins = startMins + 30; // Enforce minimum visual duration
                  }
                  return { ...l, startMins, endMins };
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
                  
                  const top = ((displayStart - (tlStartH * 60)) / 60) * hourHeight;
                  const height = Math.max(60, ((displayEnd - displayStart) / 60) * hourHeight); // Ensure minimum 60px height
                  
                  const leftPercent = (l.colIndex / l.numCols) * 100;
                  const widthPercent = 100 / l.numCols;
                  
                  const { title, borderColorClass, textColorClass, bgColorClass, entityStyle, hasFinDebt, hasHwDebt } = getLessonDisplayData(l);
                  const topicTitle = getLessonTopic(l);
                  const isPast = ymd(new Date(l.date)) < ymd(new Date());
                  const isFaded = false;
                  
                  return (
                    <div 
                      key={l.id} 
                      className="absolute transition-all z-30 hover:z-40 px-1 py-[1px]"
                      style={{ 
                        top, 
                        height,
                        left: `${leftPercent}%`,
                        width: `${widthPercent}%`
                      }}
                    >
                      <div 
                        className={`h-full w-full entity-light-bg rounded-xl shadow-sm ring-1 ring-slate-200 border-t-[4px] entity-border-top flex items-center justify-between px-3 py-2 cursor-pointer transition-all outline-none group hover:shadow-md hover:-translate-y-px overflow-hidden ${isFaded ? "opacity-60" : ""}`}
                        style={entityStyle}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDrawer(l);
                        }}
                      >
                        {/* Left: Time & Info */}
                        <div className="flex gap-3 items-center flex-1 min-w-0 h-full">
                          
                          <div className={`font-bold tabular-nums text-sm sm:text-base flex items-center justify-center shrink-0 pr-3 border-r-2 border-[#006584]/20 ${textColorClass} h-full`}>
                            <span>{l.startTime} — {l.endTime}</span>
                          </div>
                          
                          <div className="min-w-0 flex-1 flex flex-col justify-center">
                            <div className="font-bold text-stone-800 text-sm sm:text-base truncate leading-tight mb-0.5">{title}</div>
                            <div className="text-[10px] sm:text-xs text-stone-500 font-medium flex items-center gap-1.5 flex-wrap">
                              <span className="bg-white/60 px-1.5 rounded">{l.subjectName}</span>
                              {l.status === 'cancelled' ? (
                                <span className="text-[9px] font-bold text-red-600 bg-red-100 px-1 rounded-sm">Отменён</span>
                              ) : l.status === 'skipped_free' ? (
                                <span className="text-[9px] font-bold text-stone-600 bg-stone-200 px-1 rounded-sm">б/о</span>
                              ) : (
                                renderStatusIcon(l.status)
                              )}
                              {topicTitle && height >= 60 && (
                                <>
                                  <span className="text-stone-300">•</span>
                                  <span className="truncate max-w-[120px] sm:max-w-[200px]" title={topicTitle}>{topicTitle}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Right: Actions */}
                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-2">
                          {hasHwDebt && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDrawer(l, "hw");
                              }}
                              className="flex flex-col items-center justify-center w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-xl font-bold text-[8px] sm:text-[9px] uppercase transition-all outline-none bg-white shadow-sm ring-1 ring-slate-200 active:bg-slate-50 text-[#B71234] hover:text-rose-600"
                            >
                              <span className="leading-none mb-0.5">ДЗ</span>
                              <XCircle size={10} className="sm:hidden" strokeWidth={2.5}/>
                              <XCircle size={12} className="hidden sm:block" strokeWidth={2.5}/>
                            </button>
                          )}
                          {hasFinDebt && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDrawer(l, "fin");
                              }}
                              className="flex flex-col items-center justify-center w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-xl font-bold text-[8px] sm:text-[9px] uppercase transition-all outline-none bg-white shadow-sm ring-1 ring-slate-200 active:bg-slate-50 text-[#B71234] hover:text-rose-600"
                            >
                              <span className="leading-none mb-0.5">₽</span>
                              <XCircle size={10} className="sm:hidden" strokeWidth={2.5}/>
                              <XCircle size={12} className="hidden sm:block" strokeWidth={2.5}/>
                            </button>
                          )}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              setPopover({ lesson: l, triggerRect: rect });
                            }}
                            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-stone-400 hover:text-indigo-600 hover:bg-white/50 shadow-sm rounded-xl transition-all"
                          >
                            <MoreVertical size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
