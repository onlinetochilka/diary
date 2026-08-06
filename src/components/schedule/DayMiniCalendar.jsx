import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ymd } from './scheduleUtils.jsx';
import Button from '../ui/Button.jsx';

const MONTH_NAMES = [
  'Январь','Февраль','Март','Апрель','Май','Июнь',
  'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'
];
const DOW = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

/**
 * DayMiniCalendar — навигационный мини-календарь.
 *
 * Назначение: быстрый переход к конкретной дате.
 * Индикация:
 *   - Выбранный день → заполненный кружок #006584
 *   - Сегодня → ring #006584
 *   - День с занятиями (не выбранный, не сегодня) → лёгкий тинт фона
 *   - Выходные → чуть иной цвет цифры
 * Без точек. Цифры крупнее.
 */
export default function DayMiniCalendar({ currentDate, lessonsByDate = {}, onDateSelect }) {
  const today = ymd(new Date());
  const selectedStr = ymd(currentDate);

  const [calYear, setCalYear] = useState(currentDate.getFullYear());
  const [calMonth, setCalMonth] = useState(currentDate.getMonth());

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  const firstDay = new Date(calYear, calMonth, 1);
  const lastDay  = new Date(calYear, calMonth + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // 0=Пн
  const totalDays = lastDay.getDate();

  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="select-none">

      {/* ── Заголовок месяца ── */}
      <div className="flex items-center justify-between mb-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={prevMonth}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors p-0 border-none"
        >
          <ChevronLeft size={15} strokeWidth={2} />
        </Button>
        <span className="text-[13px] font-bold text-stone-800">
          {MONTH_NAMES[calMonth]} {calYear}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={nextMonth}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors p-0 border-none"
        >
          <ChevronRight size={15} strokeWidth={2} />
        </Button>
      </div>

      {/* ── Дни недели ── */}
      <div className="grid grid-cols-7 mb-1.5">
        {DOW.map((d, i) => (
          <div
            key={d}
            className={`text-center text-[11px] font-semibold pb-1 ${
              i >= 5 ? 'text-rose-300' : 'text-stone-300'
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* ── Сетка дней ── */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} />;

          const dateStr   = `${calYear}-${String(calMonth + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const isToday   = dateStr === today;
          const isSel     = dateStr === selectedStr;
          const hasLessons = !!(lessonsByDate[dateStr]?.length);
          const dow       = (new Date(dateStr).getDay() + 6) % 7;
          const isWeekend = dow >= 5;

          return (
            <Button
              key={dateStr}
              variant="ghost"
              onClick={() => onDateSelect(new Date(dateStr + 'T12:00:00'))}
              className={[
                'relative flex items-center justify-center h-8 w-full rounded-xl p-0 border-none',
                'text-[13px] font-semibold transition-all duration-100 outline-none hover:text-stone-900',
                isSel
                  // Выбранный: filled circle
                  ? 'bg-[#006584] text-white hover:text-white hover:bg-[#00526a] shadow-sm font-bold'
                  : isToday
                  // Сегодня: ring без заливки
                  ? 'ring-2 ring-[#006584]/50 text-[#006584] font-bold hover:bg-[#006584]/8 hover:text-[#006584]'
                  : hasLessons
                  // Занятый день: более заметный тинт
                  ? isWeekend
                    ? 'text-rose-500 bg-rose-100 hover:bg-rose-200 hover:text-rose-600'
                    : 'text-[#006584] bg-[#006584]/18 hover:bg-[#006584]/28 hover:text-[#006584]'
                  // Пустой день
                  : isWeekend
                    ? 'text-rose-300 hover:bg-rose-50 hover:text-rose-400'
                    : 'text-stone-400 hover:bg-stone-100 text-stone-600',
              ].join(' ')}
            >
              {day}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
