import React, { useState } from "react";
import { formatMoney } from "../../utils/format.js";
import { Video, MapPin, Plus, ArrowRight } from "lucide-react";
import { getEntityStyle } from "../../utils/colors.js";
import { getPlural } from "../../utils/plural.js";
import Tooltip from "../ui/Tooltip.jsx";
import Button from "../ui/Button.jsx";

export default function StudentMiniCard({ 
  student, 
  lessons, 
  periodLabel = "на неделе",
  onAddLesson,
  onGoToProfile,
  onCardClick,
  isSelected,
}) {
  const [isHovered, setIsHovered] = useState(false);

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
  const activeLessonsCount = lessons.filter(l => l.status !== 'cancelled').length;

  const subject = student?.subjects?.[0];
  const style = getEntityStyle(student);

  return (
    <div 
      className={`bg-white rounded-xl p-4 flex flex-col gap-3 relative shrink-0 border-t-4 entity-border-top transition-all duration-200 ${
        isSelected
          ? "shadow-[0_0_0_2px_rgba(99,102,241,0.35),0_4px_20px_rgba(99,102,241,0.12)]"
          : onCardClick
            ? "shadow-sm ring-1 ring-slate-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)] hover:ring-slate-300"
            : "shadow-sm ring-1 ring-slate-200"
      } ${onCardClick ? "cursor-pointer" : ""}`}
      style={style}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onCardClick?.(student)}
    >
      {/* Hover action buttons */}
      <div
        className="absolute top-2.5 right-2.5 flex items-center gap-1 transition-all duration-150"
        style={{
          opacity: isHovered ? 1 : 0,
          transform: isHovered ? "translateY(0)" : "translateY(-4px)",
          pointerEvents: isHovered ? "auto" : "none",
        }}
      >
        {onAddLesson && (
          <Tooltip text="Добавить урок" position="top">
            <Button
              variant="ghost"
              onClick={(e) => { e.stopPropagation(); onAddLesson(student); }}
              className="w-6 h-6 rounded-md p-0 bg-slate-100 hover:bg-blue-100 hover:text-blue-600 text-slate-500 flex items-center justify-center transition-colors duration-100 border-none"
            >
              <Plus size={13} strokeWidth={2.5} />
            </Button>
          </Tooltip>
        )}
        {onGoToProfile && (
          <Tooltip text="К ученику" position="top">
            <Button
              variant="ghost"
              onClick={(e) => { e.stopPropagation(); onGoToProfile(student); }}
              className="w-6 h-6 rounded-md p-0 bg-slate-100 hover:bg-slate-200 hover:text-slate-700 text-slate-500 flex items-center justify-center transition-colors duration-100 border-none"
            >
              <ArrowRight size={13} strokeWidth={2.5} />
            </Button>
          </Tooltip>
        )}
      </div>

      {/* Header */}
      <div className="flex gap-3 items-center pr-14">
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
        
        {(nextLesson?.format || subject?.format) && (nextLesson?.format || subject?.format) !== 'unknown' && (
          <>
            <span className="text-stone-300">•</span>
            <div className="flex items-center gap-1">
              {(nextLesson?.format || subject?.format) === "online" ? (
                (nextLesson?.videoLink || subject?.videoLink) ? (
                  <a href={nextLesson?.videoLink || subject?.videoLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium cursor-pointer" onClick={(e) => e.stopPropagation()}>
                    <Video size={13} className="text-blue-500" /> Онлайн
                  </a>
                ) : (
                  <><Video size={13} className="text-stone-400" /> Онлайн</>
                )
              ) : (nextLesson?.format || subject?.format) === "offline" ? (
                <><MapPin size={13} className="text-stone-400" /> Очно</>
              ) : (nextLesson?.format || subject?.format) === "mixed" ? (
                "Смешанный"
              ) : null}
            </div>
          </>
        )}
      </div>

      <div className="h-px bg-stone-100 w-full" />

      {/* Footer / Summary */}
      <div className="flex justify-between items-center text-xs">
        <span className="text-stone-500">
          {activeLessonsCount} {getPlural(activeLessonsCount, ["занятие", "занятия", "занятий"])} {periodLabel}
        </span>
        {totalPrice !== 0 && (
          <span className="font-bold text-stone-900">{formatMoney(totalPrice)}</span>
        )}
      </div>
    </div>
  );
}
