import React, { useEffect, useState } from "react";
import { Card, Button, Tooltip } from "../components/ui/index.js";
import { db } from "../services/firebase.js";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { getEntityStyle } from "../utils/colors.js";
import { Phone, BookOpen, LogOut, Loader2 } from "lucide-react";

export default function GuestPortalView({ hash }) {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // В реальном приложении мы бы искали по хешу, 
    // но сейчас для демо просто найдем любого ученика, 
    // если хеша нет в базе (мокируем).
    const fetchStudent = async () => {
      try {
        const studentsRef = collection(db, "students");
        // Замокаем успешную загрузку первого попавшегося, если нет реального UUID.
        // В проде: query(studentsRef, where("guestHash", "==", hash))
        const snapshot = await getDocs(studentsRef);
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          setStudent({ id: doc.id, ...doc.data() });
        } else {
          setError("Ученик не найден");
        }
      } catch (err) {
        setError("Ошибка загрузки данных");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudent();
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

  return (
    <div className="min-h-screen w-full bg-stone-50 p-4 sm:p-6 md:p-8 flex justify-center">
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
          <div className="bg-stone-50/50 p-6 border-t border-stone-100 flex flex-wrap gap-8">
             <div>
                <p className="text-xs text-stone-400 font-bold uppercase mb-1">Проведено уроков</p>
                <p className="text-xl font-bold text-stone-800">12</p>
             </div>
             <div>
                <p className="text-xs text-stone-400 font-bold uppercase mb-1">Выполнено ДЗ</p>
                <p className="text-xl font-bold text-emerald-600">85%</p>
             </div>
             {student.balance < 0 && (
               <div>
                  <p className="text-xs text-stone-400 font-bold uppercase mb-1">Задолженность</p>
                  <p className="text-xl font-bold text-terracotta">{Math.abs(student.balance)} ₽</p>
               </div>
             )}
          </div>
        </Card>

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

        {/* Notes */}
        {student.notes && (
          <div className="mt-8">
            <h3 className="text-lg font-bold text-stone-800 mb-4">Комментарий репетитора</h3>
            <Card className="bg-stone-50 border-stone-200 shadow-sm">
              <p className="text-stone-700 leading-relaxed font-medium">{student.notes}</p>
            </Card>
          </div>
        )}
        
        {/* Placeholder for Lesson History */}
        <div className="mt-8">
           <h3 className="text-lg font-bold text-stone-800 mb-4">Расписание и история</h3>
           <Card className="py-8 flex flex-col items-center justify-center text-stone-400 bg-stone-50/50 border-dashed">
              <BookOpen size={32} className="mb-2 opacity-50" />
              <p>Здесь будет отображаться лента уроков (Этап 3)</p>
           </Card>
        </div>
      </div>
    </div>
  );
}
