/**
 * GroupLessonHistoryModal.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Журнал занятий группы — аналог LessonHistoryModal, но для группового контекста.
 * Загружает уроки по groupId, показывает посещаемость и ДЗ-агрегаты.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, ChevronRight, BookOpen, AlertCircle, FileText } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import SideDrawer from '../ui/SideDrawer.jsx';
import { useLessons } from '../../hooks/useLessons.js';
import { cn } from '../../utils/cn.js';

const FILTERS = [
  { key: 'all',       label: 'Все' },
  { key: 'conducted', label: 'Прошедшие' },
  { key: 'upcoming',  label: 'Предстоящие' },
  { key: 'range',     label: 'Период' },
];

const STATUS_LABELS = {
  conducted:    { label: 'Проведён',     cls: 'bg-emerald-50 text-emerald-600' },
  scheduled:    { label: 'Запланирован', cls: 'bg-stone-100 text-stone-400' },

  cancelled:    { label: 'Отменён',      cls: 'bg-red-50 text-red-400' },
  skipped_paid: { label: 'Пропуск (оплач.)', cls: 'bg-amber-50 text-amber-600' },
  skipped_free: { label: 'Пропуск',      cls: 'bg-stone-100 text-stone-400' },
};

const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [, m, d] = dateStr.split('-');
  return `${parseInt(d)} ${MONTHS[parseInt(m) - 1]}`;
}

function groupByMonth(lessons) {
  const map = {};
  lessons.forEach(l => {
    const key = l.date?.slice(0, 7) || 'unknown';
    if (!map[key]) map[key] = [];
    map[key].push(l);
  });
  return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
}

function MonthLabel({ dateKey }) {
  if (!dateKey || dateKey === 'unknown') return null;
  const [y, m] = dateKey.split('-');
  return (
    <p className="text-[11px] font-bold text-stone-400 uppercase tracking-widest mb-3 mt-1">
      {MONTHS[parseInt(m) - 1]} {y} г.
    </p>
  );
}

export default function GroupLessonHistoryModal({ isOpen, onClose, group, studentsInGroup = [] }) {
  const { 
    lessons, 
    isLoading: loading, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useLessons({ groupId: group?.id });

  const [filter, setFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setFilter('all');
  }, [isOpen]);

  // Фильтрация
  const today = new Date().toISOString().slice(0, 10);
  const filtered = useMemo(() => {
    switch (filter) {
      case 'conducted': return lessons.filter(l => l.status === 'conducted');
      case 'upcoming':  return lessons.filter(l => l.date >= today && l.status !== 'cancelled');
      case 'range':
        return lessons.filter(l => {
          if (dateFrom && l.date < dateFrom) return false;
          if (dateTo   && l.date > dateTo)   return false;
          return true;
        });
      default: return lessons;
    }
  }, [lessons, filter, dateFrom, dateTo, today]);

  // KPI
  const stats = useMemo(() => {
    const conducted = lessons.filter(l => l.status === 'conducted');
    const groupSize = group?.studentIds?.length || 1;

    let totalPresent = 0;
    let attendanceLessons = 0;
    conducted.forEach(l => {
      if (Array.isArray(l.presentStudentIds)) {
        totalPresent += l.presentStudentIds.length;
        attendanceLessons++;
      }
    });
    const attendanceRate = attendanceLessons > 0
      ? Math.round((totalPresent / (attendanceLessons * groupSize)) * 100)
      : null;

    // ДЗ: только уроки у которых вообще есть ДЗ текст
    const lessonsWithHw = conducted.filter(l => l.homework);
    const hwRate = lessonsWithHw.length > 0
      ? Math.round(
          lessonsWithHw.reduce((acc, l) => {
            const doneCount = (l.hwDoneBy || []).length;
            return acc + (doneCount / groupSize);
          }, 0) / lessonsWithHw.length * 100
        )
      : null;

    return { total: conducted.length, attendanceRate, hwRate };
  }, [lessons, group]);

  const grouped = useMemo(() => groupByMonth(filtered), [filtered]);

  if (!group) return null;

  return (
    <SideDrawer isOpen={isOpen} onClose={onClose} title={`Журнал — ${group.name}`} width="max-w-lg">

      {/* KPI-панель */}
      {!loading && lessons.length > 0 && (
        <div className="flex items-stretch bg-white border border-stone-100 rounded-2xl shadow-sm mb-6 overflow-hidden">
          {/* Проведено */}
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-4 gap-0.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Проведено</p>
            <p className="text-3xl font-black text-stone-800 leading-none">{stats.total}</p>
          </div>

          <div className="w-px bg-stone-100 my-3" />

          {/* Посещаемость */}
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-4 gap-0.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Посещаемость</p>
            {stats.attendanceRate !== null
              ? <p className="text-3xl font-black text-blue-500 leading-none">{stats.attendanceRate}%</p>
              : <p className="text-sm text-stone-300 font-medium leading-none mt-1">нет данных</p>
            }
          </div>

          {stats.hwRate !== null && (
            <>
              <div className="w-px bg-stone-100 my-3" />
              {/* ДЗ сдано */}
              <div className="flex-1 flex flex-col items-center justify-center px-4 py-4 gap-0.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">ДЗ сдано</p>
                <p className="text-3xl font-black text-emerald-500 leading-none">{stats.hwRate}%</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Фильтры */}
      {!loading && lessons.length > 0 && (
        <div className="mb-6">
          <div className="flex gap-2">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  'flex-1 text-[13px] font-semibold py-2 px-2 rounded-xl transition-all duration-150 whitespace-nowrap text-center',
                  filter === f.key
                    ? 'bg-stone-800 text-white shadow-sm'
                    : 'bg-white text-stone-500 hover:text-stone-700 hover:bg-stone-100 border border-stone-100'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          {filter === 'range' && (
            <div className="flex gap-2 mt-3">
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="flex-1 text-sm border border-stone-200 rounded-xl px-3 py-2 outline-none focus:border-stone-400 bg-white text-stone-700" />
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="flex-1 text-sm border border-stone-200 rounded-xl px-3 py-2 outline-none focus:border-stone-400 bg-white text-stone-700" />
            </div>
          )}
        </div>
      )}

      {/* Список уроков */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-stone-400 text-sm">
          Загрузка...
        </div>
      )}

      {!loading && lessons.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <p className="text-stone-400 text-sm font-medium">Занятий пока нет</p>
        </div>
      )}

      {!loading && lessons.length > 0 && filtered.length === 0 && (
        <div className="flex items-center justify-center py-10 text-stone-400 text-sm">
          Нет занятий за выбранный период
        </div>
      )}

      {!loading && grouped.map(([monthKey, monthLessons]) => (
        <div key={monthKey} className="mb-4">
          <MonthLabel dateKey={monthKey} />
          <div className="flex flex-col gap-3">
            {monthLessons.map(lesson => {
              const statusInfo = STATUS_LABELS[lesson.status] || STATUS_LABELS.scheduled;
              const groupSize  = group?.studentIds?.length || 0;
              const presentCount = Array.isArray(lesson.presentStudentIds)
                ? lesson.presentStudentIds.length
                : null;
              const hwDoneCount = (lesson.hwDoneBy || []).length;
              const hasHw = !!lesson.homework;

              return (
                <div key={lesson.id}
                  className="bg-white border border-stone-100 shadow-sm rounded-2xl px-4 py-3 flex flex-col gap-2"
                >
                  {/* Строка 1: дата + время + статус */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={cn(
                        'w-2 h-2 rounded-full shrink-0',
                        lesson.status === 'conducted' ? 'bg-emerald-400'
                          : lesson.status === 'cancelled' ? 'bg-red-300' : 'bg-stone-300'
                      )} />
                      <span className="text-[15px] font-bold text-stone-800">
                        {formatDate(lesson.date)}
                      </span>
                      <span className="text-sm text-stone-400 font-medium">{lesson.startTime}</span>
                    </div>
                    <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-md shrink-0', statusInfo.cls)}>
                      {statusInfo.label}
                    </span>
                  </div>

                  {/* Тема */}
                  {lesson.topicId && (
                    <p className="text-[13px] text-stone-500 pl-4">{lesson.topicId}</p>
                  )}

                  {/* Строка 2: посещаемость + ДЗ */}
                  {lesson.status === 'conducted' && (
                    <div className="flex items-center gap-3 pl-4 flex-wrap">
                      {/* Посещаемость */}
                      {presentCount !== null && (
                        <span className={cn(
                          'inline-flex items-center gap-1 text-[12px] font-semibold px-2 py-0.5 rounded-lg',
                          presentCount === groupSize
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        )}>
                          👥 {presentCount}/{groupSize} пришли
                        </span>
                      )}

                      {/* ДЗ */}
                      {hasHw && (
                        <span className={cn(
                          'inline-flex items-center gap-1 text-[12px] font-semibold px-2 py-0.5 rounded-lg',
                          hwDoneCount === groupSize
                            ? 'bg-emerald-50 text-emerald-700'
                            : hwDoneCount > 0
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-stone-100 text-stone-500'
                        )}>
                          ДЗ: {hwDoneCount}/{groupSize} сдали
                        </span>
                      )}
                    </div>
                  )}

                  {/* Заметки */}
                  {lesson.notes && (
                    <p className="text-[12px] text-stone-400 pl-4 leading-snug line-clamp-2">{lesson.notes}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* ── Кнопка подгрузки (Infinite Scroll) ───────────────── */}
      {hasNextPage && (
        <div className="flex justify-center pt-2 pb-6">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-[#006584] bg-[#006584]/5 hover:bg-[#006584]/10 transition-colors disabled:opacity-50"
          >
            {isFetchingNextPage ? (
              <span className="flex items-center gap-1.5"><span className="w-4 h-4 border-2 border-[#006584] border-t-transparent rounded-full animate-spin"></span> Загрузка...</span>
            ) : (
              'Загрузить ещё'
            )}
          </button>
        </div>
      )}
    </SideDrawer>
  );
}
