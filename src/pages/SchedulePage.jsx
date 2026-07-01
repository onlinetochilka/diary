import { useState, useEffect, useMemo } from "react";
import { CalendarDays, Plus, ChevronLeft, ChevronRight, CheckCircle2, XCircle, AlertCircle, Clock, FileText, PartyPopper, Copy } from "lucide-react";
import { Card, Button, Switch, SegmentedControl } from "../components/ui/index.js";
import { getLessons, getStudents, getGroups, deleteLesson, addLesson, updateLesson } from "../services/database.js";
import { getEntityColor } from "../utils/colors.js";
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
  let day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // 0=Mon, 6=Sun
};

// Format date to YYYY-MM-DD
const ymd = (d) => {
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
};

export default function SchedulePage() {
  const [view, setView] = useState("week"); // 'month', 'week', 'agenda'
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [lessons, setLessons] = useState([]);
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [hwDebtOnly, setHwDebtOnly] = useState(false);
  const [colorMode] = useState(() => localStorage.getItem("app_color_mode") || "entity");

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);

  // Fast Tracking Popover State
  const [popover, setPopover] = useState(null); // { lesson, x, y }
  
  // Drag-and-Drop Quick Edit State
  const [timeEditPopover, setTimeEditPopover] = useState(null); // { lesson, newDate, isCopy, x, y }

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [ls, st, gr] = await Promise.all([
        getLessons(),
        getStudents(),
        getGroups()
      ]);
      setLessons(ls);
      setStudents(st);
      setGroups(gr);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };



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
    fetchData();

    // Auto switch to agenda on mobile
    if (window.innerWidth < 1024) {
      setView("agenda");
    }
    const handleResize = () => {
      if (window.innerWidth < 1024 && view !== "agenda") {
        setView("agenda");
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleOpenDrawer = (lesson = null) => {
    setPopover(null);
    setEditingLesson(lesson);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setEditingLesson(null);
  };

  const handleSaveLesson = async (id, data) => {
    if (id) {
      await updateLesson(id, data);
    } else {
      await addLesson(data);
    }
    
    // Quick and dirty topic completion
    if (data._markTopicCompleted && data.type === "individual" && data.studentId && data.programId && data.topicId) {
      // Not fully implemented: Requires fetching student, updating the specific program's topic, and saving.
      // For this step, we just save the lesson.
    }

    handleCloseDrawer();
    fetchData();
  };

  const handleDeleteLesson = async (id) => {
    await deleteLesson(id);
    handleCloseDrawer();
    fetchData();
  };

  const handleQuickStatus = async (lesson, status) => {
    setPopover(null);
    await updateLesson(lesson.id, { status });
    fetchData();
  };

  const handleQuickHomework = async (lesson, studentId, isDone) => {
    try {
      const currentHwDoneBy = lesson.hwDoneBy || [];
      const newHwDoneBy = isDone 
        ? [...currentHwDoneBy, studentId]
        : currentHwDoneBy.filter(id => id !== studentId);
        
      await updateLesson(lesson.id, { hwDoneBy: newHwDoneBy });
      setLessons(prev => prev.map(l => l.id === lesson.id ? { ...l, hwDoneBy: newHwDoneBy } : l));
      
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

  const LessonCard = ({ lesson, onClick }) => {
    let title = "Неизвестно";
    let entityId = null;
    
    if (lesson.type === "individual") {
      const st = students.find(s => s.id === lesson.studentId);
      title = st ? st.name : "Ученик удален";
      entityId = lesson.studentId;
    } else {
      const gr = groups.find(g => g.id === lesson.groupId);
      title = gr ? gr.name : "Группа удалена";
      entityId = lesson.groupId;
    }

    const isPast = ymd(new Date(lesson.date)) < ymd(new Date()) && lesson.status !== "planned";
    const isFaded = isPast || hwDebtOnly;
    
    // Determine card styling based on colorMode
    let colorClass = "";
    if (colorMode === "subject") {
      colorClass = getSubjectColor(lesson.subjectName);
    } else {
      const c = getEntityColor(title);
      colorClass = `${c.bg} ${c.text} ${c.border}`;
    }

    return (
      <div 
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "copyMove";
          e.dataTransfer.setData("application/json", JSON.stringify(lesson));
        }}
        onClick={(e) => onClick(e, lesson)}
        className={`px-2 py-1.5 rounded-lg border text-xs cursor-pointer hover:shadow-md transition-all relative ${colorClass} ${isFaded ? "opacity-50 grayscale" : ""}`}
      >
        <div className="flex items-center justify-between mb-0.5">
          <span className="font-bold tabular-nums">{lesson.startTime}</span>
          <div className="flex gap-1 items-center shrink-0">
            {renderStatusIcon(lesson.status)}
          </div>
        </div>
        <div className={`font-medium flex items-center justify-between gap-1 ${lesson.status === 'cancelled' ? 'line-through' : ''}`}>
          <span className="truncate">{title}</span>
          {lesson.homework && (
            <div 
              className="shrink-0 flex items-center justify-center" 
              title={isLessonHwFullyDone(lesson) ? "ДЗ сдано" : "Долг по ДЗ"}
            >
              <FileText size={10} className={isLessonHwFullyDone(lesson) ? "text-emerald-500" : "text-red-500"} />
            </div>
          )}
        </div>
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
      <div className="flex-1 min-h-0 bg-white border border-stone-200/60 rounded-2xl overflow-hidden flex flex-col shadow-sm">
        <div className="grid grid-cols-7 bg-stone-50 border-b border-stone-200/60 shrink-0">
          {['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'].map(d => (
            <div key={d} className="py-2 text-center text-[10px] font-bold text-stone-400 uppercase tracking-widest border-r border-stone-200/60 last:border-0">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 flex-1 overflow-y-auto">
          {days.map((day, idx) => {
            if (!day) return <div key={idx} className="border-r border-b border-stone-100 bg-stone-50/30 p-1" />;
            
            const dateStr = ymd(new Date(year, currentDate.getMonth(), day));
            const dayLessons = lessonsByDate[dateStr] || [];
            const isToday = dateStr === todayStr;

            return (
              <div key={idx} className={`group/day border-r border-b border-stone-100 p-1.5 flex flex-col min-h-[100px] ${isToday ? "bg-indigo-50/20" : ""}`}>
                <div className="flex items-center justify-between mb-1.5 px-1 shrink-0">
                  <span className={`text-xs font-semibold ${isToday ? "bg-indigo-600 text-white w-5 h-5 rounded-full flex items-center justify-center" : "text-stone-500"}`}>
                    {day}
                  </span>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleOpenDrawer({ date: dateStr })}
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
                <div className="flex-1 space-y-1 overflow-y-auto scrollbar-thin pr-0.5">
                  {dayLessons.slice(0, 3).map(l => (
                    <LessonCard 
                      key={l.id} 
                      lesson={l} 
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setPopover({ lesson: l, x: rect.left, y: rect.bottom });
                      }} 
                    />
                  ))}
                  {dayLessons.length > 3 && (
                    <button 
                      className="w-full text-[10px] font-semibold text-stone-500 bg-stone-100/50 hover:bg-stone-100 border border-stone-200/50 rounded-lg py-1 mt-1 transition-colors"
                      onClick={() => {
                        setView("agenda");
                        setTimeout(() => {
                          const el = document.getElementById(`agenda-date-${dateStr}`);
                          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                        }, 100);
                      }}
                    >
                      +{dayLessons.length - 3} урока
                    </button>
                  )}
                </div>
              </div>
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
      <div className="flex-1 min-h-0 flex gap-2 overflow-x-auto snap-x pb-2 scrollbar-thin">
        {weekDays.map((wd, i) => {
          const dateStr = ymd(wd);
          const isToday = dateStr === todayStr;
          const isPast = dateStr < todayStr;
          const dayName = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'][i];
          const dayLessons = lessonsByDate[dateStr] || [];

          return (
            <div key={dateStr} className={`min-w-[180px] sm:min-w-[200px] flex-1 flex flex-col snap-center transition-opacity ${isPast ? 'opacity-60 grayscale-[10%]' : ''}`}>
              <div className={`p-3 rounded-t-xl border border-b-0 shrink-0 ${isPast ? 'bg-stone-50 border-stone-200/40' : 'bg-white border-stone-200/60'}`}>
                <div className={`text-[10px] font-bold tracking-widest uppercase mb-1 ${isToday ? 'text-indigo-600' : 'text-stone-400'}`}>{dayName}</div>
                <div className={`text-2xl font-bold leading-none flex items-center justify-center w-9 h-9 rounded-full ${isToday ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200' : 'text-stone-800'}`}>
                  {wd.getDate()}
                </div>
              </div>
              <div 
                className={`flex-1 min-h-0 border rounded-b-xl p-2 flex flex-col transition-colors ${isPast ? 'bg-stone-50 border-stone-200/40' : 'bg-white border-stone-200/60 border-t-0'}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  const isCopying = e.altKey || e.ctrlKey || e.metaKey;
                  e.dataTransfer.dropEffect = isCopying ? "copy" : "move";
                  e.currentTarget.classList.add("bg-indigo-50/50");
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove("bg-indigo-50/50");
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove("bg-indigo-50/50");
                  try {
                    const dataStr = e.dataTransfer.getData("application/json");
                    if (!dataStr) return;
                    const lessonData = JSON.parse(dataStr);
                    setTimeEditPopover({
                      lesson: lessonData,
                      newDate: dateStr,
                      isCopy: e.altKey || e.ctrlKey || e.metaKey,
                      x: e.clientX,
                      y: e.clientY
                    });
                  } catch (err) {}
                }}
              >
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="w-full mb-3 border-dashed shrink-0"
                  onClick={() => handleOpenDrawer({ date: dateStr })}
                >
                  <Plus size={14} className="mr-1" /> Добавить
                </Button>
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
                  {dayLessons.length === 0 && (
                    <div className="h-20 flex flex-col items-center justify-center text-xs text-stone-400 opacity-60 text-center px-2">
                      {hwDebtOnly ? (
                        <>
                          <PartyPopper size={20} className="text-emerald-400 mb-1 opacity-80" strokeWidth={1.5} />
                          <span>Все долги сданы</span>
                        </>
                      ) : (
                        <span className="italic">Нет уроков</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderAgenda = () => {
    const sortedDates = Object.keys(lessonsByDate).sort();
    
    return (
      <div className="flex-1 overflow-y-auto space-y-6 pr-2 scrollbar-thin pb-8">
        {sortedDates.length === 0 && (
          <div className="text-center py-12 text-stone-500 bg-white rounded-2xl border border-stone-200/60 flex flex-col items-center justify-center">
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
              <div className="sticky top-0 bg-[#FBFBFA] z-10 border-b border-stone-200/50 py-2 mb-3 flex items-center justify-between group/agenda">
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
              <div className="space-y-2">
                {dayLessons.map(l => {
                  const topicTitle = getLessonTopic(l);
                  let title = "Неизвестно";
                  let entityId = null;
                  if (l.type === "individual") {
                    const st = students.find(s => s.id === l.studentId);
                    title = st ? st.name : "Ученик удален";
                    entityId = l.studentId;
                  } else {
                    const gr = groups.find(g => g.id === l.groupId);
                    title = gr ? gr.name : "Группа удалена";
                    entityId = l.groupId;
                  }
                  
                  return (
                  <div 
                    key={l.id} 
                    className="flex gap-3 bg-white border border-stone-200/60 p-3 rounded-xl shadow-sm items-center cursor-pointer hover:border-indigo-200 transition-colors"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setPopover({ lesson: l, x: rect.left, y: rect.bottom });
                    }}
                  >
                    <div className="w-16 text-center shrink-0">
                      <div className="text-lg font-bold text-stone-800">{l.startTime}</div>
                      <div className="text-[10px] text-stone-500 uppercase">{l.endTime}</div>
                    </div>
                    {colorMode === "subject" ? (
                      <div className={`w-1 h-10 rounded-full shrink-0 ${getSubjectColor(l.subjectName).split(' ')[0]}`} />
                    ) : (
                      <div className={`w-1 h-10 rounded-full shrink-0 ${getEntityColor(title).bg}`} />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-stone-800 truncate">
                        {title}
                      </div>
                      <div className="text-xs text-stone-500 truncate flex items-center gap-1.5">
                        <span className="font-medium text-stone-600">{l.subjectName}</span>
                        {renderStatusIcon(l.status)}
                        {topicTitle && (
                          <>
                            <span className="text-stone-300">•</span>
                            <span className="truncate" title={topicTitle}>{topicTitle}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {l.homework && l.homework.trim() !== "" && (
                      <div className="shrink-0 flex items-center gap-1.5 px-2 py-1 bg-stone-50 rounded-lg border border-stone-200/60" title={isLessonHwFullyDone(l) ? "ДЗ выполнено" : "ДЗ не выполнено"}>
                        <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">ДЗ</span>
                        {isLessonHwFullyDone(l) ? (
                          <CheckCircle2 size={14} className="text-emerald-500" />
                        ) : (
                          <XCircle size={14} className="text-red-400" />
                        )}
                      </div>
                    )}
                  </div>
                )})}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <PageWrapper
      title="Расписание"
      subtitle="Управление уроками и долгами"
      icon={CalendarDays}
      accentClass="text-indigo-600"
      extraHeader={
        <Button variant="primary" onClick={() => handleOpenDrawer()}>
          <Plus size={16} strokeWidth={2} className="mr-2" />
          Новый урок
        </Button>
      }
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" className="px-2" onClick={prevPeriod}><ChevronLeft size={18} /></Button>
          <Button variant="secondary" size="sm" onClick={goToday}>Сегодня</Button>
          <Button variant="secondary" size="sm" className="px-2" onClick={nextPeriod}><ChevronRight size={18} /></Button>
          <span className="text-lg font-bold text-stone-800 ml-2 w-32">{headerTitle}</span>
        </div>
        
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4">
          <label className="flex items-center gap-2 text-sm font-medium text-stone-600 bg-stone-100 px-3 py-1.5 rounded-lg cursor-pointer">
            <Switch checked={hwDebtOnly} onChange={() => setHwDebtOnly(!hwDebtOnly)} accent="red" />
            Долги по ДЗ
          </label>
          <div className="hidden lg:block">
            <SegmentedControl
              options={[
                { label: "Месяц", value: "month" },
                { label: "Неделя", value: "week" },
                { label: "Список", value: "agenda" }
              ]}
              value={view}
              onChange={setView}
            />
          </div>
        </div>
      </div>

      {view === "month" && renderMonth()}
      {view === "week" && renderWeek()}
      {view === "agenda" && renderAgenda()}

      <LessonDrawer 
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        onSubmit={handleSaveLesson}
        onDelete={handleDeleteLesson}
        initialData={editingLesson}
        students={students}
        groups={groups}
        lessons={lessons}
      />

      {popover && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPopover(null)} />
          <div 
            className="fixed z-50 bg-white rounded-xl shadow-xl border border-stone-200/60 p-2 w-56 animate-in fade-in zoom-in duration-200"
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
            className="fixed z-50 bg-white rounded-xl shadow-xl border border-stone-200/60 p-4 w-60 animate-in fade-in zoom-in duration-200 flex flex-col gap-3"
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
    </PageWrapper>
  );
}
