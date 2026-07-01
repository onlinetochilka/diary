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
  
  const [isPaying, setIsPaying] = useState(null); // student object or null
  const [payAmount, setPayAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [remindStudent, setRemindStudent] = useState(null); // student object or null
  const [copied, setCopied] = useState(false);

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

  const handlePay = async () => {
    if (!isPaying || !payAmount) return;
    setIsSubmitting(true);
    await addPayment({
      studentId: isPaying.id,
      amount: Number(payAmount),
      currency: "RUB",
      paidAt: new Date().toISOString(),
      note: "Оплата занятий"
    });
    await fetchData();
    setIsSubmitting(false);
    setIsPaying(null);
    setPayAmount("");
  };

  const generateReminderText = (student) => {
    const debt = Math.abs(student.balance || 0);
    return `Привет! Напоминаю об оплате занятий. У нас накопилось к оплате ${debt} ₽. Перевести можно по номеру привязанному к телефону. Спасибо!`;
  };

  const handleCopy = async () => {
    if (!remindStudent) return;
    try {
      await navigator.clipboard.writeText(generateReminderText(remindStudent));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <PageWrapper title="Финансы и Аналитика" icon={Wallet} accentClass="text-emerald-600">
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-stone-300" /></div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Финансы и Аналитика"
      subtitle="Сводка доходов и контроль оплат"
      icon={Wallet}
      accentClass="text-emerald-600"
    >
      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card variant="elevated" className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white border-0">
          <p className="text-sm text-emerald-100 font-medium">Доход за месяц</p>
          <p className="text-3xl font-bold mt-2 tracking-tight">{incomeThisMonth.toLocaleString('ru')} ₽</p>
          <p className="text-xs text-emerald-100 mt-2 opacity-80">Фактические поступления</p>
        </Card>
        
        <Card variant="elevated" className="bg-white border-stone-200">
          <p className="text-sm text-stone-500 font-medium">Прогноз до конца месяца</p>
          <p className="text-3xl font-bold mt-2 tracking-tight text-stone-900">{forecastThisMonth.toLocaleString('ru')} ₽</p>
          <p className="text-xs text-stone-400 mt-2">Доход + Запланированные уроки</p>
        </Card>

        <Card variant="elevated" className="bg-white border-stone-200">
          <p className="text-sm text-stone-500 font-medium">Уроков за месяц</p>
          <p className="text-3xl font-bold mt-2 tracking-tight text-stone-900">{lessonsConductedThisMonth}</p>
          <p className="text-xs text-stone-400 mt-2">Проведено занятий</p>
        </Card>
      </div>

      <div className="mt-6 space-y-4">
        {/* Chart */}
        <h2 className="text-base font-bold text-stone-900 tracking-tight">Доход по месяцам</h2>
        <Card variant="glass" className="h-40 flex flex-col justify-end p-5 pt-8">
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
                    <div className="w-full max-w-[40px] bg-stone-100 rounded-t-md relative overflow-hidden flex flex-col justify-end" style={{ height: '100%' }}>
                      {d.income > 0 ? (
                        <div 
                          className={`w-full rounded-t-md transition-all duration-500 ${d.isCurrent ? 'bg-emerald-500' : 'bg-emerald-200'}`}
                          style={{ height: `${height}%` }}
                        />
                      ) : (
                        <div className="w-full absolute bottom-0 border-b-2 border-dashed border-stone-200" />
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
        onRemind={setRemindStudent} 
        onPay={(s) => { setIsPaying(s); setPayAmount(Math.abs(s.balance).toString()); }} 
      />

      {/* Pay Modal */}
      {isPaying && (
        <>
          <div className="fixed inset-0 bg-stone-900/20 backdrop-blur-sm z-40 transition-opacity" onClick={() => !isSubmitting && setIsPaying(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-white rounded-2xl shadow-xl z-50 p-5 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg text-stone-900">Внести оплату</h3>
                <p className="text-sm text-stone-500 mt-0.5">{isPaying.name}</p>
              </div>
              <button 
                onClick={() => !isSubmitting && setIsPaying(null)}
                className="p-1.5 text-stone-400 hover:bg-stone-100 rounded-lg transition-colors"
                disabled={isSubmitting}
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">Сумма, ₽</label>
                <Input 
                  type="number" 
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  disabled={isSubmitting}
                  className="text-lg font-medium py-3"
                  autoFocus
                />
              </div>
              <Button 
                variant="primary" 
                className="w-full justify-center h-11"
                onClick={handlePay}
                disabled={isSubmitting || !payAmount}
              >
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : "Подтвердить оплату"}
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Reminder Modal */}
      {remindStudent && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setRemindStudent(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-white rounded-2xl shadow-xl z-50 p-5 animate-in fade-in zoom-in-95 border border-stone-200">
            <div className="flex gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                <AlertCircle size={20} />
              </div>
              <div>
                <h3 className="font-bold text-stone-900 leading-tight">Напоминание об оплате</h3>
                <p className="text-xs text-stone-500 mt-0.5">{remindStudent.name}</p>
              </div>
            </div>
            
            <div className="bg-stone-50 p-3 rounded-lg text-sm text-stone-700 font-medium mb-4 whitespace-pre-wrap leading-relaxed border border-stone-100 relative">
              {generateReminderText(remindStudent)}
            </div>
            
            <Button 
              variant={copied ? "primary" : "secondary"}
              className={`w-full justify-center h-10 transition-colors ${copied ? 'bg-emerald-500 text-white hover:bg-emerald-600 ring-0' : ''}`}
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <CheckCircle size={16} className="mr-2" />
                  Скопировано!
                </>
              ) : (
                <>
                  <Copy size={16} className="mr-2" />
                  Скопировать текст
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </PageWrapper>
  );
}
