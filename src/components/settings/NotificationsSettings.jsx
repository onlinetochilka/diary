import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Check, AlertCircle, BookCheck, BarChart3, Users, UserCheck } from 'lucide-react';
import Switch from '../ui/Switch.jsx';
import Select from '../ui/Select.jsx';

const LABEL_CLS = "block text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-1.5";

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

export function NotificationsSettings({ value, onSave, students = [] }) {
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
                <Switch checked={section.enabled} onChange={v => update(key, "enabled", v)} accent={cfg.accent} />
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
