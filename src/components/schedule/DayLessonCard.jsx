import React from 'react';
import { CheckCircle2, BookOpen, XCircle } from 'lucide-react';

/**
 * DayLessonCard — карточка урока в дневном расписании.
 * Стиль идентичен карточкам на Главной странице:
 *   entity-light-bg + border-l-[4px] entity-border-l + ring-1 ring-stone-200 + shadow-sm
 */
export default function DayLessonCard({
  lesson,
  title,
  entityStyle,
  hasHwDebt,
  hasFinDebt,
  topicTitle,
  isSelected,
  isCurrentLesson,
  onClick,
  onHwDebtClick,
  onFinDebtClick,
}) {
  const { status, startTime, endTime, homework, subjectName } = lesson;

  const isCancelled   = status === 'cancelled';
  const isSkippedFree = status === 'skipped_free';
  const isConducted   = status === 'conducted';
  const isSkippedPaid = status === 'skipped_paid';

  const hwText = typeof homework === 'string' ? homework : (homework?.text || '');
  const hasHwText = hwText.trim().length > 0;
  const subjectLine = [subjectName, topicTitle].filter(Boolean).join(' · ');

  // Длительность
  const [sH, sM] = (startTime || '0:0').split(':').map(Number);
  const [eH, eM] = (endTime || '0:0').split(':').map(Number);
  const durationMins = (eH * 60 + eM) - (sH * 60 + sM);
  const durationLabel = durationMins >= 60
    ? `${Math.floor(durationMins / 60)} ч${durationMins % 60 > 0 ? ` ${durationMins % 60} мин` : ''}`
    : `${durationMins} мин`;

  return (
    <div
      className={[
        'entity-light-bg entity-border-l ring-1 ring-stone-200',
        'border-l-[4px] shadow-sm rounded-xl',
        'flex flex-col px-4 py-3 gap-1.5',
        'cursor-pointer select-none transition-all duration-200',
        isSelected
          ? 'shadow-md -translate-y-px ring-[#006584]/30'
          : 'hover:shadow-md hover:-translate-y-px',
        isCancelled || isSkippedFree ? 'opacity-55' : '',
      ].join(' ')}
      style={entityStyle}
      onClick={() => onClick?.(lesson)}
    >
      {/* Строка 1: Время + длительность + бейджи */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {/* Время — белый чип как на Главной */}
          <span
            className="text-[11px] font-semibold bg-white/80 text-stone-700 px-2 py-0.5 rounded-md tabular-nums"
          >
            {startTime} — {endTime}
          </span>
          {/* Длительность */}
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
            style={{
              color: `oklch(0.35 0.14 var(--card-h, 200))`,
              background: `oklch(0.88 0.08 var(--card-h, 200))`,
            }}
          >
            {durationLabel}
          </span>
        </div>

        {/* Бейджи справа */}
        <div className="flex items-center gap-1 shrink-0">
          {isCurrentLesson && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#006584] text-white text-[10px] font-bold shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />
              Сейчас
            </span>
          )}
          {hasHwDebt && (
            <button
              onClick={e => { e.stopPropagation(); onHwDebtClick?.(lesson); }}
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-bold transition-colors shadow-sm"
            >
              <BookOpen size={9} strokeWidth={2.5} />
              ДЗ
            </button>
          )}
          {hasFinDebt && (
            <button
              onClick={e => { e.stopPropagation(); onFinDebtClick?.(lesson); }}
              className="px-1.5 py-0.5 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-bold transition-colors shadow-sm"
            >
              ₽!
            </button>
          )}
          {isConducted && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
              <CheckCircle2 size={9} strokeWidth={2.5} />
              Готово
            </span>
          )}
          {isCancelled && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-stone-200 text-stone-600 text-[10px] font-bold">
              <XCircle size={9} strokeWidth={2} />
              Отменён
            </span>
          )}
          {isSkippedPaid && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
              Пропуск
            </span>
          )}
          {isSkippedFree && (
            <span className="px-1.5 py-0.5 rounded-full bg-stone-200 text-stone-500 text-[10px] font-bold">
              б/о
            </span>
          )}
        </div>
      </div>

      {/* Строка 2: Имя — как на Главной (text-sm font-semibold) */}
      <div className="font-semibold text-stone-900 truncate leading-snug text-sm pl-0.5">
        {title}
      </div>

      {/* Строка 3: Предмет · Тема */}
      {subjectLine && (
        <div
          className="text-[12px] font-medium truncate pl-0.5"
          style={{ color: `oklch(0.52 0.08 var(--card-h, 200))` }}
        >
          {subjectLine}
        </div>
      )}

      {/* Строка 4: ДЗ */}
      {hasHwText && (
        <div
          className="flex items-start gap-1.5 text-[11px] leading-snug pl-0.5"
          style={{ color: `oklch(0.55 0.06 var(--card-h, 200))` }}
          title={hwText}
        >
          <BookOpen size={11} strokeWidth={2} className="mt-px shrink-0" />
          <span className="line-clamp-1">{hwText}</span>
        </div>
      )}

      {/* Пульс-кольцо для текущего урока */}
      {isCurrentLesson && (
        <span className="absolute inset-0 rounded-xl pointer-events-none ring-2 ring-[#006584]/15 animate-pulse" />
      )}
    </div>
  );
}
