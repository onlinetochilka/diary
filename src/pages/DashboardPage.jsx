import React, { useState, useEffect } from "react";
import { PageWrapper } from "../components/layout/PageWrapper.jsx";
import { Card, Button } from "../components/ui/index.js";
import { LayoutDashboard, Users, TrendingUp, Clock, BookOpen, Plus, Coffee, AlertCircle, CheckCircle2, PlayCircle, Send, Wallet, Bell, Check, ChevronDown, ChevronUp } from "lucide-react";
import { getLessons, getStudents, getPayments } from "../services/database.js";
import { getEntityColor } from "../utils/colors.js";
import EmailGeneratorModal from "../components/students/EmailGeneratorModal.jsx";

export default function DashboardPage({ onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [todayLessons, setTodayLessons] = useState([]);
  const [showConducted, setShowConducted] = useState(false);
  
  const [nextLesson, setNextLesson] = useState(null);
  const [nextLessonState, setNextLessonState] = useState("done"); // "upcoming", "active", "done"
  
  const [hwDebts, setHwDebts] = useState([]);
  const [moneyDebts, setMoneyDebts] = useState([]);
  
  const [stats, setStats] = useState({
    todayCount: 0,
    hwDebtsCount: 0,
    moneyDebtsCount: 0,
    incomeMonth: 0
  });

  const [emailModal, setEmailModal] = useState({ isOpen: false, student: null });

  useEffect(() => {
    async function fetchData() {
      const [allLessons, students, payments] = await Promise.all([
        getLessons(),
        getStudents(),
        getPayments()
      ]);

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

      // 2. Homework Debts (Ждут ДЗ)
      const hwMap = {}; // studentId -> count
      const pastHwLessons = allLessons.filter(l => l.status === "conducted" && l.homework?.trim().length > 0);
      
      pastHwLessons.forEach(l => {
        if (l.type === "individual" && l.studentId) {
          if (!l.hwDoneBy.includes(l.studentId)) {
            hwMap[l.studentId] = (hwMap[l.studentId] || 0) + 1;
          }
        }
      });

      const hwDebtsArr = Object.entries(hwMap)
        .map(([studentId, count]) => {
          const s = students.find(x => x.id === studentId);
          return { student: s, count };
        })
        .filter(x => x.student)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5); // top 5

      setHwDebts(hwDebtsArr);

      // 3. Money Debts (Ожидают оплаты)
      const mDebts = students
        .filter(s => s.balance < 0)
        .sort((a, b) => a.balance - b.balance)
        .slice(0, 5); // top 5
      
      setMoneyDebts(mDebts);

      // 4. Stats
      const incomeMonth = payments
        .filter(p => new Date(p.paidAt) >= monthStart && new Date(p.paidAt) < nextMonthStart)
        .reduce((sum, p) => sum + Number(p.amount), 0);

      setStats({
        todayCount: todayL.length,
        hwDebtsCount: Object.values(hwMap).reduce((sum, count) => sum + count, 0),
        moneyDebtsCount: students.filter(s => s.balance < 0).length,
        incomeMonth
      });

      setLoading(false);
    }
    
    fetchData();
    const interval = setInterval(fetchData, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <PageWrapper
      title="Главная"
      subtitle="Операционный центр"
      icon={LayoutDashboard}
      accentClass="text-stone-600"
    >
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-2">
        {[
          { label: "Уроков сегодня", value: loading ? "..." : stats.todayCount,  icon: BookOpen,   color: "text-indigo-600 bg-indigo-50" },
          { label: "Ждут ДЗ",        value: loading ? "..." : stats.hwDebtsCount, icon: AlertCircle, color: "text-amber-600 bg-amber-50" },
          { label: "Ожидают оплаты", value: loading ? "..." : stats.moneyDebtsCount, icon: Wallet,  color: "text-red-600 bg-red-50" },
          { label: "Доход, ₽",       value: loading ? "..." : `${(stats.incomeMonth / 1000).toFixed(1)}К`, icon: TrendingUp,  color: "text-emerald-600 bg-emerald-50" },
        ].map((s) => (
          <Card key={s.label} variant="elevated" className="animate-scale-in">
            <div className={`inline-flex p-2 rounded-xl mb-3 ${s.color.split(" ")[1]}`}>
              <s.icon size={16} strokeWidth={1.5} className={s.color.split(" ")[0]} />
            </div>
            <p className="text-2xl font-bold text-stone-900 leading-none">{s.value}</p>
            <p className="text-xs text-stone-500 mt-1">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Focus & Timeline */}
        <div className="lg:col-span-2">
          
          {/* Focus Block: Up Next */}
          {loading ? (
             <div className="rounded-3xl p-8 mb-6 h-40 bg-stone-100 animate-pulse" />
          ) : nextLessonState !== "done" && nextLesson ? (
            <div className={`relative overflow-hidden rounded-3xl p-6 mb-8 text-white shadow-xl transition-all ${
              nextLessonState === "active" 
                ? "bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-emerald-500/30 ring-4 ring-emerald-500/20" 
                : "bg-gradient-to-br from-violet-600 to-indigo-700 shadow-violet-500/30"
            }`}>
              {nextLessonState === "active" && (
                 <div className="absolute top-5 right-5 flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full backdrop-blur-md">
                   <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                   <span className="text-xs font-bold uppercase tracking-wider">Идет сейчас</span>
                 </div>
              )}
              {nextLessonState === "upcoming" && (
                 <div className="absolute top-5 right-5 px-3 py-1 bg-white/20 rounded-full backdrop-blur-md">
                   <span className="text-xs font-bold uppercase tracking-wider">На очереди</span>
                 </div>
              )}
              <div className="mt-2">
                <div className="text-4xl sm:text-5xl font-black tabular-nums tracking-tight mb-2 opacity-90">
                  {nextLesson.startTime} <span className="text-2xl opacity-60 font-medium">- {nextLesson.endTime}</span>
                </div>
                <div className="text-xl sm:text-2xl font-medium text-white/90 mb-6 tracking-tight">
                  {nextLesson.displayName} <span className="opacity-60 mx-2">•</span> {nextLesson.subjectName}
                </div>
                
                <div className="flex gap-3">
                  <Button 
                    variant="primary" 
                    className="bg-white text-stone-900 hover:bg-stone-50 border-0 h-11 px-6 shadow-sm"
                    onClick={() => onNavigate("schedule")}
                  >
                    <PlayCircle size={18} className="mr-2 text-stone-500" />
                    {nextLessonState === "active" ? "К уроку" : "Открыть материалы"}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl p-8 mb-8 text-center bg-teal-50/40 border border-teal-100/60 shadow-sm">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-teal-500 mb-4 mx-auto shadow-sm">
                <Coffee size={28} />
              </div>
              <h3 className="text-lg font-bold text-teal-900">Все уроки завершены!</h3>
              <p className="text-teal-700/70 mt-1">Отличная работа. Самое время выдохнуть и отдохнуть.</p>
            </div>
          )}

          {/* Today's Timeline */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Clock size={16} className="text-stone-400" />
              План на сегодня
            </h3>
            
            {loading ? (
              <div className="h-20 bg-stone-100 rounded-2xl animate-pulse" />
            ) : todayLessons.length === 0 ? (
               <p className="text-sm text-stone-500 italic">На сегодня занятий нет.</p>
            ) : (
              <div className="space-y-3">
                {todayLessons.filter(l => l.status === "conducted").length > 0 && (
                  <div className="mb-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowConducted(!showConducted)}
                      className="text-stone-500 hover:text-stone-700 bg-stone-100/50 hover:bg-stone-100"
                    >
                      {showConducted ? <ChevronUp size={14} className="mr-1" /> : <ChevronDown size={14} className="mr-1" />}
                      {showConducted ? "Скрыть прошедшие" : `Показать прошедшие (${todayLessons.filter(l => l.status === "conducted").length})`}
                    </Button>
                  </div>
                )}
                
                <div className="bg-stone-50/50 p-2 rounded-3xl border border-stone-100 space-y-1">
                  {todayLessons.map((l) => {
                    const isConducted = l.status === "conducted";
                    if (isConducted && !showConducted) return null;
                    
                    return (
                      <div
                        key={l.id}
                        className={`flex items-center gap-4 p-3 rounded-2xl transition-all ${
                          isConducted 
                            ? "opacity-60 grayscale bg-transparent" 
                            : "bg-white shadow-sm border border-stone-200/60 hover:border-stone-300"
                        }`}
                      >
                        <div className="text-sm font-bold text-stone-500 w-12 text-right tabular-nums">{l.startTime}</div>
                        <div className={`h-10 w-10 rounded-xl ${getEntityColor(l.displayName).bg} flex items-center justify-center shrink-0`}>
                          <span className={`text-sm font-bold ${getEntityColor(l.displayName).text}`}>
                            {l.displayName[0]}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-bold truncate ${isConducted ? "line-through text-stone-500" : "text-stone-900"}`}>
                            {l.displayName}
                          </p>
                          <p className="text-xs text-stone-500">{l.subjectName}</p>
                        </div>
                      </div>
                    );
                  })}
                  {todayLessons.filter(l => l.status !== "conducted").length === 0 && !showConducted && (
                    <div className="p-4 text-center text-sm text-stone-500">
                      Остальных занятий на сегодня нет
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
        </div>

        {/* Right Column: Where's the fire? */}
        <div className="space-y-6">
          <h3 className="text-sm font-bold text-stone-900 uppercase tracking-widest flex items-center gap-2">
            <AlertCircle size={16} className="text-stone-400" />
            Где горит?
          </h3>

          {/* Ожидают оплаты */}
          <Card variant="elevated" padding={false} className="overflow-hidden border-stone-200/60">
            <div className="p-4 border-b border-stone-100 flex items-center gap-2 bg-stone-50/50">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                <Wallet size={16} />
              </div>
              <h4 className="font-bold text-stone-900">Ожидают оплаты</h4>
            </div>
            <div className="p-2">
              {loading ? (
                <div className="h-16 bg-stone-100 animate-pulse m-2 rounded-xl" />
              ) : moneyDebts.length === 0 ? (
                <div className="p-6 text-center">
                  <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mx-auto mb-3 shadow-inner">
                    <CheckCircle2 size={24} />
                  </div>
                  <p className="text-sm font-medium text-stone-900">Все оплаты получены.</p>
                  <p className="text-xs text-stone-500 mt-1">Идеально!</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {moneyDebts.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-2 hover:bg-stone-50 rounded-xl group transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-stone-900 truncate">{s.name}</p>
                        <p className="text-xs font-bold text-red-500">{s.balance} ₽</p>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="w-8 h-8 opacity-0 group-hover:opacity-100 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all" 
                          onClick={() => onNavigate("finance")}
                          title="Отметить оплату"
                        >
                          <Check size={16} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="w-8 h-8 opacity-0 group-hover:opacity-100 text-stone-400 hover:text-violet-600 hover:bg-violet-50 transition-all" 
                          onClick={() => setEmailModal({ isOpen: true, student: s })}
                          title="Напомнить"
                        >
                          <Bell size={16} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Ждут ДЗ */}
          <Card variant="elevated" padding={false} className="overflow-hidden border-stone-200/60">
            <div className="p-4 border-b border-stone-100 flex items-center gap-2 bg-stone-50/50">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                <BookOpen size={16} />
              </div>
              <h4 className="font-bold text-stone-900">Ждут ДЗ</h4>
            </div>
            <div className="p-2">
              {loading ? (
                <div className="h-16 bg-stone-100 animate-pulse m-2 rounded-xl" />
              ) : hwDebts.length === 0 ? (
                <div className="p-6 text-center">
                  <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mx-auto mb-3 shadow-inner">
                    <CheckCircle2 size={24} />
                  </div>
                  <p className="text-sm font-medium text-stone-900">Все домашки сданы и проверены.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {hwDebts.map(item => (
                    <div key={item.student.id} className="flex items-center justify-between p-2 hover:bg-stone-50 rounded-xl group transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-stone-900 truncate">{item.student.name}</p>
                        <p className="text-xs text-amber-600">{item.count} не сдано</p>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="w-8 h-8 opacity-0 group-hover:opacity-100 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all" 
                          onClick={() => onNavigate("students")}
                          title="Перейти к карточке ученика"
                        >
                          <Check size={16} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="w-8 h-8 opacity-0 group-hover:opacity-100 text-stone-400 hover:text-amber-600 hover:bg-amber-50 transition-all" 
                          onClick={() => setEmailModal({ isOpen: true, student: item.student })}
                          title="Напомнить о ДЗ"
                        >
                          <Bell size={16} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

        </div>
      </div>

      <EmailGeneratorModal
        isOpen={emailModal.isOpen}
        onClose={() => setEmailModal({ isOpen: false, student: null })}
        student={emailModal.student}
      />
    </PageWrapper>
  );
}
