/**
 * TopDebtorsCard.jsx — антитоп: должники по убыванию долга.
 * Та же структура что и TopStudentsSection, розовая схема.
 */
import React, { useMemo } from "react";
import { AlertCircle, CheckCircle } from "lucide-react";
import { Card } from "../ui/index.js";
import { getEntityStyle, getEntityColorClasses } from "../../utils/colors.js";

export function TopDebtorsCard({ studentData, maxItems = 5, className = "" }) {
  const debtors = useMemo(() =>
    [...studentData]
      .filter(s => s.balance < 0)
      .sort((a, b) => a.balance - b.balance)
      .slice(0, maxItems),
    [studentData, maxItems]
  );

  const maxDebt = debtors.length > 0 ? Math.abs(debtors[0].balance) : 0;

  return (
    <div className={`space-y-2.5 ${className} w-full`}>
      <div className="flex items-center gap-2 h-5">
        <AlertCircle size={14} className="text-stone-400" strokeWidth={2.5} />
        <h2 className="text-sm font-bold text-stone-800 tracking-tight">Должники</h2>
        <span className="text-[10px] text-stone-400 font-medium mt-0.5">по сумме долга</span>
      </div>

      <Card variant="elevated" className="p-0 overflow-hidden">
        {debtors.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 px-4 text-center">
            <CheckCircle size={22} className="text-emerald-400/60" />
            <p className="text-sm font-medium text-stone-500">Все ученики в расчёте</p>
          </div>
        ) : (
          /* Прокручиваемая зона: 3 строки видны */
          <div
            className="divide-y divide-stone-50 overflow-y-auto"
            style={{ maxHeight: "192px", scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {debtors.map((s, i) => {
              const c   = getEntityColorClasses();
              const pct = maxDebt > 0 ? Math.round((Math.abs(s.balance) / maxDebt) * 100) : 0;

              return (
                <div key={s.id} className="flex items-center gap-3 px-4 py-3 hover:bg-rose-50/20 transition-colors">
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
                      <span className="text-sm font-bold text-rose-500 shrink-0 ml-2">−{Math.abs(s.balance).toLocaleString("ru")} ₽</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1 bg-stone-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-rose-400 to-rose-200 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
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
