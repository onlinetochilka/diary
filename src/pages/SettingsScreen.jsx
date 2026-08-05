import React, { useState, useEffect, useRef, useCallback } from "react";
import { PageWrapper } from "../components/layout/PageWrapper.jsx";
import { Modal, Select } from "../components/ui/index.js";
import {
  User, Globe, AlertTriangle, Bell,
  Check, Loader2, LogOut, Trash2,
  Settings as SettingsIcon, Receipt,
  ChevronDown, Search, AlertCircle, BookCheck, BarChart3,
  Users, UserCheck,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
import {
  getUserConfig, updateUserConfig, getStudents,
} from "../services/database.js";
import pb from "../services/pocketbase.js";
import { clearAllTutorData } from "../utils/demoData.js";

// ─── Design tokens ─────────────────────────────────────────────────────────
// Flat, clean style: bg-gray-50 inputs → bg-white + ring on focus
// Cards: bg-white border border-gray-200 shadow-sm rounded-2xl

const INPUT_CLS =
  "w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-4 py-2.5 " +
  "placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 " +
  "focus:bg-white focus:border-transparent transition-all duration-200";

const LABEL_CLS =
  "block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5";

const BTN_BASE =
  "inline-flex items-center justify-center font-medium text-sm rounded-xl " +
  "transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 " +
  "disabled:opacity-40 disabled:cursor-not-allowed";

// ─── Shared micro-components ──────────────────────────────────────────────

function FieldLabel({ children, status }) {
  return (
    <label className={`${LABEL_CLS} flex items-center justify-between`}>
      {children}
      {status === "saving" && <Loader2 size={12} className="text-gray-400 animate-spin" />}
      {status === "success" && <Check size={12} className="text-emerald-500" />}
    </label>
  );
}

function SettingsCard({ children, className = "", danger = false }) {
  return (
    <div
      className={
        "bg-white rounded-2xl shadow-sm p-6 " +
        (danger ? "border border-red-200 " : "border border-gray-200 ") +
        className
      }
    >
      {children}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, description, danger = false, action }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-5">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0
          ${danger ? "bg-red-50 text-red-500" : "bg-gray-100 text-gray-500"}`}>
          <Icon size={18} />
        </div>
        <div>
          <h2 className={`text-base font-semibold ${danger ? "text-red-900" : "text-gray-900"}`}>
            {title}
          </h2>
          {description && (
            <p className={`text-sm mt-0.5 leading-snug ${danger ? "text-red-500" : "text-gray-500"}`}>
              {description}
            </p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

// Clean toggle — no neumorphism
function Toggle({ checked, onChange, accent = "blue" }) {
  const colors = { blue: "bg-blue-600", amber: "bg-amber-500", violet: "bg-violet-600", emerald: "bg-emerald-500" };
  return (
    <button
      type="button" role="switch" aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={
        `relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent ` +
        `transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ` +
        (checked ? colors[accent] : "bg-gray-200")
      }
    >
      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

// Auto-save on blur
function SaveOnBlurInput({ label, value, onSave, multiline, disabled, placeholder }) {
  const [local, setLocal]   = useState(value ?? "");
  const [status, setStatus] = useState("idle");
  const timer = useRef(null);

  useEffect(() => { setLocal(value ?? ""); }, [value]);

  const handleBlur = async () => {
    if (local === (value ?? "")) return;
    setStatus("saving");
    try {
      await onSave(local);
      setStatus("success");
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setStatus("idle"), 2000);
    } catch { setStatus("idle"); }
  };

  return (
    <div>
      <FieldLabel status={status}>{label}</FieldLabel>
      {multiline ? (
        <textarea value={local} onChange={e => setLocal(e.target.value)} onBlur={handleBlur}
          disabled={disabled} placeholder={placeholder}
          className={`${INPUT_CLS} min-h-[88px] resize-none`} />
      ) : (
        <input type="text" value={local} onChange={e => setLocal(e.target.value)} onBlur={handleBlur}
          disabled={disabled} placeholder={placeholder}
          className={`${INPUT_CLS} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`} />
      )}
    </div>
  );
}

// ─── Simple tags input ──────────────────────────────────────────────────────

function SimpleTagsInput({ value = [], onChange, placeholder }) {
  const [input, setInput] = useState("");

  const addTag  = (text) => { const t = text.trim(); if (t && !value.includes(t)) onChange([...value, t]); setInput(""); };
  const removeTag = (i) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div
      className="flex flex-wrap gap-1.5 w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 min-h-[42px] cursor-text
        focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white focus-within:border-transparent transition-all"
      onClick={e => e.currentTarget.querySelector("input")?.focus()}
    >
      {value.map((tag, i) => (
        <span key={i} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-blue-100 text-blue-800 text-xs font-medium">
          {tag}
          <button type="button" onClick={() => removeTag(i)} className="hover:text-blue-600 ml-0.5">×</button>
        </span>
      ))}
      <input type="text" value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(input); }
          if (e.key === "Backspace" && !input && value.length) removeTag(value.length - 1);
        }}
        onPaste={e => { e.preventDefault(); e.clipboardData.getData("text").split(/[\n,]+/).forEach(t => addTag(t)); }}
        placeholder={value.length ? "" : placeholder}
        className="flex-1 min-w-[120px] bg-transparent outline-none text-sm text-gray-900 placeholder:text-gray-400"
      />
    </div>
  );
}

// ─── Timezone Combobox ──────────────────────────────────────────────────────

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

function TimezoneCombobox({ value, onChange }) {
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
          ${open ? "ring-2 ring-blue-500 border-transparent bg-white" : ""}`}>
        <span className="truncate">{findZoneLabel(value) || "(GMT+3)  Москва"}</span>
        <ChevronDown size={15} className={`text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1.5 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100">
            <Search size={13} className="text-gray-400 shrink-0" />
            <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Поиск города..." className="flex-1 text-sm outline-none bg-transparent placeholder:text-gray-400" />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered
              ? (filtered.length === 0
                  ? <p className="text-sm text-gray-400 text-center py-4">Ничего не найдено</p>
                  : filtered.map(z => (
                    <button key={z.value + z.label} type="button" onClick={() => select(z.value)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors
                        ${z.value === value ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                      {z.label}
                    </button>
                  )))
              : TIMEZONE_GROUPS.map(group => (
                <div key={group.label}>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-4 pt-3 pb-1">{group.label}</p>
                  {group.zones.map(z => (
                    <button key={z.value + z.label} type="button" onClick={() => select(z.value)}
                      className={`w-full text-left px-4 py-1.5 text-sm hover:bg-gray-50 transition-colors
                        ${z.value === value ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                      {z.label}
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

// ─── Working Hours ──────────────────────────────────────────────────────────

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

function WorkingHoursSettings({ value, onSave }) {
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
                <Toggle checked={h.active} onChange={v => handleChange(day.id, "active", v)} accent="emerald" />
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

// ─── Notifications ──────────────────────────────────────────────────────────

const DAYS_OPTIONS = [
  { id: 1, name: "Понедельник" }, { id: 2, name: "Вторник" }, { id: 3, name: "Среда" },
  { id: 4, name: "Четверг" },    { id: 5, name: "Пятница" }, { id: 6, name: "Суббота" },
  { id: 0, name: "Воскресенье" },
];

const DEFAULT_NOTIFICATIONS = {
  debtReminder:     { enabled: false, delayHours: 24,   sendTo: "all", selectedStudentIds: [] },
  homeworkReminder: { enabled: false,                   sendTo: "all", selectedStudentIds: [] },
  progressReport:   {
    enabled: false, frequency: "weekly", dayOfWeek: 5, dayOfMonth: 1,
    includeTopics: true, includeHomework: true, includeFinancials: true,
    sendTo: "all", selectedStudentIds: [],
  },
};

const NOTIF_CONFIG = {
  debtReminder:     { icon: AlertCircle, title: "Напоминание о долге",            hint: "Однократно — через N часов после появления",              iconBg: "bg-amber-50  text-amber-500",   accent: "amber"   },
  homeworkReminder: { icon: BookCheck,   title: "Напоминание о домашнем задании", hint: "Утром за день до урока, если ДЗ не сдано",                 iconBg: "bg-violet-50 text-violet-500",  accent: "violet"  },
  progressReport:   { icon: BarChart3,   title: "Отчёт о работе",                 hint: "Уроки, темы, ДЗ и финансы — по расписанию",               iconBg: "bg-emerald-50 text-emerald-600", accent: "emerald" },
};

const SMALL_SELECT =
  "h-9 bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg px-3 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent transition-all";
const SMALL_NUM =
  "w-14 h-9 bg-gray-50 border border-gray-200 text-gray-900 text-sm text-center rounded-lg px-2 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent transition-all";

function NotificationsSettings({ value, onSave, students = [] }) {
  const merge = (def, over) => ({ ...def, ...(over || {}) });
  const [notif, setNotif]   = useState(() => ({
    debtReminder:     merge(DEFAULT_NOTIFICATIONS.debtReminder,     value?.debtReminder),
    homeworkReminder: merge(DEFAULT_NOTIFICATIONS.homeworkReminder, value?.homeworkReminder),
    progressReport:   merge(DEFAULT_NOTIFICATIONS.progressReport,   value?.progressReport),
  }));
  const [status, setStatus] = useState("idle");
  const timer = useRef(null);

  useEffect(() => {
    if (!value) return;
    setNotif({
      debtReminder:     merge(DEFAULT_NOTIFICATIONS.debtReminder,     value.debtReminder),
      homeworkReminder: merge(DEFAULT_NOTIFICATIONS.homeworkReminder, value.homeworkReminder),
      progressReport:   merge(DEFAULT_NOTIFICATIONS.progressReport,   value.progressReport),
    });
  }, [value]);

  const persist = async updated => {
    setStatus("saving");
    try { await onSave(updated); setStatus("success"); clearTimeout(timer.current); timer.current = setTimeout(() => setStatus("idle"), 2000); }
    catch { setStatus("idle"); }
  };

  const update = (section, field, val) => {
    const updated = { ...notif, [section]: { ...notif[section], [field]: val } };
    setNotif(updated);
    persist(updated);
  };

  const toggleStudent = (section, studentId) => {
    const current = notif[section].selectedStudentIds || [];
    const next = current.includes(studentId) ? current.filter(id => id !== studentId) : [...current, studentId];
    update(section, "selectedStudentIds", next);
  };

  const clamp = (v, mn, mx) => Math.max(mn, Math.min(mx, v || mn));

  return (
    <div>
      {/* Save indicator */}
      <div className="h-4 flex justify-end items-center gap-1.5 mb-3">
        {status === "saving" && <Loader2 size={12} className="text-gray-400 animate-spin" />}
        {status === "success" && <span className="flex items-center gap-1 text-[11px] text-emerald-500 font-medium"><Check size={11} /> Сохранено</span>}
      </div>

      <div className="space-y-2">
        {Object.entries(NOTIF_CONFIG).map(([key, cfg]) => {
          const IconComp = cfg.icon;
          const section  = notif[key];
          const selected = section.selectedStudentIds || [];

          return (
            <div key={key} className="border border-gray-100 rounded-xl overflow-hidden">
              {/* Header row */}
              <div className="flex items-center justify-between p-3.5 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
                    <IconComp size={17} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{cfg.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{cfg.hint}</p>
                  </div>
                </div>
                <Toggle checked={section.enabled} onChange={v => update(key, "enabled", v)} accent={cfg.accent} />
              </div>

              {/* Expanded body */}
              {section.enabled && (
                <div className="px-4 pb-4 pt-3 border-t border-gray-100 space-y-4">

                  {/* Debt: delay hours */}
                  {key === "debtReminder" && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-gray-600">Отправить через</span>
                      <input type="number" min="1" max="72" value={section.delayHours}
                        onChange={e => update(key, "delayHours", clamp(Number(e.target.value), 1, 72))}
                        className={SMALL_NUM} />
                      <span className="text-sm text-gray-600">ч после появления долга</span>
                    </div>
                  )}

                  {/* Homework: description */}
                  {key === "homeworkReminder" && (
                    <p className="text-sm text-gray-500 leading-relaxed">
                      Если ученик не отметил ДЗ как выполненное — напоминание придёт утром накануне урока.
                    </p>
                  )}

                  {/* Progress report: frequency + content chips */}
                  {key === "progressReport" && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <Select value={section.frequency} onChange={e => update(key, "frequency", e.target.value)} className="w-48 min-h-[42px] py-0">
                          <option value="weekly">Каждую неделю</option>
                          <option value="biweekly">Раз в 2 недели</option>
                          <option value="monthly">Раз в месяц</option>
                        </Select>
                        {section.frequency !== "monthly" ? (
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-500 font-medium">в</span>
                            <Select value={section.dayOfWeek} onChange={e => update(key, "dayOfWeek", Number(e.target.value))} className="w-40 min-h-[42px] py-0">
                              {DAYS_OPTIONS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </Select>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-500 font-medium">числа</span>
                            <input type="number" min="1" max="28" value={section.dayOfMonth}
                              onChange={e => update(key, "dayOfMonth", clamp(Number(e.target.value), 1, 28))}
                              className="w-16 h-[42px] text-center text-sm border border-stone-200 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { k: "includeTopics",     l: "Темы уроков" },
                          { k: "includeHomework",   l: "Домашние задания" },
                          { k: "includeFinancials", l: "Финансы" },
                        ].map(({ k, l }) => (
                          <button key={k} onClick={() => update(key, k, !section[k])}
                            className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all
                              ${section[k]
                                ? "bg-emerald-600 text-white border-emerald-600"
                                : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"}`}>
                            {section[k] && "✓ "}{l}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Recipient selector: all vs selected ── */}
                  <div className="border-t border-gray-100 pt-3">
                    <p className={`${LABEL_CLS} mb-2`}>Получатели рассылки</p>
                    <div className="flex gap-2 mb-3">
                      {[
                        { val: "all",      label: "Все ученики",  Icon: Users },
                        { val: "selected", label: "По выбору",    Icon: UserCheck },
                      ].map(({ val, label, Icon: Ic }) => (
                        <button key={val}
                          onClick={() => update(key, "sendTo", val)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all
                            ${section.sendTo === val
                              ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                              : "bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300"}`}>
                          <Ic size={13} />
                          {label}
                        </button>
                      ))}
                    </div>

                    {/* Student picker (only when "selected") */}
                    {section.sendTo === "selected" && students.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {students.map(s => {
                          const isSelected = selected.includes(s.id);
                          return (
                            <button key={s.id}
                              onClick={() => toggleStudent(key, s.id)}
                              className={`text-xs px-3 py-1 rounded-lg border font-medium transition-all
                                ${isSelected
                                  ? "bg-blue-100 text-blue-800 border-blue-200"
                                  : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300"}`}>
                              {isSelected && "✓ "}{s.name}
                            </button>
                          );
                        })}
                        {students.length === 0 && (
                          <p className="text-xs text-gray-400 italic">Нет активных учеников</p>
                        )}
                      </div>
                    )}

                    {section.sendTo === "selected" && selected.length === 0 && students.length > 0 && (
                      <p className="text-xs text-amber-500 mt-1">Выберите хотя бы одного ученика</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Confirm Modal ──────────────────────────────────────────────────────────

function ConfirmModal({ isOpen, onClose, onConfirm, title, description, bullets, confirmLabel, isLoading }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-sm">
      <div className="space-y-4">
        {description && <p className="text-sm text-gray-600">{description}</p>}
        {bullets && (
          <ul className="space-y-1.5 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            {bullets.map(b => (
              <li key={b} className="flex items-center gap-2 text-sm text-red-700">
                <span className="text-red-400 shrink-0">•</span>{b}
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-3 pt-1">
          <button onClick={onClose}
            className={`${BTN_BASE} flex-1 h-10 border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-300`}>
            Отмена
          </button>
          <button onClick={onConfirm} disabled={isLoading}
            className={`${BTN_BASE} flex-1 h-10 bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm`}>
            {isLoading && <Loader2 size={14} className="animate-spin mr-1.5" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function SettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [config,   setConfig]   = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [students, setStudents] = useState([]);

  const [isResetting,    setIsResetting]    = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [deleteConfirm,  setDeleteConfirm]  = useState("");
  const [isDeleting,     setIsDeleting]     = useState(false);

  useEffect(() => {
    async function load() {
      if (authLoading) return;
      try {
        if (user?.id) {
          const [c, s] = await Promise.all([getUserConfig(user.id), getStudents(user.id)]);
          setConfig(c || {});
          setStudents((s || []).filter(st => !st.isArchived));
        } else {
          setConfig({});
        }
      } catch (e) {
        console.error("Failed to load config:", e);
        setConfig({});
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, authLoading]);

  const updateConfig = useCallback(async (key, value) => {
    const next = { ...config, [key]: value };
    setConfig(next);
    if (user?.id) await updateUserConfig(user.id, { [key]: value });
  }, [config, user]);

  const handleResetConfirm = async () => {
    setIsResetting(true);
    try { await clearAllTutorData(user.id); window.location.reload(); }
    catch (e) { console.error("Reset failed", e); setIsResetting(false); setResetModalOpen(false); }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "УДАЛИТЬ") return;
    setIsDeleting(true);
    try { await clearAllTutorData(user.id); pb.authStore.clear(); }
    catch (e) { console.error("Delete failed", e); setIsDeleting(false); }
  };

  if (loading || !config) {
    return (
      <PageWrapper>
        <div className="flex justify-center items-center h-64 text-gray-400">
          <Loader2 size={24} className="animate-spin" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Настройки"
      subtitle="Основные настройки аккаунта"
      icon={SettingsIcon}
      iconBgClass="bg-[#636B74]/10"
      iconTextClass="text-[#636B74]"
    >
      <ConfirmModal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        onConfirm={handleResetConfirm}
        isLoading={isResetting}
        title="Стереть базу с концами?"
        description="Действие нельзя отменить. Это удалит:"
        bullets={["Всех учеников", "Все уроки и расписание", "Все финансовые записи", "Все программы"]}
        confirmLabel="Да, я уверен"
      />

      <div className="max-w-[1400px] mx-auto pb-6">
        {/*
          Layout:
          ┌─────────────────┬──────────────────────┬────────────────────────┐
          │  Профиль        │  Ваше время          │  Уведомления           │
          │  ──────────     │  ──────────          │  ──────────────        │
          │  Реквизиты      │  (same height as     │  (same height as       │
          │                 │   left col)          │   other two cols)      │
          └─────────────────┴──────────────────────┴────────────────────────┘
          ┌─────────────────────────────────────────────────────────────────┐
          │  Критические действия (full width)                              │
          └─────────────────────────────────────────────────────────────────┘
        */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── Колонка 1: Профиль + Реквизиты (стопка) ── */}
          <div className="flex flex-col gap-5">

            {/* ① ПРОФИЛЬ */}
            <SettingsCard>
              <SectionHeader icon={User} title="Профиль" description="Данные для учеников и клиентов" />
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <SaveOnBlurInput label="Имя репетитора"
                    value={config.displayName || user?.displayName || ""}
                    onSave={v => updateConfig("displayName", v)}
                    placeholder="Как вас называют" />
                  <SaveOnBlurInput label="Телефон"
                    value={config.phone || ""}
                    onSave={v => updateConfig("phone", v)}
                    placeholder="+7 (999) 000-00-00" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <SaveOnBlurInput label="Telegram"
                    value={config.telegram || ""}
                    onSave={v => updateConfig("telegram", v)}
                    placeholder="@username" />
                  <div>
                    <FieldLabel>Email аккаунта</FieldLabel>
                    <input type="text" value={user?.email || ""} disabled
                      className={`${INPUT_CLS} opacity-50 cursor-not-allowed`} />
                  </div>
                </div>
                <div>
                  <FieldLabel>Предметы</FieldLabel>
                  <SimpleTagsInput
                    value={config.subjects || []}
                    onChange={v => updateConfig("subjects", v)}
                    placeholder="Предмет + Enter" />
                </div>
              </div>
            </SettingsCard>

            {/* ② РЕКВИЗИТЫ */}
            <SettingsCard className="flex-1">
              <SectionHeader
                icon={Receipt}
                title="Реквизиты"
                description="Необязательно — можно добавить и отправлять родителям вместе с отчётом"
                action={
                  <button onClick={() => pb.authStore.clear()}
                    className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-700 transition-colors shrink-0">
                    <LogOut size={13} /> Выйти
                  </button>
                }
              />
              <SaveOnBlurInput label="Шаблон реквизитов" multiline
                value={config.requisites}
                onSave={v => updateConfig("requisites", v)}
                placeholder={"Сбербанк: 0000 0000 0000 0000 (Иванова А.П.)\nСБП по номеру телефона: +7 (999) 000-00-00"} />
            </SettingsCard>
          </div>

          {/* ── Колонка 2: Расписание ── */}
          <SettingsCard className="lg:h-full">
            <SectionHeader icon={Globe} title="Ваше время и расписание" description="Часовой пояс, валюта, рабочие часы" />
            <div className="grid grid-cols-2 gap-3 mb-1">
              <TimezoneCombobox value={config.timezone} onChange={v => updateConfig("timezone", v)} />
              <div>
                <FieldLabel>Валюта</FieldLabel>
                <Select value={config.currency} onChange={e => updateConfig("currency", e.target.value)}>
                  <option value="RUB">₽ Рубль</option>
                  <option value="BYN">Br Белорусский рубль</option>
                  <option value="USD">$ Доллар</option>
                  <option value="EUR">€ Евро</option>
                  <option value="KZT">₸ Тенге</option>
                </Select>
              </div>
            </div>
            <WorkingHoursSettings value={config.workingHours} onSave={v => updateConfig("workingHours", v)} />
          </SettingsCard>

          {/* ── Колонка 3: Уведомления ── */}
          <SettingsCard className="lg:h-full">
            <SectionHeader icon={Bell} title="Уведомления" description="Авторассылки через Telegram из карточки ученика" />
            <NotificationsSettings
              value={config.notifications}
              onSave={v => updateConfig("notifications", v)}
              students={students}
            />
          </SettingsCard>

          {/* ── Критические действия (полная ширина) ── */}
          <SettingsCard className="lg:col-span-3" danger>
            <SectionHeader icon={AlertTriangle} title="Критические действия" danger />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

              {/* Сброс данных */}
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="text-sm font-bold text-red-800 mb-1">Удалить все данные</p>
                  <p className="text-sm text-red-500 leading-relaxed">
                    Это удалит: Всех учеников, уроки и финансовые записи.<br/>
                    Действие нельзя отменить.
                  </p>
                </div>
                <button onClick={() => setResetModalOpen(true)} disabled={isResetting}
                  className={`${BTN_BASE} shrink-0 h-10 px-4 border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 focus:ring-red-300`}>
                  <Trash2 size={14} className="mr-2" />
                  Удалить
                </button>
              </div>

              {/* Удаление аккаунта */}
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-red-800 mb-1">Удаление профиля</p>
                  <p className="text-sm text-red-500 leading-relaxed mb-3">
                    Навсегда удалит ваш аккаунт. Отменить невозможно.
                  </p>
                  <div className="flex gap-2">
                    <input type="text" placeholder="Впишите УДАЛИТЬ"
                      value={deleteConfirm}
                      onChange={e => setDeleteConfirm(e.target.value)}
                      className="flex-1 min-w-0 bg-white border border-red-200 text-gray-900 text-sm rounded-xl px-4 py-2.5 placeholder:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-400 transition-all" />
                    <button onClick={handleDeleteAccount}
                      disabled={deleteConfirm !== "УДАЛИТЬ" || isDeleting}
                      className={`${BTN_BASE} shrink-0 h-10 px-4 bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm`}>
                      {isDeleting ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Trash2 size={14} className="mr-1.5" />}
                      Удалить
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </SettingsCard>

        </div>
      </div>
    </PageWrapper>
  );
}
