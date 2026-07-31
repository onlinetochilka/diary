import React from 'react';
import { getEntityStyle } from '../../utils/colors.js';
import { Download, ArrowLeft, CheckCircle2, Circle } from 'lucide-react';

function Stat({ label, value, accent }) {
  return (
    <div className="text-center">
      <p className={`text-3xl font-black tracking-tight ${accent ?? 'text-stone-900'}`}>{value}</p>
      <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mt-1">{label}</p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="mb-10">
      <div className="flex items-center gap-3 mb-5">
        <div className="h-px flex-1 bg-stone-100" />
        <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest shrink-0">{title}</h3>
        <div className="h-px flex-1 bg-stone-100" />
      </div>
      {children}
    </section>
  );
}

export default function ReportTemplateView({ reportConfig, onBack }) {
  if (!reportConfig) return null;
  const { student, period, sections } = reportConfig;
  const activeSubject = student.subjects?.[0];

  // Цвет из палитры ученика
  const accentH  = student.colorOklch?.h  ?? 220;
  const accentL  = student.colorOklch?.l  ?? 0.92;
  const headerBg = `oklch(${Math.max(0.25, accentL - 0.6)} 0.10 ${accentH})`;
  const accentBg = `oklch(${accentL} 0.12 ${accentH})`;
  const accentFg = `oklch(${Math.max(0.25, accentL - 0.55)} 0.12 ${accentH})`;

  const periodLabel = period === 'month' ? 'Текущий месяц' : period === '3months' ? '3 месяца' : 'Всё время';

  return (
    <div className="min-h-screen bg-[#F0EDE8] flex flex-col print:bg-white">
      
      {/* Панель управления */}
      <div className="flex justify-between items-center px-8 py-4 bg-white border-b border-stone-200 print:hidden">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-800 transition-colors font-medium"
        >
          <ArrowLeft size={16} /> Назад
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 text-sm font-semibold text-white px-4 py-2 rounded-lg transition-colors"
          style={{ backgroundColor: '#7A404D' }}
        >
          <Download size={15} /> Скачать PDF
        </button>
      </div>

      {/* Документ */}
      <div className="flex-1 flex justify-center py-8 px-4 print:py-0">
        <div
          className="w-full max-w-2xl bg-white shadow-xl print:shadow-none"
          style={{ borderRadius: '16px', overflow: 'hidden' }}
        >
          {/* ══════ ШАПКА ══════ */}
          <div
            className="px-10 pt-10 pb-8 text-white"
            style={{ backgroundColor: headerBg }}
          >
            <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-60 mb-6">
              Отчёт об успеваемости · {periodLabel}
            </p>
            <div className="flex items-end justify-between gap-6">
              <div>
                <h1 className="text-3xl font-extrabold leading-tight tracking-tight">{student.name}</h1>
                <p className="text-sm opacity-70 mt-1 font-medium">
                  {activeSubject?.name || '—'}{student.grade ? ` · ${student.grade}` : ''}
                </p>
              </div>
              <div
                className="text-right text-xs opacity-50 shrink-0 pb-0.5"
              >
                <p>{new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
            </div>
          </div>

          {/* ══════ ТЕЛО ══════ */}
          <div className="px-10 pt-10 pb-12">

            {/* — Сводка — */}
            {sections.summary && (
              <Section title="Сводка">
                <div className="grid grid-cols-4 gap-px bg-stone-100 rounded-2xl overflow-hidden">
                  {[
                    { label: 'Уроков', value: '12' },
                    { label: 'ДЗ сдано', value: '85%', accent: 'text-emerald-600' },
                    { label: 'Пропусков', value: '0' },
                    { label: 'Посещаемость', value: '100%', accent: 'text-blue-600' },
                  ].map(s => (
                    <div key={s.label} className="bg-white py-6 px-4">
                      <Stat {...s} />
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* — Прогресс — */}
            {sections.progress && activeSubject?.programs?.length > 0 && (
              <Section title="Прогресс по программе">
                <div className="space-y-5">
                  {activeSubject.programs.map(prog => {
                    const total = prog.topics?.length || 0;
                    const done  = prog.topics?.filter(t => t.isCompleted)?.length || 0;
                    const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
                    return (
                      <div key={prog.id}>
                        <div className="flex justify-between items-baseline mb-2">
                          <span className="text-sm font-semibold text-stone-700">{prog.name}</span>
                          <span className="text-sm font-bold" style={{ color: accentFg }}>{pct}%</span>
                        </div>
                        <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: accentFg }}
                          />
                        </div>
                        {total > 0 && (
                          <p className="text-xs text-stone-400 mt-1">{done} из {total} тем</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}

            {/* — Журнал занятий — */}
            {sections.history && (
              <Section title="Журнал занятий">
                <div className="space-y-0">
                  {[
                    { date: '21.07.2026', time: '15:00', topic: 'Решение тригонометрических уравнений', note: 'Разобрали основные формулы приведения. Хорошо справляется с базой.', hw: sections.homework ? 'Решить №1–10 из сборника' : null, hwDone: true },
                    { date: '14.07.2026', time: '15:00', topic: 'Производные сложных функций', note: 'Освоили правило цепочки. Нужно больше практики на вычисление.', hw: sections.homework ? 'Упр. 5.12–5.20' : null, hwDone: false },
                  ].map((entry, i) => (
                    <div key={i} className="flex gap-5 pb-6">
                      {/* Дата-колонка */}
                      <div className="w-24 shrink-0 pt-0.5">
                        <p className="text-sm font-bold text-stone-700">{entry.date}</p>
                        <p className="text-xs text-stone-400">{entry.time}</p>
                      </div>
                      {/* Разделитель */}
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: accentFg }} />
                        <div className="w-px flex-1 bg-stone-100 mt-1" />
                      </div>
                      {/* Контент */}
                      <div className="flex-1 pt-0.5 pb-2">
                        <h4 className="text-sm font-bold text-stone-800 mb-1">{entry.topic}</h4>
                        <p className="text-xs text-stone-500 leading-relaxed">{entry.note}</p>
                        {entry.hw && (
                          <div className="mt-2 flex items-center gap-1.5 text-xs">
                            {entry.hwDone
                              ? <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                              : <Circle       size={12} className="text-stone-300 shrink-0" />
                            }
                            <span className={entry.hwDone ? 'text-stone-400 line-through' : 'text-stone-500'}>
                              ДЗ: {entry.hw}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* — Финансы — */}
            {sections.finance && (
              <Section title="Финансы">
                <div className="flex items-center justify-between p-5 rounded-2xl" style={{ backgroundColor: accentBg }}>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: accentFg }}>Текущий баланс</p>
                    <p className="text-2xl font-black mt-1" style={{ color: accentFg }}>
                      {student.balance > 0 ? '+' : ''}{student.balance ?? 0} ₽
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: accentFg }}>Уроков оплачено</p>
                    <p className="text-2xl font-black mt-1" style={{ color: accentFg }}>—</p>
                  </div>
                </div>
              </Section>
            )}

          </div>

          {/* Подвал */}
          <div
            className="px-10 py-5 border-t border-stone-100 flex justify-between items-center"
          >
            <p className="text-xs text-stone-300 font-medium">Tutor Planner</p>
            <p className="text-xs text-stone-300">{new Date().toLocaleDateString('ru-RU')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
