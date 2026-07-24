import React, { useState, useEffect } from "react";
import { PageWrapper } from "../components/layout/PageWrapper.jsx";
import { Card, Button } from "../components/ui/index.js";
import {
  LayoutDashboard, Users, TrendingUp, Clock, BookOpen,
  Plus, Coffee, AlertCircle, CheckCircle2, PlayCircle,
  Send, Wallet, Bell, Check, ChevronDown, ChevronUp, Settings2
} from "lucide-react";
import { getLessons, getStudents, getPayments, updateLesson, addPayment, getUserConfig, updateUserConfig } from "../services/database.js";
import { getEntityStyle, getEntityColorClasses } from "../utils/colors.js";
import ActionItemModal from "../components/dashboard/ActionItemModal.jsx";
import ActionItemCard from "../components/dashboard/ActionItemCard.jsx";
import CommunityNewsCard, { TelegramIcon } from "../components/dashboard/CommunityNewsCard.jsx";
import MetricsSettingsModal from "../components/dashboard/MetricsSettingsModal.jsx";

const getPlural = (number, forms) => {
  const n = Math.abs(number) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return forms[2];
  if (n1 > 1 && n1 < 5) return forms[1];
  if (n1 === 1) return forms[0];
  return forms[2];
};

export default function DashboardPage({ onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [todayLessons, setTodayLessons] = useState([]);
  const [showConducted, setShowConducted] = useState(false);

  const [nextLesson, setNextLesson] = useState(null);
  const [nextLessonState, setNextLessonState] = useState("done"); // "upcoming" | "active" | "done"

  const [hwDebts, setHwDebts] = useState([]);
  const [moneyDebts, setMoneyDebts] = useState([]);
  const [actionItems, setActionItems] = useState([]);

  const [stats, setStats] = useState({
    todayCount: 0,
    lessonsWeek: 0,
    lessonsLeftWeek: 0,
    lessonsMonth: 0,
    lessonsLeftMonth: 0,
    hoursWorkedThisMonth: 0,
    hoursLeftWeek: 0,
    hoursLeftMonth: 0,
    cancelledMonth: 0,
    incomeMonth: 0,
    expectedIncomeMonth: 0,
    totalDebt: 0,
    totalAdvances: 0,
    averageReceipt: 0,
    activeStudentsCount: 0,
    newStudentsMonth: 0,
  });

  const [metricsConfig, setMetricsConfig] = useState(["todayCount", "activeStudentsCount", "hoursWorkedThisMonth", "incomeMonth"]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [actionModal, setActionModal] = useState({ isOpen: false, item: null, mode: "remind" });
  const [refreshKey, setRefreshKey] = useState(0);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(false);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    // Add a 10px threshold to account for decimal scaling issues
    setIsScrolledToBottom(scrollTop + clientHeight >= scrollHeight - 10);
  };

  useEffect(() => {
    async function fetchData() {
      const [allLessons, students, payments, userConfig] = await Promise.all([
        getLessons(),
        getStudents(),
        getPayments(),
        getUserConfig()
      ]);

      if (userConfig?.dashboardMetrics) {
        setMetricsConfig(userConfig.dashboardMetrics);
      }

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const currentTimeStr = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');

      // 1. Today's Lessons & Next Lesson
      const todayL = allLessons
        .filter(l => l.date === todayStr && l.status !== "cancelled" && l.status !== "skipped_free")
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

      const enrichedTodayL = todayL.map(l => {
        let name = "Неизвестно";
        let studentObj = null;
        if (l.type === "individual" && l.studentId) {
          const s = students.find(x => x.id === l.studentId);
          if (s) { name = s.name; studentObj = s; }
        } else if (l.type === "group" && l.groupId) {
          name = "Группа";
        }
        return { ...l, displayName: name, studentObj };
      });

      setTodayLessons(enrichedTodayL);

      let foundNext = null;
      let foundState = "done";
      for (const l of enrichedTodayL) {
        if (l.endTime > currentTimeStr && l.status !== "conducted") {
          foundNext = l;
          if (l.startTime <= currentTimeStr && l.endTime >= currentTimeStr) {
            foundState = "active";
          } else {
            foundState = "upcoming";
          }
          break;
        }
      }
      setNextLesson(foundNext);
      setNextLessonState(foundState);

      // 2. Homework Debts
      const hwMap = {};
      const pastHwLessons = allLessons.filter(l => {
        const hwText = typeof l.homework === 'string' ? l.homework : (l.homework?.text || "");
        return l.status === "conducted" && hwText.trim().length > 0;
      });

      pastHwLessons.forEach(l => {
        if (l.type === "individual" && l.studentId) {
          if (!l.hwDoneBy || !l.hwDoneBy.includes(l.studentId)) {
            if (!hwMap[l.studentId]) hwMap[l.studentId] = { count: 0, lessons: [] };
            hwMap[l.studentId].count += 1;
            hwMap[l.studentId].lessons.push(l);
          }
        }
      });

      const hwDebtsArr = Object.entries(hwMap)
        .map(([studentId, data]) => {
          const s = students.find(x => x.id === studentId);
          return { student: s, count: data.count, lessons: data.lessons };
        })
        .filter(x => x.student)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setHwDebts(hwDebtsArr);

      // 3. Money Debts
      const mDebts = students
        .filter(s => s.balance < 0)
        .sort((a, b) => a.balance - b.balance)
        .slice(0, 5);

      setMoneyDebts(mDebts);

      // 4. Action Items (Combined)
      const combined = [
        ...mDebts.map(s => {
          const debt = Math.abs(s.balance);
          const price = (s.subjects && s.subjects.length > 0 && s.subjects[0].price) ? s.subjects[0].price : 0;
          const count = price > 0 ? Math.ceil(debt / price) : 1;
          return {
            id: `money-${s.id}`,
            type: 'money',
            student: s,
            amount: debt,
            count: count,
            priority: debt
          };
        }),
        ...hwDebtsArr.map(item => ({
          id: `hw-${item.student.id}`,
          type: 'hw',
          student: item.student,
          count: item.count,
          lessons: item.lessons,
          priority: item.count * 1000
        }))
      ];
      combined.sort((a, b) => b.priority - a.priority);
      setActionItems(combined);

      // 5. Stats
      const monthStartStr = monthStart.toISOString().split('T')[0];
      const nextMonthStartStr = nextMonthStart.toISOString().split('T')[0];
      const currentDayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - currentDayOfWeek + 1);
      const weekStartStr = weekStart.toISOString().split('T')[0];
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      const weekEndStr = weekEnd.toISOString().split('T')[0];

      let lessonsMonth = 0, lessonsWeek = 0, lessonsLeftWeek = 0, lessonsLeftMonth = 0;
      let hoursWorkedThisMonth = 0, hoursLeftWeek = 0, hoursLeftMonth = 0;
      let cancelledMonth = 0, expectedIncomeMonth = 0;
      let totalConductedPrice = 0;

      const getDur = (l) => {
          if (!l.startTime || !l.endTime) return 0;
          const [h1, m1] = l.startTime.split(':').map(Number);
          const [h2, m2] = l.endTime.split(':').map(Number);
          const dur = (h2 + m2 / 60) - (h1 + m1 / 60);
          return dur > 0 ? dur : 0;
      };

      allLessons.forEach(l => {
          if (l.date >= monthStartStr && l.date < nextMonthStartStr) {
             const isConducted = l.status === "conducted" || l.status === "skipped_paid";
             const isCancelled = l.status === "cancelled" || l.status === "skipped_free";
             const isScheduled = l.status === "scheduled";
             const dur = getDur(l);
             
             if (isCancelled) cancelledMonth++;
             
             if (isConducted) {
                lessonsMonth++;
                hoursWorkedThisMonth += dur;
                totalConductedPrice += (Number(l.price) || 0);
             }
             if (isScheduled) {
                lessonsLeftMonth++;
                hoursLeftMonth += dur;
                expectedIncomeMonth += (Number(l.price) || 0);
             }
          }
          if (l.date >= weekStartStr && l.date < weekEndStr) {
             const isConducted = l.status === "conducted" || l.status === "skipped_paid";
             const isScheduled = l.status === "scheduled";
             const dur = getDur(l);
             if (isConducted || isScheduled) lessonsWeek++;
             if (isScheduled) {
                 lessonsLeftWeek++;
                 hoursLeftWeek += dur;
             }
          }
      });

      let newStudentsMonth = 0;
      students.forEach(s => {
         if (s.createdAt) {
           const ca = s.createdAt.toDate ? s.createdAt.toDate() : new Date(s.createdAt);
           if (ca >= monthStart) newStudentsMonth++;
         }
      });

      let totalDebt = 0;
      let totalAdvances = 0;
      students.forEach(s => {
         if (s.balance < 0) totalDebt += Math.abs(s.balance);
         if (s.balance > 0) totalAdvances += s.balance;
      });

      const incomeMonth = payments
        .filter(p => new Date(p.paidAt) >= monthStart && new Date(p.paidAt) < nextMonthStart)
        .reduce((sum, p) => sum + Number(p.amount), 0);

      const averageReceipt = lessonsMonth > 0 ? Math.round(totalConductedPrice / lessonsMonth) : 0;

      setStats({
        todayCount: todayL.length,
        lessonsWeek,
        lessonsLeftWeek,
        lessonsMonth,
        lessonsLeftMonth,
        hoursWorkedThisMonth,
        hoursLeftWeek,
        hoursLeftMonth,
        cancelledMonth,
        incomeMonth,
        expectedIncomeMonth,
        totalDebt,
        totalAdvances,
        averageReceipt,
        activeStudentsCount: students.length,
        newStudentsMonth
      });

      setLoading(false);
    }

    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [refreshKey]);

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
    lessonsLeftMonth: { label: "Осталось " + getPlural(stats.lessonsLeftMonth, ["урок", "урока", "уроков"]) + " в этом месяце", value: stats.lessonsLeftMonth, color: "bg-gradient-to-br from-cyan-500 to-blue-500", nav: "schedule" },
    hoursWorkedThisMonth: { label: getPlural(Math.round(stats.hoursWorkedThisMonth), ["Час", "Часа", "Часов"]) + " в этом месяце", value: formatNum(stats.hoursWorkedThisMonth), color: "bg-gradient-to-br from-sky-400 to-cyan-500", nav: "schedule" },
    hoursLeftWeek: { label: "Осталось " + getPlural(Math.round(stats.hoursLeftWeek), ["час", "часа", "часов"]) + " на этой неделе", value: formatNum(stats.hoursLeftWeek), color: "bg-gradient-to-br from-teal-400 to-emerald-500", nav: "schedule" },
    hoursLeftMonth: { label: "Осталось " + getPlural(Math.round(stats.hoursLeftMonth), ["час", "часа", "часов"]) + " в этом месяце", value: formatNum(stats.hoursLeftMonth), color: "bg-gradient-to-br from-teal-400 to-emerald-500", nav: "schedule" },
    cancelledMonth: { label: getPlural(stats.cancelledMonth, ["Отмена", "Отмены", "Отмен"]) + " за месяц", value: stats.cancelledMonth, color: "bg-gradient-to-br from-rose-400 to-red-500", nav: "schedule" },
    incomeMonth: { label: `Доход в ${monthNamesPrep[now.getMonth()]}`, value: formatMoney(stats.incomeMonth), color: "bg-gradient-to-br from-emerald-500 to-teal-400", nav: "finance" },
    expectedIncomeMonth: { label: "Ожидаемый доход", value: formatMoney(stats.expectedIncomeMonth), color: "bg-gradient-to-br from-teal-400 to-emerald-500", nav: "schedule" },
    totalDebt: { label: "Сумма долгов", value: formatMoney(stats.totalDebt), color: "bg-gradient-to-br from-red-500 to-rose-600", nav: "finance" },
    totalAdvances: { label: "Сумма авансов", value: formatMoney(stats.totalAdvances), color: "bg-gradient-to-br from-emerald-400 to-cyan-500", nav: "finance" },
    averageReceipt: { label: "Средний чек", value: formatMoney(stats.averageReceipt), color: "bg-gradient-to-br from-amber-400 to-orange-500", nav: "finance" },
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
      accentClass="text-stone-600"
      maxWidth="max-w-7xl"
      noGlobalScroll={true}
      actionRight={
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-ivory shadow-neu-sm hover:shadow-neu-md active:shadow-neu-sm-inset transition-all text-stone-400 hover:text-stone-600 outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          title="Настроить метрики"
        >
          <Settings2 size={20} />
        </button>
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
              className="group animate-scale-in flex flex-col items-center justify-center py-6 bg-ivory rounded-2xl shadow-neu-sm hover:shadow-neu-md active:shadow-neu-sm-inset transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer select-none"
            >
              <p className={`text-2xl sm:text-3xl font-black mb-1.5 transition-transform duration-200 group-active:scale-95 bg-clip-text text-transparent ${config.color}`}>
                {loading ? "..." : config.value}
              </p>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{loading ? "Загрузка..." : config.label}</p>
            </button>
          );
        })}
      </div>

      {/* ── Расписание на сегодня (full width) ───────────────────────────── */}
      <section className="shrink-0">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={20} className="text-stone-400" />
          <h2 className="text-lg font-bold text-stone-800">Расписание на сегодня</h2>
        </div>

        {loading ? (
          <div className="h-20 bg-stone-100 rounded-2xl animate-pulse" />
        ) : todayLessons.filter(l => l.status !== "conducted").length === 0 ? (
          <div className="flex items-center gap-3 text-stone-500 py-2">
            <Coffee fill="currentColor" size={20} />
            <span className="text-base font-bold">На сегодня всё</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {todayLessons.filter(l => l.status !== "conducted").map((l) => {
              const c = getEntityColorClasses();
              return (
                <div
                  key={l.id}
                  className="bg-ivory shadow-neu-sm p-4 rounded-2xl flex items-center gap-4 transition-all hover:shadow-neu-md cursor-pointer group"
                  onClick={() => onNavigate("schedule")}
                >
                  <div
                    className={`h-12 w-12 rounded-xl ${c.bg} flex items-center justify-center shrink-0 shadow-inner`}
                    style={getEntityStyle(l.displayName)}
                  >
                    <span className={`text-base font-bold ${c.text}`}>
                      {l.displayName[0]}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-bold text-stone-900 truncate group-hover:text-blue-600 transition-colors">
                      {l.displayName}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md tabular-nums">{l.startTime}</span>
                      <span className="text-xs text-stone-500 truncate">{l.subjectName}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Асимметричная сетка ───────────────────────────────────
            Левая колонка: список «Требует внимания»
            Правая колонка: «На острие пера» — sticky при скролле
      ─────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start lg:flex-1 lg:min-h-0">

        {/* LEFT COLUMN — Action Items */}
        <section className="lg:col-span-2 flex flex-col h-full min-h-0">
          <div className="flex items-center gap-2 mb-5 shrink-0">
            <AlertCircle size={20} className="text-stone-400" />
            <h2 className="text-lg font-bold text-stone-800">Требует внимания</h2>
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
            <div className="flex items-center gap-3 text-stone-500 py-3 shrink-0">
              <CheckCircle2 size={20} className="text-emerald-500" />
              <span className="text-base font-bold">Всё в порядке — задолженностей нет</span>
            </div>
          ) : (
            /* Single-column list with custom elegant scroll indicator */
            <div className="relative -mx-2 px-2 flex-1 min-h-0">
              <div 
                className="flex flex-col gap-6 h-full overflow-y-auto hide-scrollbar pb-8"
                onScroll={handleScroll}
              >
                {actionItems.map(item => (
                  <ActionItemCard
                    key={item.id}
                    item={item}
                    onMarkDone={(item) => setActionModal({ isOpen: true, item, mode: "mark_done" })}
                  />
                ))}
              </div>
              
              {/* Fade indicator at the bottom */}
              {actionItems.length > 3 && !isScrolledToBottom && (
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[rgb(var(--ivory))] to-transparent pointer-events-none flex items-end justify-center pb-1">
                  <span className="text-[10px] font-bold text-stone-400/80 uppercase tracking-widest animate-pulse">
                    Прокрутите вниз ↓
                  </span>
                </div>
              )}
            </div>
          )}
        </section>

        {/* RIGHT COLUMN — Community News (sticky) */}
        <aside className="lg:col-span-1 lg:sticky lg:top-6">
          <div className="flex items-center gap-2 mb-5">
            <TelegramIcon size={20} className="text-[#1B4F72]" />
            <h2 className="text-lg font-bold text-stone-800">На острие пера</h2>
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
        onConfirm={async (item, selectedLessons) => {
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
              comment: "Оплата по долгу"
            });
          }
          setRefreshKey(k => k + 1);
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
