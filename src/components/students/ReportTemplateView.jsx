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
  const { student, period, sections, lessons = [] } = reportConfig;
  const activeSubject = student.subjects?.[0];

  // Цвет из палитры ученика
  const accentH  = student.colorOklch?.h  ?? 220;
  const accentL  = student.colorOklch?.l  ?? 0.92;
  const accentBg = `oklch(${accentL} 0.12 ${accentH})`;
  const accentFg = `oklch(${Math.max(0.25, accentL - 0.55)} 0.12 ${accentH})`;
  
  // Новый премиальный светлый фон для шапки
  const headerBgLight = `oklch(${0.98} 0.02 ${accentH})`;

  const periodLabel = period.type === 'custom' 
    ? `${new Date(period.from).toLocaleDateString('ru-RU')} — ${new Date(period.to).toLocaleDateString('ru-RU')}`
    : period === 'month' ? 'Текущий месяц' : period === '3months' ? '3 месяца' : 'Всё время';

  // Расчет сводки
  const totalConducted = lessons.length;
  const lessonsWithHw = lessons.filter(l => !!l.homework);
  const hwDone = lessonsWithHw.filter(l => l.hwDoneBy?.includes(student.id)).length;
  const hwPercent = lessonsWithHw.length > 0 ? Math.round((hwDone / lessonsWithHw.length) * 100) : 0;
  // Пока у нас нет концепции пропусков в БД в таком виде (статус cancelled), считаем отмененные
  const cancelledCount = 0; // Временно 0, так как мы фильтруем только conducted в билдере

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col print:bg-white pb-20 print:pb-0">
      
      {/* Панель управления */}
      <div className="flex justify-between items-center px-8 py-4 bg-white border-b border-stone-200 print:hidden shadow-sm z-10 sticky top-0">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-800 transition-colors font-medium"
        >
          <ArrowLeft size={16} /> Назад
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 text-sm font-semibold text-white px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all"
          style={{ backgroundColor: '#7A404D' }}
        >
          <Download size={16} /> Сохранить PDF
        </button>
      </div>

      {/* Документ */}
      <div className="flex-1 flex justify-center py-10 px-4 print:py-0">
        <div
          className="w-full max-w-[800px] bg-white shadow-2xl print:shadow-none relative"
          style={{ borderRadius: '24px', overflow: 'hidden' }}
        >
          {/* Декоративная линия сверху */}
          <div className="h-2 w-full absolute top-0 left-0" style={{ backgroundColor: accentFg }} />
          
          {/* ══════ ШАПКА (Новый светлый дизайн) ══════ */}
          <div
            className="px-12 pt-16 pb-12"
            style={{ backgroundColor: headerBgLight }}
          >
            <div className="flex justify-between items-start mb-8">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.25em]" style={{ color: accentFg }}>
                Отчёт об успеваемости
              </p>
              <p className="text-[11px] font-bold uppercase tracking-widest text-stone-400">
                {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            
            <div className="flex items-end justify-between gap-6">
              <div>
                <h1 className="text-4xl font-black text-stone-900 tracking-tight leading-tight mb-2">
                  {student.name}
                </h1>
                <div className="flex items-center gap-2 text-sm font-semibold text-stone-500 uppercase tracking-wider">
                  <span>{activeSubject?.name || 'Предмет не указан'}</span>
                  {student.grade && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-stone-300" />
                      <span>{student.grade}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Период</p>
                <p className="text-sm font-semibold text-stone-700">{periodLabel}</p>
              </div>
            </div>
          </div>

          {/* ══════ ТЕЛО ══════ */}
          <div className="px-12 pt-12 pb-16">

            {/* — Сводка — */}
            {sections.summary && (
              <Section title="Сводка">
                <div className="grid grid-cols-3 gap-px bg-stone-100 rounded-3xl overflow-hidden shadow-sm border border-stone-100">
                  <div className="bg-white py-8 px-4 flex flex-col items-center justify-center">
                    <p className="text-4xl font-black tracking-tight text-stone-800">{totalConducted}</p>
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-2">Проведено уроков</p>
                  </div>
                  <div className="bg-white py-8 px-4 flex flex-col items-center justify-center">
                    <p className="text-4xl font-black tracking-tight" style={{ color: hwPercent >= 80 ? '#10b981' : '#f59e0b' }}>{hwPercent}%</p>
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-2">Выполнено ДЗ</p>
                  </div>
                  <div className="bg-white py-8 px-4 flex flex-col items-center justify-center">
                    <p className="text-4xl font-black tracking-tight text-blue-600">{hwPercent === 100 ? '100%' : 'Отл.'}</p>
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-2">Успеваемость</p>
                  </div>
                </div>
              </Section>
            )}

            {/* — Прогресс — */}
            {sections.progress && activeSubject?.programs?.length > 0 && (
              <Section title="Прогресс по программе">
                <div className="space-y-6">
                  {activeSubject.programs.map(prog => {
                    const total = prog.topics?.length || 0;
                    const done  = prog.topics?.filter(t => t.isCompleted)?.length || 0;
                    const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
                    return (
                      <div key={prog.id} className="bg-stone-50/50 p-6 rounded-2xl border border-stone-100">
                        <div className="flex justify-between items-baseline mb-3">
                          <span className="text-base font-bold text-stone-800">{prog.name}</span>
                          <span className="text-lg font-black" style={{ color: accentFg }}>{pct}%</span>
                        </div>
                        <div className="h-2.5 bg-stone-200 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: accentFg }}
                          />
                        </div>
                        {total > 0 && (
                          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mt-3">Пройдено {done} из {total} тем</p>
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
                {lessons.length === 0 ? (
                  <div className="text-center py-10 text-stone-400 text-sm font-medium">
                    Нет проведенных уроков за выбранный период.
                  </div>
                ) : (
                  <div className="space-y-0">
                    {lessons.map((lesson, i) => {
                      const hasHw = !!lesson.homework;
                      const hwDone = hasHw && lesson.hwDoneBy?.includes(student.id);
                      
                      return (
                        <div key={lesson.id} className="flex gap-6 pb-8">
                          {/* Дата-колонка */}
                          <div className="w-24 shrink-0 pt-0.5 text-right">
                            <p className="text-sm font-bold text-stone-800">
                              {new Date(lesson.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                            </p>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 mt-1">{lesson.startTime || '—'}</p>
                          </div>
                          {/* Разделитель */}
                          <div className="flex flex-col items-center">
                            <div className="w-3 h-3 rounded-full mt-1.5 shrink-0 ring-4 ring-white" style={{ backgroundColor: accentFg }} />
                            {i !== lessons.length - 1 && <div className="w-px flex-1 bg-stone-200 mt-2" />}
                          </div>
                          {/* Контент */}
                          <div className="flex-1 pt-0.5 pb-2">
                            <h4 className="text-base font-bold text-stone-900 mb-1.5">{lesson.theme || 'Тема не указана'}</h4>
                            {lesson.note && (
                              <p className="text-sm text-stone-600 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-100 mb-3">{lesson.note}</p>
                            )}
                            
                            {sections.homework && hasHw && (
                              <div className="flex items-start gap-2 text-sm mt-3">
                                {hwDone
                                  ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                                  : <Circle size={16} className="text-stone-300 shrink-0 mt-0.5" />
                                }
                                <div>
                                  <span className={`text-[11px] font-bold uppercase tracking-wider block mb-0.5 ${hwDone ? 'text-emerald-600' : 'text-stone-400'}`}>
                                    {hwDone ? 'Сдано' : 'Домашнее задание'}
                                  </span>
                                  <span className={hwDone ? 'text-stone-400 line-through' : 'text-stone-700 font-medium'}>
                                    {lesson.homework}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Section>
            )}

            {/* — Финансы — */}
            {sections.finance && (
              <Section title="Финансы">
                <div className="flex items-center justify-between p-8 rounded-3xl" style={{ backgroundColor: accentBg }}>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: accentFg }}>Текущий баланс</p>
                    <p className="text-4xl font-black tracking-tight" style={{ color: accentFg }}>
                      {student.balance > 0 ? '+' : ''}{student.balance ?? 0} ₽
                    </p>
                  </div>
                </div>
              </Section>
            )}

          </div>

          {/* Подвал */}
          <div
            className="px-12 py-8 border-t border-stone-100 flex justify-between items-center bg-stone-50/50"
          >
            <div className="flex items-center gap-2 text-stone-300">
              <span className="w-4 h-4 rounded bg-stone-200 block" />
              <p className="text-[11px] font-bold uppercase tracking-widest">Tutor Planner</p>
            </div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-stone-300">{new Date().toLocaleDateString('ru-RU')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
