import { useState, useEffect, useMemo, forwardRef } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, Plus, ChevronLeft, ChevronRight, CheckCircle2, XCircle, AlertCircle, Clock, FileText, PartyPopper, Copy, MoreVertical, ArrowLeft } from "lucide-react";
import { Card, Button, Switch, SegmentedControl, Tooltip } from "../components/ui/index.js";
import { useSchedule } from "../hooks/useSchedule.js";
import { getEntityStyle, getEntityColorClasses } from "../utils/colors.js";
import { DndContext, useDraggable, useDroppable, DragOverlay, pointerWithin, closestCenter, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import LessonDrawer from "../components/schedule/LessonDrawer.jsx";

const maintainOffsetModifier = ({ transform, activeNodeRect, activatorEvent }) => {
  if (!activeNodeRect || !activatorEvent) return transform;
  return transform;
};

// ── Shared Section Wrapper ─────────────────────────────────────────────────
function PageWrapper({ children, title, subtitle, icon: Icon, accentClass, extraHeader }) {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 flex flex-col h-[calc(100vh-theme(spacing.16))] sm:h-[100dvh]">
      <header className="max-w-6xl mx-auto w-full flex items-start justify-between gap-4 shrink-0">
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
      <div className="flex-1 flex flex-col min-h-0 w-full">
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

  const [view, setView] = useState(pageState?.view || "week"); // 'month', 'week', 'day'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [navigatedFromMonth, setNavigatedFromMonth] = useState(false);

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
  const [popover, setPopover] = useState(null); // { lesson, triggerRect }
  
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
  const [dragTimeDelta, setDragTimeDelta] = useState(0);
  const [dragWidth, setDragWidth] = useState(null);
  const [dragHeight, setDragHeight] = useState(null);

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
    
    // Find the original DOM node to get exact dimensions
    const nodeId = String(event.active.id);
    const node = document.getElementById(nodeId);
    
    if (node) {
      const rect = node.getBoundingClientRect();
      setDragWidth(rect.width);
      setDragHeight(rect.height);
    } else if (event.active.rect && event.active.rect.current && event.active.rect.current.initial) {
      setDragWidth(event.active.rect.current.initial.width);
      setDragHeight(event.active.rect.current.initial.height);
    } else {
      setDragWidth(null);
      setDragHeight(null);
    }
    setDragTimeDelta(0);
  };

  const handleDragMove = (event) => {
    const { delta } = event;
    if (view === "week" && delta && delta.y) {
      const hourHeight = 64;
      let timeDeltaMins = Math.round((delta.y / hourHeight) * 60);
      timeDeltaMins = Math.round(timeDeltaMins / 5) * 5;
      setDragTimeDelta(timeDeltaMins);
    } else {
      setDragTimeDelta(0);
    }
  };

  const handleDragEnd = (event) => {
    setActiveDragLesson(null);
    setDragTimeDelta(0);
    setDragWidth(null);
    const { active, over, delta } = event;
    if (!over) return;
    
    const lesson = active.data.current;
    const newDateStr = over.data.current.date;
    const oldDateStr = ymd(new Date(lesson.date));
    
    let timeDeltaMins = 0;
    if (view === "week" && delta && delta.y) {
      const hourHeight = 64;
      timeDeltaMins = Math.round((delta.y / hourHeight) * 60);
      timeDeltaMins = Math.round(timeDeltaMins / 5) * 5;
    }
    
    if (lesson && (oldDateStr !== newDateStr || timeDeltaMins !== 0)) {
      let newStartTime = lesson.startTime;
      let newEndTime = lesson.endTime;
      if (timeDeltaMins !== 0) {
        const [oldSH, oldSM] = lesson.startTime.split(':').map(Number);
        const [oldEH, oldEM] = lesson.endTime.split(':').map(Number);
        
        const durationMins = (oldEH * 60 + oldEM) - (oldSH * 60 + oldSM);
        
        const dateObj = new Date();
        dateObj.setHours(oldSH, oldSM + timeDeltaMins, 0, 0);
        newStartTime = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
        
        const newTotalMins = dateObj.getHours() * 60 + dateObj.getMinutes() + durationMins;
        const newEH = Math.floor(newTotalMins / 60) % 24;
        const newEM = newTotalMins % 60;
        newEndTime = `${String(newEH).padStart(2, '0')}:${String(newEM).padStart(2, '0')}`;
      }

      const updatedData = { 
        ...lesson, 
        date: newDateStr || oldDateStr, 
        startTime: newStartTime, 
        endTime: newEndTime 
      };
      
      handleSaveLesson(lesson.id, updatedData);
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
    const hwText = typeof l.homework === 'string' ? l.homework : (l.homework?.text || "");
    if (!hwText || hwText.trim() === "") return true;
    if (l.type === "individual") {
      return l.hwDoneBy?.includes(l.studentId);
    } else {
      const group = groups.find(g => g.id === l.groupId);
      if (!group || !group.studentIds || group.studentIds.length === 0) return true;
      return group.studentIds.every(id => l.hwDoneBy?.includes(id));
    }
  };

  const studentsWithDebt = useMemo(() => {
    const debts = new Set();
    const pastLessons = lessons.filter(l => new Date(`${l.date}T${l.endTime}`) < new Date());
    pastLessons.forEach(l => {
      if (!isLessonHwFullyDone(l)) {
        if (l.type === "individual") {
          if (!l.hwDoneBy?.includes(l.studentId)) debts.add(l.studentId);
        } else {
          const group = groups.find(g => g.id === l.groupId);
          if (group && group.studentIds) {
            group.studentIds.forEach(id => {
              if (!l.hwDoneBy?.includes(id)) debts.add(id);
            });
          }
        }
      }
    });
    return debts;
  }, [lessons, groups]);

  const studentsWithFinDebt = useMemo(() => {
    const debts = new Set();
    students.forEach(s => {
      if ((s.balance || 0) < 0) debts.add(s.id);
    });
    return debts;
  }, [students]);

  const firstUpcomingLessonIdByStudent = useMemo(() => {
    const map = new Map();
    const sortedLessons = [...lessons].sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.startTime}`);
      const dateB = new Date(`${b.date}T${b.startTime}`);
      return dateA - dateB;
    });
    
    const now = new Date();
    const upcoming = sortedLessons.filter(l => new Date(`${l.date}T${l.endTime}`) >= now && l.status !== "cancelled" && l.status !== "skipped_free");
    
    upcoming.forEach(l => {
      if (l.type === "individual" && l.studentId) {
        if (!map.has(l.studentId)) map.set(l.studentId, l.id);
      } else if (l.type === "group" && l.groupId) {
        const group = groups.find(g => g.id === l.groupId);
        if (group && group.studentIds) {
          group.studentIds.forEach(id => {
             if (!map.has(id)) map.set(id, l.id);
          });
        }
      }
    });
    return map;
  }, [lessons, groups]);

  const filteredLessons = useMemo(() => {
    if (!hwDebtOnly || view === "month") return lessons;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    return lessons.filter(l => {
      const lessonDate = new Date(`${l.date}T00:00:00`);
      if (lessonDate < todayStart) return false;

      if (l.type === "individual") {
        return studentsWithDebt.has(l.studentId);
      } else {
        const group = groups.find(g => g.id === l.groupId);
        if (group && group.studentIds) {
          return group.studentIds.some(id => studentsWithDebt.has(id));
        }
        return false;
      }
    });
  }, [lessons, hwDebtOnly, groups, studentsWithDebt]);

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
      case "conducted": return null;
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
    isDragging = false, isFaded = false, title, borderColorClass, textColorClass, bgColorClass, entityStyle, 
    hasFinDebt = false, hasHwDebt = false, layout = "horizontal",
    listeners = {}, attributes = {}, style = {}, onMoreClick
  }, ref) => {
    const topic = getLessonTopic(lesson);
    const isCanceled = lesson.status === 'cancelled' || lesson.status === 'skipped_free';
    const isNeedsAttention = ymd(new Date(lesson.date)) < ymd(new Date()) && lesson.status === 'planned';

    const combinedStyle = { ...style, ...entityStyle };

    if (layout === "vertical") {
      return (
        <div 
          ref={ref}
          id={isOverlay ? undefined : `lesson-${lesson.id}-${ymd(new Date(lesson.date))}`}
          {...listeners}
          {...attributes}
          onClick={(e) => {
            if (isDragging || isOverlay) return;
            onClick(e, lesson);
          }}
          style={combinedStyle}
          className={`h-full flex flex-col p-1.5 rounded-lg cursor-pointer transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#006584] ${isCanceled ? 'bg-red-50/80 border border-red-200' : `${bgColorClass} border border-stone-200/50 hover:brightness-95`} ${isOverlay ? 'cursor-grabbing shadow-neu-xl scale-105 rotate-1 z-50' : 'hover:shadow-neu-sm shadow-sm'} ${isFaded ? "opacity-60" : ""} ${isNeedsAttention && !isFaded ? "ring-2 ring-amber-400" : ""} overflow-hidden`}
        >
          <div className="flex items-start justify-between gap-1 w-full shrink-0">
            <span className={`font-bold tabular-nums ${textColorClass} text-[10px] sm:text-[11px] leading-none`}>{lesson.startTime} - {lesson.endTime}</span>
            <div className="flex gap-0.5 items-center shrink-0">
              {hasHwDebt && <div className="w-2 h-2 rounded-full bg-[#006584]" title="Есть долг по ДЗ" />}
              {hasFinDebt && <div className="w-2 h-2 rounded-full bg-[#B71234]" title="Есть финансовый долг" />}
              {isCanceled ? (
                <span className="text-[9px] font-bold text-red-600 bg-red-100 px-1 rounded-sm leading-tight ml-0.5">Отменен</span>
              ) : (
                renderStatusIcon(lesson.status)
              )}
              {!isOverlay && onMoreClick && (
                <button 
                  onClick={onMoreClick}
                  className="ml-0.5 text-stone-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all outline-none p-0.5 pointer-events-auto"
                >
                  <MoreVertical size={14} />
                </button>
              )}
            </div>
          </div>
          <div className={`mt-0.5 font-medium flex-1 min-h-0 flex flex-col min-w-0 ${isCanceled ? 'opacity-60 line-through' : ''}`}>
            <span className={`line-clamp-2 min-w-0 font-bold text-stone-800 text-[11px] sm:text-xs leading-tight`}>{title}</span>
            {topic && <span className="line-clamp-1 text-[9px] sm:text-[10px] text-stone-500 leading-tight mt-0.5">{topic}</span>}
          </div>
        </div>
      );
    }

    return (
      <div 
        ref={ref}
        id={isOverlay ? undefined : `lesson-${lesson.id}-${ymd(new Date(lesson.date))}`}
        {...listeners}
        {...attributes}
        onClick={(e) => {
          if (isDragging || isOverlay) return;
          onClick(e, lesson);
        }}
        style={combinedStyle}
        className={`px-2 ${compact ? 'py-0.5' : 'py-1.5'} rounded-lg cursor-pointer transition-all relative outline-none focus-visible:ring-2 focus-visible:ring-[#006584] ${isCanceled ? 'bg-red-50/80 border border-red-100' : `${bgColorClass} border border-stone-200/50 hover:brightness-95`} ${isOverlay ? 'cursor-grabbing shadow-neu-xl scale-105 rotate-1 z-50' : 'hover:shadow-neu-sm hover:-translate-y-px active:shadow-neu-sm-inset'} ${isFaded ? "opacity-60" : ""}`}
      >
        <div className={`flex items-center justify-between ${compact ? '' : 'mb-0.5'}`}>
          <div className="flex items-center gap-1.5">
            <span className={`font-bold tabular-nums ${textColorClass} ${compact ? 'text-[9px]' : 'text-[10px] sm:text-xs'}`}>{lesson.startTime} - {lesson.endTime}</span>
            <div className="flex gap-0.5 shrink-0">
              {hasHwDebt && <div className="w-2 h-2 rounded-full bg-[#006584]" title="Есть долг по ДЗ" />}
              {hasFinDebt && <div className="w-2 h-2 rounded-full bg-[#B71234]" title="Есть финансовый долг" />}
            </div>
          </div>
          <div className="flex gap-1 items-center shrink-0">
            {isCanceled ? (
              <span className="text-[9px] font-bold text-red-600 bg-red-100 px-1 rounded-sm leading-tight ml-0.5">Отменен</span>
            ) : (
              renderStatusIcon(lesson.status)
            )}
            {!isOverlay && onMoreClick && (
              <button 
                onClick={onMoreClick}
                className="ml-1 text-stone-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all outline-none p-0.5 pointer-events-auto"
              >
                <MoreVertical size={14} />
              </button>
            )}
          </div>
        </div>
        <div className={`font-medium flex items-center justify-between gap-1 min-w-0 ${isCanceled ? 'line-through opacity-70' : ''}`}>
          <span className={`truncate min-w-0 flex-1 font-bold text-stone-800 ${compact ? 'text-[9.5px] leading-tight' : 'text-xs'}`}>{title}</span>
        </div>
      </div>
    );
  });

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

    let borderColorClass = "";
    let textColorClass = "";
    let bgColorClass = "";
    let entityStyle = {};
    
    if (lesson.group) {
      const subjColor = getSubjectColor(lesson.subject);
      borderColorClass = subjColor.replace('bg-', 'border-');
      bgColorClass = subjColor;
      textColorClass = subjColor.replace('bg-', 'text-').replace('100', '700').replace('50', '700');
    } else {
      const c = getEntityColorClasses();
      entityStyle = getEntityStyle(entity || title);
      borderColorClass = "border-transparent";
      bgColorClass = c.bg;
      textColorClass = c.text;
    }
    
    if (!borderColorClass.includes('border-') && !borderColorClass.includes('entity-border')) borderColorClass = 'border-indigo-400';
    if (!textColorClass.includes('text-') && !textColorClass.includes('entity-text')) textColorClass = 'text-indigo-700';
    if (!bgColorClass.includes('bg-') && !bgColorClass.includes('entity-bg')) bgColorClass = 'bg-indigo-100';

    let hasFinDebt = false;
    let hasHwDebt = false;
    if (lesson.type === "individual") {
      const isFirst = firstUpcomingLessonIdByStudent.get(lesson.studentId) === lesson.id;
      if (isFirst) {
        hasFinDebt = (entity?.balance || 0) < 0;
        hasHwDebt = studentsWithDebt.has(lesson.studentId);
      }
    } else {
      const debtStudentsInGroup = entity?.studentIds?.filter(id => firstUpcomingLessonIdByStudent.get(id) === lesson.id) || [];
      hasFinDebt = debtStudentsInGroup.some(id => {
         const st = students.find(s => s.id === id);
         return (st?.balance || 0) < 0;
      });
      hasHwDebt = debtStudentsInGroup.some(id => studentsWithDebt.has(id));
    }
    
    const isPast = ymd(new Date(lesson.date)) < ymd(new Date());
    const isFaded = (isPast && lesson.status !== "planned" && !hasFinDebt && !hasHwDebt) || hwDebtOnly;

    return { title, isFaded, borderColorClass, textColorClass, bgColorClass, entityStyle, hasFinDebt, hasHwDebt };
  };

  const LessonCardOverlay = ({ lesson, compact = false, dragTimeDelta = 0, width = null, height = null }) => {
    const displayLesson = { ...lesson };
    if (dragTimeDelta !== 0) {
      const [oldSH, oldSM] = lesson.startTime.split(':').map(Number);
      const [oldEH, oldEM] = lesson.endTime.split(':').map(Number);
      const durationMins = (oldEH * 60 + oldEM) - (oldSH * 60 + oldSM);
      const dateObj = new Date();
      dateObj.setHours(oldSH, oldSM + dragTimeDelta, 0, 0);
      displayLesson.startTime = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
      
      const newTotalMins = dateObj.getHours() * 60 + dateObj.getMinutes() + durationMins;
      displayLesson.endTime = `${String(Math.floor(newTotalMins / 60) % 24).padStart(2, '0')}:${String(newTotalMins % 60).padStart(2, '0')}`;
    }
    const { title, isFaded, borderColorClass, textColorClass, bgColorClass, entityStyle, hasFinDebt, hasHwDebt } = getLessonDisplayData(displayLesson);
    return (
      <div style={{ width: width ? `${width}px` : 'auto', height: height ? `${height}px` : 'auto' }} className="h-full">
        <LessonCardView 
          lesson={displayLesson}
          onClick={() => {}}
          compact={compact}
          layout={compact ? "horizontal" : "vertical"}
          isOverlay={true}
        isDragging={false}
        isFaded={isFaded}
          isDragging={false}
          isFaded={isFaded}
          title={title}
          borderColorClass={borderColorClass}
          textColorClass={textColorClass}
          bgColorClass={bgColorClass}
          entityStyle={entityStyle}
          style={{
            boxShadow: "var(--shadow-neu-xl)",
            cursor: "grabbing",
            zIndex: 50,
            margin: 0,
            transformOrigin: "0 0"
          }}
        />
      </div>
    );
  };

  const LessonCard = ({ lesson, onClick, compact = false, layout = "horizontal", onMoreClick }) => {
    const { title, isFaded, borderColorClass, textColorClass, bgColorClass, entityStyle, hasFinDebt, hasHwDebt } = getLessonDisplayData(lesson);
    
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
      id: `lesson-${lesson.id}-${ymd(new Date(lesson.date))}`,
      data: lesson
    });

    return (
      <LessonCardView 
        ref={setNodeRef}
        lesson={lesson}
        onClick={onClick}
        onMoreClick={onMoreClick}
        compact={compact}
        layout={layout}
        isOverlay={false}
        isDragging={isDragging}
        isFaded={isFaded}
        title={title}
        borderColorClass={borderColorClass}
        textColorClass={textColorClass}
        bgColorClass={bgColorClass}
        entityStyle={entityStyle}
        hasFinDebt={hasFinDebt}
        hasHwDebt={hasHwDebt}
        listeners={listeners}
        attributes={attributes}
        style={{ opacity: isDragging ? 0 : 1, height: layout === "vertical" ? "100%" : "auto" }}
      />
    );
  };

  const DroppableSlot = ({ id, date, isToday, children, className, onClick }) => {
    const { isOver, setNodeRef } = useDroppable({
      id: id,
      data: { date }
    });
    
    return (
      <div 
        ref={setNodeRef} 
        onClick={onClick}
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
      <div className="max-w-6xl mx-auto w-full flex-1 min-h-0 rounded-2xl overflow-hidden flex flex-col">
        <div className="grid grid-cols-7 shrink-0 border-b border-stone-200/60">
          {['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'].map(d => (
            <div key={d} className="py-2 text-center text-[10px] font-bold text-stone-400 uppercase tracking-widest border-r border-stone-200/60 last:border-0">
              {d}
            </div>
          ))}
        </div>
        <div 
          className="grid grid-cols-7 flex-1 overflow-hidden"
          style={{ gridTemplateRows: `repeat(${days.length / 7}, minmax(0, 1fr))` }}
        >
          {days.map((day, idx) => {
            if (!day) return <div key={idx} className="min-w-0 border-r border-b border-stone-200/60 bg-transparent opacity-50 p-1" />;
            
            const dateStr = ymd(new Date(year, currentDate.getMonth(), day));
            const dayLessons = lessonsByDate[dateStr] || [];
            const isToday = dateStr === todayStr;
            const isPast = dateStr < todayStr;

            const lessonCount = dayLessons.length;
            
            // Timeline bounds (default 08:00 - 22:00)
            const tlStartMins = 8 * 60;
            const tlEndMins = 22 * 60;
            const tlTotalMins = tlEndMins - tlStartMins;
            
            const hasHwDebtors = dayLessons.some(l => {
              if (l.type === "individual") {
                return firstUpcomingLessonIdByStudent.get(l.studentId) === l.id && studentsWithDebt.has(l.studentId);
              }
              if (l.type === "group" && l.groupId) {
                const g = groups.find(gr => gr.id === l.groupId);
                return g?.studentIds?.some(id => firstUpcomingLessonIdByStudent.get(id) === l.id && studentsWithDebt.has(id));
              }
              return false;
            });
            const hasFinDebtors = dayLessons.some(l => {
              if (l.type === "individual") {
                return firstUpcomingLessonIdByStudent.get(l.studentId) === l.id && studentsWithFinDebt.has(l.studentId);
              }
              if (l.type === "group" && l.groupId) {
                const g = groups.find(gr => gr.id === l.groupId);
                return g?.studentIds?.some(id => firstUpcomingLessonIdByStudent.get(id) === l.id && studentsWithFinDebt.has(id));
              }
              return false;
            });
            
            const paidCount = isPast ? dayLessons.filter(l => l.status === "conducted" || l.status === "skipped_paid").length : 0;

            return (
              <DroppableSlot 
                key={idx} 
                id={`month-slot-${dateStr}`} 
                date={dateStr}
                className={`group/day min-w-0 border-r border-b border-stone-200/60 p-2 sm:p-3 flex flex-col min-h-[100px] md:min-h-[120px] cursor-pointer ${isToday ? "bg-white ring-2 ring-inset ring-emerald-500/40 shadow-sm z-10" : isPast ? "bg-stone-100/60 hover:bg-stone-200/50 transition-colors" : "bg-white hover:bg-stone-50 transition-colors"} relative`}
                onClick={() => {
                  setCurrentDate(new Date(year, currentDate.getMonth(), day));
                  setView("day");
                  setNavigatedFromMonth(true);
                }}
              >
                <div className="flex-1 flex flex-col h-full">
                  {/* Top Header */}
                  <div className="flex items-start justify-between w-full h-7">
                    <div className="flex flex-col gap-1.5 mt-1">
                      {!isPast && hasHwDebtors && (
                        <Tooltip text="Не сдано ДЗ" position="top-left">
                          <div className="w-2 h-2 rounded-full bg-[#006584] shadow-sm cursor-help" />
                        </Tooltip>
                      )}
                      {!isPast && hasFinDebtors && (
                        <Tooltip text="Задолженность" position="top-left">
                          <div className="w-2 h-2 rounded-full bg-[#B71234] shadow-sm cursor-help" />
                        </Tooltip>
                      )}
                      {isPast && (lessonCount - paidCount) > 0 && (
                        <span className="text-[9px] sm:text-[10px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-100/50 whitespace-nowrap shadow-sm">
                          {lessonCount - paidCount} {
                            [11,12,13,14].includes((lessonCount - paidCount)%100) ? 'отмен' : 
                            (lessonCount - paidCount)%10 === 1 ? 'отмена' : 
                            [2,3,4].includes((lessonCount - paidCount)%10) ? 'отмены' : 'отмен'
                          }
                        </span>
                      )}
                    </div>
                    {isToday ? (
                      <span className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-emerald-500 text-white text-sm font-bold shadow-sm shrink-0">
                        {day}
                      </span>
                    ) : (
                      <span className={`text-sm sm:text-base font-medium leading-none shrink-0 ${isPast ? "text-stone-500" : "text-stone-600 group-hover/day:text-stone-800 transition-colors"}`}>
                        {day}
                      </span>
                    )}
                  </div>
                  
                  {/* Centered Content */}
                  <div className="flex-1 flex flex-col justify-center items-center mt-1">
                    {lessonCount > 0 ? (
                      isPast ? (
                        // Report Mode for Past Days (Grid-stable)
                        <div className="flex flex-col items-center justify-center gap-2.5 w-full">
                          <div className="flex items-baseline gap-1 relative">
                            <span className="text-2xl md:text-3xl font-black text-stone-700 leading-none">{paidCount}</span>
                            <span className="text-[10px] md:text-xs text-stone-400 font-medium">
                              {getLessonWord(paidCount)}
                            </span>
                          </div>
                          {/* Invisible placeholder for timeline to keep exact vertical height as future days */}
                          <div className="h-[3px] w-full max-w-[85%] opacity-0" />
                        </div>
                      ) : (
                        // Schedule Mode for Future Days
                        <div className="flex flex-col items-center justify-center gap-2.5 w-full">
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl md:text-3xl font-black text-stone-800 leading-none">{lessonCount}</span>
                            <span className="text-[10px] md:text-xs text-stone-500 font-medium">
                              {getLessonWord(lessonCount)}
                            </span>
                          </div>
                          
                          <div className="h-[3px] w-full max-w-[85%] bg-stone-200/80 rounded-full relative overflow-hidden shadow-inner">
                            {dayLessons.map(l => {
                              const [sH, sM] = l.startTime.split(':').map(Number);
                              const [eH, eM] = l.endTime.split(':').map(Number);
                              const startMins = sH * 60 + sM;
                              const endMins = eH * 60 + eM;
                              const left = Math.max(0, ((startMins - tlStartMins) / tlTotalMins) * 100);
                              const width = Math.min(100 - left, ((endMins - startMins) / tlTotalMins) * 100);
                              
                              return (
                                <div 
                                  key={l.id}
                                  className="absolute top-0 bottom-0 bg-stone-400 rounded-full shadow-sm"
                                  style={{ left: `${left}%`, width: `${width}%` }}
                                />
                              );
                            })}
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <span className="text-[10px] text-stone-400 font-medium opacity-0 group-hover/day:opacity-100 transition-opacity">
                          Нет уроков
                        </span>
                      </div>
                    )}
                  </div>
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
    
    // Timeline bounds
    const tlStartH = 8;
    const tlEndH = 23; 
    const hours = Array.from({ length: tlEndH - tlStartH }, (_, i) => tlStartH + i);
    const hourHeight = 64; // px

    return (
      <div className="max-w-6xl mx-auto w-full flex-1 min-h-0 flex flex-col bg-ivory/30 rounded-xl border border-stone-200/50 shadow-sm overflow-hidden">
        {/* Headers */}
        <div className="flex shrink-0 border-b border-stone-200/50 bg-white/60">
          <div className="w-10 sm:w-12 shrink-0 border-r border-stone-200/50"></div>
          <div className="flex-1 flex min-w-0">
            {weekDays.map((wd, i) => {
              const dateStr = ymd(wd);
              const isToday = dateStr === todayStr;
              const isPast = dateStr < todayStr;
              const dayName = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'][i];
              const dayLessons = lessonsByDate[dateStr] || [];
              
              const hasHwDebtors = dayLessons.some(l => {
                if (l.type === "individual") {
                  return firstUpcomingLessonIdByStudent.get(l.studentId) === l.id && studentsWithDebt.has(l.studentId);
                } else {
                  return l.studentIds?.some(id => firstUpcomingLessonIdByStudent.get(id) === l.id && studentsWithDebt.has(id));
                }
              });

              const hasFinDebtors = dayLessons.some(l => {
                if (l.type === "individual") {
                  const entity = l.studentId ? students.find(s => s.id === l.studentId) : null;
                  return firstUpcomingLessonIdByStudent.get(l.studentId) === l.id && (entity?.balance || 0) < 0;
                } else {
                  return l.studentIds?.some(id => {
                    const st = students.find(s => s.id === id);
                    return firstUpcomingLessonIdByStudent.get(id) === l.id && (st?.balance || 0) < 0;
                  });
                }
              });
              
              const paidCount = isPast ? dayLessons.filter(l => l.status === "conducted" || l.status === "skipped_paid").length : 0;
              const cancelCount = isPast ? (dayLessons.length - paidCount) : 0;

              return (
                <div key={dateStr} className={`flex-1 min-w-0 flex flex-col items-center justify-center py-2 sm:py-3 border-r border-stone-200/50 last:border-r-0 relative ${isToday ? "bg-white ring-2 ring-emerald-500/40 ring-inset z-10" : isPast ? "bg-stone-100/60" : "bg-white hover:bg-stone-50/30"} transition-all`}>
                  <div className="absolute top-1 left-1 flex flex-col gap-1">
                    {!isPast && hasHwDebtors && (
                      <Tooltip text="Не сдано ДЗ" position="top-left">
                        <div className="w-2 h-2 rounded-full bg-[#006584] shadow-sm cursor-help" />
                      </Tooltip>
                    )}
                    {!isPast && hasFinDebtors && (
                      <Tooltip text="Задолженность" position="top-left">
                        <div className="w-2 h-2 rounded-full bg-[#B71234] shadow-sm cursor-help" />
                      </Tooltip>
                    )}
                  </div>
                  {isPast && cancelCount > 0 && (
                    <div className="absolute top-1 right-1">
                      <span className="text-[9px] font-bold text-rose-500 bg-rose-50 px-1 rounded-md border border-rose-100/50 shadow-sm">
                        {cancelCount}
                      </span>
                    </div>
                  )}
                  <div className={`text-[9px] sm:text-[10px] font-bold tracking-widest uppercase mb-1 ${isToday ? 'text-emerald-700' : 'text-stone-400'}`}>{dayName}</div>
                  <div className={`text-lg sm:text-2xl font-bold leading-none flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full ${isToday ? 'bg-emerald-500 text-white shadow-neu-sm' : 'text-stone-800'}`}>
                    {wd.getDate()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto flex relative scrollbar-thin pt-3 pb-6">
          <div className="w-10 sm:w-12 shrink-0 border-r border-stone-200/50 bg-white/40 sticky left-0 z-20 pt-3">
            <div className="relative" style={{ height: hours.length * hourHeight }}>
              {hours.map(h => (
                <div key={h} className="absolute w-full text-right pr-2 text-[10px] font-medium text-stone-400 -translate-y-1/2" style={{ top: (h - tlStartH) * hourHeight }}>
                  {h}:00
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex-1 flex min-w-[500px] relative pt-3">
            <div className="absolute top-3 left-0 right-0 pointer-events-none z-20" style={{ height: hours.length * hourHeight }}>
              {hours.map(h => (
                <div key={h} className="absolute w-full border-t border-stone-300 border-dashed" style={{ top: (h - tlStartH) * hourHeight }} />
              ))}
            </div>
            
            {weekDays.map((wd) => {
              const dateStr = ymd(wd);
              const isToday = dateStr === todayStr;
              const isPast = dateStr < todayStr;
              const dayLessons = lessonsByDate[dateStr] || [];

              return (
                <div key={dateStr} className={`group flex-1 min-w-0 border-r border-stone-200/50 last:border-r-0 ${isToday ? "bg-emerald-50/30" : isPast ? "bg-stone-100/60" : "bg-white"} relative transition-all`}>
                  <DroppableSlot 
                    id={`week-slot-${dateStr}`}
                    date={dateStr}
                    className="w-full relative min-h-full"
                    style={{ height: hours.length * hourHeight }}
                    onClick={() => handleOpenDrawer({ date: dateStr })}
                  >
                    {(() => {
                      const sorted = [...dayLessons].map(l => {
                        const [sH, sM] = l.startTime.split(':').map(Number);
                        const [eH, eM] = l.endTime.split(':').map(Number);
                        return { ...l, startMins: sH * 60 + sM, endMins: eH * 60 + eM };
                      }).sort((a, b) => a.startMins - b.startMins || (b.endMins - b.startMins) - (a.endMins - a.startMins));

                      let clusters = [];
                      sorted.forEach(l => {
                        if (clusters.length === 0) {
                          clusters.push([l]);
                        } else {
                          let lastCluster = clusters[clusters.length - 1];
                          let clusterEnd = Math.max(...lastCluster.map(c => c.endMins));
                          if (l.startMins < clusterEnd) {
                            lastCluster.push(l);
                          } else {
                            clusters.push([l]);
                          }
                        }
                      });

                      const positioned = [];
                      clusters.forEach(cluster => {
                        let columns = [];
                        cluster.forEach(l => {
                          let placed = false;
                          for (let i = 0; i < columns.length; i++) {
                            const col = columns[i];
                            const lastInCol = col[col.length - 1];
                            if (l.startMins >= lastInCol.endMins) {
                              col.push(l);
                              placed = true;
                              break;
                            }
                          }
                          if (!placed) {
                            columns.push([l]);
                          }
                        });
                        
                        const numCols = columns.length;
                        columns.forEach((col, colIndex) => {
                          col.forEach(l => {
                            positioned.push({ ...l, colIndex, numCols });
                          });
                        });
                      });

                      return positioned.map(l => {
                        let displayStart = l.startMins;
                        let displayEnd = l.endMins;
                        if (displayStart < tlStartH * 60) displayStart = tlStartH * 60;
                        if (displayEnd > tlEndH * 60) displayEnd = tlEndH * 60;
                        
                        const top = ((displayStart - (tlStartH * 60)) / 60) * hourHeight;
                        const height = Math.max(20, ((displayEnd - displayStart) / 60) * hourHeight);
                        
                        const leftPercent = (l.colIndex / l.numCols) * 100;
                        const widthPercent = 100 / l.numCols;
                        
                        return (
                          <div 
                            key={l.id} 
                            className="absolute transition-all z-30 hover:z-40 px-[1px] sm:px-[2px]"
                            style={{ 
                              top, 
                              height,
                              left: `${leftPercent}%`,
                              width: `${widthPercent}%`
                            }}
                          >
                            <LessonCard 
                              lesson={l} 
                              layout={widthPercent < 50 ? "compact" : "vertical"}
                              compact={widthPercent <= 50}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDrawer(l);
                              }} 
                              onMoreClick={(e) => {
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                setPopover({ lesson: l, triggerRect: rect });
                              }}
                            />
                          </div>
                        );
                      });
                    })()}
                  </DroppableSlot>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderDay = () => {
    const dateStr = ymd(currentDate);
    const dayLessons = lessonsByDate[dateStr] || [];
    const formattedDate = currentDate.toLocaleString("ru", { weekday: 'long', day: 'numeric', month: 'long' });
    
    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin pb-8 px-4 sm:px-6 lg:px-8 -mx-4 sm:-mx-6 lg:-mx-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="sticky top-0 backdrop-blur-md bg-[rgb(var(--ivory))]/80 z-10 border-b border-stone-200/50 py-3 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {navigatedFromMonth && (
                <button 
                  onClick={() => {
                    setView("month");
                    setNavigatedFromMonth(false);
                  }}
                  className="p-1.5 hover:bg-stone-200/50 text-stone-500 rounded-lg transition-colors"
                  title="Назад к месяцу"
                >
                  <ArrowLeft size={18} />
                </button>
              )}
              <h3 className="text-base font-bold text-stone-800 capitalize">
                {formattedDate}
              </h3>
            </div>
            <button 
              onClick={() => handleOpenDrawer({ date: dateStr })}
              className="text-stone-500 hover:text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 text-sm font-medium"
            >
              <Plus size={16} /> Добавить урок
            </button>
          </div>
          
          {dayLessons.length === 0 ? (
            <div className="text-center py-12 text-stone-500 bg-ivory shadow-neu-sm-inset rounded-2xl flex flex-col items-center justify-center">
              "На этот день уроков не запланировано."
            </div>
          ) : (
            <div className="space-y-4">
              {dayLessons.map(l => {
                const topicTitle = getLessonTopic(l);
                const { title, borderColorClass, textColorClass, entityStyle } = getLessonDisplayData(l);
                
                return (
                  <div 
                    key={l.id} 
                    className={`border-l-4 ${borderColorClass} flex flex-col sm:flex-row gap-3 bg-ivory shadow-neu-sm p-4 rounded-2xl items-start sm:items-center justify-between cursor-pointer transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-[#006584] group @media (hover: hover) { hover:shadow-neu-md hover:-translate-y-px }`}
                    style={entityStyle}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDrawer(l);
                    }}
                  >
                    <div className="flex gap-4 items-center flex-1 min-w-0">
                      <div className={`font-bold tabular-nums text-lg flex items-center justify-center shrink-0 pr-4 border-r-2 border-[#006584]/20 ${textColorClass}`}>
                        <span>{l.startTime} — {l.endTime}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-stone-800 text-base truncate">{title}</div>
                        <div className="text-xs text-stone-500 font-medium flex items-center gap-1.5 mt-0.5 flex-wrap">
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
                    
                    <div className="flex items-center gap-2 mt-3 sm:mt-0 self-end sm:self-auto shrink-0">
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
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setPopover({ lesson: l, triggerRect: rect });
                        }}
                        className="w-11 h-11 flex items-center justify-center text-stone-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all ml-1"
                      >
                        <MoreVertical size={20} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <PageWrapper 
      title="Календарь занятий" 
      subtitle="Ваше время, уроки и финансы"
      icon={CalendarDays}
      accentClass="text-[#006584]"
    >
      <div className="h-full flex flex-col pt-4 relative">
        {/* Header Section */}
        <div className="max-w-6xl mx-auto w-full flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-4 shrink-0 px-2 sm:px-0">
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
          
          <div className="flex items-center justify-between md:justify-end gap-4 flex-wrap">
            {view !== 'month' && (
              <div className="flex items-center gap-2 shrink-0" title="Показать предстоящие уроки с должниками">
                <Switch checked={hwDebtOnly} onChange={setHwDebtOnly} />
                <span className="text-sm font-bold text-stone-700 cursor-pointer select-none" onClick={() => setHwDebtOnly(!hwDebtOnly)}>Несданные ДЗ</span>
              </div>
            )}

            <div className="flex bg-ivory shadow-neu-sm-inset rounded-xl p-1 shrink-0">
              {['month', 'week', 'day'].map((v) => (
                <button
                  key={v}
                  onClick={() => {
                    setView(v);
                    if (v !== 'day') setNavigatedFromMonth(false);
                  }}
                  className={`px-4 h-9 rounded-lg text-sm font-bold transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#006584] ${view === v ? 'bg-ivory shadow-neu-sm text-[#006584]' : 'text-stone-500 hover:text-stone-700'}`}
                >
                  {v === 'month' ? 'Месяц' : v === 'week' ? 'Неделя' : 'День'}
                </button>
              ))}
            </div>
            
            <Button 
              variant="primary"
              className="ml-2 h-[42px] px-5"
              onClick={() => handleOpenDrawer()}
            >
              <Plus size={20} strokeWidth={2.5} className="mr-1.5 opacity-90" />
              Новый урок
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-2xl p-0 sm:p-2">
          <DndContext 
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd} 
            onDragCancel={() => {
              setActiveDragLesson(null);
              setDragTimeDelta(0);
            }}
          >
            {view === "month" && renderMonth()}
            {view === "week" && renderWeek()}
            {view === "day" && renderDay()}
            {createPortal(
              <DragOverlay dropAnimation={null}>
                {activeDragLesson ? (
                  <LessonCardOverlay 
                    lesson={activeDragLesson} 
                    compact={view === 'month'} 
                    dragTimeDelta={dragTimeDelta}
                    width={dragWidth}
                    height={dragHeight}
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
                className="fixed z-50 bg-ivory rounded-xl shadow-neu-xl p-2 w-56 animate-in fade-in zoom-in duration-200 overflow-y-auto"
                style={style}
              >
                <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1 px-2 pt-1">Действия</div>
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

            {popover.lesson.homework && (typeof popover.lesson.homework === 'string' ? popover.lesson.homework : popover.lesson.homework.text)?.trim() !== "" && (
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
          );
        })(),
        document.body
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
