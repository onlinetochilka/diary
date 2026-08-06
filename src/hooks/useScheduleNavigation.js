/**
 * useScheduleNavigation.js
 * ────────────────────────────────────────────────────────────────────────────
 * Хук навигации по периодам расписания:
 *   - переключение вида (month/week/day)
 *   - prev / next / today
 *   - вычисление заголовка текущего периода
 *   - адаптивная блокировка week/month на мобильных
 *   - periodLessons — уроки текущего периода (для ScheduleStatsRow)
 */

import { useState, useEffect, useMemo } from "react";
import { ymd } from "../components/schedule/scheduleUtils.jsx";

const MONTH_NAMES = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

export function useScheduleNavigation({ pageState, lessons, currentDate, setCurrentDate, view, setView }) {
  const [navigatedFromMonth, setNavigatedFromMonth] = useState(false);

  // Синхронизация с pageState
  useEffect(() => {
    if (pageState?.view) setView(pageState.view);
  }, [pageState]);

  // Адаптивное переключение на day-вид на мобильных
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setView(prev => (prev !== "day" ? "day" : prev));
    }
    const handleResize = () => {
      setView(prev => {
        if (window.innerWidth < 1024 && prev !== "day") return "day";
        return prev;
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ── Переходы ────────────────────────────────────────────────────────────

  const prevPeriod = () => {
    const d = new Date(currentDate);
    if (view === "month")     d.setMonth(d.getMonth() - 1);
    else if (view === "week") d.setDate(d.getDate() - 7);
    else                      d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const nextPeriod = () => {
    const d = new Date(currentDate);
    if (view === "month")     d.setMonth(d.getMonth() + 1);
    else if (view === "week") d.setDate(d.getDate() + 7);
    else                      d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const goToday = () => {
    setCurrentDate(new Date());
    if (window.innerWidth < 1024) setView("day");
  };

  const handleViewChange = (v) => {
    setView(v);
    if (v !== "day") setNavigatedFromMonth(false);
  };

  // ── Заголовок периода ───────────────────────────────────────────────────

  const year      = currentDate.getFullYear();
  const monthName = MONTH_NAMES[currentDate.getMonth()];

  const headerTitle = useMemo(() => {
    if (view === "month") {
      return `${monthName} ${year}`;
    }
    if (view === "week") {
      const d = new Date(currentDate);
      const dayOfWeek = d.getDay() === 0 ? 6 : d.getDay() - 1;
      d.setDate(d.getDate() - dayOfWeek);
      const endD = new Date(d);
      endD.setDate(endD.getDate() + 6);

      if (d.getMonth() === endD.getMonth()) {
        return `${d.getDate()} - ${endD.getDate()} ${MONTH_NAMES[d.getMonth()].toLowerCase()} ${year}`;
      }
      return `${d.getDate()} ${MONTH_NAMES[d.getMonth()].toLowerCase().slice(0, 3)} - ${endD.getDate()} ${MONTH_NAMES[endD.getMonth()].toLowerCase().slice(0, 3)} ${year}`;
    }
    // day
    return `${currentDate.getDate()} ${MONTH_NAMES[currentDate.getMonth()].toLowerCase()} ${year}`;
  }, [view, currentDate, monthName, year]);

  // ── Уроки текущего периода (для ScheduleStatsRow) ──────────────────────

  const periodLessons = useMemo(() => {
    if (view === "day") {
      const dateStr = ymd(currentDate);
      return lessons.filter(l => l.date === dateStr);
    }
    let start, end;
    if (view === "month") {
      const y = currentDate.getFullYear();
      const m = currentDate.getMonth();
      start = ymd(new Date(y, m, 1));
      end   = ymd(new Date(y, m + 1, 0));
    } else {
      const d = new Date(currentDate);
      const dayOfWeek = d.getDay() === 0 ? 6 : d.getDay() - 1;
      d.setDate(d.getDate() - dayOfWeek);
      start = ymd(d);
      const endD = new Date(d);
      endD.setDate(endD.getDate() + 6);
      end = ymd(endD);
    }
    return lessons.filter(l => l.date >= start && l.date <= end);
  }, [lessons, currentDate, view]);

  return {
    view,
    setView,
    currentDate,
    setCurrentDate,
    navigatedFromMonth,
    setNavigatedFromMonth,
    year,
    headerTitle,
    periodLessons,
    prevPeriod,
    nextPeriod,
    goToday,
    handleViewChange,
  };
}
