import React, { useMemo } from "react";
import StudentMiniCard from "./StudentMiniCard.jsx";

export default function ScheduleSidebar({ lessons, students, groups, periodLabel = "на неделе" }) {
  const cardsData = useMemo(() => {
    if (!lessons || lessons.length === 0) return [];
    
    // Group lessons by studentId / groupId
    const map = new Map();
    
    lessons.forEach(l => {
      if (l.status === "cancelled") return;
      
      let key = null;
      let entity = null;
      let isGroup = false;
      
      if (l.type === "individual" && l.studentId) {
        key = `student_${l.studentId}`;
        entity = students.find(s => s.id === l.studentId);
      } else if (l.type === "group" && l.groupId) {
        key = `group_${l.groupId}`;
        entity = groups.find(g => g.id === l.groupId);
        isGroup = true;
      }
      
      if (key && entity) {
        if (!map.has(key)) {
          // Adapt group to look somewhat like student for the mini card
          const adaptedEntity = isGroup ? {
             ...entity,
             format: "online", // or derive from group members
             grade: null,
             subjects: [{ name: "Групповое занятие", price: 0 }] 
          } : entity;
          
          map.set(key, {
            entity: adaptedEntity,
            lessons: []
          });
        }
        map.get(key).lessons.push(l);
      }
    });

    const items = Array.from(map.values());
    
    // Sort by earliest next lesson
    items.forEach(item => {
      item.nextLessonTime = item.lessons.map(l => new Date(`${l.date}T${l.startTime}`).getTime()).sort()[0];
    });
    
    items.sort((a, b) => a.nextLessonTime - b.nextLessonTime);
    
    return items;
  }, [lessons, students, groups]);

  if (cardsData.length === 0) {
    return (
      <div className="hidden xl:flex flex-col w-80 shrink-0">
        <h3 className="font-semibold text-slate-800 mb-4 px-1">Ученики</h3>
        <div className="text-sm text-slate-500 bg-white p-4 rounded-2xl shadow-sm ring-1 ring-slate-200 text-center">
          Нет запланированных занятий {periodLabel}
        </div>
      </div>
    );
  }

  return (
    <div className="hidden xl:flex flex-col w-80 shrink-0">
      <div className="flex justify-between items-center mb-4 px-1">
        <h3 className="font-semibold text-slate-800">Ученики</h3>
        <span className="text-xs font-bold text-slate-400">{cardsData.length}</span>
      </div>
      <div className="flex flex-col gap-3 overflow-y-auto scrollbar-thin pr-2 pb-8" style={{ maxHeight: 'calc(100vh - 250px)' }}>
        {cardsData.map((data, idx) => (
          <StudentMiniCard 
            key={idx} 
            student={data.entity} 
            lessons={data.lessons} 
            periodLabel={periodLabel} 
          />
        ))}
      </div>
    </div>
  );
}
