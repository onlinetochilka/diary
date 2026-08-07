import React from 'react';
import { Download, ArrowLeft, CheckCircle2, Circle } from 'lucide-react';
import Button from '../ui/Button.jsx';
import { getEntityStyle } from '../../utils/colors.js';

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

export default function GroupReportTemplateView({ reportConfig, onBack }) {
  if (!reportConfig) return null;
  const { group, period, sections, lessons = [], students = [] } = reportConfig;

  // Дизайн из палитры группы
  const accentH  = group.colorOklch?.h  ?? 220;
  const accentL  = group.colorOklch?.l  ?? 0.92;
  const accentBg = `oklch(${accentL} 0.12 ${accentH})`;
  const accentFg = `oklch(${Math.max(0.25, accentL - 0.55)} 0.12 ${accentH})`;
  const headerBgLight = `oklch(${0.98} 0.02 ${accentH})`;

  const periodLabel = period.type === 'custom' 
    ? `${new Date(period.from).toLocaleDateString('ru-RU')} — ${new Date(period.to).toLocaleDateString('ru-RU')}`
    : period === 'month' ? 'Текущий месяц' : period === '3months' ? '3 месяца' : 'Всё время';

  const totalConducted = lessons.length;
  
  // Расчет средней посещаемости
  let totalPossibleVisits = 0;
  let totalActualVisits = 0;
  lessons.forEach(l => {
    const studentCount = group.studentIds?.length || 0;
    totalPossibleVisits += studentCount;
    totalActualVisits += Object.keys(l.attendance || {}).filter(id => l.attendance[id] === 'present' || l.attendance[id] === 'late').length;
  });
  const avgAttendance = totalPossibleVisits > 0 ? Math.round((totalActualVisits / totalPossibleVisits) * 100) : 0;

  // Расчет ДЗ по группе
  const lessonsWithHw = lessons.filter(l => !!l.homework);
  let hwDoneTotal = 0;
  let hwPossibleTotal = 0;
  lessonsWithHw.forEach(l => {
    hwPossibleTotal += group.studentIds?.length || 0;
    hwDoneTotal += l.hwDoneBy?.length || 0;
  });
  const hwPercent = hwPossibleTotal > 0 ? Math.round((hwDoneTotal / hwPossibleTotal) * 100) : 0;

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col print:bg-white pb-20 print:pb-0">
      <div className="flex justify-between items-center px-8 py-4 bg-white border-b border-stone-200 print:hidden shadow-sm z-10 sticky top-0">
        <Button
          variant="ghost"
          onClick={onBack}
          className="w-auto h-auto border-none flex items-center gap-2 text-sm text-stone-500 hover:text-stone-800 transition-colors font-medium px-2 py-1"
        >
          <ArrowLeft size={16} /> Назад
        </Button>
        <Button
          onClick={() => window.print()}
          className="w-auto h-auto border-none flex items-center gap-2 text-sm font-semibold text-white px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all"
          style={{ backgroundColor: '#7A404D' }}
        >
          <Download size={16} /> Сохранить PDF
        </Button>
      </div>

      <div className="flex-1 flex justify-center py-10 px-4 print:py-0">
        <div className="w-full max-w-[800px] bg-white shadow-2xl print:shadow-none relative" style={{ borderRadius: '24px', overflow: 'hidden' }}>
          <div className="h-2 w-full absolute top-0 left-0" style={{ backgroundColor: accentFg }} />
          
          <div className="px-12 pt-16 pb-12" style={{ backgroundColor: headerBgLight }}>
            <div className="flex justify-between items-start mb-8">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.25em]" style={{ color: accentFg }}>
                Сводный отчет по группе
              </p>
              <p className="text-[11px] font-bold uppercase tracking-widest text-stone-400">
                {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            
            <div className="flex items-end justify-between gap-6">
              <div>
                <h1 className="text-4xl font-black text-stone-900 tracking-tight leading-tight mb-2">
                  {group.name}
                </h1>
                <div className="flex items-center gap-2 text-sm font-semibold text-stone-500 uppercase tracking-wider">
                  <span>{group.subjectName || 'Предмет не указан'}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Период</p>
                <p className="text-sm font-semibold text-stone-700">{periodLabel}</p>
              </div>
            </div>
          </div>

          <div className="px-12 pt-12 pb-16">
            {sections.summary && (
              <Section title="Сводка">
                <div className="grid grid-cols-3 gap-px bg-stone-100 rounded-3xl overflow-hidden shadow-sm border border-stone-100">
                  <div className="bg-white py-8 px-4 flex flex-col items-center justify-center">
                    <p className="text-4xl font-black tracking-tight text-stone-800">{totalConducted}</p>
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-2">Проведено уроков</p>
                  </div>
                  <div className="bg-white py-8 px-4 flex flex-col items-center justify-center">
                    <p className="text-4xl font-black tracking-tight" style={{ color: avgAttendance >= 80 ? '#10b981' : '#f59e0b' }}>{avgAttendance}%</p>
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-2">Средняя посещаемость</p>
                  </div>
                  <div className="bg-white py-8 px-4 flex flex-col items-center justify-center">
                    <p className="text-4xl font-black tracking-tight text-blue-600">{hwPercent}%</p>
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-2">Сдача ДЗ</p>
                  </div>
                </div>
              </Section>
            )}

            {sections.progress && group?.programs?.length > 0 && (
              <Section title="Прогресс по программам">
                <div className="space-y-6">
                  {group.programs.map(prog => {
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
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: accentFg }} />
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

            {sections.journal && (
              <Section title="Журнал занятий">
                {lessons.length === 0 ? (
                  <div className="text-center py-10 text-stone-400 text-sm font-medium">Нет проведенных уроков за выбранный период.</div>
                ) : (
                  <div className="space-y-0">
                    {lessons.map((lesson, i) => (
                      <div key={lesson.id} className="flex gap-6 pb-8">
                        <div className="w-24 shrink-0 pt-0.5 text-right">
                          <p className="text-sm font-bold text-stone-800">{new Date(lesson.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</p>
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 mt-1">{lesson.startTime || '—'}</p>
                        </div>
                        <div className="flex flex-col items-center">
                          <div className="w-3 h-3 rounded-full mt-1.5 shrink-0 ring-4 ring-white" style={{ backgroundColor: accentFg }} />
                          {i !== lessons.length - 1 && <div className="w-px flex-1 bg-stone-200 mt-2" />}
                        </div>
                        <div className="flex-1 pt-0.5 pb-2">
                          <h4 className="text-base font-bold text-stone-900 mb-1.5">{lesson.theme || 'Тема не указана'}</h4>
                          {lesson.note && (
                            <p className="text-sm text-stone-600 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-100 mb-3">{lesson.note}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            )}

            {sections.attendance && (
              <Section title="Матрица посещаемости">
                {lessons.length === 0 ? (
                  <div className="text-center py-4 text-stone-400 text-sm">Нет данных для матрицы</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="border-b border-stone-200">
                          <th className="py-2 px-2 font-semibold text-stone-500">Ученик</th>
                          {lessons.map(l => (
                            <th key={l.id} className="py-2 px-1 text-center font-semibold text-stone-500 text-[10px]">
                              {new Date(l.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'numeric' })}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {students.map(student => (
                          <tr key={student.id} className="border-b border-stone-100 hover:bg-stone-50">
                            <td className="py-2 px-2 font-medium text-stone-800">{student.name}</td>
                            {lessons.map(l => {
                              const att = l.attendance?.[student.id];
                              const isPresent = att === 'present' || att === 'late';
                              const isAbsent = att === 'absent_warned' || att === 'absent_unwarned';
                              return (
                                <td key={l.id} className="py-2 px-1 text-center">
                                  {isPresent ? (
                                    <CheckCircle2 size={14} className="text-emerald-500 mx-auto" />
                                  ) : isAbsent ? (
                                    <span className="text-red-500 font-bold text-[10px]">Н</span>
                                  ) : (
                                    <span className="text-stone-300">—</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Section>
            )}

            {sections.homework && (
              <Section title="Сдача домашних заданий">
                <div className="space-y-3">
                  {students.map(student => {
                    let totalHw = 0;
                    let doneHw = 0;
                    lessons.forEach(l => {
                      if (l.homework) {
                        totalHw++;
                        if (l.hwDoneBy?.includes(student.id)) doneHw++;
                      }
                    });
                    const pct = totalHw > 0 ? Math.round((doneHw / totalHw) * 100) : 0;
                    return (
                      <div key={student.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-xl">
                        <span className="font-medium text-stone-800">{student.name}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 h-2 bg-stone-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-sm font-bold text-stone-600 min-w-[3ch] text-right">{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}

            {sections.finance && (
              <Section title="Финансовый баланс участников">
                <div className="grid grid-cols-2 gap-4">
                  {students.map(student => (
                    <div key={student.id} className={`p-4 rounded-xl border ${student.balance < 0 ? 'bg-red-50 border-red-100' : 'bg-stone-50 border-stone-100'}`}>
                      <p className="text-sm font-semibold text-stone-800 mb-1">{student.name}</p>
                      <p className={`text-xl font-bold ${student.balance < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {student.balance > 0 ? '+' : ''}{student.balance ?? 0} ₽
                      </p>
                    </div>
                  ))}
                </div>
              </Section>
            )}

          </div>

          <div className="px-12 py-8 border-t border-stone-100 flex justify-between items-center bg-stone-50/50">
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
