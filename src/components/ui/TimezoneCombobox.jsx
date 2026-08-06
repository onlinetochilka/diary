import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import { FieldLabel } from './FieldLabel.jsx';

const INPUT_CLS =
  "w-full bg-stone-50 border border-stone-200/80 text-stone-900 text-sm rounded-xl px-3.5 py-3 " +
  "placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#006584]/20 " +
  "focus:bg-white focus:border-[#006584]/50 transition-all duration-200 hover:border-stone-300";

const TIMEZONE_GROUPS = [
  { label: "Популярные", zones: [
    { value: "Europe/Moscow",  label: "(GMT+3)  Москва" },
    { value: "Europe/Minsk",   label: "(GMT+3)  Минск" },
    { value: "Asia/Almaty",    label: "(GMT+5)  Алматы" },
    { value: "Europe/Kiev",    label: "(GMT+2)  Киев" },
  ]},
  { label: "Россия", zones: [
    { value: "Europe/Kaliningrad", label: "(GMT+2)  Калининград" },
    { value: "Europe/Moscow",      label: "(GMT+3)  Москва" },
    { value: "Europe/Samara",      label: "(GMT+4)  Самара" },
    { value: "Asia/Yekaterinburg", label: "(GMT+5)  Екатеринбург" },
    { value: "Asia/Omsk",          label: "(GMT+6)  Омск" },
    { value: "Asia/Novosibirsk",   label: "(GMT+7)  Новосибирск" },
    { value: "Asia/Krasnoyarsk",   label: "(GMT+7)  Красноярск" },
    { value: "Asia/Irkutsk",       label: "(GMT+8)  Иркутск" },
    { value: "Asia/Yakutsk",       label: "(GMT+9)  Якутск" },
    { value: "Asia/Vladivostok",   label: "(GMT+10) Владивосток" },
    { value: "Asia/Magadan",       label: "(GMT+11) Магадан" },
    { value: "Asia/Kamchatka",     label: "(GMT+12) Камчатка" },
  ]},
  { label: "СНГ и ближнее зарубежье", zones: [
    { value: "Europe/Kiev",     label: "(GMT+2)  Киев" },
    { value: "Europe/Chisinau", label: "(GMT+2)  Кишинёв" },
    { value: "Europe/Minsk",    label: "(GMT+3)  Минск" },
    { value: "Asia/Tbilisi",    label: "(GMT+4)  Тбилиси" },
    { value: "Asia/Yerevan",    label: "(GMT+4)  Ереван" },
    { value: "Asia/Baku",       label: "(GMT+4)  Баку" },
    { value: "Asia/Tashkent",   label: "(GMT+5)  Ташкент" },
    { value: "Asia/Almaty",     label: "(GMT+5)  Алматы" },
    { value: "Asia/Bishkek",    label: "(GMT+6)  Бишкек" },
  ]},
  { label: "Европа", zones: [
    { value: "Europe/London",   label: "(GMT+0)  Лондон" },
    { value: "Europe/Berlin",   label: "(GMT+1)  Берлин" },
    { value: "Europe/Paris",    label: "(GMT+1)  Париж" },
    { value: "Europe/Helsinki", label: "(GMT+2)  Хельсинки" },
    { value: "Europe/Istanbul", label: "(GMT+3)  Стамбул" },
  ]},
  { label: "Другие", zones: [
    { value: "America/New_York",    label: "(GMT-5)  Нью-Йорк" },
    { value: "America/Los_Angeles", label: "(GMT-8)  Лос-Анджелес" },
    { value: "Asia/Dubai",          label: "(GMT+4)  Дубай" },
    { value: "Asia/Shanghai",       label: "(GMT+8)  Пекин" },
    { value: "Asia/Tokyo",          label: "(GMT+9)  Токио" },
  ]},
];

const ALL_ZONES    = TIMEZONE_GROUPS.flatMap(g => g.zones);
const findZoneLabel = (v) => ALL_ZONES.find(z => z.value === v)?.label ?? v;

export function TimezoneCombobox({ value, onChange }) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState("");
  const ref      = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setQuery(""); } };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const filtered = query.trim()
    ? ALL_ZONES.filter(z => z.label.toLowerCase().includes(query.toLowerCase()) || z.value.toLowerCase().includes(query.toLowerCase()))
    : null;

  const select = v => { onChange(v); setOpen(false); setQuery(""); };

  return (
    <div ref={ref} className="relative">
      <FieldLabel>Часовой пояс</FieldLabel>
      <button type="button"
        onClick={() => { setOpen(o => !o); setTimeout(() => inputRef.current?.focus(), 50); }}
        className={`${INPUT_CLS} flex items-center justify-between gap-2 text-left cursor-pointer
          ${open ? "bg-white border-[#006584]/50 ring-2 ring-[#006584]/20 ring-offset-0" : ""}`}>
        <span className="truncate">{findZoneLabel(value) || "(GMT+3)  Москва"}</span>
        <ChevronDown size={18} className={`text-stone-400 shrink-0 transition-transform duration-300 ${open ? "rotate-180 text-[#006584]" : ""}`} strokeWidth={2} />
      </button>
      {open && (
        <div className="absolute z-50 top-[calc(100%+4px)] left-0 w-full bg-white border border-stone-200 rounded-xl shadow-xl overflow-hidden animate-fade-in origin-top">
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-stone-100">
            <Search size={13} className="text-stone-400 shrink-0" />
            <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Поиск города..." className="flex-1 text-[13px] outline-none bg-transparent placeholder:text-stone-400" />
          </div>
          <div className="max-h-60 overflow-y-auto py-1.5">
            {filtered
              ? (filtered.length === 0
                  ? <p className="text-[13px] text-stone-400 text-center py-4">Ничего не найдено</p>
                  : filtered.map(z => (
                    <button key={z.value + z.label} type="button" onClick={() => select(z.value)}
                      className={`w-[calc(100%-8px)] mx-1 text-left px-3 py-2 text-[13px] rounded-lg transition-colors flex items-center justify-between
                        ${z.value === value ? "bg-[#006584]/5 text-[#006584] font-semibold" : "text-stone-700 hover:bg-stone-100"}`}>
                      <span className="truncate">{z.label}</span>
                      {z.value === value && <Check size={16} strokeWidth={2.5} />}
                    </button>
                  )))
              : TIMEZONE_GROUPS.map(group => (
                <div key={group.label}>
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest px-4 pt-3 pb-1">{group.label}</p>
                  {group.zones.map(z => (
                    <button key={z.value + z.label} type="button" onClick={() => select(z.value)}
                      className={`w-[calc(100%-8px)] mx-1 text-left px-3 py-2 text-[13px] rounded-lg transition-colors flex items-center justify-between
                        ${z.value === value ? "bg-[#006584]/5 text-[#006584] font-semibold" : "text-stone-700 hover:bg-stone-100"}`}>
                      <span className="truncate">{z.label}</span>
                      {z.value === value && <Check size={16} strokeWidth={2.5} />}
                    </button>
                  ))}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
