/**
 * FinanceChart.jsx
 * Улучшенный график доходов по месяцам.
 *
 * Улучшения vs старого inline-варианта:
 *  • Ось Y с подписями (25%, 50%, 75%, 100% от максимума)
 *  • Горизонтальная пунктирная сетка, точно выровненная с осью Y
 *  • Градиентные столбцы (текущий — насыщеннее)
 *  • Rich tooltip при hover: «85 000 ₽ · июль»
 *  • Текущий месяц: подпись суммы всегда видна (над столбцом)
 *  • Trend-бейдж в заголовке с иконкой TrendingUp/TrendingDown
 *
 * Props:
 *   chartData       — [{ label, income, isCurrent }]
 *   maxMonthIncome  — number
 *   incomeGrowthPct — number | null
 */
import React, { useState } from "react";
import { TrendingUp, TrendingDown, BarChart2 } from "lucide-react";
import { Card, EmptyState } from "../ui/index.js";

const BAR_HEIGHT_FULL    = 148; // px — полный размер
const BAR_HEIGHT_COMPACT = 156;  // px — компактный режим (чтобы Card был 192px)

/** 85000 → «85к», 1200000 → «1.2м» */
function fmt(v) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}м`;
  if (v >= 1_000)     return `${Math.round(v / 1_000)}к`;
  return String(v);
}

const MONTH_TO_DATIVE = {
  "янв.": "январю", "январь": "январю",
  "февр.": "февралю", "февраль": "февралю",
  "март": "марту",
  "апр.": "апрелю", "апрель": "апрелю",
  "май": "маю",
  "июнь": "июню",
  "июль": "июлю",
  "авг.": "августу", "август": "августу",
  "сент.": "сентябрю", "сентябрь": "сентябрю",
  "окт.": "октябрю", "октябрь": "октябрю",
  "нояб.": "ноябрю", "ноябрь": "ноябрю",
  "дек.": "декабрю", "декабрь": "декабрю",
};

const Y_TICKS = [1, 0.75, 0.5, 0.25]; // от вершины вниз

export function FinanceChart({ chartData, maxMonthIncome, incomeGrowthPct, compact = false }) {
  const [hovered, setHovered] = useState(null);
  const BAR_HEIGHT = compact ? BAR_HEIGHT_COMPACT : BAR_HEIGHT_FULL;
  const hasData = maxMonthIncome > 0;

  let prevMonthText = "предыдущему месяцу";
  if (chartData && chartData.length > 0) {
    const currentIdx = chartData.findIndex((d) => d.isCurrent);
    if (currentIdx > 0) {
      const prevLabel = chartData[currentIdx - 1].label.toLowerCase();
      prevMonthText = MONTH_TO_DATIVE[prevLabel] || prevLabel;
    }
  }

  return (
    <div className="space-y-2.5 w-full">
      {/* ── Заголовок ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 h-5">
        <div className="flex items-center gap-2">
          <BarChart2 size={14} className="text-stone-400" strokeWidth={2.5} />
          <h2 className="text-sm font-bold text-stone-800 tracking-tight">
            Доход по месяцам
          </h2>
        </div>

        {hasData && incomeGrowthPct !== null && (
          <span
            className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
              incomeGrowthPct >= 0
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-600"
            }`}
          >
            {incomeGrowthPct >= 0
              ? <TrendingUp size={11} />
              : <TrendingDown size={11} />
            }
            {incomeGrowthPct >= 0 ? "+" : ""}{incomeGrowthPct}%&nbsp;к {prevMonthText}
          </span>
        )}
      </div>

      {/* ── Карточка графика ────────────────────────────────────────────── */}
      <Card variant="elevated" className="p-5 pb-4">
        {!hasData ? (
          /* Empty state */
          <div
            className="flex items-center justify-center bg-stone-50/50 rounded-xl border border-dashed border-stone-200"
            style={{ height: BAR_HEIGHT }}
          >
            <EmptyState
              icon={TrendingUp}
              title="Пока нет данных"
              description="График доходов появится здесь после первой транзакции"
              iconTheme="bg-white text-stone-300 ring-1 ring-stone-100 shadow-sm"
              size="sm"
            />
          </div>
        ) : (
          <div className="flex gap-1 sm:gap-2">
            {/* ── Ось Y (только в полном режиме) ───────────────────────────── */}
            {!compact && (
              <div
                className="relative shrink-0 w-8"
                style={{ height: BAR_HEIGHT }}
              >
                {Y_TICKS.map((level) => (
                  <div
                    key={level}
                    className="absolute right-0 flex items-center justify-end"
                    style={{
                      top: `${(1 - level) * 100}%`,
                      transform: "translateY(-50%)",
                    }}
                  >
                    <span className="text-[9px] font-medium text-stone-300 leading-none">
                      {fmt(Math.round(maxMonthIncome * level))}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* ── Область столбцов + сетка ──────────────────────────────── */}
            <div className="flex-1 flex flex-col gap-2">
              {/* Зона столбцов */}
              <div
                className="relative"
                style={{ height: BAR_HEIGHT }}
              >
                {/* Горизонтальные линии сетки */}
                {Y_TICKS.map((level) => (
                  <div
                    key={level}
                    className="absolute left-0 right-0 border-t border-dashed border-stone-100/80"
                    style={{ top: `${(1 - level) * 100}%` }}
                  />
                ))}

                {/* Столбцы */}
                <div className="absolute inset-0 flex items-end gap-1.5 sm:gap-3">
                  {chartData.map((d, i) => {
                    const heightPct =
                      maxMonthIncome > 0 ? (d.income / maxMonthIncome) * 100 : 0;
                    const isHov = hovered === i;

                    return (
                      <div
                        key={i}
                        className="flex-1 h-full flex flex-col justify-end items-center relative"
                        onMouseEnter={() => setHovered(i)}
                        onMouseLeave={() => setHovered(null)}
                      >
                        {/* Rich tooltip */}
                        {isHov && d.income > 0 && (
                          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                            <div className="bg-stone-800 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap">
                              {d.income.toLocaleString("ru")} ₽
                            </div>
                            {/* Стрелка */}
                            <div className="flex justify-center">
                              <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-stone-800" />
                            </div>
                          </div>
                        )}

                        {/* Подпись суммы над текущим месяцем */}
                        {d.isCurrent && d.income > 0 && !isHov && (
                          <div className="absolute bottom-full mb-1 text-[9px] font-bold text-emerald-600 whitespace-nowrap">
                            {fmt(d.income)}
                          </div>
                        )}

                        {/* Столбец */}
                        <div
                          className="w-full max-w-[44px] rounded-t-lg transition-all duration-700 relative overflow-hidden"
                          style={{ height: d.income > 0 ? `${heightPct}%` : "3px" }}
                        >
                          {d.income > 0 ? (
                            <>
                              <div
                                className={`absolute inset-0 transition-opacity duration-200 ${
                                  d.isCurrent
                                    ? "bg-gradient-to-t from-emerald-600 to-emerald-400"
                                    : "bg-emerald-400/60"
                                } ${isHov ? "opacity-100" : "opacity-90"}`}
                              />
                              {/* Блик сверху */}
                              {d.isCurrent && (
                                <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/20 to-transparent" />
                              )}
                            </>
                          ) : (
                            <div className="absolute inset-0 bg-stone-100 rounded-full" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Подписи месяцев */}
              <div className="flex gap-1.5 sm:gap-3">
                {chartData.map((d, i) => (
                  <div key={i} className="flex-1 flex justify-center">
                    <span
                      className={`text-[10px] sm:text-xs capitalize transition-colors ${
                        d.isCurrent
                          ? "text-emerald-700 font-bold"
                          : hovered === i
                          ? "text-stone-600"
                          : "text-stone-400"
                      }`}
                    >
                      {d.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
