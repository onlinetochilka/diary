import React, { memo, useState } from "react";
import { Pencil, CheckCircle2, BookOpen, ChevronLeft, ChevronRight, Clock, FileText } from "lucide-react";
import { getEntityStyle, getEntityColorClasses } from "../../utils/colors.js";
import { cn } from "../../utils/cn.js";
import { getPlural } from "../../utils/plural.js";

const GroupCard = memo(({
  group,
  studentsInGroup,
  onOpenProgressModal,
  onOpenDrawer,
  onOpenLessonHistory,
  onOpenReport,
}) => {
  const [currentProgramIndex, setCurrentProgramIndex] = useState(0);

  // Stats calculation
  const debtorsCount = studentsInGroup.filter(s => (s.balance || 0) < 0).length;
  const isDebtor = debtorsCount > 0;
  
  // Mock stats - in reality these would come from group.stats
  const groupStats = group.stats || {};
  const attendanceRate = groupStats.attendanceRate ?? 100;
  const homeworkRate = groupStats.homeworkRate ?? 100;

  const activePrograms = group.programs || [];
  const safeProgramIndex = Math.min(currentProgramIndex, Math.max(0, activePrograms.length - 1));

  // Style for the card wrapper
  const isHighlighted = false;

  return (
    <div
      className={cn(
        "group relative bg-white p-5 rounded-2xl shadow-sm ring-1 flex flex-col hover:shadow-md transition-all duration-300 h-full",
        isHighlighted
          ? "ring-2 ring-blue-400 shadow-blue-100 shadow-md animate-highlight-pulse"
          : "ring-slate-200 hover:ring-black/10"
      )}
    >
      {/* HEADER */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex -space-x-2 overflow-hidden shrink-0 py-1 pl-1">
            {studentsInGroup.length > 0 ? (
              <>
                {studentsInGroup.slice(0, 3).map((s, i) => {
                  const c = getEntityColorClasses();
                  return (
                    <div 
                      key={s.id} 
                      className={`inline-block h-11 w-11 rounded-full ring-2 ring-[#FBFBFA] ${c.bg} flex items-center justify-center relative z-10`}
                      style={{ ...getEntityStyle(s), zIndex: 10 - i }}
                      title={s.name}
                    >
                      <span className={`text-sm font-bold ${c.text}`}>{s.name.charAt(0)}</span>
                    </div>
                  );
                })}
                {studentsInGroup.length > 3 && (
                  <div className="inline-block h-11 w-11 rounded-full ring-2 ring-[#FBFBFA] bg-stone-100/50 backdrop-blur-sm flex items-center justify-center relative z-10" style={{ zIndex: 5 }}>
                    <span className="text-xs font-bold text-stone-600">+{studentsInGroup.length - 3}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="h-11 w-11 rounded-full ring-2 ring-[#FBFBFA] bg-stone-100 flex items-center justify-center border border-dashed border-stone-300">
                <span className="text-xs text-stone-400">?</span>
              </div>
            )}
          </div>
          
          <div className="min-w-0 flex-1 ml-1">
            <h3 className="text-[17px] font-semibold text-stone-900 truncate tracking-tight" title={group.name}>
              {group.name}
            </h3>
            <div className="flex items-center gap-1.5 text-[13px] text-stone-500 truncate mt-0.5">
              <span className="font-medium text-teal-600">{group.subjectName}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-start gap-2 shrink-0">
          <div className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase shadow-sm shrink-0 mt-1">
            Группа
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); onOpenLessonHistory?.(group); }}
              title="История занятий"
              className={cn(
                "p-2 rounded-lg text-stone-400 transition-all duration-200 outline-none hover:bg-stone-100 hover:text-stone-700",
                "focus-visible:ring-2 focus-visible:ring-academic-blue",
                "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              )}
            >
              <Clock size={16} strokeWidth={2} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onOpenReport?.(group); }}
              title="Собрать отчёт"
              className={cn(
                "p-2 rounded-lg text-stone-400 transition-all duration-200 outline-none hover:bg-stone-100 hover:text-stone-700",
                "focus-visible:ring-2 focus-visible:ring-academic-blue",
                "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              )}
            >
              <FileText size={16} strokeWidth={2} />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onOpenDrawer(group);
              }}
              title="Редактировать группу"
              className={cn(
                "p-2 rounded-lg text-stone-400 transition-all duration-200 outline-none hover:bg-stone-100 hover:text-stone-700",
                "focus-visible:ring-2 focus-visible:ring-academic-blue",
                "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              )}
            >
              <Pencil size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      {/* FINANCE BLOCK */}
      <div className="flex items-center justify-between p-3 bg-stone-50/80 rounded-xl mb-5 ring-1 ring-black/[0.03]">
        <div className="flex flex-col">
          <span className="text-[11px] font-medium text-stone-400 uppercase tracking-wider mb-0.5">
            Статус оплат
          </span>
          <span className={cn(
            "text-base font-bold tracking-tight",
            isDebtor ? "text-red-600" : "text-emerald-600"
          )}>
            {isDebtor 
              ? `${debtorsCount} ${getPlural(debtorsCount, 'должник', 'должника', 'должников')}`
              : "Всё оплачено"}
          </span>
        </div>
        <div className="flex flex-col items-end text-right">
            <span className="text-[11px] font-medium text-stone-400 uppercase tracking-wider mb-0.5">Базовая ставка</span>
            <span className="text-[13px] font-semibold text-stone-700 mt-0.5">
              {group.price}₽ / {group.paymentType === 'subscription' ? (group.subscriptionLessons ? `${group.subscriptionLessons} зан.` : 'абон.') : 'урок'}
            </span>
        </div>
      </div>

      {/* STATS BLOCK */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {/* Посещаемость */}
        <div className="flex flex-col p-3 bg-stone-50 rounded-xl ring-1 ring-black/[0.03]">
          <div className="flex items-center gap-1.5 mb-2">
            <CheckCircle2 size={14} className="text-blue-500" />
            <span className="text-xs font-medium text-stone-500">Посещаемость</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-stone-800">{attendanceRate}%</span>
          </div>
          <span className="text-[11px] text-stone-400 mt-0.5">
            Средняя по группе
          </span>
        </div>

        {/* Домашние задания */}
        <div className="flex flex-col p-3 bg-stone-50 rounded-xl ring-1 ring-black/[0.03]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <BookOpen size={14} className="text-purple-500" />
              <span className="text-xs font-medium text-stone-500">ДЗ</span>
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-stone-800">{homeworkRate}%</span>
          </div>
          <span className="text-[11px] text-stone-400 mt-0.5">Сдают вовремя</span>
        </div>
      </div>

      {/* PROGRAM BLOCK */}
      <div className="flex flex-col gap-2 flex-1 mt-auto mb-5">
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-semibold text-stone-700 truncate pr-2">
              Программа занятий
            </span>
          </div>
          
          {activePrograms.length > 0 ? (
            <div className="flex flex-col gap-1.5 mt-1">
              <div className="flex justify-between items-end gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs text-stone-500 truncate font-medium">
                    {activePrograms[safeProgramIndex].name}
                  </span>
                  {activePrograms.length > 1 && (
                    <div className="flex gap-0.5 items-center bg-stone-100 rounded-md px-1 py-0.5 shrink-0 ml-1">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setCurrentProgramIndex(p => Math.max(0, p - 1)); }} 
                        disabled={safeProgramIndex === 0} 
                        className="p-0.5 text-stone-400 hover:text-stone-700 disabled:opacity-30 disabled:hover:text-stone-400 transition-colors"
                      >
                        <ChevronLeft size={12} />
                      </button>
                      <span className="text-[10px] text-stone-500 font-medium px-0.5">
                        {safeProgramIndex + 1}/{activePrograms.length}
                      </span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setCurrentProgramIndex(p => Math.min(activePrograms.length - 1, p + 1)); }} 
                        disabled={safeProgramIndex === activePrograms.length - 1} 
                        className="p-0.5 text-stone-400 hover:text-stone-700 disabled:opacity-30 disabled:hover:text-stone-400 transition-colors"
                      >
                        <ChevronRight size={12} />
                      </button>
                    </div>
                  )}
                </div>
                <span className="text-[11px] font-bold text-stone-700 shrink-0">
                  {(() => {
                    const prog = activePrograms[safeProgramIndex];
                    const total = prog.topics?.length || 0;
                    const completed = prog.topics?.filter(t => t.isCompleted)?.length || 0;
                    return total > 0 ? Math.round((completed / total) * 100) : 0;
                  })()}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden cursor-pointer" onClick={() => onOpenProgressModal(group, activePrograms[safeProgramIndex])}>
                <div 
                  className="h-full bg-academic-blue rounded-full transition-all duration-500 ease-out" 
                  style={{ 
                    ...getEntityStyle(activePrograms[safeProgramIndex]),
                    backgroundColor: 'oklch(var(--card-l) 0.12 var(--card-h))',
                    width: `${(() => {
                      const prog = activePrograms[safeProgramIndex];
                      const total = prog.topics?.length || 0;
                      const completed = prog.topics?.filter(t => t.isCompleted)?.length || 0;
                      return total > 0 ? Math.round((completed / total) * 100) : 0;
                    })()}%` 
                  }} 
                />
              </div>
            </div>
          ) : (
            <div className="text-xs font-medium text-stone-400 mt-1">
              Программа не назначена
            </div>
          )}
        </div>
      </div>

      {/* FOOTER */}
      <div className="flex items-center justify-between mt-auto pt-4 border-t border-stone-100">
        <div className="flex flex-col">
          <span className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-0.5">Общий доход</span>
          <span className="text-[13px] font-semibold text-stone-700">
            {(group.ltv || 0).toLocaleString('ru-RU')} ₽
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-0.5">Проведено</span>
          <span className="text-[13px] font-semibold text-stone-700">
            {group.conductedHours || 0} ч
          </span>
        </div>
      </div>

    </div>
  );
});

export default GroupCard;
