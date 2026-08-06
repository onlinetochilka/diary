import React from 'react';
import { CheckCircle2, BookOpen, XCircle, Users } from 'lucide-react';
import Tooltip from '../ui/Tooltip.jsx';

/**
 * DayLessonCard — карточка урока в дневном расписании.
 * Стиль идентичен карточкам на Главной странице:
 *   entity-light-bg + border-l-[4px] entity-border-l + ring-1 ring-stone-200 + shadow-sm
 *
 * Props:
 *   hasActiveSelection — флаг того, что хоть одна другая карточка активна.
 *                        Используется для dimming-эффекта неактивных карточек.
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
  hasActiveSelection,
  onClick,
  onHwDebtClick,
  onFinDebtClick,
  onTimeChange,
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
  const durationMins = Math.max(0, (eH * 60 + eM) - (sH * 60 + sM));
  const durationLabel = durationMins >= 60
    ? `${Math.floor(durationMins / 60)} ч${durationMins % 60 > 0 ? ` ${durationMins % 60} мин` : ''}`
    : `${durationMins} мин`;

  // Вычисляем классы состояния
  const stateClasses = hasActiveSelection
    ? 'opacity-60 hover:opacity-90 hover:shadow-md hover:-translate-y-px'
    : 'hover:shadow-md hover:-translate-y-px';

  const cardStyle = isSelected
    ? {
        ...entityStyle,
        boxShadow: `0 0 0 2px oklch(0.65 0.15 var(--card-h, 270)), 0 4px 12px oklch(0.65 0.10 var(--card-h, 270) / 0.25)`,
      }
    : entityStyle;

  return (
    <div
      className={[
        'entity-light-bg entity-border-l ring-1 ring-stone-200',
        'border-l-[4px] shadow-sm rounded-xl',
        'flex flex-col px-4 py-3 gap-1.5',
        'cursor-pointer select-none transition-all duration-200',
        isSelected ? '' : stateClasses,
        isCancelled || isSkippedFree ? 'opacity-55' : '',
      ].join(' ')}
      style={cardStyle}
      onClick={() => onClick?.(lesson)}
    >
      {/* Строка 1: Время + длительность + бейджи */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {/* Время — поля ввода */}
          <Tooltip text="Нажмите, чтобы изменить время">
            <div
              className="group flex items-center gap-0.5 text-[11px] font-bold bg-white/70 hover:bg-white text-stone-700 px-1.5 py-0.5 rounded-md tabular-nums shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-sm ring-1 ring-black/5 hover:ring-blue-500/30 transition-all cursor-pointer relative"
              onClick={(e) => e.stopPropagation()}
            >
              <input 
                type="time" 
                value={startTime}
                onChange={(e) => onTimeChange && onTimeChange(lesson, { startTime: e.target.value, endTime })}
                className="relative bg-transparent outline-none w-[36px] text-center cursor-pointer hover:text-blue-600 focus:text-blue-600 transition-colors [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:m-0"
                style={{ padding: 0 }}
              />
              <span className="text-stone-400 font-normal mx-px">–</span>
              <input 
                type="time" 
                value={endTime}
                onChange={(e) => onTimeChange && onTimeChange(lesson, { startTime, endTime: e.target.value })}
                className="relative bg-transparent outline-none w-[36px] text-center cursor-pointer hover:text-blue-600 focus:text-blue-600 transition-colors [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:m-0"
                style={{ padding: 0 }}
              />
            </div>
          </Tooltip>
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
      <div className="font-semibold text-stone-900 truncate leading-snug text-sm pl-0.5 flex items-center gap-1.5">
        {lesson.type === 'group' && <Users size={14} className="text-[#006584] shrink-0" />}
        <span className="truncate">{title}</span>
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
        <Tooltip text={hwText} position="top" wrapperClassName="flex w-full justify-start">
          <div
            className="flex items-start gap-1.5 text-[11px] leading-snug pl-0.5 w-full"
            style={{ color: `oklch(0.55 0.06 var(--card-h, 200))` }}
          >
            <BookOpen size={11} strokeWidth={2} className="mt-px shrink-0" />
            <span className="line-clamp-1">{hwText}</span>
          </div>
        </Tooltip>
      )}

      {/* Пульс-кольцо для текущего урока удалено по просьбе пользователя */}
    </div>
  );
}
