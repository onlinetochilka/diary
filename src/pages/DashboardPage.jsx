import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getPlural } from "../utils/plural.js";
import { WidgetErrorBoundary } from "../components/ui/WidgetErrorBoundary.jsx";
import QuickStatusModal from "../components/schedule/QuickStatusModal.jsx";
import LitePaymentModal from "../components/finance/LitePaymentModal.jsx";
import { renderStatusIcon } from "../components/schedule/scheduleUtils.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { PageWrapper } from "../components/layout/PageWrapper.jsx";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import Tooltip from "../components/ui/Tooltip.jsx";
import { DashboardLessonSkeleton, ActionItemSkeleton } from "../components/ui/Skeletons.jsx";
import {
  LayoutDashboard, Users, TrendingUp, Clock, BookOpen,
  Plus, Coffee, AlertCircle, CheckCircle2, PlayCircle,
  Send, Wallet, Bell, Check, ChevronDown, ChevronUp, Settings2,
  Smile, CheckCheck, Search, Copy, Video, Phone, MessageCircle, X,
  UserPlus, CreditCard
} from "lucide-react";
import { getUserConfig, updateUserConfig } from "../services/database.js";
import { usePayments } from "../hooks/usePayments.js";
import { useLessons } from "../hooks/useLessons.js";
import { getEntityStyle, getEntityColorClasses } from "../utils/colors.js";
import ActionItemModal from "../components/dashboard/ActionItemModal.jsx";
import ActionItemCard from "../components/dashboard/ActionItemCard.jsx";
import CommunityNewsCard, { TelegramIcon } from "../components/dashboard/CommunityNewsCard.jsx";
import MetricsSettingsModal from "../components/dashboard/MetricsSettingsModal.jsx";
import { useDashboardData } from "../hooks/useDashboardData.js";
import { CurrentDateTitle, CurrentDateSubtitle } from "../components/dashboard/CurrentDateHeader.jsx";
import DayNotesPopover from "../components/schedule/DayNotesPopover.jsx";
import { useDayNotes } from "../hooks/useDayNotes.js";
import { ymd } from "../components/schedule/scheduleUtils.jsx";

