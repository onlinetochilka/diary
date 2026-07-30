import React from 'react';

export default function StudentTileFooter({ student, globalStats }) {
  return (
    <div className="flex items-center justify-between mt-auto pt-4 border-t border-stone-100">
      <div className="flex flex-col">
        <span className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-0.5">Общий доход</span>
        <span className="text-[13px] font-semibold text-stone-700">
          {student.ltv.toLocaleString('ru-RU')} ₽
        </span>
      </div>
      <div className="flex flex-col items-end">
        <span className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-0.5">Проведено</span>
        <span className="text-[13px] font-semibold text-stone-700">
          {globalStats.conductedHours ?? 0} ч
        </span>
      </div>
    </div>
  );
}
