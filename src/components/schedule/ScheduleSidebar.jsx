import React, { useMemo } from "react";
import StudentMiniCard from "./StudentMiniCard.jsx";
import Button from "../ui/Button.jsx";

export default function ScheduleSidebar({ lessons, students, groups, periodLabel = "на неделе", onCreateLesson, onCreateStudent, onAddLesson, onGoToProfile, selectedEntityId, onCardClick, isTimelineMode, selectedDateStr, onQuickModal, onOpenInspector }) {
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

  const hasAnyStudents = (students && students.length > 0) || (groups && groups.length > 0);

  if (!hasAnyStudents) {
    return (
      <div className="flex flex-col h-full bg-white relative shadow-sm rounded-[28px] overflow-hidden border border-stone-100">
        <div className="flex flex-1 flex-col items-center justify-center py-16 px-4 text-center animate-fade-in w-full">
          <Button 
            variant="ghost"
            onClick={onCreateStudent}
            className="w-16 h-16 rounded-full flex items-center justify-center p-0 mb-5 bg-blue-100 text-blue-600 hover:bg-blue-200 shadow-sm hover:shadow-md transition-all border-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
          </Button>
          <h3 className="text-xl font-bold text-stone-900 mb-2 tracking-tight">Здесь пока пусто</h3>
          <p className="text-stone-500 text-sm font-medium">Чтобы составить расписание, сначала добавьте учеников</p>
        </div>
      </div>
    );
  }

  if (cardsData.length === 0) {
    return (
      <div className="flex flex-col h-full bg-white relative shadow-sm rounded-[28px] overflow-hidden border border-stone-100">
        <div className="flex flex-1 flex-col items-center justify-center py-16 px-4 text-center animate-fade-in w-full">
          <Button 
            variant="ghost"
            onClick={onCreateLesson}
            className="w-16 h-16 rounded-full flex items-center justify-center p-0 mb-5 bg-indigo-100 text-indigo-600 hover:bg-indigo-200 shadow-sm hover:shadow-md transition-all border-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><line x1="10" x2="14" y1="16" y2="16"/><line x1="12" x2="12" y1="14" y2="18"/></svg>
          </Button>
          <h3 className="text-xl font-bold text-stone-900 mb-2 tracking-tight">Уроков пока нет</h3>
          <p className="text-stone-500 text-sm font-medium">Нажмите на иконку, чтобы запланировать первое занятие.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white relative shadow-sm rounded-[28px] overflow-hidden border border-stone-100">
      <div className="flex justify-between items-center px-6 py-5 border-b border-stone-100/80 bg-white shrink-0">
        <h3 className="font-semibold text-lg text-stone-800">
          {isTimelineMode ? "Расписание на день" : "Ученики"}
        </h3>
        <span className="text-xs font-bold text-stone-400">
          {isTimelineMode ? lessons.length : cardsData.length}
        </span>
      </div>
      <div className="flex-1 min-h-0 relative overflow-hidden">
        <div className="h-full overflow-y-auto px-6 pt-5 pb-16 bg-stone-50/30 hide-scrollbar flex flex-col gap-3">
          {isTimelineMode ? (
            <div className="flex flex-col gap-2">
              {[...lessons].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '')).map((lesson) => {
                const entity = lesson.type === 'individual' ? students.find(s => s.id === lesson.studentId) : groups.find(g => g.id === lesson.groupId);
                const title = entity ? entity.name : 'Неизвестно';
                const colorStr = entity?.colorOklch ? `oklch(${entity.colorOklch.l} ${entity.colorOklch.c ?? 0.12} ${entity.colorOklch.h})` : '#e7e5e4';
                return (
                  <div key={lesson.id} className="relative group">
                    <Button 
                      variant="ghost"
                      onClick={() => onCardClick({ id: lesson.id, type: 'lesson' })}
                      className="flex flex-col items-start w-full h-auto p-3 bg-white border border-stone-200 rounded-xl hover:border-[#006584]/30 hover:shadow-sm hover:bg-white transition-all text-left font-normal"
                      style={{ borderLeft: `4px solid ${colorStr}` }}
                    >
                      <div className="text-xs font-bold text-stone-500 mb-1">{lesson.startTime} - {lesson.endTime}</div>
                      <div className="text-sm font-semibold text-stone-800">{title}</div>
                      {lesson.subjectName && <div className="text-[11px] text-stone-400 mt-0.5">{lesson.subjectName}</div>}
                    </Button>
                    
                    {onQuickModal && (
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          className="w-7 h-7 p-0 rounded-md bg-stone-100/80 backdrop-blur text-stone-500 hover:bg-emerald-100 hover:text-emerald-600 shadow-sm border border-stone-200/50 flex items-center justify-center"
                          onClick={(e) => { e.stopPropagation(); onQuickModal(lesson, entity); }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            cardsData.map((data, idx) => (
              <StudentMiniCard 
                key={idx} 
                student={data.entity} 
                lessons={data.lessons} 
                periodLabel={periodLabel}
                onAddLesson={onAddLesson}
                onGoToProfile={onGoToProfile}
                onCardClick={onCardClick}
                isSelected={data.entity.id === selectedEntityId}
                onQuickModal={onQuickModal}
                onOpenInspector={onOpenInspector}
              />
            ))
          )}
        </div>
        {cardsData.length > 3 && (
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none z-10" />
        )}
      </div>
    </div>
  );
}
