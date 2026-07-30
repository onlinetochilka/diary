import React from "react";
import { formatMoney } from "../../utils/format.js";
import { Video, MapPin, User as UserIcon } from "lucide-react";
import { getEntityStyle } from "../../utils/colors.js";
import { getPlural } from "../../utils/plural.js";

export default function StudentMiniCard({ 
  student, 
  lessons, 
  periodLabel = "на неделе"
}) {
  if (!student || !lessons || lessons.length === 0) return null;

  // Sorting lessons to find the next one
  const sortedLessons = [...lessons].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.startTime.localeCompare(b.startTime);
  });
  
  const nextLesson = sortedLessons[0];
  const nextLessonDate = new Date(nextLesson.date);
  const nextLessonDayName = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"][nextLessonDate.getDay()];

  // Format: "Пн, 10:00"
  const timeStr = `${nextLessonDayName}, ${nextLesson.startTime}`;

  // Calculate total price for these lessons
  let totalPrice = 0;
  lessons.forEach(l => {
    if (l.status === "cancelled") return;
    if (l.customPrice !== undefined) {
      totalPrice += Number(l.customPrice);
    } else {
      const price = student?.subjects?.[0]?.price || 0;
      totalPrice += price;
    }
  });

  const subject = student?.subjects?.[0];
  const style = getEntityStyle(student.id);

  return (
    <div 
      className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 p-4 flex flex-col gap-3 relative overflow-hidden shrink-0 border-t-4 entity-border-top"
      style={style}
    >
      {/* Header */}
      <div className="flex gap-3 items-center">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-stone-900 truncate">
            {student.name}
          </div>
          <div className="text-xs text-stone-500 truncate flex gap-1 items-center">
            {subject ? (
              <>
                <span className="font-medium entity-text">{subject.name}</span>
                {student.grade && <span className="text-stone-300">•</span>}
              </>
            ) : null}
            {student.grade && <span>{student.grade} класс</span>}
          </div>
        </div>
      </div>

      {/* Next lesson info */}
      <div className="flex items-center gap-3 text-xs text-stone-600">
        <div className="flex items-center gap-1.5">
          <span className="font-medium">{timeStr}</span>
        </div>
        <span className="text-stone-300">•</span>
        <div className="flex items-center gap-1">
          {student.format === "online" ? (
            <><Video size={13} className="text-stone-400" /> Онлайн</>
          ) : student.format === "offline" ? (
            <><MapPin size={13} className="text-stone-400" /> Очно</>
          ) : student.format === "mixed" ? (
            "Смешанный"
          ) : (
            <span className="text-stone-400">Не указан</span>
          )}
        </div>
      </div>

      <div className="h-px bg-stone-100 w-full" />

      {/* Footer / Summary */}
      <div className="flex justify-between items-center text-xs">
        <span className="text-stone-500">
          {lessons.length} {getPlural(lessons.length, ["занятие", "занятия", "занятий"])} {periodLabel}
        </span>
        {totalPrice > 0 && (
          <span className="font-bold text-stone-900">{formatMoney(totalPrice)}</span>
        )}
      </div>
    </div>
  );
}
