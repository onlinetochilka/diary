import React from "react";
import { formatMoney } from "../../utils/format.js";

function StatItem({ label, value }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-xl font-black text-stone-800 tabular-nums leading-none">{value}</span>
      <span className="text-[11px] font-medium text-stone-400 leading-none">{label}</span>
    </div>
  );
}

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
           const parsed = Number(l.customPrice);
           if (!isNaN(parsed) && parsed >= 0) expectedRevenue += parsed;
        } else {
           const student = students.find(s => s.id === l.studentId);
           const matchedSubject = student?.subjects?.find(sub => sub.name === l.subjectName);
           const price = matchedSubject?.price ?? student?.subjects?.[0]?.price ?? 0;
           expectedRevenue += Math.max(0, price);
        }
      }
    } else if (l.type === "group" && l.groupId) {
       // Group logic
       if (l.status !== "cancelled" && l.status !== "skipped_free") {
          if (l.customPrice != null) {
             const gp = Number(l.customPrice);
             if (!isNaN(gp) && gp >= 0) expectedRevenue += gp;
          } else if (l.price != null) {
             const gp = Number(l.price);
             if (!isNaN(gp) && gp >= 0) expectedRevenue += gp;
          }
       }
       uniqueStudents.add(`group_${l.groupId}`);
    }
  });

  return (
    <div className="flex items-center gap-5 px-2">
      <StatItem label="занятий" value={totalLessons} />
      <div className="w-px h-6 bg-stone-200 shrink-0" />
      <StatItem label="часов" value={Number(totalHours.toFixed(1))} />
      <div className="w-px h-6 bg-stone-200 shrink-0" />
      <StatItem label="учеников" value={uniqueStudents.size} />
      <div className="w-px h-6 bg-stone-200 shrink-0" />
      <StatItem label="доход" value={formatMoney(expectedRevenue)} />
    </div>
  );
}
