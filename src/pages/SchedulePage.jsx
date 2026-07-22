import { useState, useEffect, useMemo, forwardRef } from "react";
import { CalendarDays, Plus, ChevronLeft, ChevronRight, CheckCircle2, XCircle, AlertCircle, Clock, FileText, PartyPopper, Copy } from "lucide-react";
import { Card, Button, Switch, SegmentedControl } from "../components/ui/index.js";
import { useSchedule } from "../hooks/useSchedule.js";
import { getEntityColor } from "../utils/colors.js";
import { DndContext, useDraggable, useDroppable, DragOverlay, pointerWithin, closestCenter, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import LessonDrawer from "../components/schedule/LessonDrawer.jsx";

// ── Shared Section Wrapper ─────────────────────────────────────────────────
function PageWrapper({ children, title, subtitle, icon: Icon, accentClass, extraHeader }) {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 flex flex-col h-[calc(100vh-theme(spacing.16))] sm:h-[100dvh]">
      <header className="flex items-start justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
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
        {extraHeader && <div>{extraHeader}</div>}
      </header>
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {children}
      </div>
    </div>
  );
}

// ── Subject Color Hash ───────────────────────────────────────────────────
function getSubjectColor(subjectName) {
  if (!subjectName) return "bg-stone-100 text-stone-800 border-stone-200";
  const colors = [
    "bg-indigo-100 text-indigo-800 border-indigo-200",
    "bg-violet-100 text-violet-800 border-violet-200",
    "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200",
    "bg-emerald-100 text-emerald-800 border-emerald-200",
    "bg-teal-100 text-teal-800 border-teal-200",
    "bg-cyan-100 text-cyan-800 border-cyan-200",
    "bg-amber-100 text-amber-800 border-amber-200",
    "bg-orange-100 text-orange-800 border-orange-200",
    "bg-rose-100 text-rose-800 border-rose-200",
  ];
  let hash = 0;
  for (let i = 0; i < subjectName.length; i++) {
    hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// ── Helpers ────────────────────────────────────────────────────────────────
const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year, month) => {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // 0=Mon, 6=Sun
};

const getLessonWord = (count) => {
  const n = Math.abs(count) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return "уроков";
  if (n1 > 1 && n1 < 5) return "урока";
  if (n1 === 1) return "урок";
  return "уроков";
};

// Format date to YYYY-MM-DD
const ymd = (d) => {
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
};

export default function SchedulePage({ pageState }) {
  const {
    lessons,
    students,
    groups,
    isLoading,
    handleSaveLesson: hookSaveLesson,
    handleDeleteLesson: hookDeleteLesson,
    handleQuickStatus: hookQuickStatus,
    handleQuickHomework: hookQuickHomework
  } = useSchedule();

  const [view, setView] = useState(pageState?.view || "week"); // 'month', 'week', 'agenda'
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    if (pageState?.view) setView(pageState.view);
  }, [pageState]);
  
  const [hwDebtOnly, setHwDebtOnly] = useState(false);
  const [colorMode] = useState(() => localStorage.getItem("app_color_mode") || "entity");

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);

  useEffect(() => {
    return () => {
      setIsDrawerOpen(false);
    };
  }, []);
  const [drawerInitialTab, setDrawerInitialTab] = useState("info");

  // Fast Tracking Popover State
  const [popover, setPopover] = useState(null); // { lesson, x, y }
  
  // Drag-and-Drop Quick Edit State
  const [timeEditPopover, setTimeEditPopover] = useState(null); // { lesson, newDate, isCopy, x, y }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );
  const [activeDragLesson, setActiveDragLesson] = useState(null);

  useEffect(() => {
    const intent = localStorage.getItem('intent_schedule_entity');
    if (intent) {
      try {
        const parsed = JSON.parse(intent);
        localStorage.removeItem('intent_schedule_entity');
        // Give time for data to load, then open drawer
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
    // Auto switch to agenda on mobile
    if (window.innerWidth < 1024) {
      setView(prev => prev !== "agenda" ? "agenda" : prev);
    }
    const handleResize = () => {
      setView(prev => {
        if (window.innerWidth < 1024 && prev !== "agenda") {
          return "agenda";
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

  const handleQuickStatus = async (lesson, status) => {
    setPopover(null);
    await hookQuickStatus(lesson, status);
  };

  const handleQuickHomework = async (lesson, studentId, isDone) => {
    try {
      const newHwDoneBy = await hookQuickHomework(lesson, studentId, isDone);
      
      if (lesson.type === "individual") {
        setPopover(null);
      } else {
        setPopover(prev => ({ ...prev, lesson: { ...prev.lesson, hwDoneBy: newHwDoneBy } }));
      }
    } catch (e) {
      console.error(e);
      alert("Ошибка при обновлении ДЗ");
    }
  };

  const handleDragStart = (event) => {
    setActiveDragLesson(event.active.data.current);
  };

  const handleDragEnd = (event) => {
    setActiveDragLesson(null);
    const { active, over } = event;
    if (!over) return;
    
    const lesson = active.data.current;
    const newDateStr = over.data.current.date;
    const oldDateStr = ymd(new Date(lesson.date));
    
    if (lesson && newDateStr && oldDateStr !== newDateStr) {
      setTimeEditPopover({
        lesson: lesson,
        newDate: newDateStr,
        isCopy: false,
        x: window.innerWidth / 2 - 150,
        y: window.innerHeight / 2 - 100
      });
    }
  };

  // ── Date Navigation ──────────────────────────────────────────────────────
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

  const goToday = () => setCurrentDate(new Date());

  const isLessonHwFullyDone = (l) => {
    if (!l.homework || l.homework.trim() === "") return true;
    if (l.type === "individual") {
      return l.hwDoneBy?.includes(l.studentId);
    } else {
      const group = groups.find(g => g.id === l.groupId);
      if (!group || !group.studentIds || group.studentIds.length === 0) return true;
      return group.studentIds.every(id => l.hwDoneBy?.includes(id));
    }
  };

  const filteredLessons = useMemo(() => {
    return lessons.filter(l => {
      if (hwDebtOnly) {
        // Only past lessons with homework assigned but not fully done
        const lessonDate = new Date(`${l.date}T${l.endTime}`);
        const isPast = lessonDate < new Date();
        return isPast && !isLessonHwFullyDone(l);
      }
      return true;
    });
  }, [lessons, hwDebtOnly, groups]);

  const lessonsByDate = useMemo(() => {
    const map = {};
    filteredLessons.forEach(l => {
      if (!map[l.date]) map[l.date] = [];
      map[l.date].push(l);
    });
    // Sort within each day by start time
    Object.keys(map).forEach(date => {
      map[date].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
    return map;
  }, [filteredLessons]);

  const monthName = currentDate.toLocaleString("ru", { month: "long" });
  const year = currentDate.getFullYear();
  const headerTitle = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;

  const renderStatusIcon = (status) => {
    switch(status) {
      case "conducted": return <CheckCircle2 size={12} className="text-emerald-600" />;
      case "cancelled": return <XCircle size={12} className="text-red-500" />;
      case "skipped_paid": return <AlertCircle size={12} className="text-amber-500" />;
      case "skipped_free": return <AlertCircle size={12} className="text-stone-400" />;
      default: return null;
    }
  };

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

  const LessonCardView = forwardRef(({ 
    lesson, onClick, compact = false, isOverlay = false, 
    isDragging = false, isFaded = false, title, borderColorClass, textColorClass, 
    listeners = {}, attributes = {}, style = {}
  }, ref) => {
    return (
      <div 
        ref={ref}
        {...listeners}
        {...attributes}
        onClick={(e) => {
          if (isDragging || isOverlay) return;
          onClick(e, lesson);
        }}
        style={style}
        className={`pl-2 pr-1.5 ${compact ? 'py-0.5 border-l-[3px]' : 'py-1.5 border-l-4'} rounded-lg cursor-pointer transition-all relative outline-none focus-visible:ring-2 focus-visible:ring-[#006584] ${borderColorClass} ${isOverlay ? 'cursor-grabbing bg-white shadow-neu-xl scale-105 rotate-1' : 'bg-white/50 hover:bg-white hover:shadow-neu-sm hover:-translate-y-px active:shadow-neu-sm-inset'} ${isFaded ? "opacity-50 grayscale" : ""}`}
      >
        <div className={`flex items-center justify-between ${compact ? '' : 'mb-0.5'}`}>
          <span className={`font-bold tabular-nums ${textColorClass} ${compact ? 'text-[9px]' : 'text-xs'}`}>{lesson.startTime}</span>
          <div className="flex gap-1 items-center shrink-0">
            {renderStatusIcon(lesson.status)}
          </div>
        </div>
        <div className={`font-medium flex items-center justify-between gap-1 min-w-0 ${lesson.status === 'cancelled' ? 'line-through' : ''}`}>
          <span className={`truncate min-w-0 flex-1 font-bold text-stone-800 ${compact ? 'text-[9.5px] leading-tight' : 'text-xs'}`}>{title}</span>
          {lesson.homework && (
            <div 
              className="shrink-0 flex items-center justify-center" 
              title={isLessonHwFullyDone(lesson) ? "ДЗ сдано" : "Долг по ДЗ"}
            >
              <FileText size={10} className={isLessonHwFullyDone(lesson) ? "text-[#006584]" : "text-[#B71234]"} strokeWidth={2.5} />
            </div>
          )}
        </div>
      </div>
    );
  });

  const getLessonDisplayData = (lesson) => {
    let title = "Неизвестно";
    if (lesson.type === "individual") {
      const st = students.find(s => s.id === lesson.studentId);
      title = st ? st.name : "Ученик удален";
    } else {
      const gr = groups.find(g => g.id === lesson.groupId);
      title = gr ? gr.name : "Группа удалена";
    }

    const isPast = ymd(new Date(lesson.date)) < ymd(new Date()) && lesson.status !== "planned";
    const isFaded = isPast || hwDebtOnly;
    
    let borderColorClass = "";
    let textColorClass = "";
    
    if (lesson.group) {
      const subjColor = getSubjectColor(lesson.subject);
      borderColorClass = subjColor.replace('bg-', 'border-');
      textColorClass = subjColor.replace('bg-', 'text-').replace('100', '700').replace('50', '700');
    } else {
      const c = getEntityColor(title);
      borderColorClass = c.border;
      textColorClass = c.text;
    }
    
    if (!borderColorClass.includes('border-')) borderColorClass = 'border-indigo-400';
    if (!textColorClass.includes('text-')) textColorClass = 'text-indigo-700';

    return { title, isFaded, borderColorClass, textColorClass };
  };

  const LessonCardOverlay = ({ lesson, compact = false }) => {
    const { title, isFaded, borderColorClass, textColorClass } = getLessonDisplayData(lesson);
    return (
      <LessonCardView 
        lesson={lesson}
        onClick={() => {}}
        compact={compact}
        isOverlay={true}
        isDragging={false}
        isFaded={isFaded}
        title={title}
        borderColorClass={borderColorClass}
        textColorClass={textColorClass}
        style={{
          boxShadow: "var(--shadow-neu-xl)",
          cursor: "grabbing",
          zIndex: 50,
          margin: 0
        }}
      />
    );
  };

  const LessonCard = ({ lesson, onClick, compact = false }) => {
    const { title, isFaded, borderColorClass, textColorClass } = getLessonDisplayData(lesson);
    
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
      id: `lesson-${lesson.id}`,
      data: lesson
    });

    return (
      <LessonCardView 
        ref={setNodeRef}
        lesson={lesson}
        onClick={onClick}
        compact={compact}
        isOverlay={false}
        isDragging={isDragging}
        isFaded={isFaded}
        title={title}
        borderColorClass={borderColorClass}
        textColorClass={textColorClass}
        listeners={listeners}
        attributes={attributes}
        style={{ opacity: isDragging ? 0.3 : 1 }}
      />
    );
  };

  const DroppableSlot = ({ id, date, isToday, children, className }) => {
    const { isOver, setNodeRef } = useDroppable({
      id: id,
      data: { date }
    });
    
    return (
      <div 
        ref={setNodeRef} 
        className={`${className} transition-all duration-300 ${isOver ? 'shadow-neu-sm-inset bg-stone-200/20' : ''}`}
      >
        {children}
      </div>
    );
  };

  const renderMonth = () => {
    const daysInMonth = getDaysInMonth(year, currentDate.getMonth());
    const firstDay = getFirstDayOfMonth(year, currentDate.getMonth());
    const days = [];
    
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    const todayStr = ymd(new Date());

    return (
      <div className="flex-1 min-h-0 rounded-2xl overflow-hidden flex flex-col">
        <div className="grid grid-cols-7 shrink-0 border-b border-white/70">
          {['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'].map(d => (
            <div key={d} className="py-2 text-center text-[10px] font-bold text-stone-400 uppercase tracking-widest border-r border-white/70 last:border-0">
              {d}
            </div>
          ))}
        </div>
        <div 
          className="grid grid-cols-7 flex-1 overflow-hidden"
          style={{ gridTemplateRows: `repeat(${days.length / 7}, minmax(0, 1fr))` }}
        >
          {days.map((day, idx) => {
            if (!day) return <div key={idx} className="min-w-0 border-r border-b border-white/70 bg-transparent opacity-50 p-1" />;
            
            const dateStr = ymd(new Date(year, currentDate.getMonth(), day));
            const dayLessons = lessonsByDate[dateStr] || [];
            const isToday = dateStr === todayStr;
            const isPast = dateStr < todayStr;

            return (
              <DroppableSlot 
                key={idx} 
                id={`month-slot-${dateStr}`} 
                date={dateStr}
                className={`group/day min-w-0 border-r border-b border-white/70 p-1 flex flex-col min-h-0 ${isToday ? "bg-white/30 shadow-neu-sm-inset" : "bg-transparent hover:bg-white/30 transition-colors"}`}
                onClick={() => {
                  setView("agenda");
                  setTimeout(() => {
                    const el = document.getElementById(`agenda-date-${dateStr}`);
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }, 100);
                }}
              >
                <div className={`flex-1 flex flex-col min-h-0 ${isPast ? "opacity-40 grayscale pointer-events-none" : ""}`}>
                  <div className="flex items-center justify-between mb-1.5 px-1 shrink-0">
                    <span className={`text-xs font-semibold ${isToday ? "bg-[#006584] shadow-neu-sm text-white w-6 h-6 rounded-full flex items-center justify-center" : "text-stone-500"}`}>
                      {day}
                    </span>
                    <div className="flex items-center gap-1 pointer-events-auto">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleOpenDrawer({ date: dateStr }); }}
                        className="opacity-0 group-hover/day:opacity-100 text-stone-400 hover:text-indigo-600 hover:bg-indigo-50 p-0.5 rounded transition-all"
                        title="Добавить урок"
                      >
                        <Plus size={14} strokeWidth={2.5} />
                      </button>
                      {dayLessons.length > 0 && (
                        <span className="text-[10px] text-stone-400">{dayLessons.length} ур.</span>
                      )}
                    </div>
                  </div>
                <div className="flex-1 space-y-0.5 overflow-hidden px-0.5 mt-0.5">
                  {dayLessons.slice(0, 2).map(l => (
                    <LessonCard 
                      key={l.id} 
                      lesson={l}
                      compact={true}
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setPopover({ lesson: l, x: rect.left, y: rect.bottom });
                      }} 
                    />
                  ))}
                </div>
                {dayLessons.length > 2 && (
                  <div className="text-center pb-0.5">
                    <button 
                      className="inline-block bg-black/5 hover:bg-black/10 text-stone-500 text-[10px] font-medium rounded-full px-1.5 py-0.5 cursor-pointer transition-colors mt-0.5 pointer-events-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        setView("agenda");
                        setTimeout(() => {
                          const el = document.getElementById(`agenda-date-${dateStr}`);
                          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                        }, 100);
                      }}
                    >
                      + {dayLessons.length - 2} {getLessonWord(dayLessons.length - 2)}
                    </button>
                  </div>
                )}
                </div>
              </DroppableSlot>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeek = () => {
    const d = new Date(currentDate);
    const dayOfWeek = d.getDay() === 0 ? 6 : d.getDay() - 1;
    d.setDate(d.getDate() - dayOfWeek); // Start of week (Monday)
    
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      weekDays.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }

    const todayStr = ymd(new Date());

    return (
      <div className="flex-1 min-h-0 flex gap-1 lg:gap-2 overflow-hidden pb-2">
        {weekDays.map((wd, i) => {
          const dateStr = ymd(wd);
          const isToday = dateStr === todayStr;
          const isPast = dateStr < todayStr;
          const isWeekend = i === 5 || i === 6;
          const dayName = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'][i];
          const dayLessons = lessonsByDate[dateStr] || [];
          const isNarrow = isWeekend && dayLessons.length === 0;

          return (
            <div key={dateStr} className={`group ${isNarrow ? 'w-10 sm:w-12 shrink-0' : 'flex-1 min-w-0'} flex flex-col transition-all rounded-xl ${isToday ? "bg-white/30 shadow-neu-sm-inset" : isPast ? "bg-transparent opacity-60" : "bg-transparent hover:bg-white/30"}`}>
              <div className={`p-2 sm:p-3 shrink-0 ${isPast ? 'opacity-60' : ''}`}>
                <div className="text-center font-medium leading-tight">
                  <div className={`text-[9px] sm:text-[10px] font-bold tracking-widest uppercase mb-1 sm:mb-2 ${isToday ? 'text-[#006584]' : 'text-stone-400'}`}>{dayName}</div>
                </div>
                <div className="flex justify-center">
                  <div className={`text-lg sm:text-2xl font-bold leading-none flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full ${isToday ? 'bg-[#006584] text-white shadow-neu-sm' : 'text-stone-800'}`}>
                    {wd.getDate()}
                  </div>
                </div>
              </div>
              <DroppableSlot 
                id={`week-slot-${dateStr}`}
                date={dateStr}
                className={`flex-1 min-h-[140px] p-1 sm:p-2 flex flex-col transition-colors border-l border-white/70 ${isPast ? 'opacity-60' : ''}`}
              >
                {!isNarrow && (
                  <button 
                    className="w-full mb-2 flex items-center justify-center py-1.5 text-stone-400 font-medium text-[11px] bg-transparent hover:shadow-neu-sm-inset rounded-xl transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#006584] opacity-30 md:opacity-0 md:group-hover:opacity-100"
                    onClick={() => handleOpenDrawer({ date: dateStr })}
                  >
                    <Plus size={14} className="mr-1" /> Добавить
                  </button>
                )}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                  {dayLessons.map(l => (
                    <LessonCard 
                      key={l.id} 
                      lesson={l} 
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setPopover({ lesson: l, x: rect.left, y: rect.bottom });
                      }} 
                    />
                  ))}
                  {dayLessons.length === 0 && !isNarrow && (
                    <div className="h-20 flex flex-col items-center justify-center text-[11px] text-stone-400 opacity-60 text-center px-1">
                      {hwDebtOnly ? (
                        <>
                          <PartyPopper size={16} className="text-emerald-400 mb-1 opacity-80" strokeWidth={1.5} />
                          <span>Все долги сданы</span>
                        </>
                      ) : (
                        <span className="italic">Нет уроков</span>
                      )}
                    </div>
                  )}
                </div>
              </DroppableSlot>
            </div>
          );
        })}
      </div>
    );
  };

  const renderAgenda = () => {
    const sortedDates = Object.keys(lessonsByDate).sort();
    
    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin pb-8">
        <div className="max-w-4xl mx-auto space-y-6 pr-2">
          {sortedDates.length === 0 && (
            <div className="text-center py-12 text-stone-500 bg-ivory shadow-neu-sm-inset rounded-2xl flex flex-col items-center justify-center">
              {hwDebtOnly ? (
                <>
                  <div className="bg-emerald-50 p-3 rounded-full mb-3">
                    <PartyPopper size={28} className="text-emerald-500" strokeWidth={1.5} />
                  </div>
                  <span className="font-medium text-stone-800 mb-1 text-base">Ура! Все долги сданы</span>
                  <span className="text-sm text-stone-400">Ученики молодцы</span>
                </>
              ) : (
                "Нет запланированных уроков."
              )}
            </div>
          )}
          {sortedDates.map(dateStr => {
            const dayLessons = lessonsByDate[dateStr];
            const d = new Date(dateStr);
            const formattedDate = d.toLocaleString("ru", { weekday: 'long', day: 'numeric', month: 'long' });
            
            return (
              <div key={dateStr} id={`agenda-date-${dateStr}`}>
                <div className="sticky top-0 backdrop-blur-md bg-[rgb(var(--ivory))]/80 z-10 border-b border-stone-200/50 py-2 mb-3 flex items-center justify-between group/agenda">
                  <h3 className="text-sm font-bold text-stone-800 capitalize">
                    {formattedDate}
                  </h3>
                  <button 
                    onClick={() => handleOpenDrawer({ date: dateStr })}
                    className="opacity-0 group-hover/agenda:opacity-100 text-stone-400 hover:text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded-lg transition-all flex items-center gap-1 text-xs font-medium"
                  >
                    <Plus size={14} /> Добавить
                  </button>
                </div>
                <div className="space-y-4">
                  {dayLessons.map(l => {
                    const topicTitle = getLessonTopic(l);
                    const { title, borderColorClass, textColorClass } = getLessonDisplayData(l);
                    
                    return (
                    <div 
                      key={l.id} 
                      className={`border-l-4 ${borderColorClass} flex flex-col sm:flex-row gap-3 bg-ivory shadow-neu-sm p-4 rounded-2xl items-start sm:items-center justify-between cursor-pointer transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-[#006584] group @media (hover: hover) { hover:shadow-neu-md hover:-translate-y-px }`}
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setPopover({ lesson: l, x: rect.left, y: rect.bottom });
                      }}
                    >
                      <div className="flex gap-4 items-center">
                        <div className={`font-bold tabular-nums text-lg flex items-center justify-center shrink-0 pr-4 border-r-2 border-[#006584]/20 ${textColorClass}`}>
                          <span>{l.startTime} — {l.endTime}</span>
                        </div>
                        <div>
                          <div className="font-bold text-stone-800 text-base">{title}</div>
                          <div className="text-xs text-stone-500 font-medium flex items-center gap-1.5 mt-0.5">
                            <span>{l.subjectName}</span>
                            {renderStatusIcon(l.status)}
                            {topicTitle && (
                              <>
                                <span className="text-stone-300">•</span>
                                <span className="truncate max-w-[150px] sm:max-w-[300px]" title={topicTitle}>{topicTitle}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-3 sm:mt-0 self-end sm:self-auto w-full sm:w-auto justify-end">
                        {l.homework && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDrawer(l, "hw");
                            }}
                            className={`flex flex-col items-center justify-center w-11 h-11 shrink-0 rounded-xl font-bold text-[10px] uppercase transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#006584] ${isLessonHwFullyDone(l) ? 'text-[#006584] shadow-neu-sm-inset' : 'bg-ivory shadow-neu-sm active:shadow-neu-sm-inset text-[#B71234]'}`}
                          >
                            <span className="leading-none mb-0.5">ДЗ</span>
                            {isLessonHwFullyDone(l) ? <CheckCircle2 size={12} strokeWidth={2.5}/> : <XCircle size={12} strokeWidth={2.5}/>}
                          </button>
                        )}
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <PageWrapper 
      title="Расписание" 
      subtitle="Управление уроками и долгами"
      icon={CalendarDays}
      accentClass="text-[#006584]"
    >
      <div className="h-full flex flex-col pt-4 overflow-hidden relative">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex bg-ivory shadow-neu-sm rounded-xl p-1 shrink-0">
              <button onClick={prevPeriod} className="w-10 h-10 flex items-center justify-center rounded-lg text-stone-600 hover:text-[#006584] hover:shadow-neu-sm-inset active:shadow-neu-sm-inset transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#006584]">
                <ChevronLeft size={20} />
              </button>
              <button onClick={goToday} className="px-4 h-10 flex items-center justify-center rounded-lg text-stone-700 font-bold text-sm hover:text-[#006584] hover:shadow-neu-sm-inset active:shadow-neu-sm-inset transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#006584]">
                Сегодня
              </button>
              <button onClick={nextPeriod} className="w-10 h-10 flex items-center justify-center rounded-lg text-stone-600 hover:text-[#006584] hover:shadow-neu-sm-inset active:shadow-neu-sm-inset transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#006584]">
                <ChevronRight size={20} />
              </button>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-800 tracking-tight whitespace-nowrap min-w-[140px]">
              {headerTitle}
            </h2>
          </div>
          
          <div className="flex items-center justify-between md:justify-end gap-4 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <div className="flex items-center gap-2 shrink-0">
              <Switch checked={hwDebtOnly} onChange={setHwDebtOnly} />
              <span className="text-sm font-bold text-stone-700 cursor-pointer select-none" onClick={() => setHwDebtOnly(!hwDebtOnly)}>Долги по ДЗ</span>
            </div>

            <div className="flex bg-ivory shadow-neu-sm-inset rounded-xl p-1 shrink-0">
              {['month', 'week', 'agenda'].map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-4 h-9 rounded-lg text-sm font-bold transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#006584] ${view === v ? 'bg-ivory shadow-neu-sm text-[#006584]' : 'text-stone-500 hover:text-stone-700'}`}
                >
                  {v === 'month' ? 'Месяц' : v === 'week' ? 'Неделя' : 'Список'}
                </button>
              ))}
            </div>
            
            <button 
              className="px-4 h-11 flex items-center justify-center bg-ivory text-[#006584] font-bold rounded-xl shadow-neu-sm hover:shadow-neu-md active:shadow-neu-sm-inset transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#006584] ml-2 shrink-0"
              onClick={() => handleOpenDrawer()}
            >
              <Plus size={18} strokeWidth={3} className="mr-2" />
              Новый урок
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-2xl p-0 sm:p-2">
          <DndContext 
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd} 
            onDragCancel={() => setActiveDragLesson(null)}
          >
            {view === "month" && renderMonth()}
            {view === "week" && renderWeek()}
            {view === "agenda" && renderAgenda()}
            <DragOverlay dropAnimation={null} modifiers={[snapCenterToCursor]}>
              {activeDragLesson ? (
                <LessonCardOverlay 
                  lesson={activeDragLesson} 
                  compact={view === 'month'} 
                />
              ) : null}
            </DragOverlay>
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

      {popover && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPopover(null)} />
          <div 
            className="fixed z-50 bg-ivory rounded-xl shadow-neu-xl p-2 w-56 animate-in fade-in zoom-in duration-200"
            style={{ 
              top: Math.min(popover.y + 4, window.innerHeight - 200), 
              left: Math.min(popover.x, window.innerWidth - 224) 
            }}
          >
            <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1 px-2 pt-1">Действия</div>
            <button 
              className="w-full text-left px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 rounded-lg flex items-center gap-2"
              onClick={() => handleOpenDrawer(popover.lesson)}
            >
              Подробнее...
            </button>
            <button 
              className="w-full text-left px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 rounded-lg flex items-center gap-2"
              onClick={() => {
                const duplicated = { ...popover.lesson };
                delete duplicated.id;
                delete duplicated.seriesId;
                handleOpenDrawer(duplicated);
              }}
            >
              <Copy size={14} className="text-stone-400" /> Дублировать...
            </button>

            {popover.lesson.homework && popover.lesson.homework.trim() !== "" && (
              <>
                <div className="my-1 border-t border-stone-100" />
                <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1 px-2 pt-1">Домашка</div>
                {(() => {
                  const lesson = popover.lesson;
                  if (lesson.type === "individual") {
                    const isDone = lesson.hwDoneBy?.includes(lesson.studentId);
                    return (
                      <label className="flex items-center justify-between px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 rounded-lg cursor-pointer">
                        <span className="flex items-center gap-2">
                          <FileText size={14} className={isDone ? "text-emerald-500" : "text-red-500"} />
                          {isDone ? "ДЗ выполнено" : "Отметить ДЗ"}
                        </span>
                        <input 
                          type="checkbox" 
                          checked={isDone || false}
                          onChange={(e) => handleQuickHomework(lesson, lesson.studentId, e.target.checked)}
                          className="w-4 h-4 rounded border-stone-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </label>
                    );
                  } else {
                    const group = groups.find(g => g.id === lesson.groupId);
                    if (!group || !group.studentIds) return null;
                    const ids = group.studentIds;
                    const doneCount = ids.filter(id => lesson.hwDoneBy?.includes(id)).length;
                    
                    if (ids.length > 5) {
                      return (
                        <button 
                          className="w-full text-left px-3 py-2 text-sm text-indigo-700 hover:bg-indigo-50 rounded-lg flex items-center justify-between font-medium"
                          onClick={() => handleOpenDrawer(lesson)}
                        >
                          <span>Отметить ДЗ (сдали {doneCount}/{ids.length})</span>
                          <span className="text-lg leading-none">➔</span>
                        </button>
                      );
                    } else {
                      return (
                        <div className="flex flex-col gap-0.5">
                          {ids.map(id => {
                            const st = students.find(s => s.id === id);
                            const isDone = lesson.hwDoneBy?.includes(id);
                            return (
                              <label key={id} className="flex items-center justify-between px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-50 rounded-lg cursor-pointer">
                                <span className="flex items-center gap-2 truncate pr-2">
                                  <FileText size={14} className={isDone ? "text-emerald-500" : "text-stone-300"} />
                                  <span className="truncate">{st?.name || "Ученик"}</span>
                                </span>
                                <input 
                                  type="checkbox" 
                                  checked={isDone || false}
                                  onChange={(e) => handleQuickHomework(lesson, id, e.target.checked)}
                                  className="w-4 h-4 rounded border-stone-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                                />
                              </label>
                            );
                          })}
                        </div>
                      );
                    }
                  }
                })()}
              </>
            )}

            <div className="my-1 border-t border-stone-100" />
            <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1 px-2 pt-1">Изменить статус</div>
            <button 
              className="w-full text-left px-3 py-1.5 text-sm text-emerald-700 hover:bg-emerald-50 rounded-lg flex items-center gap-2"
              onClick={() => handleQuickStatus(popover.lesson, "conducted")}
            >
              <CheckCircle2 size={14} /> Проведен
            </button>
            <button 
              className="w-full text-left px-3 py-1.5 text-sm text-amber-700 hover:bg-amber-50 rounded-lg flex items-center gap-2"
              onClick={() => handleQuickStatus(popover.lesson, "skipped_paid")}
            >
              <AlertCircle size={14} /> Пропуск (Оплачен)
            </button>
            <button 
              className="w-full text-left px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-50 rounded-lg flex items-center gap-2"
              onClick={() => handleQuickStatus(popover.lesson, "skipped_free")}
            >
              <AlertCircle size={14} /> Пропуск (б/о)
            </button>
            <button 
              className="w-full text-left px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 rounded-lg flex items-center gap-2"
              onClick={() => handleQuickStatus(popover.lesson, "cancelled")}
            >
              <XCircle size={14} /> Отменен
            </button>
          </div>
        </>
      )}

      {timeEditPopover && (
        <>
          <div className="fixed inset-0 z-40 bg-stone-900/10" onClick={() => setTimeEditPopover(null)} />
          <div 
            className="fixed z-50 bg-ivory rounded-xl shadow-neu-xl p-4 w-60 animate-in fade-in zoom-in duration-200 flex flex-col gap-3"
            style={{ 
              top: Math.min(timeEditPopover.y, window.innerHeight - 150), 
              left: Math.min(timeEditPopover.x, window.innerWidth - 240) 
            }}
          >
            <div>
              <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">
                Время на {new Date(timeEditPopover.newDate).toLocaleDateString("ru", { day: 'numeric', month: 'short' })}
              </div>
              <div className="text-xs text-stone-500 mb-2">
                {timeEditPopover.isCopy ? "Копирование урока" : "Перенос урока"}
              </div>
            </div>
            
            <input 
              type="time" 
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
              defaultValue={timeEditPopover.lesson.startTime}
              autoFocus
              onKeyDown={async (e) => {
                if (e.key === "Enter") {
                  const newTime = e.target.value;
                  const data = { ...timeEditPopover.lesson, date: timeEditPopover.newDate };
                  
                  // Calculate new end time based on original duration
                  const [oldSH, oldSM] = timeEditPopover.lesson.startTime.split(':').map(Number);
                  const [oldEH, oldEM] = timeEditPopover.lesson.endTime.split(':').map(Number);
                  const durationMins = (oldEH * 60 + oldEM) - (oldSH * 60 + oldSM);
                  
                  const [newSH, newSM] = newTime.split(':').map(Number);
                  const newTotalMins = newSH * 60 + newSM + durationMins;
                  const newEH = Math.floor(newTotalMins / 60) % 24;
                  const newEM = newTotalMins % 60;
                  
                  data.startTime = newTime;
                  data.endTime = `${String(newEH).padStart(2, '0')}:${String(newEM).padStart(2, '0')}`;
                  
                  setTimeEditPopover(null);
                  
                  if (timeEditPopover.isCopy) {
                    delete data.id;
                    delete data.seriesId;
                    await addLesson(data);
                  } else {
                    await updateLesson(data.id, data);
                  }
                  fetchData();
                } else if (e.key === "Escape") {
                  setTimeEditPopover(null);
                }
              }}
            />
            <div className="text-[10px] text-stone-400 text-center flex items-center justify-center gap-1 bg-stone-50 rounded p-1">
              Нажмите <strong className="font-semibold text-stone-600 bg-white border border-stone-200 px-1 rounded shadow-sm">Enter</strong> для сохранения
            </div>
          </div>
        </>
      )}

      {view === "week" && (
        <div className="text-center text-[11px] text-stone-400 mt-2 flex items-center justify-center gap-3">
          <span>💡 <strong>Подсказка:</strong> Уроки можно перетаскивать мышкой на другой день.</span>
          <span>Зажмите <strong>Ctrl</strong> (или <strong>Alt/Option</strong>) при перетаскивании, чтобы скопировать урок.</span>
        </div>
      )}
      </div>
    </PageWrapper>
  );
}
