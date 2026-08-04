/**
 * TopStudentsSection.jsx — Топ прибыльных учеников.
 * Показывает первые 3 строки, остальные — скролл без скроллбара.
 * Нет цветных бейджей рядом с аватаркой — только тихий номер слева.
 */
import React, { useMemo } from "react";
import { Crown } from "lucide-react";
import { Card } from "../ui/index.js";
import { getEntityStyle, getEntityColorClasses } from "../../utils/colors.js";

const BAR_COLORS = [
  "from-amber-400  to-amber-200",
  "from-stone-300  to-stone-200",
  "from-orange-400 to-orange-200",
  "from-emerald-400 to-emerald-200",
  "from-emerald-300 to-emerald-100",
];

export function TopStudentsSection({ studentData, maxItems = 5, className = "" }) {
  const top = useMemo(() =>
    [...studentData]
      .filter(s => s.totalPaymentsSum > 0)
      .sort((a, b) => b.totalPaymentsSum - a.totalPaymentsSum)
      .slice(0, maxItems),
    [studentData, maxItems]
  );

  const maxSum = top.length > 0 ? top[0].totalPaymentsSum : 0;

  return (
    <div className={`space-y-2.5 ${className} w-full`}>
      <div className="flex items-center gap-2 h-5">
        <Crown size={14} className="text-stone-400" strokeWidth={2.5} />
        <h2 className="text-sm font-bold text-stone-800 tracking-tight">Топ учеников</h2>
        <span className="text-[10px] text-stone-400 font-medium mt-0.5">по сумме оплат</span>
      </div>

      <Card variant="elevated" className="p-0 overflow-hidden">
        {top.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-4 text-center bg-gradient-to-b from-stone-50/50 to-amber-50/20" style={{ height: 192 }}>
            <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center border border-amber-100 mb-1">
              <Crown size={24} className="text-amber-500" strokeWidth={2} />
            </div>
            <div>
              <p className="text-sm font-bold text-stone-700">Нет данных</p>
              <p className="text-xs text-stone-500 max-w-[200px] leading-relaxed mx-auto">Здесь появится топ учеников по сумме оплат.</p>
            </div>
          </div>
        ) : (
        /* Прокручиваемая зона: 3 строки видны */
        <div
          className="divide-y divide-stone-50 overflow-y-auto"
          style={{ maxHeight: "192px", scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {top.map((s, i) => {
            const c   = getEntityColorClasses();
            const pct = maxSum > 0 ? Math.round((s.totalPaymentsSum / maxSum) * 100) : 0;
            const bar = BAR_COLORS[i] ?? BAR_COLORS[4];

            return (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50/50 transition-colors">
                {/* Тихий номер */}
                <span className="text-[10px] font-bold text-stone-300 w-3 text-center shrink-0">{i + 1}</span>

                {/* Аватар */}
                <div
                  className={`h-7 w-7 rounded-lg ${c.bg} flex items-center justify-center shrink-0`}
                  style={getEntityStyle(s)}
                >
                  <span className={`text-[10px] font-bold ${c.text}`}>{s.name.charAt(0)}</span>
                </div>

                {/* Имя + бар */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="text-sm font-semibold text-stone-800 truncate leading-tight">{s.name}</span>
                    <span className="text-sm font-bold text-stone-700 shrink-0 ml-2">{s.totalPaymentsSum.toLocaleString("ru")} ₽</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 h-1 bg-stone-100 rounded-full overflow-hidden">
                      <div className={`h-full bg-gradient-to-r ${bar} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-stone-400 shrink-0">{s.totalLessons} ур.</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </Card>
    </div>
  );
}
