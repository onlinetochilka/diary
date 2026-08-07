/**
 * useDashboardData.js
 * ────────────────────────────────────────────────────────────────────────────
 * Хук загрузки и вычисления всех данных для DashboardPage.
 * Инкапсулирует: fetchData, статистику уроков/часов/доходов,
 * долги по ДЗ и финансам, actionItems, refreshKey.
 */
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getUserConfig } from "../services/database.js";
import { useStudents } from "./useStudents.js";
import { getLessons, getPayments } from "../api/databaseApi.js";
import {
  calculateStudentBalances,
  calculateIncomeForPeriod,
  getLessonDuration,
  calculateTotalWeeklyWorkingHours
} from "../utils/financeCalculators.js";

const INITIAL_STATS = {
  todayCount: 0, lessonsWeek: 0, lessonsLeftWeek: 0, lessonsMonth: 0, lessonsLeftMonth: 0,
  hoursWorkedThisMonth: 0, hoursLeftWeek: 0, hoursLeftMonth: 0, cancelledMonth: 0,
  incomeMonth: 0, expectedIncomeMonth: 0, totalDebt: 0, totalAdvances: 0, averageReceipt: 0,
  unpaidLessons: 0, activeStudentsCount: 0, newStudentsMonth: 0, freeSlotsWeek: 0, rescheduledMonth: 0,
};

const EMPTY_ARRAY = [];

