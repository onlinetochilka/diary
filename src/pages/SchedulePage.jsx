import { useState, useEffect, useMemo, forwardRef, useRef } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, Plus, ChevronLeft, ChevronRight, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Tooltip } from "../components/ui/index.js";
import { useSchedule } from "../hooks/useSchedule.js";
import { getEntityStyle, getEntityColorClasses } from "../utils/colors.js";
import { DndContext, DragOverlay, pointerWithin, closestCenter } from "@dnd-kit/core";
import { useScheduleDragAndDrop } from "../hooks/useScheduleDragAndDrop.js";

import LessonDrawer from "../components/schedule/LessonDrawer.jsx";
import ActionItemModal from "../components/dashboard/ActionItemModal.jsx";
import { addPayment } from "../services/database.js";
import ScheduleStatsRow from "../components/schedule/ScheduleStatsRow.jsx";

import MonthView from "../components/schedule/MonthView.jsx";
import WeekView from "../components/schedule/WeekView.jsx";
import DayView from "../components/schedule/DayView.jsx";
import { LessonCardOverlay } from "../components/schedule/LessonCardOverlay.jsx";
import { ymd } from "../components/schedule/scheduleUtils.jsx";

// ── Shared Section Wrapper ─────────────────────────────────────────────────
function PageWrapper({ children, title, subtitle, icon: Icon, accentClass, extraHeader }) {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 flex flex-col h-[calc(100vh-theme(spacing.16))] sm:h-[100dvh]">
      <header className="max-w-[1400px] mx-auto w-full flex items-start justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 shrink-0">
          <span className={`p-2.5 rounded-2xl ${accentClass} bg-opacity-15`}>
            <Icon size={22} strokeWidth={1.5} className={accentClass} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-stone-900 tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-stone-500 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        {extraHeader && <div className="flex-1 min-w-0 flex justify-end">{extraHeader}</div>}
      </header>
      <div className="flex-1 flex flex-col min-h-0 w-full">
        {children}
      </div>
    </div>
  );
}

