import React, { useEffect, useState } from "react";
import { Card, Button, Tooltip } from "../components/ui/index.js";
import pb from "../services/pocketbase.js";
import { getEntityStyle } from "../utils/colors.js";
import { Phone, BookOpen, LogOut, Loader2 } from "lucide-react";

import { getLessons, getUserConfig } from "../services/database.js";

export default function GuestPortalView({ hash }) {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [config, setConfig] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    // В реальном приложении мы бы искали по хешу, 
    // но сейчас для демо просто найдём любого ученика, 
    // если хеша нет в базе (мокируем).
    // TODO: В продакшене — кастомный PocketBase endpoint для гостевого доступа по hash.
    const fetchData = async () => {
      try {
        const records = await pb.collection("students").getList(1, 1);
        if (records.items.length > 0) {
          const st = records.items[0];
          setStudent(st);
          
          // Получаем историю уроков и настройки репетитора параллельно
          const [loadedLessons, tutorConfig] = await Promise.all([
            getLessons({ studentId: st.id }),
            getUserConfig(st.tutorId)
          ]);
          
          loadedLessons.sort((a, b) => new Date(b.date) - new Date(a.date));
          setLessons(loadedLessons);
          setConfig(tutorConfig);
        } else {
          setError("Ученик не найден");
        }
      } catch (err) {
        console.warn("Guest access failed, falling back to mock data for UI testing:", err);
        // Если открыто в инкогнито, PocketBase выдаст 403. Для теста UI мокируем данные.
        setStudent({
          id: "mock1",
          name: "Мария Смирнова (Демо)",
          grade: "10 класс",
          balance: -4500,
          subjects: [{ name: "Математика", programs: [{ id: 1, name: "Подготовка к ЕГЭ", topics: [{ isCompleted: true }, { isCompleted: false }] }] }]
        });
        setLessons([
          { id: 1, date: new Date().toISOString().slice(0, 10), startTime: "15:00", status: "scheduled", theme: "Логарифмы", homework: "Решить вариант 4" },
          { id: 2, date: new Date(Date.now() - 86400000).toISOString().slice(0, 10), startTime: "14:00", status: "conducted", theme: "Производная", homework: "Номера 1-10", hwDoneBy: ["mock1"] },
          { id: 3, date: new Date(Date.now() - 86400000 * 3).toISOString().slice(0, 10), startTime: "14:00", status: "cancelled", theme: "Болезнь" }
        ]);
        setConfig({ requisites: "Сбербанк: 0000 0000 0000 0000 (Иванов И.И.)\nСБП: +7 (999) 123-45-67" });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [hash]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-stone-50">
        <Loader2 className="animate-spin text-stone-400" size={32} />
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-stone-50 p-4">
        <Card className="max-w-md w-full text-center p-8">
          <h2 className="text-xl font-bold text-stone-800 mb-2">Ссылка недействительна</h2>
          <p className="text-stone-500 mb-6">Возможно, репетитор обновил ссылку доступа.</p>
          <Button onClick={() => window.location.href = '/'}>На главную</Button>
        </Card>
      </div>
    );
  }

  const activeSubject = student.subjects?.[0];
  const conductedLessons = lessons.filter(l => l.status === 'conducted');
  const hwDone = conductedLessons.filter(l => !!l.homework && l.hwDoneBy?.includes(student.id)).length;
  const hwTotal = conductedLessons.filter(l => !!l.homework).length;
  const hwPercent = hwTotal > 0 ? Math.round((hwDone / hwTotal) * 100) : 0;

  const todayStr = new Date().toISOString().slice(0, 10);
  const upcomingLessons = lessons.filter(l => l.date >= todayStr && l.status === 'scheduled').reverse();
  const pastLessons = lessons.filter(l => l.date < todayStr || l.status !== 'scheduled');

  const renderLessonCard = (l) => {
    const isConducted = l.status === 'conducted';
    const isCancelled = l.status === 'cancelled';
    const isScheduled = l.status === 'scheduled';
    const hasHw = !!l.homework;
    const isHwDone = hasHw && l.hwDoneBy?.includes(student.id);

    return (
      <div key={l.id} className="relative pl-6 pb-6 last:pb-0">
        {/* Timeline dot and line */}
        <div className={`absolute left-[5px] top-1.5 bottom-[-6px] w-[2px] ${isScheduled ? 'bg-blue-100' : 'bg-stone-100'} last:hidden`} />
        <div className={`absolute left-0 top-1.5 w-3 h-3 rounded-full ring-4 ring-stone-50 ${isConducted ? 'bg-emerald-500' : isCancelled ? 'bg-red-400' : 'bg-blue-400'}`} />
        
        <Card className={`p-4 border shadow-sm ${isConducted ? 'border-emerald-100 bg-emerald-50/10' : isCancelled ? 'border-red-100 bg-red-50/10' : 'border-stone-200'}`}>
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm font-bold text-stone-800">
                {new Date(l.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                {l.startTime && ` • ${l.startTime}`}
              </p>
              <p className="text-xs text-stone-500 mt-0.5">{l.theme || 'Без темы'}</p>
            </div>
            <div className={`text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wide ${isConducted ? 'text-emerald-700 bg-emerald-100' : isCancelled ? 'text-red-700 bg-red-100' : 'text-blue-700 bg-blue-100'}`}>
              {isConducted ? 'Проведен' : isCancelled ? 'Отменен' : 'Запланирован'}
            </div>
          </div>
          
          {hasHw && (
            <div className="mt-3 flex items-start gap-2 bg-stone-50 p-2.5 rounded-lg border border-stone-100">
              <BookOpen size={14} className={isHwDone ? "text-emerald-500 mt-0.5" : "text-purple-500 mt-0.5"} />
              <div>
                <p className={`text-xs font-bold uppercase tracking-wider mb-0.5 ${isHwDone ? "text-emerald-600" : "text-stone-500"}`}>
                  {isHwDone ? 'Домашка сдана' : 'Домашнее задание'}
                </p>
                <p className="text-sm text-stone-700">{l.homework}</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full bg-stone-50 p-4 sm:p-6 md:p-8 flex justify-center pb-20">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2 text-stone-500">
            <BookOpen size={18} />
            <span className="font-semibold tracking-wide">Портал Ученика</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => window.location.href = '/'} className="text-stone-400">
            <LogOut size={16} className="mr-2" />
            Выйти
          </Button>
        </div>

        {/* Student Summary */}
        <Card padding={false} className="border-t-4 overflow-hidden" style={getEntityStyle(student)}>
          <div className="p-6">
            <h1 className="text-2xl font-bold text-stone-900 mb-1">{student.name}</h1>
            <p className="text-stone-500">{activeSubject?.name || 'Предмет не указан'} {student.grade && `• ${student.grade}`}</p>
          </div>
          <div className="bg-stone-50/50 p-6 border-t border-stone-100 flex flex-wrap gap-8 items-center">
             <div>
                <p className="text-xs text-stone-400 font-bold uppercase mb-1">Проведено уроков</p>
                <p className="text-xl font-bold text-stone-800">{conductedLessons.length}</p>
             </div>
             <div>
                <p className="text-xs text-stone-400 font-bold uppercase mb-1">Выполнено ДЗ</p>
                <p className="text-xl font-bold text-emerald-600">{hwPercent}%</p>
             </div>
             {student.balance < 0 && (
               <div className="flex-1 min-w-[200px]">
                 <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center justify-between">
                   <div>
                     <p className="text-xs text-red-400 font-bold uppercase mb-0.5">К оплате</p>
                     <p className="text-2xl font-black text-[#B71234]">{Math.abs(student.balance)} ₽</p>
                   </div>
                   <Button 
                     variant="primary" 
                     className="bg-[#B71234] hover:bg-[#B71234]/90 text-white shadow-sm"
                     onClick={() => setShowPaymentModal(true)}
                   >
                     Оплатить онлайн
                   </Button>
                 </div>
               </div>
             )}
          </div>
        </Card>

        {/* Payment Modal Stub */}
        {showPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <Card className="w-full max-w-md p-6 shadow-2xl relative">
              <button 
                onClick={() => setShowPaymentModal(false)}
                className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 p-1"
              >
                ✕
              </button>
              
              <div className="flex flex-col items-center text-center mb-6 mt-2">
                <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                </div>
                <h3 className="text-xl font-bold text-stone-900 mb-2">Оплата через ЮKassa</h3>
                <p className="text-stone-500 text-sm">
                  Онлайн-оплата находится в стадии интеграции. Совсем скоро вы сможете оплачивать занятия картой прямо здесь!
                </p>
              </div>

              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">А пока — реквизиты преподавателя:</p>
                <p className="text-stone-700 font-medium whitespace-pre-wrap leading-relaxed">
                  {config?.requisites || "Реквизиты не указаны репетитором."}
                </p>
              </div>
              
              <Button 
                variant="outline" 
                className="w-full mt-6"
                onClick={() => setShowPaymentModal(false)}
              >
                Понятно, спасибо
              </Button>
            </Card>
          </div>
        )}

        {/* Programs / Goals */}
        {activeSubject?.programs?.length > 0 && (
          <>
            <h3 className="text-lg font-bold text-stone-800 mt-8 mb-4">Текущие цели</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {activeSubject.programs.map(prog => {
                const total = prog.topics?.length || 0;
                const completed = prog.topics?.filter(t => t.isCompleted)?.length || 0;
                const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
                return (
                  <Card key={prog.id} className="p-5">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-semibold text-stone-800">{prog.name}</span>
                      <span className="text-sm font-bold text-stone-500">{percent}%</span>
                    </div>
                    <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500" 
                        style={{ ...getEntityStyle(prog), backgroundColor: 'oklch(var(--card-l) 0.12 var(--card-h))', width: `${percent}%` }}
                      />
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}
        
        {/* Timeline */}
        <div className="mt-10">
           <h3 className="text-lg font-bold text-stone-800 mb-6">Расписание и история уроков</h3>
           
           {upcomingLessons.length > 0 && (
             <div className="mb-8">
               <h4 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-4">Предстоящие</h4>
               <div className="ml-2">
                 {upcomingLessons.map(renderLessonCard)}
               </div>
             </div>
           )}

           {pastLessons.length > 0 ? (
             <div>
               <h4 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-4">Прошедшие</h4>
               <div className="ml-2">
                 {pastLessons.map(renderLessonCard)}
               </div>
             </div>
           ) : (
             <Card className="py-8 flex flex-col items-center justify-center text-stone-400 bg-stone-50/50 border-dashed">
                <BookOpen size={32} className="mb-2 opacity-50" />
                <p>История уроков пока пуста</p>
             </Card>
           )}
        </div>
      </div>
    </div>
  );
}