export default function DashboardPage() {
  const { addPayment } = usePayments();
  const { updateLesson } = useLessons();
  const navigate = useNavigate();
  const location = useLocation();
  const onNavigate = (path, state) => navigate(`/${path}`, { state });
  const pageState = location.state;

  const {
    todayLessons = [], nextLessons = [], metrics = {}, loading,
    actionItems = [], tutorDebts = [], getMoneyText, getHwText,
    metricsConfig = [], setMetricsConfig, refresh, students = [],
    hwDebts = [], stats = {}
  } = useDashboardData();

  const todayStr = ymd(new Date());
  const { notesRecord } = useDayNotes(todayStr);
  const hasIncompleteNotes = notesRecord?.items?.some(i => !i.done);
  const [showNotes, setShowNotes] = useState(false);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [actionModal, setActionModal]       = useState({ isOpen: false, item: null, mode: "remind" });
  const [isProcessing, setIsProcessing]     = useState(false);
  const [quickModalLesson, setQuickModalLesson] = useState(null);
  const [showScheduleSummary, setShowScheduleSummary] = useState(false);
  const [scheduleSummaryText, setScheduleSummaryText] = useState("");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const { showToast } = useToast();

  const handlePaymentConfirm = async (studentId, amt) => {
    try {
      await addPayment({
        studentId,
        amount: amt,
        currency: "RUB",
        paidAt: new Date().toISOString(),
        note: 'Оплата занятий'
      });
      showToast({ message: "Оплата успешно добавлена", type: "success" });
      setPaymentModalOpen(false);
      refresh();
    } catch (e) {
      console.error(e);
      showToast({ message: "Ошибка при добавлении оплаты", type: "error" });
    }
  };

  const monthNamesPrep = ["январе", "феврале", "марте", "апреле", "мае", "июне", "июле", "августе", "сентябре", "октябре", "ноябре", "декабре"];
  const staticNow = new Date();

  const formatNum = (num) => typeof num === "number" ? Math.round(num) : num;
  const formatMoney = (num) => typeof num === "number" ? `${Math.round(num).toLocaleString("ru-RU")} ₽` : num;

  const METRICS_DISPLAY = {
    todayCount: { label: getPlural(stats.todayCount || 0, ["Урок сегодня", "Урока сегодня", "Уроков сегодня"]), value: stats.todayCount || 0, color: "bg-gradient-to-br from-blue-500 to-indigo-500", nav: "schedule" },
    lessonsWeek: { label: getPlural(stats.lessonsWeek || 0, ["Урок", "Урока", "Уроков"]) + " на этой неделе", value: stats.lessonsWeek || 0, color: "bg-gradient-to-br from-indigo-400 to-purple-500", nav: "schedule" },
    lessonsLeftWeek: { label: "Осталось " + getPlural(stats.lessonsLeftWeek || 0, ["урок", "урока", "уроков"]) + " на этой неделе", value: stats.lessonsLeftWeek || 0, color: "bg-gradient-to-br from-cyan-500 to-blue-500", nav: "schedule" },
    lessonsMonth: { label: getPlural(stats.lessonsMonth || 0, ["Урок", "Урока", "Уроков"]) + " в этом месяце", value: stats.lessonsMonth || 0, color: "bg-gradient-to-br from-indigo-400 to-purple-500", nav: "schedule" },
    lessonsLeftMonth: { label: "Уроков до конца месяца", value: stats.lessonsLeftMonth || 0, color: "bg-gradient-to-br from-cyan-500 to-blue-500", nav: "schedule" },
    freeSlotsWeek: { label: "Свободные окна на неделе", value: stats.freeSlotsWeek || 0, color: "bg-gradient-to-br from-emerald-400 to-teal-500", nav: "schedule" },
    hoursWorkedThisMonth: { label: "Отработано часов за месяц", value: formatNum(stats.hoursWorkedThisMonth || 0), color: "bg-gradient-to-br from-sky-400 to-cyan-500", nav: "schedule" },
    hoursLeftWeek: { label: "Часов до конца недели", value: formatNum(stats.hoursLeftWeek || 0), color: "bg-gradient-to-br from-teal-400 to-emerald-500", nav: "schedule" },
    hoursLeftMonth: { label: "Часов до конца месяца", value: formatNum(stats.hoursLeftMonth || 0), color: "bg-gradient-to-br from-teal-400 to-emerald-500", nav: "schedule" },
    cancelledMonth: { label: getPlural(stats.cancelledMonth || 0, ["Отмена", "Отмены", "Отмен"]) + " за месяц", value: stats.cancelledMonth || 0, color: "bg-gradient-to-br from-rose-400 to-red-500", nav: "schedule" },
    rescheduledMonth: { label: "Переносов за месяц", value: stats.rescheduledMonth || 0, color: "bg-gradient-to-br from-orange-400 to-amber-500", nav: "schedule" },
    incomeMonth: { label: `Доход в ${monthNamesPrep[staticNow.getMonth()]}`, value: formatMoney(stats.incomeMonth || 0), color: "bg-gradient-to-br from-emerald-500 to-teal-400", nav: "finance" },
    expectedIncomeMonth: { label: "Ожидаемый доход за месяц", value: formatMoney(stats.expectedIncomeMonth || 0), color: "bg-gradient-to-br from-teal-400 to-emerald-500", nav: "schedule" },
    totalDebt: { label: "Задолженность", value: formatMoney(stats.totalDebt || 0), color: "bg-gradient-to-br from-red-500 to-rose-600", nav: "finance" },
    totalAdvances: { label: "Авансы", value: formatMoney(stats.totalAdvances || 0), color: "bg-gradient-to-br from-emerald-400 to-cyan-500", nav: "finance" },
    averageReceipt: { label: "Средний чек", value: formatMoney(stats.averageReceipt || 0), color: "bg-gradient-to-br from-amber-400 to-orange-500", nav: "finance" },
    unpaidLessons: { label: "Неоплаченные занятия", value: `${stats.unpaidLessons || 0} шт`, color: "bg-gradient-to-br from-rose-500 to-pink-600", nav: "finance" },
    activeStudentsCount: { label: getPlural(stats.activeStudentsCount || 0, ["Активный ученик", "Активных ученика", "Активных учеников"]), value: stats.activeStudentsCount || 0, color: "bg-gradient-to-br from-violet-400 to-purple-500", nav: "students" },
    newStudentsMonth: { label: getPlural(stats.newStudentsMonth || 0, ["Новый ученик", "Новых ученика", "Новых учеников"]), value: stats.newStudentsMonth || 0, color: "bg-gradient-to-br from-fuchsia-400 to-pink-500", nav: "students" }
  };

  const handleSaveMetrics = async (newMetrics) => {
    setMetricsConfig(newMetrics);
    setIsSettingsOpen(false);
    await updateUserConfig(null, { dashboardMetrics: newMetrics });
  };

  const renderBadges = (l, isPaid, isPast, hwDebts) => (
    <div 
      className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
      onClick={(e) => { e.stopPropagation(); setQuickModalLesson(l); }}
    >
      {/* Financial Debt */}
      {isPaid ? (
        <Tooltip text="Оплачено" position="top">
          <span className="flex items-center justify-center px-1.5 h-5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold shadow-sm ring-1 ring-emerald-200/60">
            <Wallet size={9} strokeWidth={2.5} className="mr-0.5" />
          </span>
        </Tooltip>
      ) : (
        <Tooltip text="Не оплачено" position="top">
          <span className="flex items-center justify-center px-1.5 h-5 rounded-full bg-rose-50 text-rose-600 text-[10px] font-bold shadow-sm ring-1 ring-rose-200/60">
            <Wallet size={9} strokeWidth={2.5} className="mr-0.5" />
          </span>
        </Tooltip>
      )}
      
      {/* Homework Badge Logic */}
      {(() => {
        if (!isPast) {
          let hasDebt = false;
          if (l.type === 'individual') {
            hasDebt = hwDebts.some(d => d.student.id === l.studentId);
          } else if (l.type === 'group') {
            hasDebt = (l.groupStudentIds || []).some(sid => hwDebts.some(d => d.student.id === sid));
          }
          if (hasDebt) {
            return (
              <Tooltip text="Долг по ДЗ с прошлых уроков" position="top">
                <span className="flex items-center gap-0.5 px-1.5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold shadow-sm border-none">
                  <BookOpen size={9} strokeWidth={2.5} /> ДЗ
                </span>
              </Tooltip>
            );
          } else {
            return (
              <Tooltip text="Нет долгов по ДЗ" position="top">
                <span className="flex items-center gap-0.5 px-1.5 h-5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold shadow-sm ring-1 ring-emerald-200/60">
                  <BookOpen size={9} strokeWidth={2.5} /> ДЗ
                </span>
              </Tooltip>
            );
          }
        } else {
          const isHwAssigned = !!l.homework || (l.hwDoneBy && l.hwDoneBy.length > 0) || (l.hwStatuses && Object.keys(l.hwStatuses).length > 0);
          const isExplicitlyNotAssigned = l.hwAssigned === false || l.isHwNotAssigned === true;
          if (isHwAssigned) {
            const totalStudents = l.type === 'group' ? (l.groupStudentIds?.length || 0) : 1;
            const isDone = (l.hwDoneBy?.length || 0) >= totalStudents && totalStudents > 0;
            return (
              <Tooltip text={isDone ? "ДЗ выполнено" : "ДЗ задано"} position="top">
                <span className={`flex items-center gap-0.5 px-1.5 h-5 rounded-full text-[10px] font-bold shadow-sm ${isDone ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white'}`}>
                  <BookOpen size={9} strokeWidth={2.5} /> ДЗ
                </span>
              </Tooltip>
            );
          } else if (isExplicitlyNotAssigned) {
            return (
              <Tooltip text="ДЗ не задано" position="top">
                <span className="flex items-center gap-0.5 px-1.5 h-5 rounded-full bg-stone-50 text-stone-400 text-[10px] font-bold shadow-sm ring-1 ring-stone-200/60">
                  <BookOpen size={9} strokeWidth={2.5} />
                </span>
              </Tooltip>
            );
          } else if (l.status === 'conducted') {
            return (
              <Tooltip text="Не отмечено ДЗ" position="top">
                <span className="flex items-center gap-0.5 px-1.5 h-5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold shadow-sm ring-1 ring-amber-200">
                  <BookOpen size={9} strokeWidth={2.5} />
                </span>
              </Tooltip>
            );
          } else {
            return (
              <Tooltip text="Урок не состоялся" position="top">
                <span className="flex items-center gap-0.5 px-1.5 h-5 rounded-full bg-stone-50 text-stone-400 text-[10px] font-bold shadow-sm ring-1 ring-stone-200/60">
                  <BookOpen size={9} strokeWidth={2.5} />
                </span>
              </Tooltip>
            );
          }
        }
      })()}

      {/* Attendance */}
      {l.type === 'group' && (
        l.status === 'conducted' ? (
          <Tooltip text="Посещаемость" position="top">
            <span className={`flex items-center gap-0.5 px-1.5 h-5 rounded-full text-[10px] font-bold shadow-sm ${
              (Object.keys(l.attendance || {}).length >= (l.groupStudentIds?.length || 0) && (l.groupStudentIds?.length || 0) > 0) ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
            }`}>
              <Users size={9} strokeWidth={2.5} /> 
              {`${Object.keys(l.attendance || {}).length}/${l.groupStudentIds?.length || 0}`}
            </span>
          </Tooltip>
        ) : (
          <Tooltip text="Посещаемость (не отмечалась)" position="top">
            <span className="flex items-center gap-0.5 px-1.5 h-5 rounded-full bg-stone-50 text-stone-400 text-[10px] font-bold shadow-sm ring-1 ring-stone-200/60">
              <Users size={9} strokeWidth={2.5} /> 
              {`-/${l.groupStudentIds?.length || 0}`}
            </span>
          </Tooltip>
        )
      )}

      {/* Lesson Status */}
      {isPast && l.status === 'scheduled' ? (
        <Tooltip text="Урок прошел, отметьте статус" position="top">
          <span className="flex items-center gap-0.5 px-1.5 h-5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold shadow-sm ring-1 ring-amber-200">
            <AlertCircle size={9} strokeWidth={2.5} />
          </span>
        </Tooltip>
      ) : l.status === 'scheduled' ? (
        <Tooltip text="Запланирован" position="top">
          <span className="flex items-center gap-0.5 px-1.5 h-5 rounded-full bg-blue-50 text-blue-400 text-[10px] font-bold shadow-sm ring-1 ring-blue-100">
            <Clock size={9} strokeWidth={2.5} />
          </span>
        </Tooltip>
      ) : l.status === 'conducted' ? (
        <Tooltip text="Урок проведен" position="top">
          <span className="flex items-center gap-0.5 px-1.5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold shadow-sm border-none">
            <Check size={9} strokeWidth={2.5} />
          </span>
        </Tooltip>
      ) : (
        <Tooltip text="Урок отменен" position="top">
          <span className="flex items-center gap-0.5 px-1.5 h-5 rounded-full bg-stone-100 text-stone-400 text-[10px] font-bold shadow-sm ring-1 ring-stone-200/60">
            <X size={9} strokeWidth={2.5} />
          </span>
        </Tooltip>
      )}
    </div>
  );

  const renderContactButtons = (l) => (
    <div className="ml-auto flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      {(() => {
        const link = l.videoLink || (l.studentObj && (l.studentObj.subjects?.find(s => s.name === l.subjectName)?.videoLink || l.studentObj.videoLink)) || null;
        if (link) {
          return (
            <Tooltip text="Подключиться к уроку" position="top">
              <a href={link} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 transition-colors">
                <Video size={14} />
              </a>
            </Tooltip>
          );
        }
        return null;
      })()}
      
      {l.type === 'individual' && l.studentObj && (() => {
        const s = l.studentObj;
        let href = '';
        let Icon = MessageCircle;
        let color = 'text-stone-400 hover:bg-stone-50';
        
        if (s.telegram) {
          href = s.telegram.startsWith('+') || /^\d/.test(s.telegram) ? `tg://resolve?phone=${s.telegram.replace(/\D/g, '')}` : `tg://resolve?domain=${s.telegram.replace(/^@/, '')}`;
          Icon = Send;
          color = 'text-sky-500 hover:bg-sky-50';
        } else if (s.whatsapp) {
          href = `https://wa.me/${s.whatsapp.replace(/\D/g, '')}`;
          Icon = Phone;
          color = 'text-emerald-500 hover:bg-emerald-50';
        }
        
        if (href) {
          return (
            <Tooltip text="Написать ученику" position="top">
              <a href={href} target="_blank" rel="noopener noreferrer" className={`p-1.5 rounded-md transition-colors ${color}`}>
                <Icon size={14} />
              </a>
            </Tooltip>
          );
        }
        return null;
      })()}
    </div>
  );

  return (
    <PageWrapper
      title={<CurrentDateTitle />}
      subtitle={<CurrentDateSubtitle />}
      icon={LayoutDashboard}
      iconBgClass="bg-[#3B5266]/10"
      iconTextClass="text-[#3B5266]"
      maxWidth="max-w-[1400px]"
      noGlobalScroll={true}
      actionRight={
        <div className="flex items-center gap-2">
          <Tooltip text="Добавить ученика" position="bottom">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onNavigate("students", { action: "create" })}
              className="w-10 h-10 border-none flex items-center justify-center rounded-xl bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-100/50 hover:bg-blue-100 active:scale-95 transition-all p-0"
            >
              <UserPlus size={18} />
            </Button>
          </Tooltip>
          <Tooltip text="Отметить оплату" position="bottom">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPaymentModalOpen(true)}
              className="w-10 h-10 border-none flex items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shadow-sm ring-1 ring-emerald-100/50 hover:bg-emerald-100 active:scale-95 transition-all p-0"
            >
              <CreditCard size={18} />
            </Button>
          </Tooltip>
          <Tooltip text="Настроить статистику" position="bottom-right">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSettingsOpen(true)}
              className="w-10 h-10 border-none flex items-center justify-center rounded-xl bg-white text-stone-400 shadow-sm ring-1 ring-slate-200 hover:bg-stone-50 hover:text-stone-700 active:scale-95 transition-all p-0"
            >
              <Settings2 size={18} />
            </Button>
          </Tooltip>
        </div>
      }
    >
      <WidgetErrorBoundary className="shrink-0 w-full" onReset={() => refresh()}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 shrink-0">
          {metricsConfig.map((metricId, i) => {
            const config = METRICS_DISPLAY[metricId];
            if (!config) return null;
            return (
              <Button
                key={i}
                variant="ghost"
                onClick={() => onNavigate(config.nav)}
                className="group animate-scale-in flex flex-col items-start justify-center h-auto w-full p-5 rounded-[24px] border border-stone-100 bg-white shadow-sm hover:shadow-md hover:bg-white active:scale-[0.98] transition-all duration-300 cursor-pointer overflow-hidden font-normal"
              >
                <p className="text-[28px] leading-tight font-bold mb-1 transition-transform duration-200 group-hover:scale-[1.02] text-stone-900 truncate w-full text-left">
                  {loading ? "..." : config.value}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-left text-stone-400 truncate w-full">{loading ? "Загрузка..." : config.label}</p>
              </Button>
            );
          })}
        </div>
      </WidgetErrorBoundary>

      <WidgetErrorBoundary className="shrink-0 w-full" onReset={() => refresh()}>
        <section className="shrink-0 bg-white p-5 sm:p-6 rounded-[32px] shadow-sm border border-stone-100">
          <div className="flex items-center gap-2 mb-5">
            <Clock size={20} className="text-stone-400" />
            <h2 className="text-lg font-bold text-stone-800">Расписание на сегодня</h2>
            <div className="flex-1" />
            <Tooltip text="Добавить урок" position="bottom">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate("schedule", { view: 'week' })}
                className="w-8 h-8 p-0 flex items-center justify-center text-stone-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <Plus size={18} />
              </Button>
            </Tooltip>
            <Tooltip text="Скопировать расписание" position="bottom">
              {todayLessons.length > 0 && (
                <Button 
                    variant="ghost" size="icon" className="text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
                    onClick={() => {
                        const txt = todayLessons.map(l => `${l.startTime} ${l.displayName} (${l.subjectName})`).join('\n');
                        setScheduleSummaryText(txt);
                        setShowScheduleSummary(true);
                    }}
                >
                    <Copy size={18} />
                </Button>
              )}
            </Tooltip>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <DashboardLessonSkeleton key={i} />)}
            </div>
          ) : todayLessons.length === 0 ? (
            <div className="flex items-center gap-4 py-3 px-5 bg-amber-50/50 border border-amber-100/60 rounded-2xl shadow-sm">
              <div className="h-10 w-10 shrink-0 bg-amber-100 flex items-center justify-center rounded-full text-amber-600 shadow-sm">
                <Smile size={20} strokeWidth={1.5} />
              </div>
              <span className="text-sm font-semibold text-amber-900">На сегодня уроков не запланировано — можно отдохнуть</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {todayLessons.map((l) => {
                const c = getEntityColorClasses();
                const isPastTime = l.endTime < new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                const isFaded = isPastTime || l.status === 'conducted' || l.status === 'cancelled' || l.status === 'skipped_free' || l.status === 'skipped_paid';
                const isPaid = l.type === 'individual' ? l.isPaid : false;
                
                return (
                  <div
                    key={l.id}
                    className={`entity-light-bg ring-1 ring-slate-200 border-l-[4px] entity-border-l shadow-sm p-3 rounded-xl flex items-center gap-3 transition-all duration-300 group ${isFaded ? 'opacity-60 grayscale-[0.2]' : ''}`}
                    style={getEntityStyle(l.displayName)}
                  >
                    <div className="min-w-0 flex-1 pl-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-stone-900 truncate transition-colors">
                          {l.displayName}
                        </p>
                        <div className="flex items-center gap-1">
                          {renderBadges(l, isPaid, isPastTime, hwDebts)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-semibold bg-white/80 text-stone-700 px-2 py-0.5 rounded-md tabular-nums">{l.startTime} — {l.endTime}</span>
                        <span className="text-[10px] font-semibold tracking-wider uppercase text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded flex-shrink-0 truncate max-w-[80px]">
                          {l.subjectName}
                        </span>
                        
                        {renderContactButtons(l)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </WidgetErrorBoundary>

      {/* ── Асимметричная сетка ───────────────────────────────────
            Левая колонка: список «Рабочие моменты»
            Правая колонка: «На острие пера» — sticky при скролле
      ─────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 lg:grid-rows-1 gap-6 flex-1 min-h-0 pb-4 lg:pb-0">

        {/* LEFT COLUMN — Action Items */}
        <WidgetErrorBoundary className="lg:col-span-1 w-full h-full flex flex-col min-h-0" onReset={() => refresh()}>
          <section className="flex flex-col bg-white p-4 sm:p-5 rounded-[28px] shadow-sm border border-stone-100 flex-1 w-full relative overflow-hidden min-h-0">
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
              <div className="space-y-4">
                {[1, 2, 3].map(i => <ActionItemSkeleton key={i} />)}
              </div>
            ) : actionItems.length === 0 ? (
              <div className="flex items-center gap-4 py-3 px-5 bg-emerald-50/50 border border-emerald-100/60 rounded-2xl shadow-sm shrink-0 mt-2">
                <div className="h-10 w-10 shrink-0 bg-emerald-100 flex items-center justify-center rounded-full text-emerald-600 shadow-sm">
                  <CheckCheck size={20} strokeWidth={1.5} />
                </div>
                <span className="text-sm font-semibold text-emerald-900">Идеальный баланс! Ученики всё оплатили, а домашние задания сданы</span>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3 relative z-0 flex-1 overflow-y-auto hide-scrollbar pb-6">
                  {actionItems.map(item => (
                    <ActionItemCard
                      key={item.id}
                      item={item}
                      onMarkDone={async (item, hwStatus) => {
                        if (hwStatus && item.type === 'hw' && item.count === 1 && item.lessons) {
                          if (isProcessing) return;
                          setIsProcessing(true);
                          try {
                            const l = item.lessons[0];
                            await updateLesson(l.id, { 
                              hwDoneBy: [...(l.hwDoneBy || []), item.student.id],
                              hwStatus: { ...(l.hwStatus || {}), [item.student.id]: hwStatus }
                            });
                            await refresh();
                          } finally {
                            setIsProcessing(false);
                          }
                        } else {
                          setActionModal({ isOpen: true, item, mode: "mark_done" });
                        }
                      }}
                      onNavigate={onNavigate}
                      setQuickModalLesson={setQuickModalLesson}
                    />
                  ))}
                </div>
                {actionItems.length > 3 && (
                  <div className="hidden lg:block absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none rounded-b-[28px] z-10" />
                )}
              </>
            )}
          </section>
        </WidgetErrorBoundary>

        {/* MIDDLE COLUMN — Tutor Debts */}
        <WidgetErrorBoundary className="lg:col-span-1 w-full h-full flex flex-col min-h-0" onReset={() => refresh()}>
          <section className="flex flex-col bg-white p-4 sm:p-5 rounded-[28px] shadow-sm border border-stone-100 flex-1 w-full relative overflow-hidden min-h-0">
            <div className="flex items-center gap-2 mb-5 shrink-0">
              <CheckCircle2 size={20} className="text-stone-400" />
              <h2 className="text-lg font-bold text-stone-800">Что нужно сделать</h2>
              {/* Скрепка для заметок на сегодня */}
              <div 
                className="relative cursor-pointer opacity-40 hover:opacity-100 transition-opacity p-1 group ml-2"
                onClick={() => setShowNotes(true)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600 transition-colors">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
                {hasIncompleteNotes && (
                  <div className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-slate-600 border-2 border-white" />
                )}
              </div>
              {!loading && tutorDebts.length > 0 && (
                <span className="ml-auto text-xs font-bold text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full tabular-nums">
                  {tutorDebts.length}
                </span>
              )}
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <ActionItemSkeleton key={i} />)}
              </div>
            ) : tutorDebts.length === 0 ? (
              <div className="flex items-center gap-4 py-3 px-5 bg-sky-50/50 border border-sky-100/60 rounded-2xl shadow-sm h-full justify-center">
                <div className="h-10 w-10 shrink-0 bg-sky-100 flex items-center justify-center rounded-full text-sky-600 shadow-sm">
                  <Coffee size={20} strokeWidth={1.5} />
                </div>
                <span className="text-sm font-semibold text-sky-900">Чисто! Вы всё успели — можно выдохнуть</span>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3 overflow-y-auto hide-scrollbar pb-6 flex-1 relative z-0">
                  {tutorDebts.map(item => {
                    const style = getEntityStyle(item.lesson.displayName);
                    return (
                      <div 
                        key={`${item.type}-${item.lesson.id}`} 
                        className="entity-light-bg ring-1 ring-slate-200 border-l-[4px] entity-border-l shadow-sm p-3 rounded-[20px] flex items-center justify-between gap-3 transition-all duration-300 hover:shadow-md group cursor-default"
                        style={style}
                      >
                        <div className="flex flex-col gap-1 min-w-0 pr-3">
                          <p className="text-sm font-semibold text-stone-900 truncate">
                            {item.lesson.displayName}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${item.type === 'unmarked_lesson' ? 'bg-white/80 text-amber-700 ring-1 ring-amber-200' : 'bg-white/80 text-blue-700 ring-1 ring-blue-200'}`}>
                              {item.type === 'unmarked_lesson' ? 'Не отмечен статус' : 'Не задано ДЗ'}
                            </span>
                            <span className="text-[11px] font-semibold text-stone-500 bg-white/60 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                              {(() => {
                                const lDate = new Date(item.lesson.date);
                                const today = new Date();
                                today.setHours(0,0,0,0);
                                const diffDays = Math.floor((today - lDate) / (1000 * 60 * 60 * 24));
                                if (diffDays === 0) return `Сегодня, ${item.lesson.startTime}`;
                                if (diffDays === 1) return `Вчера, ${item.lesson.startTime}`;
                                return `${item.lesson.date.slice(5).replace('-', '.')} ${item.lesson.startTime}`;
                              })()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Tooltip text="Отметить статус" position="top">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-9 h-9 flex items-center justify-center bg-white shadow-sm hover:bg-stone-50 active:scale-95 border-stone-200 p-0 text-emerald-500"
                              onClick={(e) => {
                                e.stopPropagation();
                                setQuickModalLesson(item.lesson);
                              }}
                            >
                              <Check size={16} />
                            </Button>
                          </Tooltip>
                          <Tooltip text="Детали урока" position="top">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-9 h-9 flex items-center justify-center bg-white shadow-sm hover:bg-stone-50 active:scale-95 border-stone-200 p-0 text-stone-400 hover:text-stone-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                onNavigate("schedule", { openInspectorLessonId: item.lesson.id, date: item.lesson.date, view: "day" });
                              }}
                            >
                              <Search size={16} />
                            </Button>
                          </Tooltip>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {tutorDebts.length > 3 && (
                  <div className="hidden lg:block absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none rounded-b-[28px] z-10" />
                )}
              </>
            )}
          </section>
        </WidgetErrorBoundary>

        <WidgetErrorBoundary className="lg:col-span-1 w-full h-full">
          <aside className="flex flex-col lg:min-h-0 lg:overflow-y-auto hide-scrollbar">
            <div className="flex items-center gap-2 mb-5">
              <TelegramIcon size={20} className="text-[#1B4F72]" />
              <h2 className="text-lg font-bold text-stone-800">Лайфхаки от «Точилки»</h2>
            </div>
            <CommunityNewsCard />
          </aside>
        </WidgetErrorBoundary>
      </div>

      {/* ── Action Item Modal ─────────────────────────────────────────────── */}
      <ActionItemModal
        isOpen={actionModal.isOpen}
        onClose={() => setActionModal({ isOpen: false, item: null, mode: "remind" })}
        item={actionModal.item}
        mode={actionModal.mode}
        isProcessing={isProcessing}
        onConfirm={async (item, selectedLessons, note) => {
          if (isProcessing) return;
          setIsProcessing(true);
          try {
            if (item.type === 'hw') {
              const updates = [];
              if (item.count === 1 && item.lessons) {
                const l = item.lessons[0];
                const status = selectedLessons || "on_time";
                updates.push(updateLesson(l.id, { 
                  hwDoneBy: [...(l.hwDoneBy || []), item.student.id],
                  hwStatus: { ...(l.hwStatus || {}), [item.student.id]: status }
                }));
              } else if (item.lessons && selectedLessons) {
                Object.entries(selectedLessons).forEach(([lId, status]) => {
                  if (status) {
                    const l = item.lessons.find(x => x.id === lId);
                    if (l) updates.push(updateLesson(l.id, { 
                      hwDoneBy: [...(l.hwDoneBy || []), item.student.id],
                      hwStatus: { ...(l.hwStatus || {}), [item.student.id]: status }
                    }));
                  }
                });
              }
              await Promise.all(updates);
            } else if (item.type === 'money') {
              const parsedAmount = parseInt(selectedLessons, 10);
              const validAmount = (!isNaN(parsedAmount) && parsedAmount > 0) ? parsedAmount : item.amount;
              await addPayment({
                studentId: item.student.id,
                studentName: item.student.name,
                amount: validAmount,
                paidAt: new Date().toISOString(),
                note: note || "Оплата по долгу"
              });
            }
            await refresh();
            setActionModal({ isOpen: false, item: null, mode: "remind" });
          } finally {
            setIsProcessing(false);
          }
        }}
      />

      <MetricsSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialMetrics={metricsConfig}
        onSave={handleSaveMetrics}
      />

      {showScheduleSummary && (
        <>
          <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 transition-opacity" onClick={() => setShowScheduleSummary(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-24px)] max-w-sm bg-white rounded-[28px] shadow-2xl z-50 overflow-hidden flex flex-col border border-stone-100">
            <div className="flex items-center justify-between p-5 border-b border-stone-100 bg-stone-50/50">
              <h3 className="font-bold text-lg text-stone-900">Расписание на сегодня</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowScheduleSummary(false)} className="w-8 h-8 p-1 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-200/50 border-none">
                <X size={20} />
              </Button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 font-medium leading-relaxed text-[15px] text-stone-700 whitespace-pre-wrap select-all">
                {scheduleSummaryText}
              </div>
              <Button 
                variant="filled" 
                className="w-full rounded-xl bg-academic-blue hover:bg-[#00516A] text-white shadow-md shadow-[#006584]/20 transition-all font-bold text-sm border-none flex items-center justify-center gap-2"
                onClick={() => {
                  navigator.clipboard.writeText(scheduleSummaryText);
                  showToast({ message: "Расписание скопировано в буфер обмена", type: "success" });
                  setShowScheduleSummary(false);
                }}
              >
                <Copy size={16} /> Скопировать текст
              </Button>
            </div>
          </div>
        </>
      )}

      {showNotes && (
        <DayNotesPopover 
          dateStr={todayStr}
          onClose={() => setShowNotes(false)}
        />
      )}

      <QuickStatusModal
        isOpen={!!quickModalLesson}
        onClose={() => setQuickModalLesson(null)}
        lesson={quickModalLesson}
        student={quickModalLesson?.studentObj}
        group={{ id: quickModalLesson?.groupId, balance: 0 }}
        students={[]}
        onOpenFullInspector={(lesson) => {
          setQuickModalLesson(null);
          onNavigate("schedule", { openInspectorLessonId: lesson.id, date: lesson.date, view: "day" });
        }}
      />

      <LitePaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        students={students}
        onConfirm={handlePaymentConfirm}
      />
    </PageWrapper>
  );
}
