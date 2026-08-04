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
  const showDelta   = delta?.value != null && delta.value !== 0;

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100 flex flex-col h-[116px]">
      <div className="flex items-start justify-between gap-2">
        <p className={`text-2xl font-extrabold tracking-tight leading-none truncate ${valueClass}`}>
          {value}
        </p>
        {showDelta && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
            hasPositive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"
          }`}>
            {hasPositive ? "↑ +" : "↓ "}{delta.value}%
          </span>
        )}
      </div>

      <div className="mt-auto space-y-1">
        <p className="text-[10px] font-bold tracking-widest uppercase text-stone-400 leading-none truncate">
          {label}
        </p>
        <p className="text-[11px] text-stone-400 leading-none truncate">
          {sub || "\u00A0"}
        </p>
      </div>
    </div>
  );
}
