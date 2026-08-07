import React from 'react';
import { CheckCircle2, BookOpen, XCircle, Users, Wallet, AlertCircle, Clock, Check, X, Video } from 'lucide-react';
import Tooltip from '../ui/Tooltip.jsx';
import Button from '../ui/Button.jsx';

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
  hasLink,
  topicTitle,
  isSelected,
  isCurrentLesson,
  hasActiveSelection,
  onClick,
  onHwDebtClick,
  onFinDebtClick,
  onTimeChange,
  onQuickModalClick,
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

  const todayStr = new Date().toISOString().split('T')[0];
  const lessonDateStr = new Date(lesson.date).toISOString().split('T')[0];
  const isPast = lessonDateStr < todayStr || (lessonDateStr === todayStr && (endTime || '0:0') < new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }));

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
          {hasLink && (
            <span
              className="flex items-center justify-center px-1.5 py-0.5 rounded-md"
              style={{
                color: `oklch(0.35 0.14 var(--card-h, 200))`,
                background: `oklch(0.88 0.08 var(--card-h, 200))`,
              }}
            >
              <Video size={10} strokeWidth={2.5} />
            </span>
          )}
        </div>

        {/* Бейджи справа */}
        <div className="flex items-center gap-1 shrink-0">
          {isCurrentLesson && (
            <span className="inline-flex items-center gap-1 px-1.5 h-5 rounded-full bg-[#006584] text-white text-[10px] font-bold shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />
              Сейчас
            </span>
          )}
          
          {/* Financial Debt */}
          {!hasFinDebt ? (
            <Tooltip text="Оплачено" position="top">
              <span className="flex items-center justify-center px-1.5 h-5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold shadow-sm ring-1 ring-emerald-200/60">
                <Wallet size={9} strokeWidth={2.5} className="mr-0.5" />
              </span>
            </Tooltip>
          ) : (
            <Tooltip text="Не оплачено" position="top">
              <span className="flex items-center justify-center px-1.5 h-5 rounded-full bg-rose-50 text-rose-600 text-[10px] font-bold shadow-sm ring-1 ring-rose-200/60">
                <Wallet size={9} strokeWidth={2.5} className="mr-0.5" />
              </span>
            </Tooltip>
          )}

          {/* Homework Badge */}
          {(() => {
            if (!isPast) {
              if (hasHwDebt) {
                return (
                  <Tooltip text="Долг по ДЗ с прошлых уроков" position="top">
                    <span className="flex items-center gap-0.5 px-1.5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold shadow-sm border-none">
                      <BookOpen size={9} strokeWidth={2.5} /> ДЗ
                    </span>
                  </Tooltip>
                );
              } else {
                return (
                  <Tooltip text="Нет долгов по ДЗ" position="top">
                    <span className="flex items-center gap-0.5 px-1.5 h-5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold shadow-sm ring-1 ring-emerald-200/60">
                      <BookOpen size={9} strokeWidth={2.5} /> ДЗ
                    </span>
                  </Tooltip>
                );
              }
            } else {
              const isHwAssigned = !!lesson.homework || (lesson.hwDoneBy && lesson.hwDoneBy.length > 0) || (lesson.hwStatuses && Object.keys(lesson.hwStatuses).length > 0);
              const isExplicitlyNotAssigned = lesson.hwAssigned === false || lesson.isHwNotAssigned === true;
              if (isHwAssigned) {
                const totalStudents = lesson.type === 'group' ? (lesson.groupStudentIds?.length || 0) : 1;
                const isDone = (lesson.hwDoneBy?.length || 0) >= totalStudents && totalStudents > 0;
                return (
                  <Tooltip text={isDone ? "ДЗ выполнено" : "ДЗ задано"} position="top">
                    <span className={`flex items-center gap-0.5 px-1.5 h-5 rounded-full text-[10px] font-bold shadow-sm ${isDone ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white'}`}>
                      <BookOpen size={9} strokeWidth={2.5} /> ДЗ
                    </span>
                  </Tooltip>
                );
              } else if (isExplicitlyNotAssigned) {
                return (
                  <Tooltip text="ДЗ не задано" position="top">
                    <span className="flex items-center gap-0.5 px-1.5 h-5 rounded-full bg-stone-50 text-stone-400 text-[10px] font-bold shadow-sm ring-1 ring-stone-200/60">
                      <BookOpen size={9} strokeWidth={2.5} />
                    </span>
                  </Tooltip>
                );
              } else if (lesson.status === 'conducted') {
                return (
                  <Tooltip text="Не отмечено ДЗ" position="top">
                    <span className="flex items-center gap-0.5 px-1.5 h-5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold shadow-sm ring-1 ring-amber-200">
                      <BookOpen size={9} strokeWidth={2.5} />
                    </span>
                  </Tooltip>
                );
              } else {
                return (
                  <Tooltip text="Урок не состоялся" position="top">
                    <span className="flex items-center gap-0.5 px-1.5 h-5 rounded-full bg-stone-50 text-stone-400 text-[10px] font-bold shadow-sm ring-1 ring-stone-200/60">
                      <BookOpen size={9} strokeWidth={2.5} />
                    </span>
                  </Tooltip>
                );
              }
            }
          })()}

          {/* Attendance */}
          {lesson.type === 'group' && (
            lesson.status === 'conducted' ? (
              <Tooltip text="Посещаемость" position="top">
                <span className={`flex items-center gap-0.5 px-1.5 h-5 rounded-full text-[10px] font-bold shadow-sm ${
                  (Object.keys(lesson.attendance || {}).length >= (lesson.groupStudentIds?.length || 0) && (lesson.groupStudentIds?.length || 0) > 0) ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                }`}>
                  <Users size={9} strokeWidth={2.5} /> 
                  {`${Object.keys(lesson.attendance || {}).length}/${lesson.groupStudentIds?.length || 0}`}
                </span>
              </Tooltip>
            ) : (
              <Tooltip text="Посещаемость (не отмечалась)" position="top">
                <span className="flex items-center gap-0.5 px-1.5 h-5 rounded-full bg-stone-50 text-stone-400 text-[10px] font-bold shadow-sm ring-1 ring-stone-200/60">
                  <Users size={9} strokeWidth={2.5} /> 
                  {`-/${lesson.groupStudentIds?.length || 0}`}
                </span>
              </Tooltip>
            )
          )}

          {/* Lesson Status */}
          {isPast && lesson.status === 'scheduled' ? (
            <Tooltip text="Урок прошел, отметьте статус" position="top">
              <span className="flex items-center gap-0.5 px-1.5 h-5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold shadow-sm ring-1 ring-amber-200">
                <AlertCircle size={9} strokeWidth={2.5} />
              </span>
            </Tooltip>
          ) : lesson.status === 'scheduled' ? (
            <Tooltip text="Запланирован" position="top">
              <span className="flex items-center gap-0.5 px-1.5 h-5 rounded-full bg-blue-50 text-blue-400 text-[10px] font-bold shadow-sm ring-1 ring-blue-100">
                <Clock size={9} strokeWidth={2.5} />
              </span>
            </Tooltip>
          ) : lesson.status === 'conducted' ? (
            <Tooltip text="Урок проведен" position="top">
              <span className="flex items-center gap-0.5 px-1.5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold shadow-sm border-none">
                <Check size={9} strokeWidth={2.5} />
              </span>
            </Tooltip>
          ) : (
            <Tooltip text="Урок отменен" position="top">
              <span className="flex items-center gap-0.5 px-1.5 h-5 rounded-full bg-stone-100 text-stone-400 text-[10px] font-bold shadow-sm ring-1 ring-stone-200/60">
                <X size={9} strokeWidth={2.5} />
              </span>
            </Tooltip>
          )}

          {onQuickModalClick && (
            <Button
              variant="ghost"
              onClick={(e) => { e.stopPropagation(); onQuickModalClick(lesson); }}
              className="flex items-center justify-center p-1 w-6 h-6 rounded-full bg-slate-100 hover:bg-emerald-100 hover:text-emerald-600 text-slate-500 transition-colors shadow-sm border-none ml-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </Button>
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
