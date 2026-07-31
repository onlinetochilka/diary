import React, { useState, useMemo, useCallback } from 'react';
import { ArrowLeft, Plus, Calendar } from 'lucide-react';
import { ymd } from './scheduleUtils.jsx';
import DayLessonCard from './DayLessonCard.jsx';
import DayActionableGap from './DayActionableGap.jsx';
import DayInspector from './DayInspector.jsx';

// ── Проверяет идёт ли урок сейчас ────────────────────────────────────────────
function isLessonNow(lesson, dateStr, todayStr) {
  if (dateStr !== todayStr) return false;
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const [sH, sM] = lesson.startTime.split(':').map(Number);
  const [eH, eM] = lesson.endTime.split(':').map(Number);
  return nowMins >= sH * 60 + sM && nowMins < eH * 60 + eM;
}

// ── Empty state ───────────────────────────────────────────────────────────────
function DayEmptyState({ dateStr, onCreateLesson }) {
  return (
    <div className="col-span-2 flex flex-col items-center justify-center py-24 px-8 text-center">
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-stone-100 to-stone-50 flex items-center justify-center mb-6 shadow-sm">
        <Calendar size={32} className="text-stone-300" />
      </div>
      <h3 className="text-xl font-bold text-stone-700 mb-2">Свободный день</h3>
      <p className="text-sm text-stone-400 mb-8 max-w-[260px] leading-relaxed">
        Нет запланированных занятий.
      </p>
      <button
        onClick={() => onCreateLesson({ date: dateStr })}
        className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-[#006584] hover:bg-[#005470] text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-px"
      >
        <Plus size={16} strokeWidth={2.5} />
        Запланировать урок
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Построение timeline-элементов (вертикальный стек)
// ─────────────────────────────────────────────────────────────────────────
//
// Правила:
//   • Каждый урок — строка полной ширины
//   • Если уроки совпадают по времени (overlap) — делят строку пополам (flex row)
//   • Gaps — тонкий разделитель-строка между блоками
//
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Группирует timelineItems: одновременные уроки собираются в один «ряд».
 * Возвращает массив rows:
 *   { type: 'lessons', items: [...] }  — один или несколько параллельных уроков
 *   { type: 'gap', startTime, endTime } — свободное окно
 */
function buildRows(timelineItems) {
  const rows = [];
  let pending = []; // накапливаем уроки с одинаковым startTime

  const flush = () => {
    if (pending.length > 0) {
      rows.push({ type: 'lessons', items: [...pending] });
      pending = [];
    }
  };

  timelineItems.forEach(item => {
    if (item.type === 'gap') {
      flush();
      rows.push({ type: 'gap', startTime: item.startTime, endTime: item.endTime });
    } else {
      // Группируем уроки с одинаковым startTime в один ряд
      if (
        pending.length > 0 &&
        pending[0].lesson.startTime !== item.lesson.startTime
      ) {
        flush();
      }
      pending.push(item);
    }
  });
  flush();

  return rows;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

export default function DayView({
  currentDate,
  setCurrentDate,
  lessonsByDate,
  students,
  groups,
  firstUpcomingLessonIdByStudent,
  studentsWithDebt,
  studentsWithFinDebt,
  handleOpenDrawer,
  setView,
  setNavigatedFromMonth,
  navigatedFromMonth,
  getLessonDisplayData,
  getLessonTopic,
  onFinClick,
  onHwClick,
  onPatchLesson,
  onGoToProfile,
  onSaveLesson,
  allLessons,
}) {
  const dateStr  = ymd(currentDate);
  const todayStr = ymd(new Date());

  const dayLessons = useMemo(
    () => (lessonsByDate[dateStr] || []).sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [lessonsByDate, dateStr]
  );

  const [selectedLessonId, setSelectedLessonId] = useState(null);
  const selectedLesson = useMemo(
    () => dayLessons.find(l => l.id === selectedLessonId) || null,
    [dayLessons, selectedLessonId]
  );

  // Создание нового урока внутри Инспектора
  const [createInitial, setCreateInitial] = useState(null);

  const handleCardClick = useCallback((lesson) => {
    setCreateInitial(null); // сбрасываем create-режим
    setSelectedLessonId(prev => prev === lesson.id ? null : lesson.id);
  }, []);

  const handleCloseInspector = useCallback(() => setSelectedLessonId(null), []);

  const handleDateSelect = useCallback((date) => {
    setCurrentDate(date);
    setSelectedLessonId(null);
    setCreateInitial(null);
  }, [setCurrentDate]);

  // Gap-клик — открываем форму создания в Инспекторе (без шторки)
  const handleGapClick = useCallback(({ date, startTime, endTime }) => {
    setSelectedLessonId(null);
    setCreateInitial({ date, startTime, endTime });
  }, []);

  // ── Timeline items ────────────────────────────────────────────────────────
  const timelineItems = useMemo(() => {
    const sorted = [...dayLessons];
    const items = [];
    const WORK_END = '22:00';

    sorted.forEach((lesson, idx) => {
      if (idx > 0) {
        const prevEnd  = sorted[idx - 1].endTime;
        const curStart = lesson.startTime;
        const [pH, pM] = prevEnd.split(':').map(Number);
        const [cH, cM] = curStart.split(':').map(Number);
        if ((cH * 60 + cM) - (pH * 60 + pM) >= 30) {
          items.push({ type: 'gap', startTime: prevEnd, endTime: curStart });
        }
      }
      items.push({ type: 'lesson', lesson });
    });

    if (sorted.length > 0) {
      const lastEnd = sorted[sorted.length - 1].endTime;
      const [lH, lM] = lastEnd.split(':').map(Number);
      const [wH, wM] = WORK_END.split(':').map(Number);
      if ((wH * 60 + wM) - (lH * 60 + lM) >= 30) {
        items.push({ type: 'gap', startTime: lastEnd, endTime: WORK_END });
      }
    }

    return items;
  }, [dayLessons]);

  // Строим ряды для вертикального стека
  const rows = useMemo(() => buildRows(timelineItems), [timelineItems]);

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex min-h-0 overflow-hidden gap-4 py-4">

      {/* ══════════════════════════════════════════════════════════════════
          ЛЕВАЯ КОЛОНКА — вертикальный стек в Surface-боксе
      ══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

        {/* Кнопка назад (только если пришли из месяца) */}
        {navigatedFromMonth && (
          <div className="px-6 pt-3 shrink-0">
            <button
              onClick={() => { setView('month'); setNavigatedFromMonth(false); }}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-400 hover:text-[#006584] transition-colors"
            >
              <ArrowLeft size={13} />
              К месяцу
            </button>
          </div>
        )}

        {/* Surface-бокс — паттерн с Главной страницы */}
        {dayLessons.length === 0 ? (
          <div className="bg-white rounded-[28px] shadow-sm border border-stone-100 overflow-hidden">
            <DayEmptyState
              dateStr={dateStr}
              onCreateLesson={() => {
                setSelectedLessonId(null);
                setCreateInitial({ date: dateStr, startTime: '10:00', endTime: '11:00' });
              }}
            />
          </div>
        ) : (
          <section className="flex-1 min-h-0 flex flex-col bg-white p-5 sm:p-6 rounded-[28px] shadow-sm border border-stone-100 relative overflow-visible">
            {/* Скроллируемый список */}
            <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto hide-scrollbar pb-6 px-1 pt-1">
              {rows.map((row, idx) => {

                // ── Gap-строка ──
                if (row.type === 'gap') {
                  // Это окно активное, если пользователь нажал на нёго
                  const gapIsActive = !!createInitial
                    && createInitial.startTime === row.startTime
                    && createInitial.endTime === row.endTime;

                  // Считаем любое активное состояние (выбран урок ИЛИ выбрано окно)
                  const anyActive = selectedLessonId !== null || createInitial !== null;

                  return (
                    <div key={`gap-${row.startTime}`}>
                      <DayActionableGap
                        dateStr={dateStr}
                        startTime={row.startTime}
                        endTime={row.endTime}
                        onClick={handleGapClick}
                        isActive={gapIsActive}
                        hasActiveSelection={anyActive}
                      />
                    </div>
                  );
                }

                // ── Ряд уроков (один или несколько параллельных) ──
                return (
                  <div key={`row-${idx}`} className="flex gap-2">
                    {row.items.map((item, itemIdx) => {
                      const lesson = item.lesson;
                      const { title, entityStyle, hasHwDebt, hasFinDebt } = getLessonDisplayData(lesson);
                      const topicTitle = getLessonTopic(lesson);
                      const isCurrent  = isLessonNow(lesson, dateStr, todayStr);

                      // Димминг: любое активное состояние, кроме этой карточки
                      const cardHasActiveSelection =
                        (selectedLessonId !== null && selectedLessonId !== lesson.id)
                        || (createInitial !== null && selectedLessonId !== lesson.id);

                      return (
                        <div key={lesson.id} className="flex-1 min-w-0">
                          <DayLessonCard
                            lesson={lesson}
                            title={title}
                            entityStyle={entityStyle}
                            hasHwDebt={hasHwDebt}
                            hasFinDebt={hasFinDebt}
                            topicTitle={topicTitle}
                            isSelected={selectedLessonId === lesson.id}
                            isCurrentLesson={isCurrent}
                            hasActiveSelection={cardHasActiveSelection}
                            onClick={handleCardClick}
                            onHwDebtClick={onHwClick}
                            onFinDebtClick={onFinClick}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            {/* Тень снизу — маскирует край скролла */}
            <div className="absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-white to-transparent pointer-events-none rounded-b-[28px] z-10" />
          </section>
        )}
      </div>


      {/* ══════════════════════════════════════════════════════════════════
          ПРАВАЯ КОЛОНКА — Инспектор (50% экрана)
      ══════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex flex-1 min-w-0 flex-col overflow-hidden">
        <DayInspector
          selectedLesson={selectedLesson}
          currentDate={currentDate}
          lessonsByDate={lessonsByDate}
          students={students}
          groups={groups}
          allLessons={allLessons}
          createInitial={createInitial}
          onClearCreate={() => setCreateInitial(null)}
          onDateSelect={handleDateSelect}
          onClose={handleCloseInspector}
          onSaveLesson={onSaveLesson}
          onPatchLesson={onPatchLesson}
          onPaymentClick={onFinClick}
          onGoToProfile={onGoToProfile}
        />
      </div>
    </div>
  );
}
