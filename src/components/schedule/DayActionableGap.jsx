import React, { useState } from 'react';
import { Plus } from 'lucide-react';

/**
 * DayActionableGap — строка свободного времени между уроками.
 * Показывается если разрыв ≥ 30 мин.
 * Стиль: встроенная строка внутри Surface-бокса (без отдельного border/rounded).
 */
export default function DayActionableGap({ dateStr, startTime, endTime, onClick, isActive, hasActiveSelection }) {
  const [hovered, setHovered] = useState(false);

  const [sH, sM] = startTime.split(':').map(Number);
  const [eH, eM] = endTime.split(':').map(Number);
  const totalMins = (eH * 60 + eM) - (sH * 60 + sM);

  if (totalMins < 30) return null;

  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  const durationLabel = h > 0
    ? m > 0 ? `${h} ч ${m} мин` : `${h} ч`
    : `${m} мин`;

  // Логика состояний аналогична DayLessonCard
  const dimmed = hasActiveSelection && !isActive;

  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onClick?.({ date: dateStr, startTime, endTime })}
      className={[
        'w-full flex items-center gap-3 px-2 py-2',
        'rounded-xl transition-all duration-150 outline-none',
        isActive
          ? 'bg-[#006584]/10 ring-2 ring-[#006584]/30'
          : hovered
            ? 'bg-[#006584]/5'
            : 'bg-transparent',
        dimmed ? 'opacity-40' : '',
      ].join(' ')}
    >
      {/* Иконка + */}
      <div className={[
        'w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-150',
        isActive || hovered ? 'bg-[#006584] text-white' : 'bg-stone-100 text-stone-300',
      ].join(' ')}>
        <Plus size={11} strokeWidth={2.5} />
      </div>

      {/* Текст */}
      <div className="flex items-center gap-2 min-w-0">
        <span className={`text-xs font-medium transition-colors duration-150 ${isActive || hovered ? 'text-[#006584]' : 'text-stone-300'}`}>
          Свободно {durationLabel}
        </span>
        <span className={`text-[10px] tabular-nums transition-colors duration-150 ${isActive || hovered ? 'text-[#006584]/60' : 'text-stone-200'}`}>
          {startTime} — {endTime}
        </span>
      </div>

      {/* Правый хинт при hover или active */}
      {(hovered || isActive) && (
        <span className="ml-auto text-[10px] text-[#006584]/50 font-medium shrink-0">
          Запланировать →
        </span>
      )}
    </button>
  );
}
