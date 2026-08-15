/**
 * useFinanceData.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Единый источник данных для FinancePage.
 * Один Promise.all — без дублирования запросов из FinancePage и useDashboardData.
 *
 * Возвращает:
 *   loading, students, payments, lessons,
 *   incomeThisMonth, incomeLastMonth, incomeGrowthPct,
 *   averageReceipt, totalDebt, totalAdvances, debtorsCount, unpaidLessonsCount,
 *   lessonsConductedThisMonth, lessonsScheduledThisMonth, cancelledThisMonth,
 *   chartData, maxMonthIncome,
 *   studentData, debtors,
 *   onRefresh
 */
import { useMemo, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useStudents } from "./useStudents.js";
import { getLessons, getPayments } from "../api/databaseApi.js";
import { calculateStudentBalances, calculateIncomeForPeriod } from "../utils/financeCalculators.js";

export function useFinanceData() {
  const { getStudents } = useStudents();
  const queryClient = useQueryClient();

  const { now, currentMonthStartStr, nextMonthStartStr, sixMonthsAgoStr, lastMonthStart, lastMonthEnd } = useMemo(() => {
    const now = new Date();
    
    // Bounds for lessons
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart    = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    
    // Bounds for payments (last 6 months chart + this month)
    const sixMonthsAgo      = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    
    // Bounds for last month KPIs
    const lastMonthStartObj = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    return {
      now,
      currentMonthStartStr: currentMonthStart.toISOString().split("T")[0],
      nextMonthStartStr: nextMonthStart.toISOString().split("T")[0],
      sixMonthsAgoStr: sixMonthsAgo.toISOString().replace("T", " "), // PB uses YYYY-MM-DD HH:mm:ss for dates
      lastMonthStart: lastMonthStartObj,
      lastMonthEnd: currentMonthStart,
    };
  }, []);

  const { data: students = [], isLoading: loadingStudents, isError: errorStudents } = useQuery({
    queryKey: ['students'],
    queryFn: () => getStudents(),
  });

  const { data: payments = [], isLoading: loadingPayments, isError: errorPayments } = useQuery({
    queryKey: ['payments', { dateFrom: sixMonthsAgoStr }],
    queryFn: () => getPayments({ dateFrom: sixMonthsAgoStr }),
  });

  const { data: lessons = [], isLoading: loadingLessons, isError: errorLessons } = useQuery({
    queryKey: ['lessons', { dateFrom: currentMonthStartStr, dateTo: nextMonthStartStr }],
    queryFn: () => getLessons({ dateFrom: currentMonthStartStr, dateTo: nextMonthStartStr }),
  });

  const loading = loadingStudents || loadingPayments || loadingLessons;
  const isError = errorStudents || errorPayments || errorLessons;

  const onRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['students'] });
    queryClient.invalidateQueries({ queryKey: ['payments'] });
    queryClient.invalidateQueries({ queryKey: ['lessons'] });
  };



  const { currentMonthStart, nextMonthStartObj } = useMemo(() => ({
    currentMonthStart: new Date(now.getFullYear(), now.getMonth(), 1),
    nextMonthStartObj: new Date(now.getFullYear(), now.getMonth() + 1, 1),
  }), [now]);

  const incomeThisMonth = useMemo(() =>
    calculateIncomeForPeriod(payments, currentMonthStart, nextMonthStartObj),
    [payments, currentMonthStart, nextMonthStartObj]
  );

  const incomeLastMonth = useMemo(() =>
    calculateIncomeForPeriod(payments, lastMonthStart, lastMonthEnd),
    [payments, lastMonthStart, lastMonthEnd]
  );

  const incomeGrowthPct = useMemo(() => {
    if (incomeLastMonth === 0) return null;
    return Math.round(((incomeThisMonth - incomeLastMonth) / incomeLastMonth) * 100);
  }, [incomeThisMonth, incomeLastMonth]);

  const { lessonsConductedThisMonth, lessonsScheduledThisMonth, cancelledThisMonth, averageReceipt } =
    useMemo(() => {
      let conducted = 0;
      let scheduled = 0;
      let cancelled = 0;
      let totalConductedPrice = 0;

      lessons.forEach(l => {
        if (l.date < currentMonthStartStr || l.date >= nextMonthStartStr) return;
        if (l.status === "conducted" || l.status === "skipped_paid") {
          conducted++;
          totalConductedPrice += Number(l.price || 0);
        } else if (l.status === "scheduled") {
          scheduled++;
        } else if (l.status === "cancelled" || l.status === "skipped_free") {
          cancelled++;
        }
      });

      return {
        lessonsConductedThisMonth: conducted,
        lessonsScheduledThisMonth: scheduled,
        cancelledThisMonth: cancelled,
        averageReceipt: conducted > 0 ? Math.round(totalConductedPrice / conducted) : 0,
      };
    }, [lessons, currentMonthStartStr, nextMonthStartStr]);

  const { totalDebt, totalAdvances, debtorsCount, unpaidLessonsCount } =
    useMemo(() => calculateStudentBalances(students), [students]);

  const { chartData, maxMonthIncome } = useMemo(() => {
    const data = [];
    let maxIncome = 0;

    for (let i = 5; i >= 0; i--) {
      const d      = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const mEnd   = new Date(d.getFullYear(), d.getMonth() + 1, 1);

      const mIncome = calculateIncomeForPeriod(payments, mStart, mEnd);

      if (mIncome > maxIncome) maxIncome = mIncome;

      data.push({
        label: d.toLocaleDateString("ru", { month: "short" }),
        income: mIncome,
        isCurrent: i === 0,
      });
    }

    return { chartData: data, maxMonthIncome: maxIncome };
  }, [payments, now]);

  const studentData = useMemo(() =>
    students.map(s => {
      const stLessons = lessons.filter(l =>
        (l.studentId === s.id || (l.type === "group" && l.groupId === s.id)) &&
        l.status === "conducted"
      );
      const stPayments = payments.filter(p => p.studentId === s.id);
      const balance    = s.balance || 0;
      const subjectName = s.subjects?.[0]?.name || "Ученик";

      const ledger = [
        ...stLessons.map(l => ({
          type: "lesson",
          id: `l_${l.id}`,
          date: new Date(l.date),
          title: l.topic || "Урок проведён",
          amount: null,
        })),
        ...stPayments.map(p => ({
          type: "payment",
          id: `p_${p.id}`,
          date: p.paidAt ? new Date(p.paidAt) : new Date(),
          title: (p.comment ? p.comment.replace(/\[.*?\]\s*/g, '') : "") || "Оплата",
          amount: p.amount,
        })),
      ].sort((a, b) => b.date - a.date);

      return {
        ...s,
        balance,
        subjectName,
        totalLessons: stLessons.length, // Only reflects lessons this month now
        totalPaymentsCount: stPayments.length,
        totalPaymentsSum: stPayments.reduce((acc, p) => acc + (Number(p?.amount) || 0), 0),
        ledger,
      };
    }),
    [students, lessons, payments]
  );

  const debtors = useMemo(() =>
    studentData
      .filter(s => s.balance < 0)
      .sort((a, b) => a.balance - b.balance),
    [studentData]
  );

  return {
    loading,
    isError,
    students,
    payments,
    lessons,
    incomeThisMonth,
    incomeLastMonth,
    incomeGrowthPct,
    averageReceipt,
    totalDebt,
    totalAdvances,
    debtorsCount,
    unpaidLessonsCount,
    lessonsConductedThisMonth,
    lessonsScheduledThisMonth,
    cancelledThisMonth,
    chartData,
    maxMonthIncome,
    studentData,
    debtors,
    onRefresh,
  };
}
