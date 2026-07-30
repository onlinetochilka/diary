import React from 'react';
import { CheckCircle2, BookOpen } from 'lucide-react';

// Утилита для правильного склонения слов
function getPlural(count, one, two, five) {
  let n = Math.abs(count) % 100;
  if (n >= 5 && n <= 20) return five;
  n %= 10;
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return two;
  return five;
}

export default function StudentTileStats({
  studentId,
  subjectStats,
  activeSubjectId,
  onHomeworkClick
}) {
  return (
    <div className="grid grid-cols-2 gap-3 mb-5">
      {/* Посещаемость */}
      <div className="flex flex-col p-3 bg-stone-50 rounded-xl ring-1 ring-black/[0.03]">
        <div className="flex items-center gap-1.5 mb-2">
          <CheckCircle2 size={14} className="text-blue-500" />
          <span className="text-xs font-medium text-stone-500">Посещаемость</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-bold text-stone-800">{subjectStats.attendanceRate ?? 100}%</span>
        </div>
        <span className="text-[11px] text-stone-400 mt-0.5">
          {subjectStats.cancellationsCount > 0 
            ? `${subjectStats.cancellationsCount} ${getPlural(subjectStats.cancellationsCount, 'отмена', 'отмены', 'отмен')}` 
            : 'Без пропусков'}
        </span>
      </div>

      {/* Домашние задания */}
      <div className="flex flex-col p-3 bg-stone-50 rounded-xl ring-1 ring-black/[0.03]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <BookOpen size={14} className="text-purple-500" />
            <span className="text-xs font-medium text-stone-500">ДЗ</span>
          </div>
          {subjectStats.pendingHomeworks > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onHomeworkClick) onHomeworkClick(studentId, activeSubjectId);
              }}
              title={`Долг по ДЗ: ${subjectStats.pendingHomeworks}`}
              className="w-3.5 h-3.5 bg-[#006584] rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:scale-110 active:scale-95 transition-transform outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-academic-blue"
            />
          )}
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-bold text-stone-800">{subjectStats.homeworkRate ?? 100}%</span>
        </div>
        <span className="text-[11px] text-stone-400 mt-0.5">Сдано вовремя</span>
      </div>
    </div>
  );
}
