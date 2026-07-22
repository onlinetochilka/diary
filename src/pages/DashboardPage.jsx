import React, { useState, useEffect } from "react";
import { PageWrapper } from "../components/layout/PageWrapper.jsx";
import { Card, Button } from "../components/ui/index.js";
import { LayoutDashboard, Users, TrendingUp, Clock, BookOpen, Plus, Coffee, AlertCircle, CheckCircle2, PlayCircle, Send, Wallet, Bell, Check, ChevronDown, ChevronUp } from "lucide-react";
import { getLessons, getStudents, getPayments } from "../services/database.js";
import { getEntityColor } from "../utils/colors.js";
import ActionItemModal from "../components/dashboard/ActionItemModal.jsx";
import ActionItemCard from "../components/dashboard/ActionItemCard.jsx";

export default function DashboardPage({ onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [todayLessons, setTodayLessons] = useState([]);
  const [showConducted, setShowConducted] = useState(false);
  
  const [nextLesson, setNextLesson] = useState(null);
  const [nextLessonState, setNextLessonState] = useState("done"); // "upcoming", "active", "done"
  
  const [hwDebts, setHwDebts] = useState([]);
  const [moneyDebts, setMoneyDebts] = useState([]);
  const [actionItems, setActionItems] = useState([]);
  
  const [stats, setStats] = useState({
    todayCount: 0,
    activeStudentsCount: 0,
    hoursWorkedThisMonth: 0,
    incomeMonth: 0
  });

  const [actionModal, setActionModal] = useState({ isOpen: false, item: null, mode: "remind" });

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

      // 5. Action Items (Combined)
      const combined = [
        ...mDebts.map(s => ({
           id: `money-${s.id}`,
           type: 'money',
           student: s,
           amount: Math.abs(s.balance),
           priority: Math.abs(s.balance)
        })),
        ...hwDebtsArr.map(item => ({
           id: `hw-${item.student.id}`,
           type: 'hw',
           student: item.student,
           count: item.count,
           priority: item.count * 1000 // Scale up to prioritize HW if there are many
        }))
      ];
      combined.sort((a, b) => b.priority - a.priority);
      setActionItems(combined);

      // 6. Stats
      const incomeMonth = payments
        .filter(p => new Date(p.paidAt) >= monthStart && new Date(p.paidAt) < nextMonthStart)
        .reduce((sum, p) => sum + Number(p.amount), 0);
        
      const monthLessonsStr = monthStart.toISOString().substring(0, 7);
      
      const hoursWorkedThisMonth = allLessons
        .filter(l => l.status === "conducted" && l.date.startsWith(monthLessonsStr))
        .reduce((total, l) => {
           if (!l.startTime || !l.endTime) return total;
           const [h1, m1] = l.startTime.split(':').map(Number);
           const [h2, m2] = l.endTime.split(':').map(Number);
           const dur = (h2 + m2 / 60) - (h1 + m1 / 60);
           return total + (dur > 0 ? dur : 0);
        }, 0);

      setStats({
        todayCount: todayL.length,
        activeStudentsCount: students.length,
        hoursWorkedThisMonth,
        incomeMonth
      });

      setLoading(false);
    }
    
    fetchData();
    const interval = setInterval(fetchData, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  const now = new Date();
  const monthNames = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  const dayNames = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
  const dateStr = `${now.getDate()} ${monthNames[now.getMonth()].toUpperCase()}`;
  const dayStr = dayNames[now.getDay()];

  return (
    <PageWrapper
      title="Главная"
      subtitle="Операционный центр"
      icon={LayoutDashboard}
      accentClass="text-stone-600"
    >
      {/* Stat cards (Навигационная панель) */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
        {[
          { label: dayStr, value: dateStr, color: "bg-clip-text text-transparent bg-gradient-to-br from-blue-600 to-cyan-400", nav: "schedule", navState: { view: "month" }, textClass: "text-2xl sm:text-3xl" },
          { label: "Уроков сегодня", value: loading ? "..." : stats.todayCount, color: "bg-gradient-to-br from-orange-400 to-rose-500 bg-clip-text text-transparent", nav: "schedule", navState: { view: "agenda" }, textClass: "text-5xl" },
          { label: `за ${loading ? '...' : Math.round(stats.hoursWorkedThisMonth)} ч`, value: loading ? "..." : `${(stats.incomeMonth / 1000).toFixed(1)}К`, color: "bg-clip-text text-transparent bg-gradient-to-br from-emerald-500 to-teal-400", nav: "finance", textClass: "text-5xl" },
          { label: "Активных учеников", value: loading ? "..." : stats.activeStudentsCount, color: "bg-gradient-to-br from-indigo-400 to-purple-500 bg-clip-text text-transparent", nav: "students", textClass: "text-5xl" },
        ].map((s, i) => (
          <button 
             key={i} 
             onClick={() => onNavigate(s.nav, s.navState)}
             type="button" 
             className="group animate-scale-in flex flex-col items-center justify-center py-6 bg-ivory rounded-2xl shadow-neu-sm hover:shadow-neu-md active:shadow-neu-sm-inset transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer select-none"
          >
            <p className={`${s.textClass} font-black mb-1.5 transition-transform duration-200 group-active:scale-95 ${s.color}`}>{s.value}</p>
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{s.label}</p>
          </button>
        ))}
      </div>

      <div className="space-y-10">
        
        {/* Слой 2: Расписание */}
        <section>
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
              {todayLessons.filter(l => l.status !== "conducted").map((l) => (
                <div
                  key={l.id}
                  className="bg-ivory shadow-neu-sm p-4 rounded-2xl flex items-center gap-4 transition-all hover:shadow-neu-md cursor-pointer group"
                  onClick={() => onNavigate("schedule")}
                >
                  <div className={`h-12 w-12 rounded-xl ${getEntityColor(l.displayName).bg} flex items-center justify-center shrink-0 shadow-inner`}>
                    <span className={`text-base font-bold ${getEntityColor(l.displayName).text}`}>
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
              ))}
            </div>
          )}
        </section>

        {/* Слой 3: Требует внимания (Action Items) */}
        {!loading && actionItems.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-6">
              <AlertCircle size={20} className="text-stone-400" />
              <h2 className="text-lg font-bold text-stone-800">Требует внимания</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {actionItems.map(item => (
                <ActionItemCard 
                  key={item.id} 
                  item={item} 
                  onMarkDone={(item) => setActionModal({ isOpen: true, item, mode: "mark_done" })}
                />
              ))}
            </div>
          </section>
        )}

      </div>

      <ActionItemModal
        isOpen={actionModal.isOpen}
        onClose={() => setActionModal({ isOpen: false, item: null, mode: "remind" })}
        item={actionModal.item}
        mode={actionModal.mode}
        onConfirm={(item) => {
          // This would ideally update the DB. For now, we'll just close it.
          console.log("Confirmed action on", item);
        }}
      />
    </PageWrapper>
  );
}
