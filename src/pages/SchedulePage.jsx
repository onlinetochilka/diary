import { useState, useEffect, useMemo, forwardRef, useRef } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, Plus, ChevronLeft, ChevronRight, CheckCircle2, XCircle, AlertCircle, Clock, FileText, PartyPopper, Copy, MoreVertical, ArrowLeft, RotateCcw } from "lucide-react";
import { Card, Button, Switch, SegmentedControl, Tooltip } from "../components/ui/index.js";
import { useSchedule } from "../hooks/useSchedule.js";
import { getEntityStyle, getEntityColorClasses } from "../utils/colors.js";
import { DndContext, useDraggable, useDroppable, DragOverlay, pointerWithin, closestCenter, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import LessonDrawer from "../components/schedule/LessonDrawer.jsx";
import ActionItemModal from "../components/dashboard/ActionItemModal.jsx";
import { addPayment, updateLesson } from "../services/database.js";

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
  const [colorMode] = useState(() => localStorage.getItem("app_color_mode") || "entity");

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  
  // Action Modals State
  const [actionModal, setActionModal] = useState({ isOpen: false, item: null, mode: "confirm" });

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

  // Copy-mode (Ctrl / Alt held during drag)
  const [isCopyMode, setIsCopyMode] = useState(false);
  const isCopyModeRef = useRef(false); // ref so handleDragEnd always sees current value

  // Track Ctrl / Alt key for copy-mode during drag
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Control' || e.key === 'Alt') {
        isCopyModeRef.current = true;
        setIsCopyMode(true);
      }
    };
    const onKeyUp = (e) => {
      if (e.key === 'Control' || e.key === 'Alt') {
        isCopyModeRef.current = false;
        setIsCopyMode(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

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
    
    if (lesson && (isCopyModeRef.current || oldDateStr !== newDateStr || timeDeltaMins !== 0)) {
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

      if (isCopyModeRef.current) {
        // Optimistic copy: card appears immediately on the new slot
        const { id: _srcId, ...lessonWithoutId } = updatedData;
        hookCopyLesson({ ...lessonWithoutId });
      } else {
        handleSaveLesson(lesson.id, updatedData);
      }
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
  
  const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };

  const headerTitle = view === "week"
    ? `${getWeekNumber(currentDate)} неделя ${year}`
    : view === "day"
      ? currentDate.toLocaleString("ru", { day: "numeric", month: "long", year: "numeric" }).replace(' г.', '')
      : `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;

  const renderStatusIcon = (status) => {
    switch(status) {
      case "conducted": 
        return (
          <Tooltip text="Проведен" position="bottom">
            <div className="p-1 -m-1 cursor-help flex items-center justify-center">
              <CheckCircle2 size={12} className="text-emerald-500" />
            </div>
          </Tooltip>
        );
      case "cancelled": 
        return (
          <Tooltip text="Отменен" position="bottom">
            <div className="p-1 -m-1 cursor-help flex items-center justify-center">
              <XCircle size={12} className="text-red-500" />
            </div>
          </Tooltip>
        );
      case "skipped_paid": 
        return (
          <Tooltip text="Пропущен (оплачен)" position="bottom">
            <div className="p-1 -m-1 cursor-help flex items-center justify-center">
              <AlertCircle size={12} className="text-amber-500" />
            </div>
          </Tooltip>
        );
      case "skipped_free": 
        return (
          <Tooltip text="Пропуск (б/о)" position="bottom">
            <div className="p-1 -m-1 cursor-help flex items-center justify-center">
              <AlertCircle size={12} className="text-stone-400" />
            </div>
          </Tooltip>
        );
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
    listeners = {}, attributes = {}, style = {}, onMoreClick, onHwClick, onFinClick
  }, ref) => {
    const topic = getLessonTopic(lesson);
    const isCanceled = lesson.status === 'cancelled';
    const isSkippedFree = lesson.status === 'skipped_free';
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
          className={`group/card h-full flex flex-col p-1.5 rounded-lg cursor-pointer transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#006584] ${isCanceled ? 'bg-red-50/80 border border-red-200' : isSkippedFree ? 'bg-stone-100 border border-stone-300' : `${bgColorClass} border border-stone-200/50 hover:brightness-95`} ${isOverlay ? 'cursor-grabbing shadow-neu-xl scale-105 rotate-1 z-50' : 'hover:shadow-neu-sm shadow-sm'} ${isFaded ? "opacity-60" : ""} ${isNeedsAttention && !isFaded ? "ring-2 ring-amber-400" : ""}`}
        >
          <div className="flex items-start justify-between gap-1 w-full shrink-0">
            <span className={`font-bold tabular-nums ${textColorClass} text-[10px] sm:text-[11px] leading-none`}>{lesson.startTime} - {lesson.endTime}</span>
            <div className="flex gap-0.5 items-center shrink-0">
              {hasHwDebt && (
                <Tooltip text="Отметить ДЗ" position="top">
                  <div 
                    className="w-3 h-3 rounded-full bg-gradient-to-b from-[#0082a8] to-[#004e66] shadow-[0_1px_3px_rgba(0,101,132,0.6)] border border-[#00394b] ring-1 ring-inset ring-white/30 cursor-pointer hover:scale-125 hover:shadow-md active:scale-95 active:shadow-inner transition-all" 
                    onClick={(e) => { e.stopPropagation(); onHwClick && onHwClick(lesson); }}
                  />
                </Tooltip>
              )}
              {hasFinDebt && (
                <Tooltip text="Отметить оплату" position="top">
                  <div 
                    className="w-3 h-3 rounded-full bg-gradient-to-b from-[#da2146] to-[#8f0e27] shadow-[0_1px_3px_rgba(183,18,52,0.6)] border border-[#6b081b] ring-1 ring-inset ring-white/30 cursor-pointer hover:scale-125 hover:shadow-md active:scale-95 active:shadow-inner transition-all" 
                    onClick={(e) => { e.stopPropagation(); onFinClick && onFinClick(lesson); }}
                  />
                </Tooltip>
              )}
              {isCanceled ? (
                <span className="text-[9px] font-bold text-red-600 bg-red-100 px-1 rounded-sm leading-tight ml-0.5">Отменён</span>
              ) : isSkippedFree ? (
                <span className="text-[9px] font-bold text-stone-600 bg-stone-200 px-1 rounded-sm leading-tight ml-0.5">б/о</span>
              ) : (
                renderStatusIcon(lesson.status)
              )}
              {!isOverlay && onMoreClick && (
                <button 
                  onClick={onMoreClick}
                  className="ml-0.5 text-stone-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all outline-none p-0.5 pointer-events-auto lg:opacity-0 group-hover/card:opacity-100 focus-visible:opacity-100"
                >
                  <MoreVertical size={14} />
                </button>
              )}
            </div>
          </div>
          <div className={`mt-0.5 font-medium flex-1 min-h-0 flex flex-col min-w-0 ${(isCanceled || isSkippedFree) ? 'opacity-60 line-through' : ''}`}>
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
        className={`group/card px-2 ${compact ? 'py-0.5' : 'py-1.5'} rounded-lg cursor-pointer transition-all relative outline-none focus-visible:ring-2 focus-visible:ring-[#006584] ${isCanceled ? 'bg-red-50/80 border border-red-100' : isSkippedFree ? 'bg-stone-100/80 border border-stone-300' : `${bgColorClass} border border-stone-200/50 hover:brightness-95`} ${isOverlay ? 'cursor-grabbing shadow-neu-xl scale-105 rotate-1 z-50' : 'hover:shadow-neu-sm hover:-translate-y-px active:shadow-neu-sm-inset'} ${isFaded ? "opacity-60" : ""}`}
      >
        <div className={`flex items-center justify-between ${compact ? '' : 'mb-0.5'}`}>
          <div className="flex items-center gap-1.5">
            <span className={`font-bold tabular-nums ${textColorClass} ${compact ? 'text-[9px]' : 'text-[10px] sm:text-xs'}`}>{lesson.startTime} - {lesson.endTime}</span>
            <div className="flex gap-1.5 shrink-0 ml-1">
              {hasHwDebt && (
                <Tooltip text="Отметить ДЗ" position="top">
                  <div 
                    className="w-3 h-3 rounded-full bg-gradient-to-b from-[#0082a8] to-[#004e66] shadow-[0_1px_3px_rgba(0,101,132,0.6)] border border-[#00394b] ring-1 ring-inset ring-white/30 cursor-pointer hover:scale-125 hover:shadow-md active:scale-95 active:shadow-inner transition-all" 
                    onClick={(e) => { e.stopPropagation(); onHwClick && onHwClick(lesson); }}
                  />
                </Tooltip>
              )}
              {hasFinDebt && (
                <Tooltip text="Отметить оплату" position="top">
                  <div 
                    className="w-3 h-3 rounded-full bg-gradient-to-b from-[#da2146] to-[#8f0e27] shadow-[0_1px_3px_rgba(183,18,52,0.6)] border border-[#6b081b] ring-1 ring-inset ring-white/30 cursor-pointer hover:scale-125 hover:shadow-md active:scale-95 active:shadow-inner transition-all" 
                    onClick={(e) => { e.stopPropagation(); onFinClick && onFinClick(lesson); }}
                  />
                </Tooltip>
              )}
            </div>
          </div>
          <div className="flex gap-1 items-center shrink-0">
            {isCanceled ? (
              <span className="text-[9px] font-bold text-red-600 bg-red-100 px-1 rounded-sm leading-tight ml-0.5">Отменён</span>
            ) : isSkippedFree ? (
              <span className="text-[9px] font-bold text-stone-600 bg-stone-200 px-1 rounded-sm leading-tight ml-0.5">б/о</span>
            ) : (
              renderStatusIcon(lesson.status)
            )}
            {!isOverlay && onMoreClick && (
              <button 
                onClick={onMoreClick}
                className="ml-1 text-stone-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all outline-none p-0.5 pointer-events-auto lg:opacity-0 group-hover/card:opacity-100 focus-visible:opacity-100"
              >
                <MoreVertical size={14} />
              </button>
            )}
          </div>
        </div>
        <div className={`font-medium flex items-center justify-between gap-1 min-w-0 ${(isCanceled || isSkippedFree) ? 'line-through opacity-70' : ''}`}>
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

  const LessonCardOverlay = ({ lesson, compact = false, dragTimeDelta = 0, width = null, height = null, isCopyMode = false }) => {
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
      <div style={{ width: width ? `${width}px` : 'auto', height: height ? `${height}px` : 'auto' }} className="h-full relative">
        <LessonCardView 
          lesson={displayLesson}
          onClick={() => {}}
          compact={compact}
          layout={compact ? "horizontal" : "vertical"}
          isOverlay={true}
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
        {isCopyMode && (
          <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-bold shadow-lg z-50 pointer-events-none select-none">
            +
          </div>
        )}
      </div>
    );
  };

  const LessonCard = ({ lesson, onClick, compact = false, layout = "horizontal", onMoreClick, isCopyMode = false }) => {
    const { title, isFaded, borderColorClass, textColorClass, bgColorClass, entityStyle, hasFinDebt, hasHwDebt } = getLessonDisplayData(lesson);
    
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
      id: `lesson-${lesson.id}-${ymd(new Date(lesson.date))}`,
      data: lesson
    });

    const handleHwClick = (l) => {
      let stId = null;
      if (l.type === "individual") {
        stId = l.studentId;
      } else if (l.type === "group") {
        const group = groups.find(g => g.id === l.groupId);
        if (group && group.studentIds && group.studentIds.length > 0) {
          // If group, for now just pick the first debtor to mark, or show modal for all if ActionItemModal could handle it
          // Wait, ActionItemModal handles one student. We can map over debtors and show modal for the group?
          // Since ActionItemModal takes ONE item.student, let's just find the first student with debt.
          stId = group.studentIds.find(id => studentsWithDebt.has(id));
        }
      }
      
      const st = students.find(s => s.id === stId);
      if (st) {
        setActionModal({
          isOpen: true,
          mode: "confirm",
          item: {
            type: "hw",
            student: st,
            count: 1,
            lessons: [l]
          }
        });
      }
    };

    const handleFinClick = (l) => {
      let stId = null;
      if (l.type === "individual") {
        stId = l.studentId;
      } else if (l.type === "group") {
        const group = groups.find(g => g.id === l.groupId);
        if (group && group.studentIds) {
          stId = group.studentIds.find(id => studentsWithFinDebt.has(id));
        }
      }
      const st = students.find(s => s.id === stId);
      if (st) {
        setActionModal({
          isOpen: true,
          mode: "confirm",
          item: {
            type: "money",
            student: st,
            amount: Math.abs(st.balance || 0)
          }
        });
      }
    };

    return (
      <LessonCardView 
        ref={setNodeRef}
        lesson={lesson}
        onClick={onClick}
        onMoreClick={onMoreClick}
        onHwClick={handleHwClick}
        onFinClick={handleFinClick}
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
        style={{ opacity: (isDragging && !isCopyMode) ? 0 : 1, height: layout === "vertical" ? "100%" : "auto" }}
      />
    );
  };

  const DroppableSlot = ({ id, date, isToday, children, className, onClick, style }) => {
    const { isOver, setNodeRef } = useDroppable({
      id: id,
      data: { date }
    });
    
    return (
      <div 
        ref={setNodeRef} 
        onClick={onClick}
        className={`${className} transition-all duration-300 ${isOver ? 'shadow-neu-sm-inset bg-stone-200/20' : ''}`}
        style={style}
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
            
            const cancelledCount = dayLessons.filter(l => l.status === "cancelled").length;
            const skippedFreeCount = dayLessons.filter(l => l.status === "skipped_free").length;
            const unmarkedCount = isPast ? dayLessons.filter(l => l.status === "planned").length : 0;
            const paidCount = isPast ? dayLessons.filter(l => l.status === "conducted" || l.status === "skipped_paid").length : 0;

            return (
              <DroppableSlot 
                key={idx} 
                id={`month-slot-${dateStr}`} 
                date={dateStr}
                className={`group/day min-w-0 border-r border-b border-stone-200/60 p-2 sm:p-3 flex flex-col min-h-[100px] md:min-h-[120px] cursor-pointer ${isToday ? "bg-white ring-2 ring-inset ring-emerald-500/40 shadow-sm z-10 hover:shadow-neu-sm-inset hover:bg-stone-50" : isPast ? "bg-stone-100/60 hover:bg-stone-200/50 hover:shadow-neu-sm-inset" : "bg-white hover:bg-stone-50 hover:shadow-neu-sm-inset"} relative transition-all duration-300`}
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
                        <Tooltip text="Не сдано ДЗ" position="bottom-left">
                          <div className="w-2 h-2 rounded-full bg-[#006584] shadow-sm cursor-help" />
                        </Tooltip>
                      )}
                      {!isPast && hasFinDebtors && (
                        <Tooltip text="Задолженность" position="bottom-left">
                          <div className="w-2 h-2 rounded-full bg-[#B71234] shadow-sm cursor-help" />
                        </Tooltip>
                      )}
                      {(cancelledCount > 0 || skippedFreeCount > 0 || unmarkedCount > 0) && (
                        <div className="flex flex-wrap gap-1">
                          {cancelledCount > 0 && (
                            <Tooltip text="Отмены уроков" position="bottom-left">
                              <span className="text-[9px] font-bold text-rose-500 bg-rose-50 px-1 rounded-md border border-rose-100/50 shadow-sm flex items-center justify-center min-w-[16px]">
                                {cancelledCount}
                              </span>
                            </Tooltip>
                          )}
                          {skippedFreeCount > 0 && (
                            <Tooltip text="Пропуски без оплаты" position="bottom-left">
                              <span className="text-[9px] font-bold text-stone-500 bg-stone-100 px-1 rounded-md border border-stone-200/50 shadow-sm flex items-center justify-center min-w-[16px]">
                                {skippedFreeCount}
                              </span>
                            </Tooltip>
                          )}
                          {unmarkedCount > 0 && (
                            <Tooltip text="Без отметки" position="bottom-left">
                              <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-100/50 shadow-sm flex items-center justify-center whitespace-nowrap">
                                {unmarkedCount} без отметки
                              </span>
                            </Tooltip>
                          )}
                        </div>
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
        <div className="flex shrink-0 border-b border-stone-200 bg-white/80 backdrop-blur-sm z-50 pr-[16px]">
          <div className="w-10 sm:w-12 shrink-0 border-r border-stone-200"></div>
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
              const cancelCount = dayLessons.filter(l => l.status === "cancelled").length;
              const skippedFreeCount = dayLessons.filter(l => l.status === "skipped_free").length;
              const unmarkedCount = isPast ? dayLessons.filter(l => l.status === "planned").length : 0;

              return (
                <div key={dateStr} className={`flex-1 min-w-0 flex flex-col items-center justify-center py-2 sm:py-3 border-r border-stone-200 last:border-r-0 relative ${isToday ? "bg-white ring-2 ring-emerald-500/40 ring-inset z-10" : isPast ? "bg-stone-100/60" : "bg-white hover:bg-stone-50/30"} transition-all`}>
                  <div className="absolute top-1 left-1 flex flex-col gap-1">
                    {!isPast && hasHwDebtors && (
                      <Tooltip text="Не сдано ДЗ" position="bottom-left">
                        <div className="w-2 h-2 rounded-full bg-[#006584] shadow-sm cursor-help" />
                      </Tooltip>
                    )}
                    {!isPast && hasFinDebtors && (
                      <Tooltip text="Задолженность" position="bottom-left">
                        <div className="w-2 h-2 rounded-full bg-[#B71234] shadow-sm cursor-help" />
                      </Tooltip>
                    )}
                  </div>
                  {(cancelCount > 0 || skippedFreeCount > 0 || unmarkedCount > 0) && (
                    <div className="absolute top-1 right-1 flex gap-0.5">
                      {cancelCount > 0 && (
                        <Tooltip text="Отмены уроков" position="bottom-right">
                          <span className="text-[9px] font-bold text-rose-500 bg-rose-50 px-1 rounded-md border border-rose-100/50 shadow-sm">
                            {cancelCount}
                          </span>
                        </Tooltip>
                      )}
                      {skippedFreeCount > 0 && (
                        <Tooltip text="Пропуски без оплаты" position="bottom-right">
                          <span className="text-[9px] font-bold text-stone-500 bg-stone-100 px-1 rounded-md border border-stone-200/50 shadow-sm">
                            {skippedFreeCount}
                          </span>
                        </Tooltip>
                      )}
                      {unmarkedCount > 0 && (
                        <Tooltip text="Без отметки" position="bottom-right">
                          <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1 rounded-md border border-amber-100/50 shadow-sm">
                            {unmarkedCount}
                          </span>
                        </Tooltip>
                      )}
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
        <div className="flex-1 overflow-y-auto overflow-x-hidden flex relative scrollbar-thin pb-6 pr-2">
          <div className="w-10 sm:w-12 shrink-0 border-r border-stone-200 bg-white sticky left-0 z-40" style={{ minHeight: hours.length * hourHeight }}>
            <div className="relative" style={{ height: hours.length * hourHeight }}>
              {hours.map(h => (
                <div key={h} className={`absolute w-full text-right pr-2 text-[10px] font-semibold text-stone-600 ${h === tlStartH ? 'translate-y-1' : '-translate-y-1/2'}`} style={{ top: (h - tlStartH) * hourHeight }}>
                  {h === tlStartH ? null : `${h}:00`}
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex-1 flex min-w-[500px] relative">
            <div className="absolute left-0 right-0 pointer-events-none z-20" style={{ height: hours.length * hourHeight }}>
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
                <div key={dateStr} style={{ height: hours.length * hourHeight }} className={`group flex-1 min-w-0 border-r border-stone-200 last:border-r-0 ${isToday ? "bg-white ring-2 ring-emerald-500/40 ring-inset z-10" : isPast ? "bg-stone-100/60" : "bg-white"} relative transition-all`}>
                  <div 
                    className="w-full relative min-h-full transition-all duration-300"
                    style={{ height: hours.length * hourHeight }}
                  >
                    {/* Interactive Background Cells */}
                    <div className="absolute inset-0 flex flex-col z-10">
                      {hours.map(h => (
                        <DroppableSlot
                          key={h}
                          id={`week-slot-${dateStr}-${h}`}
                          date={dateStr}
                          className="w-full cursor-pointer hover:bg-stone-200/40 hover:shadow-neu-sm-inset transition-all"
                          style={{ height: hourHeight }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDrawer({ date: dateStr, startTime: `${String(h).padStart(2, '0')}:00` });
                          }}
                        />
                      ))}
                    </div>
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
                              isCopyMode={isCopyMode}
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
                  </div>
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
    const formattedDate = currentDate.toLocaleString("ru", { weekday: 'long' });
    
    const getPlural = (num, forms) => {
      const n = Math.abs(num) % 100;
      const n1 = n % 10;
      if (n > 10 && n < 20) return forms[2];
      if (n1 > 1 && n1 < 5) return forms[1];
      if (n1 === 1) return forms[0];
      return forms[2];
    };
    const formatMoney = (num) => new Intl.NumberFormat('ru-RU').format(num) + ' ₽';
    
    const revenue = dayLessons
      .filter(l => l.status !== 'cancelled' && l.status !== 'skipped_free')
      .reduce((sum, l) => sum + (Number(l.price) || 0), 0);
    const lessonCount = dayLessons.length;
    
    const todayStr = ymd(new Date());
    const isToday = dateStr === todayStr;
    
    const tlStartH = 8;
    const tlEndH = 23;
    const hours = Array.from({ length: tlEndH - tlStartH }, (_, i) => tlStartH + i);
    const hourHeight = 120; // px
    
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin pb-8 px-4 sm:px-6 lg:px-8 -mx-4 sm:-mx-6 lg:-mx-8">
        <div className="max-w-4xl mx-auto flex flex-col h-full space-y-6">
          <div className="shrink-0 sticky top-0 backdrop-blur-md bg-[rgb(var(--ivory))]/80 z-50 border-b border-stone-200/50 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {navigatedFromMonth && (
                <Tooltip text="Назад к месяцу" position="bottom">
                  <button 
                    onClick={() => {
                      setView("month");
                      setNavigatedFromMonth(false);
                    }}
                    className="p-1.5 hover:bg-stone-200/50 text-stone-500 rounded-lg transition-colors"
                  >
                    <ArrowLeft size={18} />
                  </button>
                </Tooltip>
              )}
              <h3 className="text-base font-bold text-stone-800 capitalize">
                {formattedDate}
              </h3>
            </div>
            {lessonCount > 0 && (
              <div className="text-stone-600 bg-white/60 px-4 py-1.5 rounded-xl text-sm font-bold shadow-neu-sm-inset border border-stone-200/50 flex items-center gap-2">
                <span>{lessonCount} {getPlural(lessonCount, ["урок", "урока", "уроков"])}</span>
                {revenue > 0 && (
                  <>
                    <span className="text-stone-300">•</span>
                    <span className="text-emerald-600">{formatMoney(revenue)}</span>
                  </>
                )}
              </div>
            )}
          </div>
          
          <div className="flex-1 flex bg-ivory/30 rounded-xl border border-stone-200/50 shadow-sm overflow-hidden mb-4 relative min-h-[600px] max-w-5xl mx-auto w-full">
            {/* Y-axis timeline */}
            <div className="w-12 sm:w-16 shrink-0 border-r border-stone-200 bg-white z-40">
              <div className="relative" style={{ height: hours.length * hourHeight }}>
                {hours.map(h => (
                  <div key={h} className="absolute w-full text-right pr-2 text-[10px] font-semibold text-stone-500 -translate-y-1/2" style={{ top: (h - tlStartH) * hourHeight }}>
                    {h}:00
                  </div>
                ))}
              </div>
            </div>
            
            {/* Grid Body */}
            <div className="flex-1 relative min-w-[300px]">
              {/* Horizontal Grid Lines */}
              <div className="absolute inset-0 pointer-events-none z-0">
                {hours.map(h => (
                  <div key={h} className="absolute w-full border-t border-stone-300 border-dashed" style={{ top: (h - tlStartH) * hourHeight }} />
                ))}
              </div>

              {/* Current Time Indicator */}
              {isToday && currentMins >= tlStartH * 60 && currentMins <= tlEndH * 60 && (
                <div 
                  className="absolute left-0 right-0 z-30 pointer-events-none"
                  style={{ top: ((currentMins - tlStartH * 60) / 60) * hourHeight }}
                >
                  <div className="h-[2px] bg-indigo-500 w-full relative shadow-[0_0_8px_rgba(99,102,241,0.5)]">
                    <div className="absolute left-0 -translate-y-1/2 w-2.5 h-2.5 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.8)]">
                      <div className="absolute inset-0 rounded-full bg-indigo-400 animate-ping opacity-75"></div>
                    </div>
                  </div>
                </div>
              )}

              <div 
                className="absolute inset-0 z-10"
              >
                {/* Background Clickable Area (to add lesson) */}
                <div className="absolute inset-0 flex flex-col z-10">
                  {hours.map(h => (
                    <DroppableSlot
                      key={h}
                      id={`day-slot-${dateStr}-${h}`}
                      date={dateStr}
                      className="w-full hover:bg-stone-200/40 hover:shadow-neu-sm-inset transition-all cursor-pointer"
                      style={{ height: hourHeight }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDrawer({ date: dateStr, startTime: `${String(h).padStart(2, '0')}:00` });
                      }}
                    />
                  ))}
                </div>

                {/* Lessons */}
                {(() => {
                  const sorted = [...dayLessons].map(l => {
                    const [sH, sM] = l.startTime.split(':').map(Number);
                    const [eH, eM] = l.endTime.split(':').map(Number);
                    let startMins = sH * 60 + sM;
                    let endMins = eH * 60 + eM;
                    if (endMins - startMins < 30) {
                      endMins = startMins + 30; // Enforce minimum visual duration
                    }
                    return { ...l, startMins, endMins };
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
                    const height = Math.max(60, ((displayEnd - displayStart) / 60) * hourHeight); // Ensure minimum 60px height
                    
                    const leftPercent = (l.colIndex / l.numCols) * 100;
                    const widthPercent = 100 / l.numCols;
                    
                    const { title, borderColorClass, textColorClass, bgColorClass, entityStyle, hasFinDebt, hasHwDebt } = getLessonDisplayData(l);
                    const topicTitle = getLessonTopic(l);
                    const isPast = ymd(new Date(l.date)) < ymd(new Date());
                    const isFaded = (isPast && l.status !== "planned" && !hasFinDebt && !hasHwDebt);
                    
                    return (
                      <div 
                        key={l.id} 
                        className="absolute transition-all z-30 hover:z-40 px-1 py-[1px]"
                        style={{ 
                          top, 
                          height,
                          left: `${leftPercent}%`,
                          width: `${widthPercent}%`
                        }}
                      >
                        <div 
                          className={`h-full w-full bg-ivory rounded-xl shadow-neu-sm border-l-4 ${borderColorClass} flex items-center justify-between px-3 py-2 cursor-pointer transition-all outline-none group hover:shadow-neu-md hover:-translate-y-px overflow-hidden ${isFaded ? "opacity-60" : ""}`}
                          style={entityStyle}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDrawer(l);
                          }}
                        >
                          {/* Left: Time & Info */}
                          <div className="flex gap-3 items-center flex-1 min-w-0 h-full">
                            
                            <div className={`font-bold tabular-nums text-sm sm:text-base flex items-center justify-center shrink-0 pr-3 border-r-2 border-[#006584]/20 ${textColorClass} h-full`}>
                              <span>{l.startTime} — {l.endTime}</span>
                            </div>
                            
                            <div className="min-w-0 flex-1 flex flex-col justify-center">
                              <div className="font-bold text-stone-800 text-sm sm:text-base truncate leading-tight mb-0.5">{title}</div>
                              <div className="text-[10px] sm:text-xs text-stone-500 font-medium flex items-center gap-1.5 flex-wrap">
                                <span className="bg-white/60 px-1.5 rounded">{l.subjectName}</span>
                                {l.status === 'cancelled' ? (
                                  <span className="text-[9px] font-bold text-red-600 bg-red-100 px-1 rounded-sm">Отменён</span>
                                ) : l.status === 'skipped_free' ? (
                                  <span className="text-[9px] font-bold text-stone-600 bg-stone-200 px-1 rounded-sm">б/о</span>
                                ) : (
                                  renderStatusIcon(l.status)
                                )}
                                {topicTitle && height >= 60 && (
                                  <>
                                    <span className="text-stone-300">•</span>
                                    <span className="truncate max-w-[120px] sm:max-w-[200px]" title={topicTitle}>{topicTitle}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Right: Actions */}
                          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-2">
                            {hasHwDebt && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenDrawer(l, "hw");
                                }}
                                className="flex flex-col items-center justify-center w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-xl font-bold text-[8px] sm:text-[9px] uppercase transition-all outline-none bg-ivory shadow-neu-sm active:shadow-neu-sm-inset text-[#B71234] hover:text-rose-600"
                              >
                                <span className="leading-none mb-0.5">ДЗ</span>
                                <XCircle size={10} className="sm:hidden" strokeWidth={2.5}/>
                                <XCircle size={12} className="hidden sm:block" strokeWidth={2.5}/>
                              </button>
                            )}
                            {hasFinDebt && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenDrawer(l, "fin");
                                }}
                                className="flex flex-col items-center justify-center w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-xl font-bold text-[8px] sm:text-[9px] uppercase transition-all outline-none bg-ivory shadow-neu-sm active:shadow-neu-sm-inset text-[#B71234] hover:text-rose-600"
                              >
                                <span className="leading-none mb-0.5">₽</span>
                                <XCircle size={10} className="sm:hidden" strokeWidth={2.5}/>
                                <XCircle size={12} className="hidden sm:block" strokeWidth={2.5}/>
                              </button>
                            )}
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                setPopover({ lesson: l, triggerRect: rect });
                              }}
                              className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-stone-400 hover:text-indigo-600 hover:bg-white/50 shadow-sm rounded-xl transition-all"
                            >
                              <MoreVertical size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <PageWrapper 
      title="Рабочий календарь" 
      subtitle="Ваше время под контролем"
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
                className="fixed z-50 bg-ivory rounded-xl shadow-neu-xl p-2 w-56 animate-in fade-in zoom-in duration-200 overflow-y-auto"
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
            const l = item.lessons[0]; // We always pass a single lesson array here
            await handleQuickHomework(l, item.student.id, true);
          } else if (item.type === 'money') {
            await addPayment({
              studentId: item.student.id,
              studentName: item.student.name,
              amount: selectedLessonsOrAmount,
              paidAt: new Date().toISOString(),
              comment: "Оплата с расписания"
            });
            // We need to refresh data since addPayment is outside useSchedule
            if (pageState?.refreshData) pageState.refreshData(); 
            // Fallback: reload window if refreshData isn't available
            // but useSchedule handles its own data fetching, let's just trigger a re-fetch?
            // Since we can't easily trigger the outer fetchData from here without modifying useSchedule,
            // we can just force a reload or hope the user uses the outer app refresh.
            // Actually, we can use window.dispatchEvent to notify.
            window.dispatchEvent(new CustomEvent('force-refresh-data'));
          }
        }}
      />

      </div>
    </PageWrapper>
  );
}
