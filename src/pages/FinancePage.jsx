import React, { useState, useEffect } from "react";
import { PageWrapper } from "../components/layout/PageWrapper.jsx";
import { Card, Button, Input } from "../components/ui/index.js";
import { Wallet, TrendingUp, CheckCircle, Copy, Plus, AlertCircle, CalendarClock, ChevronRight, X, Loader2 } from "lucide-react";
import { getPayments, getStudents, getLessons, addPayment } from "../services/database.js";
import FintechTable from "../components/finance/FintechTable.jsx";

export default function FinancePage() {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [lessons, setLessons] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    const [st, p, l] = await Promise.all([
      getStudents(),
      getPayments(),
      getLessons()
    ]);
    setStudents(st);
    setPayments(p);
    setLessons(l);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute stats
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // Income this month (sum of payments in this month)
  const incomeThisMonth = payments
    .filter(p => new Date(p.paidAt) >= currentMonthStart && new Date(p.paidAt) < nextMonthStart)
    .reduce((sum, p) => sum + Number(p.amount), 0);

  // Future lessons price for this month
  const futureLessonsThisMonth = lessons
    .filter(l => {
      const lDate = new Date(l.date);
      return lDate >= now && lDate < nextMonthStart && l.status !== "cancelled" && l.status !== "skipped_free";
    })
    .reduce((sum, l) => sum + Number(l.price || 0), 0);
  
  // Actually forecast is: Income this month + remaining lessons in this month
  const forecastThisMonth = incomeThisMonth + futureLessonsThisMonth;

  // Conducted lessons count this month
  const lessonsConductedThisMonth = lessons
    .filter(l => {
      const lDate = new Date(l.date);
      return lDate >= currentMonthStart && lDate < nextMonthStart && l.status === "conducted";
    }).length;

  // Chart data: last 6 months
  const chartData = [];
  let maxMonthIncome = 0;
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const mIncome = payments
      .filter(p => new Date(p.paidAt) >= mStart && new Date(p.paidAt) < mEnd)
      .reduce((sum, p) => sum + Number(p.amount), 0);
    
    if (mIncome > maxMonthIncome) maxMonthIncome = mIncome;
    chartData.push({
      label: d.toLocaleDateString("ru", { month: "short" }),
      income: mIncome,
      isCurrent: i === 0
    });
  }

  // Awaiting payments (debtors)
  const awaitingPayment = students.filter(s => (s.balance || 0) < 0).sort((a, b) => (a.balance || 0) - (b.balance || 0));

  if (loading) {
    return (
      <PageWrapper title="Финансы и Аналитика" icon={Wallet} accentClass="text-emerald-600">
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-stone-300" /></div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Управление балансом"
      subtitle="Статистика доходов и оплат"
      icon={Wallet}
      accentClass="text-emerald-600"
    >
      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card variant="elevated" className="bg-white shadow-sm border-0">
          <p className="text-sm text-stone-500 font-medium">Доход за месяц</p>
          <p className="text-3xl font-bold mt-2 tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-emerald-500 to-teal-400">{incomeThisMonth.toLocaleString('ru')} ₽</p>
          <p className="text-xs text-stone-400 mt-2">Фактические поступления</p>
        </Card>
        
        <Card variant="elevated">
          <p className="text-sm text-stone-500 font-medium">Прогноз до конца месяца</p>
          <p className="text-3xl font-bold mt-2 tracking-tight text-emerald-600">{forecastThisMonth.toLocaleString('ru')} ₽</p>
          <p className="text-xs text-stone-400 mt-2">Доход + Запланированные уроки</p>
        </Card>

        <Card variant="elevated">
          <p className="text-sm text-stone-500 font-medium">Уроков за месяц</p>
          <p className="text-3xl font-bold mt-2 tracking-tight text-stone-800">{lessonsConductedThisMonth}</p>
          <p className="text-xs text-stone-400 mt-2">Проведено занятий</p>
        </Card>
      </div>

      <div className="mt-6 space-y-4">
        {/* Chart */}
        <h2 className="text-base font-bold text-stone-900 tracking-tight">Доход по месяцам</h2>
        <Card variant="elevated" className="h-40 flex flex-col justify-end p-5 pt-8">
          {maxMonthIncome === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-stone-400 gap-3">
              <TrendingUp size={32} className="opacity-20" />
              <p className="text-sm">График обретет форму после первых оплат</p>
            </div>
          ) : (
            <div className="flex h-full items-end gap-2 sm:gap-6 justify-between w-full">
              {chartData.map((d, i) => {
                const height = maxMonthIncome > 0 ? (d.income / maxMonthIncome) * 100 : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col justify-end items-center gap-2 h-full group">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-stone-500 bg-white shadow-sm border border-stone-200 px-1.5 py-0.5 rounded">
                      {d.income.toLocaleString('ru')} ₽
                    </div>
                    <div className="w-full max-w-[40px] bg-stone-100/50 shadow-neu-inset rounded-t-md relative flex flex-col justify-end" style={{ height: '100%' }}>
                      {d.income > 0 && (
                        <div 
                          className={`w-full rounded-t-md transition-all duration-500 ${d.isCurrent ? 'bg-emerald-500' : 'bg-emerald-400/80'}`}
                          style={{ height: `${height}%` }}
                        />
                      )}
                    </div>
                    <span className={`text-xs ${d.isCurrent ? 'text-emerald-700 font-bold' : 'text-stone-400'}`}>{d.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <FintechTable 
        students={students} 
        payments={payments} 
        lessons={lessons} 
        onRefresh={fetchData}
      />
    </PageWrapper>
  );
}
