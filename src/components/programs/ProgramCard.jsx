import React from 'react';
import { Pencil, Users, TrendingUp, Layers, BookOpen } from 'lucide-react';
import { getEntityStyle, getEntityColorClasses } from "../../utils/colors.js";
import { cn } from "../../utils/cn.js";
import { getPlural } from "../../utils/plural.js";
import { Tooltip } from "../../components/ui/index.js";

export default function ProgramCard({ program, onOpenEditor }) {
  const c = getEntityColorClasses();
  
  // Mock данные для аналитики
  const mockPopularity = Math.floor(Math.random() * 20) + 1; // от 1 до 20 учеников
  const mockProgress = Math.floor(Math.random() * 100); // от 0 до 100 %
  const mockRevenue = (Math.floor(Math.random() * 50) * 1000).toLocaleString('ru-RU');
  const mockHours = Math.floor(Math.random() * 100);
  
  const count = program.topics?.length ?? 0;
  // Считаем ДЗ. В реальных данных это может быть поле hasHomework у топика.
  const hwCount = program.topics?.filter(t => t.homework || t.hasHomework)?.length || Math.floor(count * 0.7);

  return (
    <div
      className={cn(
        "group relative bg-white p-5 rounded-2xl shadow-sm ring-1 ring-slate-200",
        "hover:ring-black/10 hover:shadow-md transition-all duration-300",
        "flex flex-col h-full cursor-pointer overflow-visible",
        `border-l-4 ${c.border}`
      )}
      style={getEntityStyle(program)}
      onClick={() => onOpenEditor(program.id)}
    >
      {/* Шапка карточки */}
      <div className="flex justify-between items-start mb-2">
        <div className="min-w-0 flex-1 pr-2">
          <div className="flex items-center gap-2 mb-2">
            <span className={cn(
              "px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase shadow-sm",
              program.subject ? `${c.lightBg} ${c.text}` : "bg-stone-100 text-stone-500"
            )}>
              {program.subject || "Без предмета"}
            </span>
          </div>
          <h3 className="font-bold text-stone-900 text-lg leading-tight truncate">
            {program.name}
          </h3>
          <div className="flex items-center gap-3 mt-2.5">
            <div className="flex items-center gap-1.5 text-stone-500">
              <Layers size={14} className="text-indigo-400" />
              <span className="text-xs font-medium">
                 {count} {getPlural(count, 'тема', 'темы', 'тем')}
              </span>
            </div>
            {hwCount > 0 && (
              <div className="flex items-center gap-1.5 text-stone-500">
                <BookOpen size={14} className="text-purple-400" />
                <span className="text-xs font-medium">
                  {hwCount} {getPlural(hwCount, 'задание', 'задания', 'заданий')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Hover-actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Tooltip text="Редактировать программу" position="top">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenEditor(program.id);
              }}
              className={cn(
                "p-2 rounded-lg text-stone-400 transition-all duration-200 outline-none hover:bg-stone-100 hover:text-stone-700",
                "focus-visible:ring-2 focus-visible:ring-fuchsia-600",
                "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              )}
            >
              <Pencil size={16} strokeWidth={2} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 gap-3 mb-5 mt-4">
        {/* Популярность */}
        <div className="flex flex-col p-3 bg-blue-50/60 rounded-xl ring-1 ring-blue-100/50">
          <div className="flex items-center gap-1.5 mb-2">
            <Users size={14} className="text-blue-500" />
            <span className="text-xs font-medium text-blue-700/80">Популярность</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-blue-900">{mockPopularity}</span>
          </div>
          <span className="text-[11px] text-blue-600/70 mt-0.5">учеников на курсе</span>
        </div>

        {/* Прогресс */}
        <div className="flex flex-col p-3 bg-emerald-50/60 rounded-xl ring-1 ring-emerald-100/50">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp size={14} className="text-emerald-500" />
            <span className="text-xs font-medium text-emerald-700/80">Прогресс</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-emerald-900">{mockProgress}%</span>
          </div>
          <span className="text-[11px] text-emerald-600/70 mt-0.5">среднее прохождение</span>
        </div>
      </div>

      {/* Футер */}
      <div className="flex items-center justify-between mt-auto pt-4 border-t border-stone-100">
        <div className="flex flex-col">
          <span className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-0.5">Общий доход</span>
          <span className="text-[13px] font-semibold text-stone-700">
            {mockRevenue} ₽
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-0.5">Проведено</span>
          <span className="text-[13px] font-semibold text-stone-700">
            {mockHours} ч
          </span>
        </div>
      </div>
    </div>
  );
}
