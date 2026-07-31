/**
 * FinanceKpiCard.jsx — чистая KPI-карточка в стиле главного экрана.
 * Число сверху, лейбл снизу маленькими буквами. Никаких иконок.
 *
 * Props:
 *   label    {string}
 *   value    {string}
 *   sub      {string}   — подзаголовок (опционально)
 *   delta    {{ value: number }} — дельта к прошлому периоду (опционально)
 *   variant  {'default'|'emerald'|'warning'|'danger'}
 */
import React from "react";

const VALUE_CLASS = {
  emerald: "text-emerald-600",
  warning: "text-amber-500",
  danger:  "text-rose-500",
  default: "text-stone-900",
};

export function FinanceKpiCard({ label, value, sub, delta, variant = "default" }) {
  const valueClass = VALUE_CLASS[variant] ?? VALUE_CLASS.default;
  const hasPositive = delta?.value != null && delta.value > 0;
  const hasNegative = delta?.value != null && delta.value < 0;
  const showDelta   = delta?.value != null && delta.value !== 0;

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100 flex flex-col justify-between min-h-[112px]">
      {/* Delta row (or spacer) */}
      <div className="h-5 flex items-center">
        {showDelta && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            hasPositive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"
          }`}>
            {hasPositive ? "↑ +" : "↓ "}{delta.value}%
          </span>
        )}
      </div>

      {/* Main value */}
      <p className={`text-2xl sm:text-3xl font-bold tracking-tight leading-none mt-1 ${valueClass}`}>
        {value}
      </p>

      {/* Label + sub */}
      <div className="mt-2 space-y-0.5">
        <p className="text-[10px] font-bold tracking-widest uppercase text-stone-400 leading-tight">
          {label}
        </p>
        {sub && (
          <p className="text-[11px] text-stone-400 leading-tight">{sub}</p>
        )}
      </div>
    </div>
  );
}