export function useDashboardData() {
  const { getStudents } = useStudents();
  const [metricsConfig, setMetricsConfig] = useState(["todayCount", "activeStudentsCount", "hoursWorkedThisMonth", "incomeMonth"]);

  const { now, todayStr, monthStart, nextMonthStart, monthStartStr, nextMonthStartStr, weekStartStr, weekEndStr, queryStartStr, queryEndStr } = useMemo(() => {
    const formatYMD = (d) => {
      const yy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yy}-${mm}-${dd}`;
    };

    const now = new Date();
    const todayStr = formatYMD(now);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    
    const currentDayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - currentDayOfWeek + 1);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    
    // Bounds for querying (let's get from previous month to next month to safely cover all debts and weeks)
    const queryStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const queryEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);

    return {
      now, todayStr, monthStart, nextMonthStart,
      monthStartStr: formatYMD(monthStart),
      nextMonthStartStr: formatYMD(nextMonthStart),
      weekStartStr: formatYMD(weekStart),
      weekEndStr: formatYMD(weekEnd),
      queryStartStr: formatYMD(queryStart),
      queryEndStr: formatYMD(queryEnd),
    };
  }, []);

  const { data: students = EMPTY_ARRAY, isLoading: loadingStudents, refetch: refetchStudents } = useQuery({
    queryKey: ['students'],
    queryFn: () => getStudents(),
  });

  const { data: userConfig } = useQuery({
    queryKey: ['userConfig'],
    queryFn: () => getUserConfig(),
  });

  const { data: lessons = EMPTY_ARRAY, isLoading: loadingLessons, refetch: refetchLessons } = useQuery({
    queryKey: ['dashboard-lessons', queryStartStr, queryEndStr],
    queryFn: () => getLessons({ dateFrom: queryStartStr, dateTo: queryEndStr }),
  });

  const { data: payments = EMPTY_ARRAY, isLoading: loadingPayments, refetch: refetchPayments } = useQuery({
    queryKey: ['dashboard-payments', monthStartStr, nextMonthStartStr],
    queryFn: () => getPayments({ dateFrom: monthStartStr, dateTo: nextMonthStartStr }),
  });

  useMemo(() => {
    if (userConfig?.dashboardMetrics) {
      setMetricsConfig(userConfig.dashboardMetrics);
    }
  }, [userConfig]);

  const loading = loadingStudents || loadingLessons || loadingPayments;

  const refresh = () => {
    refetchStudents();
    refetchLessons();
    refetchPayments();
  };

  const todayLessons = useMemo(() => {
    if (loading) return [];
    return lessons
      .filter(l => l.date === todayStr && l.status !== "cancelled" && l.status !== "skipped_free")
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .map(l => {
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
  }, [lessons, students, todayStr, loading]);

  const hwDebts = useMemo(() => {
    if (loading) return [];
    const hwMap = {};
    lessons
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

    return Object.entries(hwMap)
      .map(([studentId, data]) => {
        const s = students.find(x => x.id === studentId);
        return { student: s, count: data.count, lessons: data.lessons };
      })
      .filter(x => x.student)
      .sort((a, b) => b.count - a.count);
  }, [lessons, students, loading]);

  const moneyDebts = useMemo(() => {
    if (loading) return [];
    return students
      .filter(s => s.balance < 0)
      .sort((a, b) => a.balance - b.balance);
  }, [students, loading]);

  const actionItems = useMemo(() => {
    if (loading) return [];
    return [
      ...moneyDebts.map(s => {
        const debt  = Math.abs(s.balance);
        const price = s.subjects?.[0]?.price || 0;
        const count = price > 0 ? Math.ceil(debt / price) : 1;
        return { id: `money-${s.id}`, type: "money", student: s, amount: debt, count, priority: debt };
      }),
      ...hwDebts.map(item => ({
        id: `hw-${item.student.id}`, type: "hw",
        student: item.student, count: item.count, lessons: item.lessons,
        priority: item.count * 1000,
      })),
    ].sort((a, b) => b.priority - a.priority);
  }, [moneyDebts, hwDebts, loading]);

  const tutorDebts = useMemo(() => {
    if (loading) return [];
    const nowStr = now.toTimeString().substring(0, 5); // "HH:MM"
    const todayIs = todayStr;
    const debts = [];

    lessons.forEach(l => {
      // 1. Unmarked lesson
      const isPast = l.date < todayIs || (l.date === todayIs && l.endTime < nowStr);
      if (l.status === "scheduled" && isPast && l.status !== "cancelled" && l.status !== "skipped_free") {
        let name = "Неизвестно";
        let studentObj = null;
        if (l.type === "individual" && l.studentId) {
          const s = students.find(x => x.id === l.studentId);
          if (s) { name = s.name; studentObj = s; }
        } else if (l.type === "group") {
          name = "Группа";
        }
        debts.push({ id: `unmarked-${l.id}`, type: "unmarked_lesson", lesson: { ...l, displayName: name, studentObj }, priority: 2000 });
      }

      // 2. Unset HW
      const hasHwText = typeof l.homework === "string" ? l.homework.trim().length > 0 : (l.homework?.text?.trim()?.length > 0);
      const isExplicitlyNotAssigned = l.isHwNotAssigned === true;
      if (l.status === "conducted" && !hasHwText && !isExplicitlyNotAssigned) {
        let name = "Неизвестно";
        let studentObj = null;
        if (l.type === "individual" && l.studentId) {
          const s = students.find(x => x.id === l.studentId);
          if (s) { name = s.name; studentObj = s; }
        } else if (l.type === "group") {
          name = "Группа";
        }
        debts.push({ id: `unsethw-${l.id}`, type: "unset_hw", lesson: { ...l, displayName: name, studentObj }, priority: 1000 });
      }
    });

    return debts.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      // Secondary sort by date (oldest first)
      return a.lesson.date.localeCompare(b.lesson.date);
    });
  }, [lessons, students, loading, todayStr, now]);

  const stats = useMemo(() => {
    if (loading) return INITIAL_STATS;

    let lessonsMonth = 0, lessonsWeek = 0, lessonsLeftWeek = 0, lessonsLeftMonth = 0;
    let hoursWorkedThisMonth = 0, hoursLeftWeek = 0, hoursLeftMonth = 0;
    let cancelledMonth = 0, expectedIncomeMonth = 0, totalConductedPrice = 0;
    let rescheduledMonth = 0, totalHoursThisWeek = 0;

    const monthStartISO = monthStart.toISOString();
    const nextMonthStartISO = nextMonthStart.toISOString();

    lessons.forEach(l => {
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
        if (isConducted)  { lessonsMonth++; hoursWorkedThisMonth += dur; totalConductedPrice += (Number(l.price) || 0); }
        if (isScheduled)  { lessonsLeftMonth++; hoursLeftMonth += dur; expectedIncomeMonth += (Number(l.price) || 0); }
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

    const totalWeeklyWorkingHours = calculateTotalWeeklyWorkingHours(userConfig?.workingHours);
    const freeSlotsWeek = Math.max(0, Math.round(totalWeeklyWorkingHours - totalHoursThisWeek));

    let newStudentsMonth = 0;
    students.forEach(s => {
      if (s.createdAt) {
        const ca = s.createdAt.toDate ? s.createdAt.toDate() : new Date(s.createdAt);
        if (ca >= monthStart) newStudentsMonth++;
      }
    });

    const balances = calculateStudentBalances(students);
    const incomeMonth = calculateIncomeForPeriod(payments, monthStart, nextMonthStart);
    const averageReceipt = lessonsMonth > 0 ? Math.round(totalConductedPrice / lessonsMonth) : 0;

    return {
      todayCount: todayLessons.length, lessonsWeek, lessonsLeftWeek, lessonsMonth, lessonsLeftMonth,
      hoursWorkedThisMonth, hoursLeftWeek, hoursLeftMonth, cancelledMonth, incomeMonth, expectedIncomeMonth,
      totalDebt: balances.totalDebt, totalAdvances: balances.totalAdvances, averageReceipt, unpaidLessons: balances.unpaidLessonsCount,
      activeStudentsCount: students.length, newStudentsMonth, freeSlotsWeek, rescheduledMonth,
    };
  }, [
    loading, lessons, students, payments, userConfig, 
    monthStart, nextMonthStart, monthStartStr, nextMonthStartStr, weekStartStr, weekEndStr, todayLessons.length
  ]);

  return { loading, todayLessons, hwDebts, moneyDebts, actionItems, tutorDebts, stats, metricsConfig, setMetricsConfig, refresh, students };
}
