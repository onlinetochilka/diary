/**
 * GroupReportBuilderModal.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Конструктор отчёта для группы — аналог ReportBuilderModal,
 * но с групповыми секциями: посещаемость по участникам, агрегаты ДЗ и т.д.
 */
import React, { useState } from 'react';
import { SideDrawer, Button } from '../ui/index.js';
import { BarChart2, Clock, Users, BookOpen, Target, CreditCard, ChevronRight, Download } from 'lucide-react';
import { cn } from '../../utils/cn.js';

const SECTIONS = [
  { key: 'summary',     title: 'Сводка',             desc: 'Уроков, посещаемость, % ДЗ',            icon: BarChart2,  color: { bg: 'bg-blue-100',    text: 'text-blue-600' } },
  { key: 'journal',     title: 'Журнал занятий',      desc: 'Даты, темы, кто присутствовал',          icon: Clock,      color: { bg: 'bg-violet-100',  text: 'text-violet-600' } },
  { key: 'attendance',  title: 'Посещаемость',        desc: 'Таблица по ученикам и занятиям',         icon: Users,      color: { bg: 'bg-sky-100',     text: 'text-sky-600' } },
  { key: 'homework',    title: 'Домашние задания',    desc: 'По каждому уроку: кто сдал / нет',       icon: BookOpen,   color: { bg: 'bg-amber-100',   text: 'text-amber-600' } },
  { key: 'progress',    title: 'Прогресс',            desc: 'Прохождение программы обучения',         icon: Target,     color: { bg: 'bg-emerald-100', text: 'text-emerald-600' } },
  { key: 'finance',     title: 'Финансы',             desc: 'Долги учеников, доход группы',           icon: CreditCard, color: { bg: 'bg-stone-100',   text: 'text-stone-500' } },
];

const PERIODS = [
  { key: 'month',   label: 'Месяц' },
  { key: '3months', label: '3 мес.' },
  { key: 'all',     label: 'Всё время' },
  { key: 'custom',  label: 'Диапазон' },
];

function today()    { return new Date().toISOString().slice(0, 10); }
function monthAgo() { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 10); }

export default function GroupReportBuilderModal({ isOpen, onClose, group, onGenerate }) {
  const [period, setPeriod] = useState('month');
  const [dateFrom, setDateFrom] = useState(monthAgo);
  const [dateTo,   setDateTo]   = useState(today);
  const [sections, setSections] = useState({
    summary: true, journal: true, attendance: true, homework: true, progress: true, finance: false,
  });

  const toggle = (key) => setSections(p => ({ ...p, [key]: !p[key] }));
  const selectedCount = Object.values(sections).filter(Boolean).length;
  const effectivePeriod = period === 'custom' ? { type: 'custom', from: dateFrom, to: dateTo } : period;
  const generate = (format) => onGenerate?.({ group, period: effectivePeriod, sections, format });

  if (!group) return null;

  return (
    <SideDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Собрать отчёт"
      width="max-w-lg"
      footer={
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 h-12 text-base gap-2 border-stone-300 bg-white text-stone-700 font-medium hover:bg-stone-100 hover:border-stone-400 transition-all shadow-sm"
            onClick={() => generate('pdf')}
            disabled={selectedCount === 0}
          >
            <Download size={16} /> PDF
          </Button>
          <Button
            className="flex-1 h-12 text-base gap-2 bg-[#7A404D] text-white font-semibold hover:bg-[#6a3341] active:bg-[#5c2c38] border-0 shadow-md hover:shadow-lg transition-all"
            onClick={() => generate('web')}
            disabled={selectedCount === 0}
          >
            Отчёт <ChevronRight size={16} />
          </Button>
        </div>
      }
    >
      {/* Группа */}
      <p className="text-base text-stone-500 -mt-1 mb-7">
        группа <span className="font-semibold text-stone-800">{group.name}</span>
        {group.subjectName && (
          <span className="ml-1.5 text-teal-600 font-medium">· {group.subjectName}</span>
        )}
      </p>

      {/* Период */}
      <div className="mb-8">
        <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">Период</p>
        <div className="flex gap-2 flex-wrap">
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={cn(
                "px-5 py-2 rounded-full text-[15px] font-medium border transition-all",
                period === p.key
                  ? "border-stone-800 bg-stone-800 text-white"
                  : "border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-stone-400 uppercase tracking-wide block mb-1.5">От</label>
              <input
                type="date"
                value={dateFrom}
                max={dateTo}
                onChange={e => setDateFrom(e.target.value)}
                className="w-full text-sm border border-stone-200 rounded-xl px-4 py-3 text-stone-700 outline-none focus:border-stone-400 transition-colors bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-400 uppercase tracking-wide block mb-1.5">До</label>
              <input
                type="date"
                value={dateTo}
                min={dateFrom}
                onChange={e => setDateTo(e.target.value)}
                className="w-full text-sm border border-stone-200 rounded-xl px-4 py-3 text-stone-700 outline-none focus:border-stone-400 transition-colors bg-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* Секции */}
      <div>
        <div className="flex items-baseline gap-2 mb-3">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">Включить в отчёт</p>
          <span className="text-xs text-stone-300 font-normal">{selectedCount} из {SECTIONS.length}</span>
        </div>
        <div className="rounded-2xl border border-stone-100 overflow-hidden divide-y divide-stone-100">
          {SECTIONS.map(sec => {
            const Icon = sec.icon;
            const on = sections[sec.key];
            return (
              <button
                key={sec.key}
                onClick={() => toggle(sec.key)}
                className={cn(
                  "w-full flex items-center gap-4 px-5 py-4 text-left transition-colors",
                  on ? "bg-white" : "bg-stone-50/60"
                )}
              >
                {/* Иконка */}
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", sec.color.bg)}>
                  <Icon size={18} className={sec.color.text} />
                </div>

                {/* Текст */}
                <div className="flex-1 min-w-0">
                  <p className={cn("text-[15px] font-semibold leading-snug", on ? "text-stone-800" : "text-stone-400")}>
                    {sec.title}
                  </p>
                  <p className="text-sm text-stone-400 mt-0.5">{sec.desc}</p>
                </div>

                {/* Тоггл */}
                <div className={cn(
                  "w-11 h-6 rounded-full transition-colors shrink-0 relative",
                  on ? "bg-stone-800" : "bg-stone-200"
                )}>
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform",
                    on ? "translate-x-[1.375rem]" : "translate-x-1"
                  )} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </SideDrawer>
  );
}
