/**
 * useDashboardData.js
 * ────────────────────────────────────────────────────────────────────────────
 * Хук загрузки и вычисления всех данных для DashboardPage.
 * Инкапсулирует: fetchData, статистику уроков/часов/доходов,
 * долги по ДЗ и финансам, actionItems, refreshKey.
 */
import { useState, useEffect } from "react";
import { getLessons, getStudents, getPayments, getUserConfig } from "../services/database.js";

// ── Утилита длительности урока ───────────────────────────────────────────────
function getLessonDuration(lesson) {
  if (!lesson.startTime || !lesson.endTime) return 0;
  const [h1, m1] = lesson.startTime.split(":").map(Number);
  const [h2, m2] = lesson.endTime.split(":").map(Number);
  const dur = (h2 + m2 / 60) - (h1 + m1 / 60);
  return dur > 0 ? dur : 0;
}

const INITIAL_STATS = {
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
  unpaidLessons: 0,
  activeStudentsCount: 0,
  newStudentsMonth: 0,
  freeSlotsWeek: 0,
  rescheduledMonth: 0,
};

export function useDashboardData() {
  const [loading, setLoading]         = useState(true);
  const [todayLessons, setTodayLessons] = useState([]);
  const [hwDebts, setHwDebts]         = useState([]);
  const [moneyDebts, setMoneyDebts]   = useState([]);
  const [actionItems, setActionItems] = useState([]);
  const [stats, setStats]             = useState(INITIAL_STATS);
  const [metricsConfig, setMetricsConfig] = useState(["todayCount", "activeStudentsCount", "hoursWorkedThisMonth", "incomeMonth"]);
  const [refreshKey, setRefreshKey]   = useState(0);

  useEffect(() => {
    async function fetchData() {
      let allLessons = [], students = [], payments = [], userConfig = null;
      try {
        const results = await Promise.allSettled([
          getLessons(),
          getStudents(),
          getPayments(),
          getUserConfig(),
        ]);
        allLessons  = results[0].status === "fulfilled" ? results[0].value : [];
        students    = results[1].status === "fulfilled" ? results[1].value : [];
        payments    = results[2].status === "fulfilled" ? results[2].value : [];
        userConfig  = results[3].status === "fulfilled" ? results[3].value : null;

        if (results.some(r => r.status === "rejected")) {
          const errs = results.filter(r => r.status === "rejected").map(r => r.reason?.message || "unknown");
          console.warn("[Dashboard] Some data failed to load:", errs);
        }
      } catch (err) {
        console.error("[Dashboard] fetchData error:", err);
        setLoading(false);
        return;
      }

      if (userConfig?.dashboardMetrics) {
        setMetricsConfig(userConfig.dashboardMetrics);
      }

      const now               = new Date();
      const todayStr          = now.toISOString().split("T")[0];
      const monthStart        = new Date(now.getFullYear(), now.getMonth(), 1);
      const nextMonthStart    = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const monthStartStr     = monthStart.toISOString().split("T")[0];
      const nextMonthStartStr = nextMonthStart.toISOString().split("T")[0];

      const currentDayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
      const weekStart        = new Date(now);
      weekStart.setDate(now.getDate() - currentDayOfWeek + 1);
      const weekEnd          = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      const weekStartStr = weekStart.toISOString().split("T")[0];
      const weekEndStr   = weekEnd.toISOString().split("T")[0];

      // ── 1. Уроки сегодня ───────────────────────────────────────────────
      const todayL = allLessons
        .filter(l => l.date === todayStr && l.status !== "cancelled" && l.status !== "skipped_free")
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

      const enrichedTodayL = todayL.map(l => {
        let name = "Неизвестно";
        let studentObj = null;
        if (l.type === "individual" && l.studentId) {
          const s = students.find(x => x.id === l.studentId);
          if (s) { name = s.name; studentObj = s; }
        } else if (l.type === "group") {
          name = "Группа";
        }
        return { ...l, displayName: name, studentObj };
      });
      setTodayLessons(enrichedTodayL);

      // ── 2. Долги по ДЗ ────────────────────────────────────────────────
      const hwMap = {};
      allLessons
        .filter(l => {
          const hwText = typeof l.homework === "string" ? l.homework : (l.homework?.text || "");
          return l.status === "conducted" && hwText.trim().length > 0;
        })
        .forEach(l => {
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

      // ── 3. Финансовые долги ───────────────────────────────────────────
      const mDebts = students
        .filter(s => s.balance < 0)
        .sort((a, b) => a.balance - b.balance)
        .slice(0, 5);
      setMoneyDebts(mDebts);

      // ── 4. Action Items ───────────────────────────────────────────────
      const combined = [
        ...mDebts.map(s => {
          const debt  = Math.abs(s.balance);
          const price = s.subjects?.[0]?.price || 0;
          const count = price > 0 ? Math.ceil(debt / price) : 1;
          return { id: `money-${s.id}`, type: "money", student: s, amount: debt, count, priority: debt };
        }),
        ...hwDebtsArr.map(item => ({
          id: `hw-${item.student.id}`, type: "hw",
          student: item.student, count: item.count, lessons: item.lessons,
          priority: item.count * 1000,
        })),
      ];
      combined.sort((a, b) => b.priority - a.priority);
      setActionItems(combined);

      // ── 5. Статистика ─────────────────────────────────────────────────
      let lessonsMonth = 0, lessonsWeek = 0, lessonsLeftWeek = 0, lessonsLeftMonth = 0;
      let hoursWorkedThisMonth = 0, hoursLeftWeek = 0, hoursLeftMonth = 0;
      let cancelledMonth = 0, expectedIncomeMonth = 0, totalConductedPrice = 0;
      let rescheduledMonth = 0, totalHoursThisWeek = 0;

      const monthStartISO = monthStart.toISOString();
      const nextMonthStartISO = nextMonthStart.toISOString();

      allLessons.forEach(l => {
        const dur = getLessonDuration(l);
        
        if (l.reschedules && l.reschedules.length > 0) {
          l.reschedules.forEach(ts => {
            if (ts >= monthStartISO && ts < nextMonthStartISO) {
              rescheduledMonth++;
            }
          });
        }

        if (l.date >= monthStartStr && l.date < nextMonthStartStr) {
          const isConducted = l.status === "conducted" || l.status === "skipped_paid";
          const isCancelled = l.status === "cancelled"  || l.status === "skipped_free";
          const isScheduled = l.status === "scheduled";
          if (isCancelled)  cancelledMonth++;
          if (isConducted)  { lessonsMonth++;     hoursWorkedThisMonth += dur; totalConductedPrice += (Number(l.price) || 0); }
          if (isScheduled)  { lessonsLeftMonth++;  hoursLeftMonth       += dur; expectedIncomeMonth += (Number(l.price) || 0); }
        }
        if (l.date >= weekStartStr && l.date < weekEndStr) {
          const isConducted = l.status === "conducted" || l.status === "skipped_paid";
          const isScheduled = l.status === "scheduled";
          if (isConducted || isScheduled) {
            lessonsWeek++;
            totalHoursThisWeek += dur;
          }
          if (isScheduled) { lessonsLeftWeek++; hoursLeftWeek += dur; }
        }
      });

      let totalWeeklyWorkingHours = 0;
      const wh = userConfig?.workingHours || {
        1: { active: true, start: "10:00", end: "19:00" },
        2: { active: true, start: "10:00", end: "19:00" },
        3: { active: true, start: "10:00", end: "19:00" },
        4: { active: true, start: "10:00", end: "19:00" },
        5: { active: true, start: "10:00", end: "19:00" },
        6: { active: false, start: "10:00", end: "14:00" },
        0: { active: false, start: "10:00", end: "14:00" }
      };
      
      Object.values(wh).forEach(day => {
        if (day.active) {
          const [sh, sm] = day.start.split(":").map(Number);
          const [eh, em] = day.end.split(":").map(Number);
          const dur = (eh + em/60) - (sh + sm/60);
          if (dur > 0) totalWeeklyWorkingHours += dur;
        }
      });
      const freeSlotsWeek = Math.max(0, Math.round(totalWeeklyWorkingHours - totalHoursThisWeek));

      let newStudentsMonth = 0;
      let totalDebt = 0;
      let totalAdvances = 0;
      let unpaidLessons = 0;
      students.forEach(s => {
        if (s.createdAt) {
          const ca = s.createdAt.toDate ? s.createdAt.toDate() : new Date(s.createdAt);
          if (ca >= monthStart) newStudentsMonth++;
        }
        if (s.balance < 0) {
          totalDebt += Math.abs(s.balance);
          const price = s.subjects?.[0]?.price || 0;
          unpaidLessons += price > 0 ? Math.ceil(Math.abs(s.balance) / price) : 1;
        }
        if (s.balance > 0) totalAdvances += s.balance;
      });

      const incomeMonth    = payments
        .filter(p => new Date(p.paidAt) >= monthStart && new Date(p.paidAt) < nextMonthStart)
        .reduce((sum, p) => sum + Number(p.amount), 0);
      const averageReceipt = lessonsMonth > 0 ? Math.round(totalConductedPrice / lessonsMonth) : 0;

      setStats({
        todayCount: todayL.length,
        lessonsWeek, lessonsLeftWeek, lessonsMonth, lessonsLeftMonth,
        hoursWorkedThisMonth, hoursLeftWeek, hoursLeftMonth,
        cancelledMonth, incomeMonth, expectedIncomeMonth,
        totalDebt, totalAdvances, averageReceipt, unpaidLessons,
        activeStudentsCount: students.length, newStudentsMonth,
        freeSlotsWeek, rescheduledMonth,
      });

      setLoading(false);
    }

    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [refreshKey]);

  const refresh = () => setRefreshKey(k => k + 1);

  return { loading, todayLessons, hwDebts, moneyDebts, actionItems, stats, metricsConfig, setMetricsConfig, refresh };
}
