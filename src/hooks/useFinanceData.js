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
import { useState, useEffect, useCallback, useMemo } from "react";
import { getStudents, getPayments, getLessons } from "../services/database.js";

export function useFinanceData() {
  const [loading, setLoading]   = useState(true);
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [lessons, setLessons]   = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [st, p, l] = await Promise.all([
      getStudents(),
      getPayments(),
      getLessons(),
    ]);
    setStudents(st);
    setPayments(p);
    setLessons(l);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const onRefresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  // Fix #6: Listen for the cross-page 'force-refresh-data' event that Schedule page
  // fires after accepting a payment, so Finance page picks up fresh data automatically.
  useEffect(() => {
    const handleForceRefresh = () => setRefreshKey(k => k + 1);
    window.addEventListener('force-refresh-data', handleForceRefresh);
    return () => window.removeEventListener('force-refresh-data', handleForceRefresh);
  }, []);

  // ── Временные границы ───────────────────────────────────────────────────────
  const { now, currentMonthStart, nextMonthStart, lastMonthStart, lastMonthEnd } =
    useMemo(() => {
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const nextMonthStart    = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const lastMonthStart    = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd      = currentMonthStart;
      return { now, currentMonthStart, nextMonthStart, lastMonthStart, lastMonthEnd };
    }, []);

  // ── KPI: доходы ─────────────────────────────────────────────────────────────
  const incomeThisMonth = useMemo(() =>
    payments
      .filter(p => new Date(p.paidAt) >= currentMonthStart && new Date(p.paidAt) < nextMonthStart)
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    [payments, currentMonthStart, nextMonthStart]
  );

  const incomeLastMonth = useMemo(() =>
    payments
      .filter(p => new Date(p.paidAt) >= lastMonthStart && new Date(p.paidAt) < lastMonthEnd)
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    [payments, lastMonthStart, lastMonthEnd]
  );

  const incomeGrowthPct = useMemo(() => {
    if (incomeLastMonth === 0) return null;
    return Math.round(((incomeThisMonth - incomeLastMonth) / incomeLastMonth) * 100);
  }, [incomeThisMonth, incomeLastMonth]);

  // ── KPI: уроки ──────────────────────────────────────────────────────────────
  const { lessonsConductedThisMonth, lessonsScheduledThisMonth, cancelledThisMonth, averageReceipt } =
    useMemo(() => {
      const currentMonthStartStr = currentMonthStart.toISOString().split("T")[0];
      const nextMonthStartStr    = nextMonthStart.toISOString().split("T")[0];

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
    }, [lessons, currentMonthStart, nextMonthStart]);

  // ── KPI: долги и авансы ─────────────────────────────────────────────────────
  const { totalDebt, totalAdvances, debtorsCount, unpaidLessonsCount } =
    useMemo(() => {
      let totalDebt = 0;
      let totalAdvances = 0;
      let debtorsCount = 0;
      let unpaidLessonsCount = 0;

      students.forEach(s => {
        const balance = s.balance || 0;
        if (balance < 0) {
          totalDebt += Math.abs(balance);
          debtorsCount++;
          const price = s.subjects?.[0]?.price || 0;
          unpaidLessonsCount += price > 0 ? Math.ceil(Math.abs(balance) / price) : 1;
        }
        if (balance > 0) {
          totalAdvances += balance;
        }
      });

      return { totalDebt, totalAdvances, debtorsCount, unpaidLessonsCount };
    }, [students]);

  // ── График: последние 6 месяцев ─────────────────────────────────────────────
  const { chartData, maxMonthIncome } = useMemo(() => {
    const data = [];
    let maxIncome = 0;

    for (let i = 5; i >= 0; i--) {
      const d      = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const mEnd   = new Date(d.getFullYear(), d.getMonth() + 1, 1);

      const mIncome = payments
        .filter(p => new Date(p.paidAt) >= mStart && new Date(p.paidAt) < mEnd)
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      if (mIncome > maxIncome) maxIncome = mIncome;

      data.push({
        label: d.toLocaleDateString("ru", { month: "short" }),
        income: mIncome,
        isCurrent: i === 0,
      });
    }

    return { chartData: data, maxMonthIncome: maxIncome };
  }, [payments, now]);

  // ── Обогащённые данные для таблицы ──────────────────────────────────────────
  const studentData = useMemo(() =>
    students.map(s => {
      const stLessons = lessons.filter(l =>
        (l.studentId === s.id || (l.type === "group" && l.groupId === s.id)) &&
        l.status === "conducted"
      );
      const stPayments = payments.filter(p => p.studentId === s.id);
      const balance    = s.balance || 0;
      const subjectName = s.subjects?.[0]?.name || "Ученик";

      // Ledger: хронология уроков и оплат
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
          title: p.note || "Оплата",
          amount: p.amount,
        })),
      ].sort((a, b) => b.date - a.date);

      return {
        ...s,
        balance,
        subjectName,
        totalLessons: stLessons.length,
        totalPaymentsCount: stPayments.length,
        totalPaymentsSum: stPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0),
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
    students,
    payments,
    lessons,
    // KPI
    incomeThisMonth,
    incomeLastMonth,
    incomeGrowthPct,
    averageReceipt,
    totalDebt,
    totalAdvances,
    debtorsCount,
    unpaidLessonsCount,
    // Уроки
    lessonsConductedThisMonth,
    lessonsScheduledThisMonth,
    cancelledThisMonth,
    // График
    chartData,
    maxMonthIncome,
    // Таблица
    studentData,
    debtors,
    // Управление
    onRefresh,
  };
}
