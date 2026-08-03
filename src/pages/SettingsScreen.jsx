import React, { useState, useEffect, useRef, useCallback } from "react";
import { PageWrapper } from "../components/layout/PageWrapper.jsx";
import { Card, Button, Input, Switch, Modal, TagsInput } from "../components/ui/index.js";
import {
  User, Palette, Globe, Database, AlertTriangle, Bell,
  Check, Loader2, Download, Link as LinkIcon, LogOut, Trash2,
  Settings as SettingsIcon, Phone, MessageCircle, BookOpen,
  ChevronDown, ChevronUp, Search, Clock, DollarSign, Camera,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
import {
  getUserConfig, updateUserConfig,
  getStudents, getPayments, getLessons,
} from "../services/database.js";
import { auth } from "../services/firebase.js";
import { signOut } from "firebase/auth";
import { clearAllTutorData } from "../utils/demoData.js";

// ─── Timezone data ──────────────────────────────────────────────────────────

const TIMEZONE_GROUPS = [
  {
    label: "Популярные",
    zones: [
      { value: "Europe/Moscow",        label: "(GMT+3)  Москва" },
      { value: "Europe/Minsk",         label: "(GMT+3)  Минск" },
      { value: "Asia/Almaty",          label: "(GMT+5)  Алматы" },
      { value: "Europe/Kiev",          label: "(GMT+2)  Киев" },
    ],
  },
  {
    label: "Россия",
    zones: [
      { value: "Europe/Kaliningrad",   label: "(GMT+2)  Калининград" },
      { value: "Europe/Moscow",        label: "(GMT+3)  Москва" },
      { value: "Europe/Samara",        label: "(GMT+4)  Самара" },
      { value: "Asia/Yekaterinburg",   label: "(GMT+5)  Екатеринбург" },
      { value: "Asia/Omsk",            label: "(GMT+6)  Омск" },
      { value: "Asia/Novosibirsk",     label: "(GMT+7)  Новосибирск" },
      { value: "Asia/Krasnoyarsk",     label: "(GMT+7)  Красноярск" },
      { value: "Asia/Irkutsk",         label: "(GMT+8)  Иркутск" },
      { value: "Asia/Yakutsk",         label: "(GMT+9)  Якутск" },
      { value: "Asia/Vladivostok",     label: "(GMT+10) Владивосток" },
      { value: "Asia/Magadan",         label: "(GMT+11) Магадан" },
      { value: "Asia/Kamchatka",       label: "(GMT+12) Камчатка" },
    ],
  },
  {
    label: "СНГ и ближнее зарубежье",
    zones: [
      { value: "Europe/Kiev",          label: "(GMT+2)  Киев" },
      { value: "Europe/Chisinau",      label: "(GMT+2)  Кишинёв" },
      { value: "Europe/Minsk",         label: "(GMT+3)  Минск" },
      { value: "Asia/Tbilisi",         label: "(GMT+4)  Тбилиси" },
      { value: "Asia/Yerevan",         label: "(GMT+4)  Ереван" },
      { value: "Asia/Baku",            label: "(GMT+4)  Баку" },
      { value: "Asia/Tashkent",        label: "(GMT+5)  Ташкент" },
      { value: "Asia/Ashgabat",        label: "(GMT+5)  Ашхабад" },
      { value: "Asia/Dushanbe",        label: "(GMT+5)  Душанбе" },
      { value: "Asia/Almaty",          label: "(GMT+5)  Алматы" },
      { value: "Asia/Bishkek",         label: "(GMT+6)  Бишкек" },
    ],
  },
  {
    label: "Европа",
    zones: [
      { value: "Europe/London",        label: "(GMT+0)  Лондон" },
      { value: "Europe/Berlin",        label: "(GMT+1)  Берлин" },
      { value: "Europe/Paris",         label: "(GMT+1)  Париж" },
      { value: "Europe/Helsinki",      label: "(GMT+2)  Хельсинки" },
      { value: "Europe/Bucharest",     label: "(GMT+2)  Бухарест" },
      { value: "Europe/Istanbul",      label: "(GMT+3)  Стамбул" },
    ],
  },
  {
    label: "Другие",
    zones: [
      { value: "America/New_York",     label: "(GMT-5)  Нью-Йорк" },
      { value: "America/Los_Angeles",  label: "(GMT-8)  Лос-Анджелес" },
      { value: "Asia/Dubai",           label: "(GMT+4)  Дубай" },
      { value: "Asia/Shanghai",        label: "(GMT+8)  Пекин" },
      { value: "Asia/Tokyo",           label: "(GMT+9)  Токио" },
    ],
  },
];

// Flat list for search
const ALL_ZONES = TIMEZONE_GROUPS.flatMap(g => g.zones);
const findZoneLabel = (value) =>
  ALL_ZONES.find(z => z.value === value)?.label ?? value;

// ─── Helper components ───────────────────────────────────────────────────────

function SaveStatus({ status }) {
  if (status === "saving") return <Loader2 size={13} className="text-stone-400 animate-spin shrink-0" />;
  if (status === "success") return <Check size={13} className="text-emerald-500 shrink-0" />;
  return null;
}

/** Auto-saves on blur. Shows a save indicator next to the label. */
function SaveOnBlurInput({ label, value, onSave, multiline, disabled, placeholder, className }) {
  const [local, setLocal] = useState(value ?? "");
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
    } catch {
      setStatus("idle");
    }
  };

  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-stone-700 ml-1 flex items-center justify-between gap-2">
        {label}
        <SaveStatus status={status} />
      </label>
      {multiline ? (
        <textarea
          value={local}
          onChange={e => setLocal(e.target.value)}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-stone-900 text-sm
            focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-300
            transition-all min-h-[90px] resize-y ${className ?? ""}`}
        />
      ) : (
        <Input
          value={local}
          onChange={e => setLocal(e.target.value)}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={placeholder}
          className={`bg-white ${className ?? ""}`}
        />
      )}
    </div>
  );
}

/** Card header: icon + title + description */
function SectionHeader({ icon: Icon, title, description, danger, action }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
        ${danger ? "bg-red-100 text-red-600" : "bg-stone-100 text-stone-600"}`}>
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <h2 className={`text-base font-bold leading-tight ${danger ? "text-red-900" : "text-stone-900"}`}>
          {title}
        </h2>
        {description && (
          <p className={`text-xs mt-0.5 ${danger ? "text-red-600/80" : "text-stone-400"}`}>
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

// ─── Timezone Combobox ───────────────────────────────────────────────────────

function TimezoneCombobox({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = query.trim()
    ? ALL_ZONES.filter(z =>
        z.label.toLowerCase().includes(query.toLowerCase()) ||
        z.value.toLowerCase().includes(query.toLowerCase())
      )
    : null; // null = show grouped

  const select = (zoneValue) => {
    onChange(zoneValue);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="text-sm font-medium text-stone-700 ml-1 block mb-1">Часовой пояс</label>
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="w-full h-11 bg-white border border-stone-200 rounded-xl px-4 text-sm text-stone-900
          flex items-center justify-between gap-2
          focus:outline-none focus:ring-2 focus:ring-stone-900/10 hover:border-stone-300 transition-colors"
      >
        <span className="truncate">{findZoneLabel(value) || "(GMT+3)  Москва"}</span>
        <ChevronDown size={16} className={`text-stone-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1.5 w-full bg-white border border-stone-200 rounded-xl
          shadow-lg overflow-hidden">
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-stone-100">
            <Search size={14} className="text-stone-400 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Поиск города или часового пояса..."
              className="flex-1 text-sm outline-none bg-transparent placeholder:text-stone-400"
            />
          </div>
          {/* Options */}
          <div className="max-h-60 overflow-y-auto py-1">
            {filtered ? (
              filtered.length === 0 ? (
                <p className="text-sm text-stone-400 text-center py-4">Ничего не найдено</p>
              ) : (
                filtered.map(z => (
                  <button
                    key={z.value + z.label}
                    type="button"
                    onClick={() => select(z.value)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-stone-50 transition-colors
                      ${z.value === value ? "text-stone-900 font-semibold bg-stone-50" : "text-stone-700"}`}
                  >
                    {z.label}
                  </button>
                ))
              )
            ) : (
              TIMEZONE_GROUPS.map(group => (
                <div key={group.label}>
                  <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider px-4 py-1.5 mt-1">
                    {group.label}
                  </p>
                  {group.zones.map(z => (
                    <button
                      key={z.value + z.label}
                      type="button"
                      onClick={() => select(z.value)}
                      className={`w-full text-left px-4 py-1.5 text-sm hover:bg-stone-50 transition-colors
                        ${z.value === value ? "text-stone-900 font-semibold" : "text-stone-700"}`}
                    >
                      {z.label}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Theme picker ────────────────────────────────────────────────────────────

const THEMES = [
  { id: "tochilka", name: "Точилка", color: "#e0e5ec", border: "#b8c2d1", icon: "text-stone-900" },
  { id: "dark",     name: "Тёмная",  color: "#1c2433", border: "#263044", icon: "text-white" },
];

function ThemePicker({ value, onChange }) {
  return (
    <div className="flex items-center gap-3">
      {THEMES.map(t => {
        const active = value === t.id || (!value && t.id === "tochilka");
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all
              ${active ? "bg-stone-100" : "hover:bg-stone-50"}`}
          >
            <div
              className={`w-11 h-11 rounded-full border-2 shadow-sm flex items-center justify-center transition-all
                ${active ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-ivory" : ""}`}
              style={{ backgroundColor: t.color, borderColor: t.border }}
            >
              {active && <Check size={18} className={t.icon} />}
            </div>
            <span className="text-[11px] font-medium text-stone-600">{t.name}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Working hours ────────────────────────────────────────────────────────────

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
  const [hours, setHours] = useState(value || DEFAULT_WORKING_HOURS);
  const [status, setStatus] = useState("idle");
  const timer = useRef(null);

  useEffect(() => { if (value) setHours(value); }, [value]);

  const handleChange = (day, field, val) => {
    const next = { ...hours, [day]: { ...hours[day], [field]: val } };
    setHours(next);
    setStatus("saving");
    onSave(next)
      .then(() => {
        setStatus("success");
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setStatus("idle"), 2000);
      })
      .catch(() => setStatus("idle"));
  };

  const timeCls = (active) =>
    `text-sm font-medium bg-stone-50 border border-stone-200 rounded-lg px-2 py-1 text-stone-700
     focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400
     transition-all appearance-none
     ${active ? "opacity-100" : "opacity-30 pointer-events-none"}`;

  return (
    <div className="border-t border-stone-100 pt-4 mt-4">
      <div className="flex justify-between items-center mb-3">
        <div>
          <p className="text-sm font-semibold text-stone-800">Рабочий график</p>
          <p className="text-xs text-stone-400 mt-0.5">Используется для расчёта свободных окон</p>
        </div>
        <div className="h-5 flex items-center">
          <SaveStatus status={status} />
        </div>
      </div>
      <div className="space-y-0.5">
        {DAYS_OF_WEEK.map(day => {
          const h = hours[day.id] ?? DEFAULT_WORKING_HOURS[day.id];
          return (
            <div
              key={day.id}
              className={`flex items-center justify-between rounded-xl px-3 py-2 transition-colors
                ${h.active ? "bg-stone-50" : "bg-transparent hover:bg-stone-50/60"}`}
            >
              <div className="flex items-center gap-3 w-16">
                <Switch
                  checked={h.active}
                  onChange={v => handleChange(day.id, "active", v)}
                  size="sm"
                  accent="emerald"
                  aria-label={day.name}
                />
                <span className={`text-sm font-medium w-5 ${h.active ? "text-stone-800" : "text-stone-400"}`}>
                  {day.name}
                </span>
              </div>
              <div className={`flex items-center gap-2 transition-opacity ${h.active ? "opacity-100" : "opacity-30 pointer-events-none"}`}>
                <input type="time" value={h.start}
                  onChange={e => handleChange(day.id, "start", e.target.value)}
                  className={timeCls(h.active)} />
                <span className="text-stone-300 text-sm">—</span>
                <input type="time" value={h.end}
                  onChange={e => handleChange(day.id, "end", e.target.value)}
                  className={timeCls(h.active)} />
                <span className="text-xs text-stone-400 w-10 text-right">
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

// ─── Notifications ────────────────────────────────────────────────────────────

const DAYS_OPTIONS = [
  { id: 1, name: "Понедельник" }, { id: 2, name: "Вторник" },
  { id: 3, name: "Среда" },       { id: 4, name: "Четверг" },
  { id: 5, name: "Пятница" },     { id: 6, name: "Суббота" },
  { id: 0, name: "Воскресенье" },
];

const DEFAULT_NOTIFICATIONS = {
  debtReminder:     { enabled: false, delayHours: 24, excludedStudentIds: [] },
  homeworkReminder: { enabled: false, hoursBeforeLesson: 24, excludedStudentIds: [] },
  progressReport:   {
    enabled: false, frequency: "weekly", dayOfWeek: 5, dayOfMonth: 1,
    includeTopics: true, includeHomework: true, includeFinancials: true,
    excludedStudentIds: [],
  },
};

function NotificationsSettings({ value, onSave, students = [] }) {
  const merge = (def, over) => ({ ...def, ...(over || {}) });
  const [notif, setNotif] = useState(() => ({
    debtReminder:     merge(DEFAULT_NOTIFICATIONS.debtReminder,     value?.debtReminder),
    homeworkReminder: merge(DEFAULT_NOTIFICATIONS.homeworkReminder, value?.homeworkReminder),
    progressReport:   merge(DEFAULT_NOTIFICATIONS.progressReport,   value?.progressReport),
  }));
  const [status, setStatus] = useState("idle");
  const [exclusionOpen, setExclusionOpen] = useState({ debtReminder: false, homeworkReminder: false, progressReport: false });
  const timer = useRef(null);

  useEffect(() => {
    if (!value) return;
    setNotif({
      debtReminder:     merge(DEFAULT_NOTIFICATIONS.debtReminder,     value.debtReminder),
      homeworkReminder: merge(DEFAULT_NOTIFICATIONS.homeworkReminder, value.homeworkReminder),
      progressReport:   merge(DEFAULT_NOTIFICATIONS.progressReport,   value.progressReport),
    });
  }, [value]);

  const persist = async (updated) => {
    setStatus("saving");
    try {
      await onSave(updated);
      setStatus("success");
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setStatus("idle"), 2000);
    } catch { setStatus("idle"); }
  };

  const update = (section, field, val) => {
    const updated = { ...notif, [section]: { ...notif[section], [field]: val } };
    setNotif(updated);
    persist(updated);
  };

  const toggleExclusion = (section, studentId) => {
    const current = notif[section].excludedStudentIds || [];
    const excluded = current.includes(studentId)
      ? current.filter(id => id !== studentId)
      : [...current, studentId];
    update(section, "excludedStudentIds", excluded);
  };

  const selectCls = "h-9 bg-white border border-stone-200 rounded-lg px-3 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10";
  const numCls    = "w-14 h-9 bg-white border border-stone-200 rounded-lg px-2 text-sm text-stone-900 text-center focus:outline-none focus:ring-2 focus:ring-stone-900/10";
  const clamp     = (v, mn, mx) => Math.max(mn, Math.min(mx, v || mn));

  const ExclusionPanel = ({ section }) => {
    if (!students.length) return null;
    const excluded = notif[section].excludedStudentIds || [];
    const isOpen = exclusionOpen[section];
    const count = excluded.length;

    return (
      <div className="mt-3 pt-3 border-t border-stone-100">
        <button
          type="button"
          onClick={() => setExclusionOpen(prev => ({ ...prev, [section]: !prev[section] }))}
          className="flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-stone-700 transition-colors"
        >
          {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          Настроить исключения
          {count > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-stone-200 text-stone-600 text-[10px] font-semibold">
              {count}
            </span>
          )}
        </button>
        {isOpen && (
          <div className="mt-2">
            <p className="text-[11px] text-stone-400 mb-1.5">Не отправлять:</p>
            <div className="flex flex-wrap gap-1.5">
              {students.map(s => {
                const isOut = excluded.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleExclusion(section, s.id)}
                    title={isOut ? `${s.name}: исключён` : `${s.name}: нажми чтобы исключить`}
                    className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all
                      ${isOut
                        ? "bg-red-50 text-red-400 border-red-200 line-through opacity-70"
                        : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"
                      }`}
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const TypeRow = ({ section, title, hint, children }) => (
    <div className="rounded-xl border border-stone-100 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-stone-50">
        <div>
          <p className="text-sm font-semibold text-stone-800">{title}</p>
          <p className="text-xs text-stone-400 mt-0.5">{hint}</p>
        </div>
        <Switch
          checked={notif[section].enabled}
          onChange={v => update(section, "enabled", v)}
          size="sm"
          accent="emerald"
        />
      </div>
      {notif[section].enabled && (
        <div className="px-4 py-3">
          {children}
          <ExclusionPanel section={section} />
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="h-4 flex justify-end items-center">
        <SaveStatus status={status} />
        {status === "success" && (
          <span className="text-xs text-emerald-500 font-medium ml-1">Сохранено</span>
        )}
      </div>

      {/* Долг */}
      <TypeRow section="debtReminder" title="Напоминание о долге" hint="Однократно — через N часов после появления долга">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-stone-600">Отправить через</span>
          <input
            type="number" min="1" max="72"
            value={notif.debtReminder.delayHours}
            onChange={e => update("debtReminder", "delayHours", clamp(Number(e.target.value), 1, 72))}
            className={numCls}
          />
          <span className="text-sm text-stone-600">ч после появления долга</span>
        </div>
      </TypeRow>

      {/* ДЗ */}
      <TypeRow section="homeworkReminder" title="Напоминание о домашнем задании" hint="Утром за день до урока, если ДЗ не сдано">
        <p className="text-xs text-stone-400 leading-relaxed">
          Если ученик не отметил ДЗ как выполненное, напоминание отправится утром накануне урока.
        </p>
      </TypeRow>

      {/* Отчёт */}
      <TypeRow section="progressReport" title="Отчёт о работе" hint="Уроки, темы, ДЗ и финансы — по расписанию">
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={notif.progressReport.frequency}
              onChange={e => update("progressReport", "frequency", e.target.value)}
              className={selectCls}
            >
              <option value="weekly">Каждую неделю</option>
              <option value="biweekly">Раз в 2 недели</option>
              <option value="monthly">Раз в месяц</option>
            </select>

            {notif.progressReport.frequency !== "monthly" ? (
              <>
                <span className="text-sm text-stone-500">в</span>
                <select
                  value={notif.progressReport.dayOfWeek}
                  onChange={e => update("progressReport", "dayOfWeek", Number(e.target.value))}
                  className={selectCls}
                >
                  {DAYS_OPTIONS.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <span className="text-sm text-stone-500">числа</span>
                <input
                  type="number" min="1" max="28"
                  value={notif.progressReport.dayOfMonth}
                  onChange={e => update("progressReport", "dayOfMonth", clamp(Number(e.target.value), 1, 28))}
                  className={numCls}
                />
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { key: "includeTopics",     label: "Темы уроков" },
              { key: "includeHomework",   label: "Домашние задания" },
              { key: "includeFinancials", label: "Финансы" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => update("progressReport", key, !notif.progressReport[key])}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors
                  ${notif.progressReport[key]
                    ? "bg-stone-800 text-white border-stone-800"
                    : "bg-white text-stone-400 border-stone-200 hover:border-stone-300"
                  }`}
              >
                {notif.progressReport[key] ? "✓ " : ""}{label}
              </button>
            ))}
          </div>
        </div>
      </TypeRow>
    </div>
  );
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────

function ConfirmModal({ isOpen, onClose, onConfirm, title, description, bullets, confirmLabel, isLoading }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-sm">
      <div className="space-y-4">
        {description && <p className="text-sm text-stone-600">{description}</p>}
        {bullets && (
          <ul className="space-y-1">
            {bullets.map(b => (
              <li key={b} className="flex items-start gap-2 text-sm text-stone-600">
                <span className="text-red-400 mt-0.5 shrink-0">•</span>
                {b}
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Отмена</Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function SettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);

  // Action state
  const [isExporting, setIsExporting]       = useState(false);
  const [icalCopied, setIcalCopied]         = useState(false);
  const [isResetting, setIsResetting]       = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm]   = useState("");
  const [isDeleting, setIsDeleting]         = useState(false);

  useEffect(() => {
    async function load() {
      if (authLoading) return;
      try {
        if (user?.uid) {
          const [c, s] = await Promise.all([getUserConfig(user.uid), getStudents(user.uid)]);
          setConfig(c || {});
          setStudents((s || []).filter(st => !st.isArchived));
          if (c?.theme) {
            document.documentElement.setAttribute("data-theme", c.theme);
            localStorage.setItem("tochilka_theme", c.theme);
          }
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
    if (user?.uid) await updateUserConfig(user.uid, { [key]: value });
    if (key === "theme") {
      document.documentElement.setAttribute("data-theme", value);
      localStorage.setItem("tochilka_theme", value);
    }
  }, [config, user]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const [studs, lessons, payments] = await Promise.all([
        getStudents(user.uid),
        getLessons({ tutorId: user.uid }),
        getPayments({ tutorId: user.uid }),
      ]);
      const rows = [
        "Тип,ID,Имя/Описание,Дата/Время,Сумма",
        ...studs.map(s  => `Ученик,${s.id},${s.name},,${s.balance}`),
        ...lessons.map(l => `Урок,${l.id},${l.subjectName},${l.date} ${l.startTime},${l.price}`),
        ...payments.map(p => `Платёж,${p.id},${p.studentName},${p.date},${p.amount}`),
      ];
      const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `tochilka_export_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export failed", e);
    }
    setIsExporting(false);
  };

  const handleCopyICal = async () => {
    const url = `https://api.tochilka.app/ical/${user?.uid}/export.ics`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback for non-secure contexts
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity  = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setIcalCopied(true);
    setTimeout(() => setIcalCopied(false), 2000);
  };

  const handleResetConfirm = async () => {
    setIsResetting(true);
    try {
      await clearAllTutorData(user.uid);
      window.location.reload();
    } catch (e) {
      console.error("Reset failed", e);
      setIsResetting(false);
      setResetModalOpen(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "УДАЛИТЬ") return;
    setIsDeleting(true);
    try {
      await clearAllTutorData(user.uid);
      await signOut(auth);
    } catch (e) {
      console.error("Delete account failed", e);
      setIsDeleting(false);
    }
  };

  if (loading || !config) {
    return (
      <PageWrapper>
        <div className="flex justify-center items-center h-64 text-stone-400">
          <Loader2 size={24} className="animate-spin" />
        </div>
      </PageWrapper>
    );
  }

  const icalUrl = `https://api.tochilka.app/ical/${user?.uid}/export.ics`;
  const currency = config.currency || "RUB";
  const currencySymbol = { RUB: "₽", USD: "$", EUR: "€", BYN: "Br", KZT: "₸" }[currency] || currency;

  return (
    <PageWrapper
      title="Настройки"
      subtitle="Основные настройки аккаунта"
      icon={SettingsIcon}
      iconBgClass="bg-[#636B74]/10"
      iconTextClass="text-[#636B74]"
    >
      {/* Confirm modal: reset data */}
      <ConfirmModal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        onConfirm={handleResetConfirm}
        isLoading={isResetting}
        title="Сброс данных"
        description="Это действие необратимо удалит:"
        bullets={["Всех учеников", "Все уроки и расписание", "Все финансовые записи", "Все программы"]}
        confirmLabel="Очистить всё"
      />

      {/* ── Bento Grid ── */}
      <div className="max-w-[1400px] mx-auto pb-12">
        {/*
          Desktop grid (≥1024px): 4 columns
          Row 1: Profile (col 1–2) | Schedule (col 3–4)
          Row 2: Account (col 1–2) | Lesson defaults (col 3) | Export (col 4)
          Row 3: Notifications (col 1–2) | Danger (col 3–4)
        */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">

          {/* ① ПРОФИЛЬ */}
          <Card className="lg:col-span-2 h-full">
            <SectionHeader icon={User} title="Профиль" description="Ваши данные для учеников и клиентов" />

            {/* Name + contacts row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <SaveOnBlurInput
                label="Имя репетитора"
                value={config.displayName || user?.displayName || ""}
                onSave={v => updateConfig("displayName", v)}
                placeholder="Как вас называют ученики"
              />
              <SaveOnBlurInput
                label="Телефон"
                value={config.phone || ""}
                onSave={v => updateConfig("phone", v)}
                placeholder="+7 (999) 000-00-00"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <SaveOnBlurInput
                label="Telegram"
                value={config.telegram || ""}
                onSave={v => updateConfig("telegram", v)}
                placeholder="@username"
              />
              <div className="space-y-1">
                <label className="text-sm font-medium text-stone-700 ml-1 block">Email аккаунта</label>
                <Input value={user?.email || ""} disabled className="bg-stone-50 text-stone-500" />
              </div>
            </div>

            {/* Subjects */}
            <div className="mb-4">
              <label className="text-sm font-medium text-stone-700 ml-1 block mb-1">Предметы</label>
              <TagsInput
                value={config.subjects || []}
                onChange={v => updateConfig("subjects", v)}
                placeholder="Добавьте предмет и нажмите Enter"
                helperText="Введите предмет и нажмите Enter или запятую"
              />
            </div>

            {/* Тема оформления */}
            <div className="pt-4 border-t border-stone-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-stone-800 flex items-center gap-2">
                    <Palette size={14} className="text-stone-500" /> Тема оформления
                  </p>
                  <p className="text-xs text-stone-400 mt-0.5">Внешний вид интерфейса</p>
                </div>
                <ThemePicker value={config.theme} onChange={v => updateConfig("theme", v)} />
              </div>
            </div>
          </Card>

          {/* ② РАБОЧЕЕ РАСПИСАНИЕ */}
          <Card className="lg:col-span-2 h-full">
            <SectionHeader icon={Globe} title="Ваше время и расписание" description="Часовой пояс, валюта, рабочие часы" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <TimezoneCombobox
                value={config.timezone}
                onChange={v => updateConfig("timezone", v)}
              />
              <div className="space-y-1">
                <label className="text-sm font-medium text-stone-700 ml-1 block">Валюта</label>
                <select
                  value={config.currency}
                  onChange={e => updateConfig("currency", e.target.value)}
                  className="w-full h-11 bg-white border border-stone-200 rounded-xl px-4 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-300"
                >
                  <option value="RUB">₽ Рубль</option>
                  <option value="BYN">Br Белорусский рубль</option>
                  <option value="USD">$ Доллар</option>
                  <option value="EUR">€ Евро</option>
                  <option value="KZT">₸ Тенге</option>
                </select>
              </div>
            </div>

            <WorkingHoursSettings
              value={config.workingHours}
              onSave={v => updateConfig("workingHours", v)}
            />
          </Card>

          {/* ③ АККАУНТ */}
          <Card className="lg:col-span-2 h-full">
            <SectionHeader
              icon={BookOpen}
              title="Аккаунт"
              description="Реквизиты и управление сессией"
              action={
                <button
                  onClick={() => signOut(auth)}
                  className="flex items-center gap-1.5 text-xs font-medium text-stone-400 hover:text-stone-700 transition-colors"
                >
                  <LogOut size={13} />
                  Выйти
                </button>
              }
            />

            <SaveOnBlurInput
              label="Шаблон реквизитов"
              multiline
              value={config.requisites}
              onSave={v => updateConfig("requisites", v)}
              placeholder={"Сбербанк: 0000 0000 0000 0000 (Иван И.)\nПодпись в сообщении ученику"}
              className="min-h-[80px]"
            />
          </Card>

          {/* ④ НАСТРОЙКИ УРОКА */}
          <Card className="lg:col-span-1 h-full">
            <SectionHeader icon={Clock} title="Урок" description="Значения по умолчанию" />

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-stone-700 ml-1 block mb-2">Длительность</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[40, 45, 60, 90].map(min => {
                    const active = (config.defaultDuration ?? 60) === min;
                    return (
                      <button
                        key={min}
                        onClick={() => updateConfig("defaultDuration", min)}
                        className={`py-2 rounded-xl text-sm font-medium border transition-all
                          ${active
                            ? "bg-stone-900 text-white border-stone-900"
                            : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"
                          }`}
                      >
                        {min}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-stone-400 mt-1.5 ml-1">минут</p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-stone-700 ml-1 block">
                  Стоимость урока
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    value={config.defaultPrice ?? ""}
                    onChange={e => updateConfig("defaultPrice", Number(e.target.value))}
                    placeholder="1500"
                    className="bg-white pr-10"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-stone-400 font-medium pointer-events-none">
                    {currencySymbol}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* ⑤ ЭКСПОРТ И СИНХРОНИЗАЦИЯ */}
          <Card className="lg:col-span-1 h-full">
            <SectionHeader icon={Database} title="Экспорт" description="Ваши данные" />

            <div className="space-y-3">
              {/* CSV */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                <p className="text-sm font-semibold text-stone-800">База данных</p>
                <p className="text-xs text-stone-500 mt-0.5 mb-3">Ученики, уроки и платежи</p>
                <Button variant="secondary" onClick={handleExport} disabled={isExporting} className="w-full justify-center">
                  {isExporting ? <Loader2 size={15} className="animate-spin mr-2" /> : <Download size={15} className="mr-2" />}
                  Скачать CSV
                </Button>
              </div>

              {/* iCal */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                <p className="text-sm font-semibold text-stone-800">Расписание в календарь</p>
                <p className="text-xs text-stone-500 mt-0.5 mb-2">Google / Apple Calendar</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={icalUrl}
                    className="flex-1 min-w-0 text-xs bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-stone-500 font-mono truncate"
                  />
                  <button
                    onClick={handleCopyICal}
                    className={`shrink-0 w-9 h-9 flex items-center justify-center rounded-lg border transition-colors
                      ${icalCopied
                        ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                        : "bg-white border-stone-200 text-stone-500 hover:border-stone-400"
                      }`}
                  >
                    {icalCopied ? <Check size={15} /> : <LinkIcon size={15} />}
                  </button>
                </div>
              </div>
            </div>
          </Card>

          {/* ⑥ УВЕДОМЛЕНИЯ */}
          <Card className="lg:col-span-2 h-full">
            <SectionHeader icon={Bell} title="Уведомления" description="Авторассылки через Telegram из карточки ученика" />
            <NotificationsSettings
              value={config.notifications}
              onSave={v => updateConfig("notifications", v)}
              students={students}
            />
          </Card>

          {/* ⑦ КРИТИЧЕСКИЕ ДЕЙСТВИЯ */}
          <Card className="lg:col-span-2 border-red-100 bg-red-50/30">
            <SectionHeader icon={AlertTriangle} title="Критические действия" description="Очистка данных и удаление профиля" danger />

            <div className="space-y-4">
              {/* Reset */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-red-100">
                <div>
                  <p className="text-sm font-bold text-red-900">Сброс данных профиля</p>
                  <p className="text-xs text-red-600/80 mt-0.5">Удаляет учеников, уроки и финансы. Аккаунт остаётся.</p>
                </div>
                <Button
                  variant="secondary"
                  className="border-red-200 text-red-600 hover:bg-red-50 shrink-0"
                  onClick={() => setResetModalOpen(true)}
                  disabled={isResetting}
                >
                  <Trash2 size={15} className="mr-2" />
                  Очистить данные
                </Button>
              </div>

              {/* Delete account */}
              <div>
                <p className="text-sm font-bold text-red-900 mb-1">Удаление профиля</p>
                <p className="text-xs text-red-600/80 mb-3">
                  Это действие навсегда удалит ваш аккаунт. Отменить невозможно.
                </p>
                <div className="flex gap-2 max-w-xs">
                  <Input
                    placeholder="Впишите УДАЛИТЬ"
                    value={deleteConfirm}
                    onChange={e => setDeleteConfirm(e.target.value)}
                    className="bg-white border-red-200 focus:ring-red-100"
                  />
                  <Button
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirm !== "УДАЛИТЬ" || isDeleting}
                    className="shrink-0 bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700 disabled:opacity-40"
                  >
                    {isDeleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                  </Button>
                </div>
              </div>
            </div>
          </Card>

        </div>
      </div>
    </PageWrapper>
  );
}
