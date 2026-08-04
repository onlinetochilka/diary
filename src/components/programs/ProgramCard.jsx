import React from 'react';
import { Pencil, Users, TrendingUp, Layers, BookOpen } from 'lucide-react';
import { getEntityStyle, getEntityColorClasses } from "../../utils/colors.js";
import { cn } from "../../utils/cn.js";
import { getPlural } from "../../utils/plural.js";
import { Tooltip } from "../../components/ui/index.js";

export default function ProgramCard({ program, onOpenEditor }) {
  const c = getEntityColorClasses();
  

  const count = program.topics?.length ?? 0;
  // Считаем реальные задания из homeworkBank каждой темы
  const hwCount = program.topics?.reduce((sum, t) => sum + (t.homeworkBank?.length ?? 0), 0) ?? 0;

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

    </div>
  );
}
