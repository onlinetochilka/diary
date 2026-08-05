import React from 'react';
import Card from './Card.jsx';

// ─── Программы ───────────────────────────────────────────────────────────────
export function ProgramCardSkeleton() {
  return (
    <Card className="p-5 flex flex-col h-full bg-white relative overflow-hidden ring-1 ring-slate-200 shadow-sm">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-xl bg-stone-100 animate-skeleton-pulse shrink-0" />
        <div className="flex-1 space-y-2.5 mt-1">
          <div className="h-4 bg-stone-100 rounded w-3/4 animate-skeleton-pulse" />
          <div className="h-3 bg-stone-50 rounded w-1/2 animate-skeleton-pulse" />
        </div>
      </div>
      <div className="mt-auto pt-4 border-t border-stone-100 flex items-center justify-between">
        <div className="h-3 bg-stone-50 rounded w-1/3 animate-skeleton-pulse" />
        <div className="w-8 h-8 rounded-lg bg-stone-100 animate-skeleton-pulse" />
      </div>
    </Card>
  );
}

// ─── Дашборд ─────────────────────────────────────────────────────────────────
export function DashboardLessonSkeleton() {
  return (
    <div className="bg-white ring-1 ring-slate-200 border-l-[4px] border-stone-200 shadow-sm p-3 rounded-xl flex items-center gap-3">
      <div className="w-10 h-10 shrink-0 bg-stone-100 rounded-xl animate-skeleton-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-stone-100 rounded w-1/2 animate-skeleton-pulse" />
        <div className="h-2.5 bg-stone-50 rounded w-3/4 animate-skeleton-pulse" />
      </div>
    </div>
  );
}

export function ActionItemSkeleton() {
  return (
    <div className="flex items-center gap-4 bg-white p-4 rounded-2xl ring-1 ring-slate-200 shadow-sm">
      <div className="w-10 h-10 shrink-0 rounded-xl bg-stone-100 animate-skeleton-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-stone-100 rounded w-1/3 animate-skeleton-pulse" />
        <div className="h-2.5 bg-stone-50 rounded w-2/3 animate-skeleton-pulse" />
      </div>
    </div>
  );
}

// ─── Финансы ─────────────────────────────────────────────────────────────────
export function FinanceMetricSkeleton() {
  return (
    <Card className="p-4 flex items-center gap-4 ring-1 ring-slate-200 bg-white shadow-sm">
      <div className="w-12 h-12 rounded-[14px] bg-stone-100 animate-skeleton-pulse shrink-0" />
      <div className="flex-1 space-y-2.5">
        <div className="h-3 bg-stone-50 rounded w-1/2 animate-skeleton-pulse" />
        <div className="h-5 bg-stone-100 rounded w-3/4 animate-skeleton-pulse" />
      </div>
    </Card>
  );
}

export function FinanceChartSkeleton() {
  return (
    <Card className="p-5 pb-4 ring-1 ring-slate-200 bg-white shadow-sm">
      <div className="flex justify-between items-center mb-8">
        <div className="h-5 bg-stone-100 rounded w-1/4 animate-skeleton-pulse" />
        <div className="h-6 bg-stone-50 rounded-full w-24 animate-skeleton-pulse" />
      </div>
      <div className="flex gap-2 items-end h-[156px] px-2 pb-2">
        {[40, 70, 30, 85, 50, 95].map((h, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-3">
            <div className={`w-full bg-stone-100 rounded-t-md animate-skeleton-pulse`} style={{ height: `${h}%` }} />
            <div className="h-2.5 bg-stone-50 rounded w-8 animate-skeleton-pulse" />
          </div>
        ))}
      </div>
    </Card>
  );
}
