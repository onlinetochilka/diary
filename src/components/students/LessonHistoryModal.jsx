import React, { useState, useEffect, useMemo } from 'react';
import { SideDrawer } from '../ui/index.js';
import { Send, CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react';
import { db } from '../../services/firebase.js';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { cn } from '../../utils/cn.js';

function today()    { return new Date().toISOString().slice(0, 10); }
function monthAgo() { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 10); }

function groupByMonth(lessons) {
  const map = new Map();
  for (const l of lessons) {
    const d = new Date(l.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const label = d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    if (!map.has(key)) map.set(key, { label, items: [] });
    map.get(key).items.push(l);
  }
  return [...map.values()];
}

const FILTERS = [
  { key: 'all',       label: 'Все' },
  { key: 'conducted', label: 'Прошедшие' },
  { key: 'upcoming',  label: 'Предстоящие' },
  { key: 'range',     label: 'Период' },
];

export default function LessonHistoryModal({ isOpen, onClose, student }) {
  const [lessons, setLessons]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [filter, setFilter]     = useState('all');
  const [dateFrom, setDateFrom] = useState(monthAgo);
  const [dateTo, setDateTo]     = useState(today);

  useEffect(() => {
    if (!student || !isOpen) return;
    setLessons([]); setFilter('all');
    setDateFrom(monthAgo()); setDateTo(today());
    setLoading(true);

    getDocs(query(collection(db, 'lessons'), where('studentId', '==', student.id)))
      .then(snap => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => new Date(b.date) - new Date(a.date));
        setLessons(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [student, isOpen]);

  const stats = useMemo(() => {
    const conducted = lessons.filter(l => l.status === 'conducted');
    const withHw    = conducted.filter(l => !!l.homework);
    const hwDone    = withHw.filter(l => l.hwDoneBy?.includes(student?.id));
    return {
      total:  conducted.length,
      hwRate: withHw.length > 0 ? Math.round((hwDone.length / withHw.length) * 100) : null,
    };
  }, [lessons, student]);

  const filtered = useMemo(() => {
    let r = lessons;
    if (filter === 'conducted') r = r.filter(l => l.status === 'conducted');
    else if (filter === 'upcoming')  r = r.filter(l => l.status === 'scheduled');
    else if (filter === 'range') {
      const from = new Date(dateFrom), to = new Date(dateTo);
      to.setHours(23, 59, 59);
      r = r.filter(l => { const d = new Date(l.date); return d >= from && d <= to; });
    }
    return r;
  }, [lessons, filter, dateFrom, dateTo]);

  const grouped = useMemo(() => groupByMonth(filtered), [filtered]);

  if (!student) return null;

  return (
    <SideDrawer isOpen={isOpen} onClose={onClose} title={`Журнал — ${student.name}`} width="max-w-lg">

      {/* ── KPI-панель ─────────────────────────────────────── */}
      {!loading && lessons.length > 0 && (
        <div className="flex items-stretch bg-white border border-stone-100 rounded-2xl shadow-sm mb-6 overflow-hidden">
          {/* Проведено */}
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-4 gap-0.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
              Проведено
            </p>
            <p className="text-3xl font-black text-stone-800 leading-none">
              {stats.total}
            </p>
          </div>

          {/* Разделитель */}
          {stats.hwRate !== null && (
            <div className="w-px bg-stone-100 my-3" />
          )}

          {/* ДЗ сдано */}
          {stats.hwRate !== null && (
            <div className="flex-1 flex flex-col items-center justify-center px-4 py-4 gap-0.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                ДЗ сдано
              </p>
              <p className="text-3xl font-black text-emerald-500 leading-none">
                {stats.hwRate}%
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Фильтры ───────────────────────────────────────── */}
      {!loading && lessons.length > 0 && (
        <div className="mb-6 space-y-3">
          {/* Горизонтальный ряд таблеток — 2 слева + 2 справа */}
          <div className="flex gap-2">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  'flex-1 text-[13px] font-semibold py-2 px-2 rounded-xl transition-all duration-150 whitespace-nowrap text-center',
                  filter === f.key
                    ? 'bg-stone-800 text-white shadow-sm'
                    : 'bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-700'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Выбор периода */}
          {filter === 'range' && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              {[['От', dateFrom, d => setDateFrom(d), null, dateTo],
                ['До', dateTo,   d => setDateTo(d),   dateFrom, null]].map(([label, val, set, min, max]) => (
                <div key={label}>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1.5">
                    {label}
                  </label>
                  <input
                    type="date" value={val} min={min ?? undefined} max={max ?? undefined}
                    onChange={e => set(e.target.value)}
                    className="w-full text-sm border border-stone-200 rounded-xl px-3 py-2.5 text-stone-700 outline-none focus:border-stone-400 bg-white transition-colors"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Список ────────────────────────────────────────── */}
      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin text-stone-300" />
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <p className="text-center py-16 text-sm text-stone-400">Ничего нет</p>
      )}

      {!loading && grouped.map(group => (
        <div key={group.label} className="mb-6">

          {/* Месяц-заголовок */}
          <div className="flex items-center gap-3 mb-3">
            <p className="text-[11px] font-bold text-stone-400 uppercase tracking-widest capitalize shrink-0">
              {group.label}
            </p>
            <div className="flex-1 h-px bg-stone-100" />
          </div>

          {/* Карточки уроков */}
          <div className="space-y-2">
            {group.items.map((lesson, idx) => {
              const hasHw     = !!lesson.homework;
              const hwDone    = hasHw && lesson.hwDoneBy?.includes(student.id);
              const hwOverdue = hasHw && !hwDone && lesson.status === 'conducted';

              return (
                <div
                  key={lesson.id}
                  className="flex items-start gap-3 px-3.5 py-3.5 rounded-2xl bg-white border border-stone-100 shadow-sm"
                >
                  {/* Статус-точка */}
                  <div className="mt-[5px] shrink-0">
                    {lesson.status === 'conducted' && <div className="w-2 h-2 rounded-full bg-emerald-400" />}
                    {lesson.status === 'scheduled'  && <div className="w-2 h-2 rounded-full bg-stone-300" />}
                    {lesson.status === 'cancelled'  && <div className="w-2 h-2 rounded-full bg-red-300" />}
                  </div>

                  {/* Контент */}
                  <div className="flex-1 min-w-0">
                    {/* Дата + время + иконка */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-baseline gap-2 min-w-0">
                        <span className="text-[15px] font-semibold text-stone-800 shrink-0">
                          {new Date(lesson.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                        </span>
                        <span className="text-sm text-stone-400 font-medium shrink-0">
                          {lesson.startTime}
                        </span>
                      </div>
                      {lesson.status === 'conducted' && (
                        <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md shrink-0">
                          Проведён
                        </span>
                      )}
                      {lesson.status === 'scheduled' && (
                        <span className="text-[11px] font-semibold text-stone-400 bg-stone-100 px-2 py-0.5 rounded-md shrink-0">
                          Запланирован
                        </span>
                      )}
                      {lesson.status === 'cancelled' && (
                        <span className="text-[11px] font-semibold text-red-400 bg-red-50 px-2 py-0.5 rounded-md shrink-0">
                          Отменён
                        </span>
                      )}
                    </div>

                    {/* Предмет */}
                    <p className="text-[13px] text-stone-400 mt-0.5">{lesson.subjectName}</p>

                    {/* ДЗ — компактный inline-бейдж, не во всю ширину */}
                    {hasHw && (
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <span className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[12px] font-semibold',
                          hwDone
                            ? 'bg-emerald-50 text-emerald-700'
                            : hwOverdue
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-stone-100 text-stone-500'
                        )}>
                          {hwDone ? '✓ ДЗ сдано' : `ДЗ: ${lesson.homework}`}
                        </span>
                        {hwOverdue && (
                          <button
                            onClick={() => window.open(`https://t.me/share/url?url=&text=${encodeURIComponent(`Напоминаю про ДЗ: ${lesson.homework}`)}`, '_blank')}
                            className="inline-flex items-center gap-1 text-[12px] text-blue-600 hover:text-blue-800 font-semibold bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg transition-colors"
                          >
                            <Send size={11} /> Напомнить
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </SideDrawer>
  );
}
