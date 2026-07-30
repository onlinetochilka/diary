import React from "react";
import { formatMoney } from "../../utils/format.js";

export default function ScheduleStatsRow({ lessons, students, periodLabel = "на неделе" }) {
  if (!lessons || lessons.length === 0) {
    return null;
  }

  // Calculate stats
  let totalLessons = 0;
  let totalHours = 0;
  let expectedRevenue = 0;
  const uniqueStudents = new Set();

  lessons.forEach(l => {
    if (l.status === "cancelled") return;

    totalLessons++;
    
    // Calculate duration in hours
    const [startH, startM] = l.startTime.split(':').map(Number);
    const [endH, endM] = l.endTime.split(':').map(Number);
    const duration = (endH + endM / 60) - (startH + startM / 60);
    if (duration > 0) totalHours += duration;

    // Unique students and Revenue
    if (l.type === "individual" && l.studentId) {
      uniqueStudents.add(l.studentId);
      if (l.status !== "cancelled" && l.status !== "skipped_free") {
        if (l.customPrice != null) {
           expectedRevenue += Number(l.customPrice);
        } else {
           const student = students.find(s => s.id === l.studentId);
           const price = student?.subjects?.[0]?.price || 0;
           expectedRevenue += price;
        }
      }
    } else if (l.type === "group" && l.groupId) {
       // Group logic
       if (l.status !== "cancelled" && l.status !== "skipped_free") {
         if (l.customPrice != null) {
            expectedRevenue += Number(l.customPrice);
         }
       }
       uniqueStudents.add(`group_${l.groupId}`);
    }
  });

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 flex-1 px-2 sm:px-4">
      <div className="bg-white px-3 py-1.5 rounded-xl shadow-sm ring-1 ring-slate-200 flex flex-col items-center sm:items-start min-w-[90px]">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Занятий</span>
        <span className="text-base sm:text-lg font-black text-slate-800 leading-none">{totalLessons}</span>
      </div>
      <div className="bg-white px-3 py-1.5 rounded-xl shadow-sm ring-1 ring-slate-200 flex flex-col items-center sm:items-start min-w-[90px]">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Часов</span>
        <span className="text-base sm:text-lg font-black text-slate-800 leading-none">{Number(totalHours.toFixed(1))}</span>
      </div>
      <div className="bg-white px-3 py-1.5 rounded-xl shadow-sm ring-1 ring-slate-200 flex flex-col items-center sm:items-start min-w-[90px]">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Учеников</span>
        <span className="text-base sm:text-lg font-black text-slate-800 leading-none">{uniqueStudents.size}</span>
      </div>
      <div className="bg-white px-3 py-1.5 rounded-xl shadow-sm ring-1 ring-slate-200 flex flex-col items-center sm:items-start min-w-[110px]">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Доход</span>
        <span className="text-base sm:text-lg font-black text-slate-800 leading-none">{formatMoney(expectedRevenue)}</span>
      </div>
    </div>
  );
}
