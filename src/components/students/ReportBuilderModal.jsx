import React, { useState } from 'react';
import { SideDrawer, Button } from '../ui/index.js';
import { BarChart2, Clock, BookOpen, Target, CreditCard, ChevronRight, Download, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn.js';
import { getLessons } from '../../services/database.js';

const SECTIONS = [
  { key: 'summary',  title: 'Сводка',           desc: 'Уроков, посещаемость, % ДЗ',    icon: BarChart2,  color: { bg: 'bg-blue-100',    text: 'text-blue-600' } },
  { key: 'history',  title: 'Журнал уроков',     desc: 'Дата, предмет, заметки',         icon: Clock,      color: { bg: 'bg-violet-100',  text: 'text-violet-600' } },
  { key: 'homework', title: 'Домашние задания',  desc: 'Задания и статус выполнения',    icon: BookOpen,   color: { bg: 'bg-amber-100',   text: 'text-amber-600' } },
  { key: 'progress', title: 'Прогресс',          desc: 'Достижение целей по программе', icon: Target,     color: { bg: 'bg-emerald-100', text: 'text-emerald-600' } },
  { key: 'finance',  title: 'Оплата',            desc: 'Платежи и текущий баланс',      icon: CreditCard, color: { bg: 'bg-stone-100',   text: 'text-stone-500' } },
];

const PERIODS = [
  { key: 'month',   label: 'Месяц' },
  { key: '3months', label: '3 мес.' },
  { key: 'all',     label: 'Всё время' },
  { key: 'custom',  label: 'Диапазон' },
];

function today()    { return new Date().toISOString().slice(0, 10); }
function monthAgo() { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 10); }

export default function ReportBuilderModal({ isOpen, onClose, student, onGenerate }) {
  const [period, setPeriod] = useState('month');
  const [dateFrom, setDateFrom] = useState(monthAgo);
  const [dateTo,   setDateTo]   = useState(today);
  const [isLoading, setIsLoading] = useState(false);
  const [sections, setSections] = useState({
    summary: true, history: true, homework: true, progress: true, finance: false,
  });

  const toggle = (key) => setSections(p => ({ ...p, [key]: !p[key] }));
  const selectedCount = Object.values(sections).filter(Boolean).length;
  const effectivePeriod = period === 'custom' ? { type: 'custom', from: dateFrom, to: dateTo } : period;
  
  const generate = async (format) => {
    setIsLoading(true);
    try {
      const allLessons = await getLessons({ studentId: student.id });
      // Filter by period
      const filteredLessons = allLessons.filter(l => {
        if (l.status !== 'conducted') return false; // Only include conducted lessons in the report
        const d = l.date;
        if (period === 'month') return d >= monthAgo() && d <= today();
        if (period === '3months') {
          const d3 = new Date(); d3.setMonth(d3.getMonth() - 3);
          return d >= d3.toISOString().slice(0,10) && d <= today();
        }
        if (period === 'custom') return d >= dateFrom && d <= dateTo;
        return true; // 'all'
      });
      // Sort newest to oldest
      filteredLessons.sort((a, b) => new Date(b.date) - new Date(a.date));
      onGenerate?.({ student, period: effectivePeriod, sections, format, lessons: filteredLessons });
    } finally {
      setIsLoading(false);
    }
  };

  if (!student) return null;

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
            disabled={selectedCount === 0 || isLoading}
          >
            {isLoading ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />} PDF
          </Button>
          <Button
            className="flex-1 h-12 text-base gap-2 bg-[#7A404D] text-white font-semibold hover:bg-[#6a3341] active:bg-[#5c2c38] border-0 shadow-md hover:shadow-lg transition-all"
            onClick={() => generate('web')}
            disabled={selectedCount === 0 || isLoading}
          >
            {isLoading ? <Loader2 className="animate-spin" size={16} /> : <>Отчёт <ChevronRight size={16} /></>}
          </Button>
        </div>
      }
    >
      {/* Ученик */}
      <p className="text-base text-stone-500 -mt-1 mb-7">
        для <span className="font-semibold text-stone-800">{student.name}</span>
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
