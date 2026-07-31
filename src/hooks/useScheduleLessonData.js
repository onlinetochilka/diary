/**
 * useScheduleLessonData.js
 * ────────────────────────────────────────────────────────────────────────────
 * Хук вычисляемых данных для карточек уроков на странице расписания:
 *
 *   lessonsByDate             — Map<dateStr, Lesson[]>
 *   studentsWithDebt          — Set<studentId> у которых долг по ДЗ
 *   studentsWithFinDebt       — Set<studentId> у которых отрицательный баланс
 *   firstUpcomingLessonIdByStudent — Map<studentId, lessonId> ближайшего урока
 *   getLessonTopic            — (lesson) => topicTitle | null
 *   getLessonDisplayData      — (lesson) => { title, isFaded, colors, hasHwDebt, hasFinDebt }
 */

import { useMemo } from "react";
import { getEntityStyle, getEntityColorClasses } from "../utils/colors.js";
import { ymd } from "../components/schedule/scheduleUtils.jsx";

export function useScheduleLessonData({ lessons, students, groups, hwDebtOnly }) {
  // Map dateStr → Lesson[]
  const lessonsByDate = useMemo(() => {
    const map = {};
    lessons.forEach(l => {
      if (!map[l.date]) map[l.date] = [];
      map[l.date].push(l);
    });
    return map;
  }, [lessons]);

  // Set студентов с долгом по ДЗ
  const studentsWithDebt = useMemo(() => {
    const set = new Set();
    students.forEach(s => {
      if ((s.hwDebtCount || 0) > 0) set.add(s.id);
    });
    return set;
  }, [students]);

  // Set студентов с отрицательным балансом
  const studentsWithFinDebt = useMemo(() => {
    const set = new Set();
    students.forEach(s => {
      if ((s.balance || 0) < 0) set.add(s.id);
    });
    return set;
  }, [students]);

  // Map studentId → lessonId ближайшего предстоящего урока
  const firstUpcomingLessonIdByStudent = useMemo(() => {
    const today = ymd(new Date());
    const map = new Map();
    const futureLessons = lessons
      .filter(l => l.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

    futureLessons.forEach(l => {
      if (l.type === "individual" && l.studentId && !map.has(l.studentId)) {
        map.set(l.studentId, l.id);
      } else if (l.type === "group" && l.groupId) {
        const gr = groups.find(g => g.id === l.groupId);
        if (gr && gr.studentIds) {
          gr.studentIds.forEach(sid => {
            if (!map.has(sid)) map.set(sid, l.id);
          });
        }
      }
    });
    return map;
  }, [lessons, groups]);

  // Получить тему урока по programId/topicId
  const getLessonTopic = (l) => {
    if (!l.programId || !l.topicId) return null;
    let activePrograms = [];
    if (l.type === "individual" && l.studentId) {
      const student = students.find(s => s.id === l.studentId);
      if (student) {
        const subject = student.subjects?.find(sub => sub.name === l.subjectName) || student.subjects?.[0];
        if (subject?.programs) activePrograms = subject.programs;
      }
    } else if (l.type === "group" && l.groupId) {
      const group = groups.find(g => g.id === l.groupId);
      if (group?.programs) activePrograms = group.programs;
    }
    const program = activePrograms.find(p => p.id === l.programId);
    if (program) {
      const topic = program.topics?.find(t => t.id === l.topicId);
      return topic ? topic.title : null;
    }
    return null;
  };

  // Получить данные отображения карточки урока
  const getLessonDisplayData = (lesson) => {
    let title = "";
    let entity = null;
    if (lesson.type === "individual") {
      const st = students.find(s => s.id === lesson.studentId);
      title = st ? st.name : "Неизвестный ученик";
      entity = st;
    } else {
      const gr = groups.find(g => g.id === lesson.groupId);
      title = gr ? gr.name : "Группа удалена";
      entity = gr;
    }

    const c = getEntityColorClasses();
    const entityStyle      = getEntityStyle(entity || title);
    const borderColorClass = "border-transparent";
    const bgColorClass     = c.bg;
    const textColorClass   = c.text;

    const todayStr = ymd(new Date());
    const isPast   = ymd(new Date(lesson.date)) < todayStr;
    const isFaded  = isPast && lesson.status === "conducted";

    let hasHwDebt  = false;
    let hasFinDebt = false;

    if (!isPast && !hwDebtOnly) {
      if (lesson.type === "individual") {
        if (firstUpcomingLessonIdByStudent.get(lesson.studentId) === lesson.id) {
          hasHwDebt  = studentsWithDebt.has(lesson.studentId);
          hasFinDebt = (entity?.balance || 0) < 0;
        }
      } else if (lesson.type === "group" && entity && entity.studentIds) {
        const debtors    = entity.studentIds.filter(id => studentsWithDebt.has(id));
        hasHwDebt = debtors.some(id => firstUpcomingLessonIdByStudent.get(id) === lesson.id);
        const finDebtors = entity.studentIds.filter(id => {
          const st = students.find(s => s.id === id);
          return (st?.balance || 0) < 0;
        });
        hasFinDebt = finDebtors.some(id => firstUpcomingLessonIdByStudent.get(id) === lesson.id);
      }
    }

    return { title, isFaded, borderColorClass, textColorClass, bgColorClass, entityStyle, hasFinDebt, hasHwDebt };
  };

  return {
    lessonsByDate,
    studentsWithDebt,
    studentsWithFinDebt,
    firstUpcomingLessonIdByStudent,
    getLessonTopic,
    getLessonDisplayData,
  };
}
