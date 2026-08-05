import React from 'react';
import { CheckCircle2, BookOpen } from 'lucide-react';
import { getPlural } from '../../../utils/plural.js';
import { Tooltip } from '../../ui/index.js';

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
          <span className="text-lg font-bold text-stone-800">{subjectStats.attendanceRate != null ? `${subjectStats.attendanceRate}%` : '—'}</span>
        </div>
        <span className="text-[11px] text-stone-400 mt-0.5">
          {subjectStats.attendanceRate == null 
            ? 'Занятий пока не было'
            : subjectStats.cancellationsCount > 0 
              ? `${subjectStats.cancellationsCount} ${getPlural(subjectStats.cancellationsCount, 'отмена', 'отмены', 'отмен')}` 
              : 'Без пропусков'}
        </span>
      </div>

      {/* Домашние задания */}
      {subjectStats.homeworkRate != null || subjectStats.pendingHomeworks > 0 ? (
        <div className="flex flex-col p-3 bg-stone-50 rounded-xl ring-1 ring-black/[0.03]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <BookOpen size={14} className="text-purple-500" />
              <span className="text-xs font-medium text-stone-500">ДЗ</span>
            </div>
            {subjectStats.pendingHomeworks > 0 && (
              <Tooltip text={`Долг по ДЗ: ${subjectStats.pendingHomeworks}`} position="top">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onHomeworkClick) onHomeworkClick(studentId, activeSubjectId);
                  }}
                  className="w-3.5 h-3.5 bg-[#006584] rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:scale-110 active:scale-95 transition-transform outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-academic-blue"
                />
              </Tooltip>
            )}
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-stone-800">{subjectStats.homeworkRate != null ? `${subjectStats.homeworkRate}%` : '—'}</span>
          </div>
          <span className="text-[11px] text-stone-400 mt-0.5">
            {subjectStats.homeworkRate != null ? 'Сдано вовремя' : 'Пока нет ДЗ'}
          </span>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-3 bg-stone-50/50 border border-dashed border-stone-200 rounded-xl h-[88px]">
          <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center mb-1.5">
            <BookOpen size={14} className="text-stone-300" />
          </div>
          <span className="text-[9px] font-bold tracking-wider text-stone-400 uppercase text-center leading-tight">Нет выданных<br/>заданий</span>
        </div>
      )}
    </div>
  );
}
