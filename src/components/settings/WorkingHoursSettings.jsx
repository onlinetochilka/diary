import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Check } from 'lucide-react';
import Switch from '../ui/Switch.jsx';

const DEFAULT_WORKING_HOURS = {
  1: { active: true,  start: "10:00", end: "19:00" },
  2: { active: true,  start: "10:00", end: "19:00" },
  3: { active: true,  start: "10:00", end: "19:00" },
  4: { active: true,  start: "10:00", end: "19:00" },
  5: { active: true,  start: "10:00", end: "19:00" },
  6: { active: false, start: "10:00", end: "14:00" },
  0: { active: false, start: "10:00", end: "14:00" },
};
const DAYS_OF_WEEK = [
  { id: 1, name: "Пн" }, { id: 2, name: "Вт" }, { id: 3, name: "Ср" },
  { id: 4, name: "Чт" }, { id: 5, name: "Пт" }, { id: 6, name: "Сб" },
  { id: 0, name: "Вс" },
];

export function WorkingHoursSettings({ value, onSave }) {
  const [hours, setHours]   = useState(value || DEFAULT_WORKING_HOURS);
  const [status, setStatus] = useState("idle");
  const timer = useRef(null);

  useEffect(() => { if (value) setHours(value); }, [value]);

  const handleChange = (day, field, val) => {
    const next = { ...hours, [day]: { ...hours[day], [field]: val } };
    setHours(next);
    setStatus("saving");
    onSave(next).then(() => {
      setStatus("success");
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setStatus("idle"), 2000);
    }).catch(() => setStatus("idle"));
  };

  const TIME_CLS =
    "bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg px-2 py-1.5 " +
    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent " +
    "transition-all appearance-none";

  return (
    <div className="border-t border-gray-100 pt-4 mt-4">
      <div className="flex justify-between items-center mb-3">
        <div>
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Рабочий график</p>
          <p className="text-xs text-gray-400 mt-0.5">Для расчёта свободных окон</p>
        </div>
        <div className="h-5 flex items-center gap-1.5 text-xs font-medium">
          {status === "saving" && <Loader2 size={12} className="text-gray-400 animate-spin" />}
          {status === "success" && <><Check size={12} className="text-emerald-500" /><span className="text-emerald-500">Сохранено</span></>}
        </div>
      </div>
      <div className="space-y-0.5">
        {DAYS_OF_WEEK.map(day => {
          const h = hours[day.id] ?? DEFAULT_WORKING_HOURS[day.id];
          return (
            <div key={day.id}
              className={`flex items-center justify-between rounded-xl px-3 py-2 transition-colors
                ${h.active ? "bg-gray-50" : "hover:bg-gray-50/60"}`}>
              <div className="flex items-center gap-3 w-16">
                <Switch checked={h.active} onChange={v => handleChange(day.id, "active", v)} accent="emerald" />
                <span className={`text-sm font-semibold w-5 ${h.active ? "text-gray-800" : "text-gray-400"}`}>{day.name}</span>
              </div>
              <div className={`flex items-center gap-2 ${h.active ? "" : "opacity-30 pointer-events-none"}`}>
                <input type="time" value={h.start} onChange={e => handleChange(day.id, "start", e.target.value)} className={TIME_CLS} />
                <span className="text-gray-300">—</span>
                <input type="time" value={h.end}   onChange={e => handleChange(day.id, "end",   e.target.value)} className={TIME_CLS} />
                <span className="text-xs text-gray-400 w-9 text-right tabular-nums">
                  {h.active && (() => {
                    const [sh, sm] = h.start.split(":").map(Number);
                    const [eh, em] = h.end.split(":").map(Number);
                    const dur = (eh + em / 60) - (sh + sm / 60);
                    return dur > 0 ? `${dur % 1 === 0 ? dur : dur.toFixed(1)} ч` : "—";
                  })()}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
