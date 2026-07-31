import React, { useState } from "react";
import { getPlural } from "../utils/plural.js";
import { PageWrapper } from "../components/layout/PageWrapper.jsx";
import { Card, Button, Tooltip } from "../components/ui/index.js";
import {
  LayoutDashboard, Users, TrendingUp, Clock, BookOpen,
  Plus, Coffee, AlertCircle, CheckCircle2, PlayCircle,
  Send, Wallet, Bell, Check, ChevronDown, ChevronUp, Settings2,
  Smile, CheckCheck
} from "lucide-react";
import { getLessons, getStudents, getPayments, updateLesson, addPayment, getUserConfig, updateUserConfig } from "../services/database.js";
import { getEntityStyle, getEntityColorClasses } from "../utils/colors.js";
import ActionItemModal from "../components/dashboard/ActionItemModal.jsx";
import ActionItemCard from "../components/dashboard/ActionItemCard.jsx";
import CommunityNewsCard, { TelegramIcon } from "../components/dashboard/CommunityNewsCard.jsx";
import MetricsSettingsModal from "../components/dashboard/MetricsSettingsModal.jsx";
import { useDashboardData } from "../hooks/useDashboardData.js";


export default function DashboardPage({ onNavigate }) {
  const {
    loading, todayLessons, actionItems, stats,
    metricsConfig, setMetricsConfig, refresh,
  } = useDashboardData();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [actionModal, setActionModal]       = useState({ isOpen: false, item: null, mode: "remind" });

  const now = new Date();
  const monthNames = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  const monthNamesPrep = ["январе", "феврале", "марте", "апреле", "мае", "июне", "июле", "августе", "сентябре", "октябре", "ноябре", "декабре"];
  const dayNames = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
  const dateStr = `${now.getDate()} ${monthNames[now.getMonth()]}`;
  const dayStr = dayNames[now.getDay()].charAt(0).toUpperCase() + dayNames[now.getDay()].slice(1);

  const formatNum = (num) => typeof num === "number" ? Math.round(num) : num;
  const formatMoney = (num) => typeof num === "number" ? `${Math.round(num).toLocaleString("ru-RU")} ₽` : num;

  const METRICS_DISPLAY = {
    todayCount: { label: getPlural(stats.todayCount, ["Урок сегодня", "Урока сегодня", "Уроков сегодня"]), value: stats.todayCount, color: "bg-gradient-to-br from-blue-500 to-indigo-500", nav: "schedule" },
    lessonsWeek: { label: getPlural(stats.lessonsWeek, ["Урок", "Урока", "Уроков"]) + " на этой неделе", value: stats.lessonsWeek, color: "bg-gradient-to-br from-indigo-400 to-purple-500", nav: "schedule" },
    lessonsLeftWeek: { label: "Осталось " + getPlural(stats.lessonsLeftWeek, ["урок", "урока", "уроков"]) + " на этой неделе", value: stats.lessonsLeftWeek, color: "bg-gradient-to-br from-cyan-500 to-blue-500", nav: "schedule" },
    lessonsMonth: { label: getPlural(stats.lessonsMonth, ["Урок", "Урока", "Уроков"]) + " в этом месяце", value: stats.lessonsMonth, color: "bg-gradient-to-br from-indigo-400 to-purple-500", nav: "schedule" },
    lessonsLeftMonth: { label: "Уроков до конца месяца", value: stats.lessonsLeftMonth, color: "bg-gradient-to-br from-cyan-500 to-blue-500", nav: "schedule" },
    freeSlotsWeek: { label: "Свободные окна на неделе", value: stats.freeSlotsWeek || 0, color: "bg-gradient-to-br from-emerald-400 to-teal-500", nav: "schedule" },
    hoursWorkedThisMonth: { label: "Отработано часов за месяц", value: formatNum(stats.hoursWorkedThisMonth), color: "bg-gradient-to-br from-sky-400 to-cyan-500", nav: "schedule" },
    hoursLeftWeek: { label: "Часов до конца недели", value: formatNum(stats.hoursLeftWeek), color: "bg-gradient-to-br from-teal-400 to-emerald-500", nav: "schedule" },
    hoursLeftMonth: { label: "Часов до конца месяца", value: formatNum(stats.hoursLeftMonth), color: "bg-gradient-to-br from-teal-400 to-emerald-500", nav: "schedule" },
    cancelledMonth: { label: getPlural(stats.cancelledMonth, ["Отмена", "Отмены", "Отмен"]) + " за месяц", value: stats.cancelledMonth, color: "bg-gradient-to-br from-rose-400 to-red-500", nav: "schedule" },
    rescheduledMonth: { label: "Переносов за месяц", value: stats.rescheduledMonth || 0, color: "bg-gradient-to-br from-orange-400 to-amber-500", nav: "schedule" },
    incomeMonth: { label: `Доход в ${monthNamesPrep[now.getMonth()]}`, value: formatMoney(stats.incomeMonth), color: "bg-gradient-to-br from-emerald-500 to-teal-400", nav: "finance" },
    expectedIncomeMonth: { label: "Ожидаемый доход за месяц", value: formatMoney(stats.expectedIncomeMonth), color: "bg-gradient-to-br from-teal-400 to-emerald-500", nav: "schedule" },
    totalDebt: { label: "Задолженность", value: formatMoney(stats.totalDebt), color: "bg-gradient-to-br from-red-500 to-rose-600", nav: "finance" },
    totalAdvances: { label: "Авансы", value: formatMoney(stats.totalAdvances), color: "bg-gradient-to-br from-emerald-400 to-cyan-500", nav: "finance" },
    averageReceipt: { label: "Средний чек", value: formatMoney(stats.averageReceipt), color: "bg-gradient-to-br from-amber-400 to-orange-500", nav: "finance" },
    unpaidLessons: { label: "Неоплаченные занятия", value: `${stats.unpaidLessons || 0} шт`, color: "bg-gradient-to-br from-rose-500 to-pink-600", nav: "finance" },
    activeStudentsCount: { label: getPlural(stats.activeStudentsCount, ["Активный ученик", "Активных ученика", "Активных учеников"]), value: stats.activeStudentsCount, color: "bg-gradient-to-br from-violet-400 to-purple-500", nav: "students" },
    newStudentsMonth: { label: getPlural(stats.newStudentsMonth, ["Новый ученик", "Новых ученика", "Новых учеников"]), value: stats.newStudentsMonth, color: "bg-gradient-to-br from-fuchsia-400 to-pink-500", nav: "students" }
  };

  const handleSaveMetrics = async (newMetrics) => {
    setMetricsConfig(newMetrics);
    setIsSettingsOpen(false);
    await updateUserConfig(null, { dashboardMetrics: newMetrics });
  };

  return (
    <PageWrapper
      title={dateStr}
      subtitle={dayStr}
      icon={LayoutDashboard}
      iconBgClass="bg-[#3B5266]/10"
      iconTextClass="text-[#3B5266]"
      maxWidth="max-w-[1400px]"
      noGlobalScroll={true}
      actionRight={
        <Tooltip text="Настроить метрики" position="bottom-right">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200 hover:bg-stone-50 active:scale-95 transition-all text-stone-500 hover:text-stone-700 outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Settings2 size={20} />
          </button>
        </Tooltip>
      }
    >
      {/* ── Stat cards (навигационная панель) ─────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 shrink-0">
        {metricsConfig.map((metricId, i) => {
          const config = METRICS_DISPLAY[metricId];
          if (!config) return null;
          return (
            <button
              key={i}
              onClick={() => onNavigate(config.nav)}
              type="button"
              className="group animate-scale-in flex flex-col items-start justify-center p-5 rounded-[24px] border border-stone-100 bg-white shadow-sm hover:shadow-md card-hover-lift active:scale-[0.98] transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer select-none overflow-hidden"
            >
              <p className="text-[28px] leading-tight font-bold mb-1 transition-transform duration-200 group-hover:scale-[1.02] text-stone-900 truncate w-full text-left">
                {loading ? "..." : config.value}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-left text-stone-400 truncate w-full">{loading ? "Загрузка..." : config.label}</p>
            </button>
          );
        })}
      </div>

      {/* ── Расписание на сегодня (full width) ───────────────────────────── */}
      <section className="shrink-0 bg-white p-5 sm:p-6 rounded-[32px] shadow-sm border border-stone-100">
        <div className="flex items-center gap-2 mb-5">
          <Clock size={20} className="text-stone-400" />
          <h2 className="text-lg font-bold text-stone-800">Расписание на сегодня</h2>
        </div>

        {loading ? (
          <div className="h-20 bg-stone-100 rounded-2xl animate-pulse" />
        ) : todayLessons.filter(l => l.status !== "conducted").length === 0 ? (
          <div className="flex items-center gap-4 py-3 px-5 bg-amber-50/50 border border-amber-100/60 rounded-2xl shadow-sm">
            <div className="h-10 w-10 shrink-0 bg-amber-100 flex items-center justify-center rounded-full text-amber-600 shadow-sm">
              <Smile size={20} strokeWidth={1.5} />
            </div>
            <span className="text-sm font-semibold text-amber-900">Отличная работа! На сегодня уроков больше нет — можно отдохнуть</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {todayLessons.filter(l => l.status !== "conducted").map((l) => {
              const c = getEntityColorClasses();
              return (
                <div
                  key={l.id}
                  className="entity-light-bg ring-1 ring-slate-200 border-l-[4px] entity-border-l shadow-sm p-3 rounded-xl flex items-center gap-3 transition-all duration-300 hover:shadow-md cursor-pointer group card-hover-lift"
                  style={getEntityStyle(l.displayName)}
                  onClick={() => onNavigate("schedule")}
                >
                  <div className="min-w-0 flex-1 pl-1">
                    <p className="text-sm font-semibold text-stone-900 truncate transition-colors">
                      {l.displayName}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-semibold bg-white/80 text-stone-700 px-2 py-0.5 rounded-md tabular-nums">{l.startTime} — {l.endTime}</span>
                      <span className="text-[12px] font-medium text-stone-500 truncate">{l.subjectName}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Асимметричная сетка ───────────────────────────────────
            Левая колонка: список «Рабочие моменты»
            Правая колонка: «На острие пера» — sticky при скролле
      ─────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0 pb-4 lg:pb-0">

        {/* LEFT COLUMN — Action Items */}
        <section className="lg:col-span-2 flex flex-col bg-white p-4 sm:p-5 rounded-[28px] shadow-sm border border-stone-100 h-fit max-h-full self-start w-full min-h-0 relative">
          <div className="flex items-center gap-2 mb-5 shrink-0">
            <AlertCircle size={20} className="text-stone-400" />
            <h2 className="text-lg font-bold text-stone-800">Что нужно проконтролировать</h2>
            {!loading && actionItems.length > 0 && (
              <span className="ml-auto text-xs font-bold text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full tabular-nums">
                {actionItems.length}
              </span>
            )}
          </div>

          {loading ? (
            /* Skeleton for action items list */
            <div className="flex flex-col gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-ivory shadow-neu-sm rounded-2xl p-4 space-y-3">
                  <div className="skeleton-line w-2/5" style={{ animationDelay: `${i * 0.1}s` }} />
                  <div className="skeleton-line-sm w-3/5" style={{ animationDelay: `${i * 0.15}s` }} />
                </div>
              ))}
            </div>
          ) : actionItems.length === 0 ? (
            <div className="flex items-center gap-4 py-3 px-5 bg-emerald-50/50 border border-emerald-100/60 rounded-2xl shadow-sm shrink-0 mt-2">
              <div className="h-10 w-10 shrink-0 bg-emerald-100 flex items-center justify-center rounded-full text-emerald-600 shadow-sm">
                <CheckCheck size={20} strokeWidth={1.5} />
              </div>
              <span className="text-sm font-semibold text-emerald-900">Идеальный баланс! Ученики всё оплатили, а домашние задания сданы</span>
            </div>
          ) : (
            /* Single-column list with internal scroll */
            <>
              <div className="flex flex-col gap-3 relative z-0 flex-1 min-h-0 overflow-y-auto hide-scrollbar pb-6">
                {actionItems.map(item => (
                  <ActionItemCard
                    key={item.id}
                    item={item}
                    onMarkDone={(item) => setActionModal({ isOpen: true, item, mode: "mark_done" })}
                  />
                ))}
              </div>
              {/* Bottom scroll shadow cue */}
              {actionItems.length > 3 && (
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none rounded-b-[28px] z-10" />
              )}
            </>
          )}
        </section>

        {/* RIGHT COLUMN — Community News (sticky) */}
        <aside className="lg:col-span-1 flex flex-col min-h-0 overflow-y-auto hide-scrollbar">
          <div className="flex items-center gap-2 mb-5">
            <TelegramIcon size={20} className="text-[#1B4F72]" />
            <h2 className="text-lg font-bold text-stone-800">Лайфхаки от «Точилки»</h2>
          </div>
          <CommunityNewsCard />
        </aside>
      </div>

      {/* ── Action Item Modal ─────────────────────────────────────────────── */}
      <ActionItemModal
        isOpen={actionModal.isOpen}
        onClose={() => setActionModal({ isOpen: false, item: null, mode: "remind" })}
        item={actionModal.item}
        mode={actionModal.mode}
        onConfirm={async (item, selectedLessons, note) => {
          if (item.type === 'hw') {
            const updates = [];
            if (item.count === 1 && item.lessons) {
              const l = item.lessons[0];
              updates.push(updateLesson(l.id, { hwDoneBy: [...(l.hwDoneBy || []), item.student.id] }));
            } else if (item.lessons && selectedLessons) {
              Object.entries(selectedLessons).forEach(([lId, isSelected]) => {
                if (isSelected) {
                  const l = item.lessons.find(x => x.id === lId);
                  if (l) updates.push(updateLesson(l.id, { hwDoneBy: [...(l.hwDoneBy || []), item.student.id] }));
                }
              });
            }
            await Promise.all(updates);
          } else if (item.type === 'money') {
            await addPayment({
              studentId: item.student.id,
              studentName: item.student.name,
              amount: item.amount,
              paidAt: new Date().toISOString(),
              note: note || "Оплата по долгу"
            });
          }
          refresh();
        }}
      />

      <MetricsSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialMetrics={metricsConfig}
        onSave={handleSaveMetrics}
      />
    </PageWrapper>
  );
}
