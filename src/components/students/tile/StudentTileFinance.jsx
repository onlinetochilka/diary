import React from 'react';
import { Plus } from 'lucide-react';
import { cn } from '../../../utils/classnames.js';

export default function StudentTileFinance({
  studentId,
  balanceData,
  onPayment
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-stone-50/80 rounded-xl mb-5 ring-1 ring-black/[0.03]">
      <div className="flex flex-col">
        <span className="text-[11px] font-medium text-stone-400 uppercase tracking-wider mb-0.5">
          Баланс
        </span>
        <span className={cn(
          "text-base font-bold tracking-tight",
          balanceData.isDebtor ? "text-red-600" : "text-emerald-600"
        )}>
          {balanceData.label}
        </span>
      </div>
      
      <button
        onClick={(e) => {
          e.stopPropagation();
          onPayment(studentId);
        }}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-200 shadow-sm rounded-lg text-sm font-medium text-stone-700 hover:bg-stone-50 hover:text-academic-blue transition-colors outline-none focus-visible:ring-2 focus-visible:ring-academic-blue active:scale-95"
      >
        <Plus size={16} strokeWidth={2.5} className={balanceData.isDebtor ? "text-red-500" : "text-emerald-500"} />
        <span>Оплата</span>
      </button>
    </div>
  );
}