export default function SchedulePage({ pageState }) {
  const {
    lessons,
    students,
    groups,
    isLoading,
    handleSaveLesson: hookSaveLesson,
    handleCopyLesson: hookCopyLesson,
    handleDeleteLesson: hookDeleteLesson,
    handleQuickStatus: hookQuickStatus,
    handleQuickHomework: hookQuickHomework
  } = useSchedule();

  const [view, setView] = useState(pageState?.view || "week"); // 'month', 'week', 'day'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [navigatedFromMonth, setNavigatedFromMonth] = useState(false);

  useEffect(() => {
    if (pageState?.view) setView(pageState.view);
  }, [pageState]);
  
  const [hwDebtOnly, setHwDebtOnly] = useState(false);

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  
  // Action Modals State
  const [actionModal, setActionModal] = useState({ isOpen: false, item: null, mode: "confirm" });
  const [drawerInitialTab, setDrawerInitialTab] = useState("info");

  // Fast Tracking Popover State
  const [popover, setPopover] = useState(null); // { lesson, triggerRect }

  const periodLessons = useMemo(() => {
    if (view === "day") return [];
    let start, end;
    if (view === "month") {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      start = ymd(new Date(year, month, 1));
      end = ymd(new Date(year, month + 1, 0));
    } else if (view === "week") {
      const d = new Date(currentDate);
      const dayOfWeek = d.getDay() === 0 ? 6 : d.getDay() - 1;
      d.setDate(d.getDate() - dayOfWeek);
      start = ymd(d);
      const endD = new Date(d);
      endD.setDate(endD.getDate() + 6);
      end = ymd(endD);
    }
    return lessons.filter(l => l.date >= start && l.date <= end);
  }, [lessons, currentDate, view]);

  // Handle intent schedule entity
  useEffect(() => {
    const intent = localStorage.getItem('intent_schedule_entity');
    if (intent) {
      try {
        const parsed = JSON.parse(intent);
        localStorage.removeItem('intent_schedule_entity');
        setTimeout(() => {
          handleOpenDrawer({
            type: parsed.type,
            studentId: parsed.type === "individual" ? parsed.id : "",
            groupId: parsed.type === "group" ? parsed.id : "",
          });
        }, 300);
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (window.innerWidth < 1024) {
      setView(prev => prev !== "day" ? "day" : prev);
    }
    const handleResize = () => {
      setView(prev => {
        if (window.innerWidth < 1024 && prev !== "day") {
          return "day";
        }
        return prev;
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleOpenDrawer = (lesson = null, initialTab = "info") => {
    setPopover(null);
    setEditingLesson(lesson);
    setDrawerInitialTab(initialTab);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setEditingLesson(null);
  };

  const handleSaveLesson = async (id, data) => {
    await hookSaveLesson(id, data);
    handleCloseDrawer();
  };

  const handleDeleteLesson = async (id) => {
    await hookDeleteLesson(id);
    handleCloseDrawer();
  };

  const prevPeriod = () => {
    const d = new Date(currentDate);
    if (view === "month") d.setMonth(d.getMonth() - 1);
    else if (view === "week") d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const nextPeriod = () => {
    const d = new Date(currentDate);
    if (view === "month") d.setMonth(d.getMonth() + 1);
    else if (view === "week") d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const goToday = () => {
    setCurrentDate(new Date());
    if (window.innerWidth < 1024) setView("day");
  };

  const monthNames = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
  const year = currentDate.getFullYear();
  const monthName = monthNames[currentDate.getMonth()];
  
  let headerTitle = "";
  if (view === "month") {
    headerTitle = `${monthName} ${year}`;
  } else if (view === "week") {
    const d = new Date(currentDate);
    const dayOfWeek = d.getDay() === 0 ? 6 : d.getDay() - 1;
    d.setDate(d.getDate() - dayOfWeek);
    const endD = new Date(d);
    endD.setDate(endD.getDate() + 6);
    
    if (d.getMonth() === endD.getMonth()) {
      headerTitle = `${d.getDate()} - ${endD.getDate()} ${monthNames[d.getMonth()].toLowerCase()} ${year}`;
    } else {
      headerTitle = `${d.getDate()} ${monthNames[d.getMonth()].toLowerCase().slice(0,3)} - ${endD.getDate()} ${monthNames[endD.getMonth()].toLowerCase().slice(0,3)} ${year}`;
    }
  } else {
    headerTitle = `${currentDate.getDate()} ${monthNames[currentDate.getMonth()].toLowerCase()} ${year}`;
  }

  const {
    sensors,
    activeDragLesson,
    dragTimeDelta,
    dragWidth,
    dragHeight,
    isCopyMode,
    handleDragStart,
    handleDragMove,
    handleDragEnd
  } = useScheduleDragAndDrop({ view, hookCopyLesson, handleSaveLesson: hookSaveLesson });

  const lessonsByDate = useMemo(() => {
    const map = {};
    lessons.forEach(l => {
      if (!map[l.date]) map[l.date] = [];
      map[l.date].push(l);
    });
    return map;
  }, [lessons]);

  const studentsWithDebt = useMemo(() => {
    const set = new Set();
    students.forEach(s => {
      if ((s.hwDebtCount || 0) > 0) set.add(s.id);
    });
    return set;
  }, [students]);
  
  const studentsWithFinDebt = useMemo(() => {
    const set = new Set();
    students.forEach(s => {
      if ((s.balance || 0) < 0) set.add(s.id);
    });
    return set;
  }, [students]);

  const firstUpcomingLessonIdByStudent = useMemo(() => {
    const today = ymd(new Date());
    const map = new Map(); // studentId -> lessonId
    const futureLessons = lessons.filter(l => l.date >= today).sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
    
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
    let entityStyle = getEntityStyle(entity || title);
    let borderColorClass = "border-transparent";
    let bgColorClass = c.bg;
    let textColorClass = c.text;

    const todayStr = ymd(new Date());
    const isPast = ymd(new Date(lesson.date)) < todayStr;
    const isFaded = isPast && lesson.status === 'conducted';

    let hasHwDebt = false;
    let hasFinDebt = false;
    if (!isPast && !hwDebtOnly) {
      if (lesson.type === "individual") {
        if (firstUpcomingLessonIdByStudent.get(lesson.studentId) === lesson.id) {
          hasHwDebt = studentsWithDebt.has(lesson.studentId);
          hasFinDebt = (entity?.balance || 0) < 0;
        }
      } else if (lesson.type === "group" && entity && entity.studentIds) {
        const debtors = entity.studentIds.filter(id => studentsWithDebt.has(id));
        hasHwDebt = debtors.some(id => firstUpcomingLessonIdByStudent.get(id) === lesson.id);
        const finDebtors = entity.studentIds.filter(id => {
          const st = students.find(s => s.id === id);
          return (st?.balance || 0) < 0;
        });
        hasFinDebt = finDebtors.some(id => firstUpcomingLessonIdByStudent.get(id) === lesson.id);
      }
    }

    return {
      title,
      isFaded,
      borderColorClass,
      textColorClass,
      bgColorClass,
      entityStyle,
      hasFinDebt,
      hasHwDebt
    };
  };

  return (
    <PageWrapper 
      title="Рабочий календарь" 
      subtitle="Ваше время под контролем"
      icon={CalendarDays}
      accentClass="text-[#006584]"
      extraHeader={
        view !== "day" && (
          <ScheduleStatsRow 
            lessons={periodLessons} 
            students={students} 
            periodLabel={view === "month" ? "в месяц" : "на неделе"} 
          />
        )
      }
    >
      <div className="h-full flex flex-col pt-4 relative">
        {/* Header Section */}
        <div className="max-w-[1400px] mx-auto w-full flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-4 shrink-0 px-2 sm:px-0">
          <div className="flex items-center gap-3">
            <div className="flex p-1 bg-stone-100 rounded-lg shadow-sm ring-1 ring-slate-200 shrink-0">
              <button onClick={prevPeriod} className="w-9 h-9 flex items-center justify-center rounded-md text-stone-500 hover:text-stone-700 hover:bg-white hover:shadow-sm transition-all outline-none focus-visible:ring-2 focus-visible:ring-academic-blue">
                <ChevronLeft size={20} />
              </button>
              <button onClick={goToday} className="px-4 h-9 flex items-center justify-center rounded-md text-stone-600 font-medium text-sm hover:text-stone-800 hover:bg-white hover:shadow-sm transition-all outline-none focus-visible:ring-2 focus-visible:ring-academic-blue">
                Сегодня
              </button>
              <button onClick={nextPeriod} className="w-9 h-9 flex items-center justify-center rounded-md text-stone-500 hover:text-stone-700 hover:bg-white hover:shadow-sm transition-all outline-none focus-visible:ring-2 focus-visible:ring-academic-blue">
                <ChevronRight size={20} />
              </button>
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-800 tracking-tight whitespace-nowrap min-w-[140px]">
              {headerTitle}
            </h2>
          </div>
          
          <div className="flex items-center justify-between md:justify-end gap-4 flex-wrap">
            <div className="flex p-1 bg-stone-100 rounded-lg shadow-sm ring-1 ring-slate-200 shrink-0">
              {['month', 'week', 'day'].map((v) => (
                <button
                  key={v}
                  onClick={() => {
                    setView(v);
                    if (v !== 'day') setNavigatedFromMonth(false);
                  }}
                  className={`px-4 h-9 rounded-md text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-academic-blue ${view === v ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'}`}
                >
                  {v === 'month' ? 'Месяц' : v === 'week' ? 'Неделя' : 'День'}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => handleOpenDrawer()}
              className="ml-2 flex items-center justify-center gap-2 px-5 py-2.5 bg-academic-blue text-white rounded-xl text-sm font-medium hover:bg-academic-blue-light transition-colors shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-academic-blue active:scale-[0.98]"
            >
              <Plus size={18} strokeWidth={2} />
              Новый урок
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="max-w-[1400px] mx-auto w-full flex-1 min-h-0 flex flex-col overflow-hidden rounded-2xl p-0 sm:p-2 px-2 sm:px-0">
          <DndContext 
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd} 
            onDragCancel={() => {
              handleDragEnd({ active: null, over: null, delta: { x: 0, y: 0 } });
            }}
          >
            {view === "month" && (
              <MonthView 
                currentDate={currentDate} 
                year={year} 
                lessonsByDate={lessonsByDate} 
                students={students} 
                groups={groups} 
                firstUpcomingLessonIdByStudent={firstUpcomingLessonIdByStudent} 
                studentsWithDebt={studentsWithDebt} 
                studentsWithFinDebt={studentsWithFinDebt} 
                setCurrentDate={setCurrentDate} 
                setView={setView} 
                setNavigatedFromMonth={setNavigatedFromMonth} 
                periodLessons={periodLessons} 
              />
            )}
            {view === "week" && (
              <WeekView 
                currentDate={currentDate} 
                lessonsByDate={lessonsByDate} 
                students={students} 
                groups={groups} 
                firstUpcomingLessonIdByStudent={firstUpcomingLessonIdByStudent} 
                studentsWithDebt={studentsWithDebt} 
                studentsWithFinDebt={studentsWithFinDebt} 
                periodLessons={periodLessons} 
                handleOpenDrawer={handleOpenDrawer} 
                setPopover={setPopover} 
                isCopyMode={isCopyMode} 
                getLessonDisplayData={getLessonDisplayData} 
                getLessonTopic={getLessonTopic} 
              />
            )}
            {view === "day" && (
              <DayView 
                currentDate={currentDate} 
                lessonsByDate={lessonsByDate} 
                students={students} 
                groups={groups} 
                firstUpcomingLessonIdByStudent={firstUpcomingLessonIdByStudent} 
                studentsWithDebt={studentsWithDebt} 
                studentsWithFinDebt={studentsWithFinDebt} 
                handleOpenDrawer={handleOpenDrawer} 
                setPopover={setPopover} 
                setView={setView} 
                setNavigatedFromMonth={setNavigatedFromMonth} 
                navigatedFromMonth={navigatedFromMonth} 
                getLessonDisplayData={getLessonDisplayData} 
                getLessonTopic={getLessonTopic} 
              />
            )}
            {createPortal(
              <DragOverlay dropAnimation={null}>
                {activeDragLesson ? (
                  <LessonCardOverlay 
                    lesson={activeDragLesson} 
                    displayData={getLessonDisplayData(activeDragLesson)}
                    topic={getLessonTopic(activeDragLesson)}
                    compact={view === 'month'} 
                    dragTimeDelta={dragTimeDelta}
                    width={dragWidth}
                    height={dragHeight}
                    isCopyMode={isCopyMode}
                  />
                ) : null}
              </DragOverlay>,
              document.body
            )}
          </DndContext>
        </div>

      <LessonDrawer 
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        onSubmit={handleSaveLesson}
        onDelete={handleDeleteLesson}
        initialData={editingLesson}
        initialTab={drawerInitialTab}
        students={students}
        groups={groups}
        lessons={lessons}
      />

      {popover && createPortal(
        (() => {
          const rect = popover.triggerRect;
          const currentStatus = popover.lesson.status || 'planned';
          let showAbove = false;
          const popoverEstimatedHeight = 350;
          const spaceBelow = window.innerHeight - rect.bottom;
          const spaceAbove = rect.top;

          if (spaceBelow < popoverEstimatedHeight && spaceAbove > spaceBelow) {
             showAbove = true;
          }

          const style = {
            left: Math.max(16, Math.min(rect.left, window.innerWidth - 240))
          };

          if (showAbove) {
            style.bottom = window.innerHeight - rect.top + 4;
            style.maxHeight = `calc(100vh - ${window.innerHeight - rect.top + 20}px)`;
          } else {
            style.top = rect.bottom + 4;
            style.maxHeight = `calc(100vh - ${rect.bottom + 20}px)`;
          }

          return (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setPopover(null)} />
              <div 
                className="fixed z-50 bg-white rounded-xl shadow-lg ring-1 ring-slate-200 p-2 w-56 animate-in fade-in zoom-in duration-200 overflow-y-auto"
                style={style}
              >
                <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1 px-2 pt-1">Изменить статус</div>
                <button 
                  className={`w-full text-left px-3 py-1.5 text-sm rounded-lg flex items-center gap-2 ${currentStatus === 'conducted' ? 'bg-emerald-100 text-emerald-800 font-bold' : 'text-emerald-700 hover:bg-emerald-50'}`}
                  onClick={() => handleQuickStatus(popover.lesson, currentStatus === 'conducted' ? 'planned' : 'conducted')}
                >
                  <CheckCircle2 size={14} /> Проведен
                </button>
                <button 
                  className={`w-full text-left px-3 py-1.5 text-sm rounded-lg flex items-center gap-2 ${currentStatus === 'skipped_paid' ? 'bg-amber-100 text-amber-800 font-bold' : 'text-amber-700 hover:bg-amber-50'}`}
                  onClick={() => handleQuickStatus(popover.lesson, currentStatus === 'skipped_paid' ? 'planned' : 'skipped_paid')}
                >
                  <AlertCircle size={14} /> Оплаченный пропуск
                </button>
                <button 
                  className={`w-full text-left px-3 py-1.5 text-sm rounded-lg flex items-center gap-2 ${currentStatus === 'skipped_free' ? 'bg-stone-200 text-stone-800 font-bold' : 'text-stone-700 hover:bg-stone-50'}`}
                  onClick={() => handleQuickStatus(popover.lesson, currentStatus === 'skipped_free' ? 'planned' : 'skipped_free')}
                >
                  <AlertCircle size={14} /> Неоплаченный пропуск
                </button>
                <button 
                  className={`w-full text-left px-3 py-1.5 text-sm rounded-lg flex items-center gap-2 ${currentStatus === 'cancelled' ? 'bg-red-100 text-red-800 font-bold' : 'text-red-700 hover:bg-red-50'}`}
                  onClick={() => handleQuickStatus(popover.lesson, currentStatus === 'cancelled' ? 'planned' : 'cancelled')}
                >
                  <XCircle size={14} /> Отменён
                </button>
              </div>
            </>
          );
        })(),
        document.body
      )}

      {view === "week" && (
        <div className="text-center text-[11px] text-stone-400 mt-2 flex items-center justify-center gap-3">
          <span>💡 <strong>Подсказка:</strong> Перетащите урок на другой день.</span>
          <span>Чтобы скопировать его, зажмите <strong>Ctrl</strong> (или <strong>Alt</strong>).</span>
        </div>
      )}
      
      {/* ── Action Item Modal ─────────────────────────────────────────────── */}
      <ActionItemModal
        isOpen={actionModal.isOpen}
        onClose={() => setActionModal({ isOpen: false, item: null, mode: "confirm" })}
        item={actionModal.item}
        mode={actionModal.mode}
        onConfirm={async (item, selectedLessonsOrAmount) => {
          if (item.type === 'hw') {
            const l = item.lessons[0]; 
            await hookQuickHomework(l, item.student.id, true);
          } else if (item.type === 'money') {
            await addPayment({
              studentId: item.student.id,
              studentName: item.student.name,
              amount: selectedLessonsOrAmount,
              paidAt: new Date().toISOString(),
              comment: "Оплата с расписания"
            });
            if (pageState?.refreshData) pageState.refreshData(); 
            window.dispatchEvent(new CustomEvent('force-refresh-data'));
          }
        }}
      />

      </div>
    </PageWrapper>
  );
}
