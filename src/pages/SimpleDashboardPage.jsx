import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { createPortal } from 'react-dom';
import { ChevronRight, ChevronLeft, Plus, Users, Wallet, CalendarPlus, Check, Sparkles, TrendingUp, AlertCircle, Clock } from "lucide-react";

import { useSchedule } from "../hooks/useSchedule.js";
import { useScheduleDragAndDrop } from '../hooks/useScheduleDragAndDrop.js';
import { useScheduleModals } from "../hooks/useScheduleModals.js";
import { useScheduleNavigation } from "../hooks/useScheduleNavigation.js";
import { useScheduleLessonData } from "../hooks/useScheduleLessonData.js";
import { useDashboardData } from "../hooks/useDashboardData.js";

import WeekView from "../components/schedule/WeekView.jsx";
import { LessonCardOverlay } from '../components/schedule/LessonCardOverlay.jsx';
import { StatusPopover } from "../components/schedule/StatusPopover.jsx";
import LessonInspector from "../components/schedule/LessonInspector.jsx";
import StudentFormDrawer from "../components/students/StudentFormDrawer.jsx";
import ActionItemModal from "../components/dashboard/ActionItemModal.jsx";
import Modal from '../components/ui/Modal.jsx';
import Input from '../components/ui/Input.jsx';
import Button from '../components/ui/Button.jsx';
import Tooltip from '../components/ui/Tooltip.jsx';
import Select from '../components/ui/Select.jsx';

import { usePayments } from "../hooks/usePayments.js";
import { useStudents } from "../hooks/useStudents.js";
import { usePrograms } from "../hooks/usePrograms.js";
import pb from "../services/pocketbase.js";

// ── BENTO COMPONENTS ────────────────────────────────────────────────────────
function BentoCard({ children, className = "" }) {
  return (
    <div className={`relative bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden flex flex-col p-5 sm:p-6 transition-all hover:shadow-md min-h-[200px] xl:min-h-[240px] ${className}`}>
      {children}
    </div>
  );
}

// 1. Ученики (с переключателем)
function StudentsBento({ students, onCreateStudent, onGoToProfile }) {
  const [showList, setShowList] = useState(false);

  return (
    <BentoCard>
      {showList ? (
        <div className="flex flex-col h-full animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setShowList(false)} className="p-2 hover:bg-stone-50 rounded-full transition-colors -ml-2 text-stone-400 hover:text-stone-700">
              <ChevronLeft size={20} />
            </button>
            <h3 className="font-bold text-stone-800">Ученики</h3>
            <div className="w-8" />
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2 hide-scrollbar">
            {students.map(s => (
              <div
                key={s.id}
                onClick={() => onGoToProfile(s.id)}
                className="p-3 bg-stone-50 rounded-xl hover:bg-stone-100 cursor-pointer transition-colors"
              >
                <div className="font-medium text-stone-900 text-sm truncate">{s.name}</div>
                <div className="text-xs text-stone-500 mt-0.5">{s.subjects?.[0]?.name || "Без предмета"}</div>
              </div>
            ))}
            {students.length === 0 && (
              <p className="text-sm text-stone-400 text-center py-4">Нет учеников</p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full justify-between group">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
            <Users size={28} />
          </div>
          <div className="mt-auto pt-4">
            <h3 className="text-lg sm:text-xl font-bold text-stone-900 leading-tight mb-2">Новый<br/>ученик</h3>
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={onCreateStudent}
                className="bg-blue-600 text-white rounded-xl px-4 sm:px-5 py-2 sm:py-2.5 font-semibold text-sm hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
              >
                Добавить
              </button>
              <Tooltip text="Существующие ученики">
                <button
                  onClick={() => setShowList(true)}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-stone-50 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>
      )}
    </BentoCard>
  );
}

// 2. Добавить урок
function LessonBento({ onCreateLesson }) {
  return (
    <BentoCard className="group cursor-pointer" onClick={onCreateLesson}>
      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
        <CalendarPlus size={28} />
      </div>
      <div className="mt-auto pt-4 flex items-end justify-between">
        <h3 className="text-lg sm:text-xl font-bold text-stone-900 leading-tight">Добавить<br/>урок</h3>
        <div className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
          <Plus size={20} />
        </div>
      </div>
    </BentoCard>
  );
}

// 3. Внести оплату
function PaymentBento({ onAddPayment }) {
  return (
    <BentoCard className="group cursor-pointer" onClick={onAddPayment}>
      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
        <Wallet size={28} />
      </div>
      <div className="mt-auto pt-4 flex items-end justify-between">
        <h3 className="text-lg sm:text-xl font-bold text-stone-900 leading-tight">Отметить<br/>оплату</h3>
        <div className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
          <Plus size={20} />
        </div>
      </div>
    </BentoCard>
  );
}

// 4. Статистика (Карусель)
function StatsBento({ stats }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const formatMoney = (num) => typeof num === "number" ? `${Math.round(num).toLocaleString("ru-RU")} ₽` : num;

  const slides = [
    {
      icon: TrendingUp, color: "text-amber-500", bg: "bg-amber-50",
      label: "Доход в этом месяце", value: formatMoney(stats.incomeMonth || 0)
    },
    {
      icon: Clock, color: "text-blue-500", bg: "bg-blue-50",
      label: "Уроков на неделе", value: stats.lessonsWeek || 0
    },
    {
      icon: AlertCircle, color: "text-rose-500", bg: "bg-rose-50",
      label: "Общий долг", value: formatMoney(stats.totalDebt || 0)
    }
  ];

  const nextSlide = () => setCurrentIndex((i) => (i + 1) % slides.length);
  const prevSlide = () => setCurrentIndex((i) => (i - 1 + slides.length) % slides.length);

  const slide = slides[currentIndex];
  const Icon = slide.icon;

  return (
    <BentoCard>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${slide.bg} ${slide.color}`}>
          <Icon size={20} className="sm:w-6 sm:h-6" />
        </div>
        <div className="flex gap-1">
          <button onClick={prevSlide} className="p-1.5 hover:bg-stone-50 rounded-lg text-stone-400">
            <ChevronLeft size={18} />
          </button>
          <button onClick={nextSlide} className="p-1.5 hover:bg-stone-50 rounded-lg text-stone-400">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div className="mt-auto animate-fade-in" key={currentIndex}>
        <p className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">{slide.value}</p>
        <p className="text-[10px] sm:text-xs font-semibold text-stone-400 uppercase tracking-wider mt-1 leading-tight">{slide.label}</p>
      </div>
    </BentoCard>
  );
}

// ── CUSTOM PAYMENT MODAL FOR LITE MODE ───────────────────────────────────────
function LitePaymentModal({ isOpen, onClose, students, onConfirm }) {
  const [amount, setAmount] = useState("");
  const [studentId, setStudentId] = useState("");

  useEffect(() => {
    if (isOpen) {
      setAmount("");
      setStudentId("");
    }
  }, [isOpen]);

  const activeStudents = students.filter(s => !s.isArchived);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Отметить оплату" maxWidth="max-w-sm">
      <div className="space-y-4">
        <div className="pt-2">
          <Select 
            label="Ученик"
            name="studentId"
            value={studentId} 
            onChange={e => setStudentId(e.target.value)}
          >
            <option value="" disabled hidden>Выберите ученика...</option>
            {activeStudents.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        </div>
        <div className="pt-2">
          <Input 
            label="Сумма (₽)"
            type="number" 
            value={amount} 
            onChange={e => setAmount(e.target.value)}
            placeholder="Например, 1500"
          />
        </div>
        <div className="pt-2">
          <Button 
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" 
            disabled={!studentId || !amount || Number(amount) <= 0}
            onClick={() => onConfirm(studentId, Number(amount))}
          >
            Сохранить оплату
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── MAIN PAGE COMPONENT ─────────────────────────────────────────────────────
export default function SimpleDashboardPage() {
  const { addPayment } = usePayments();
  const { createStudent, patchStudent } = useStudents();

  const navigate = useNavigate();
  const location = useLocation();
  const pageState = location.state;

  useEffect(() => {
    if (localStorage.getItem("isDemoMode") === "true") {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const [view, setView] = useState(pageState?.view || "week");
  const [currentDate, setCurrentDate] = useState(new Date());

  // 1. Data for Dashboard (Stats)
  const { stats, refresh: refreshDashboard } = useDashboardData();

  // 2. Data for Schedule
  const {
    lessons, students, groups, handleSaveLesson, handleCopyLesson,
    handleDeleteLesson, handleQuickStatus, handleQuickHomework, handlePatchLesson
  } = useSchedule({ currentDate, view });

  const { programs } = usePrograms();

  // 3. Drawers state
  const [selectedLessonId, setSelectedLessonId] = useState(null);
  const [createInitialLesson, setCreateInitialLesson] = useState(null);
  const [studentDrawerOpen, setStudentDrawerOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const handleOpenLessonDrawer = (initialData = null) => {
    if (initialData?.id) {
      setSelectedLessonId(initialData.id);
      setCreateInitialLesson(null);
    } else {
      setSelectedLessonId(null);
      setCreateInitialLesson(initialData || {});
    }
  };

  const handleCloseLessonDrawer = () => {
    setSelectedLessonId(null);
    setCreateInitialLesson(null);
  };

  // 4. Schedule Navigation
  const {
    headerTitle, periodLessons, prevPeriod, nextPeriod, goToday
  } = useScheduleNavigation({ pageState, lessons, currentDate, setCurrentDate, view, setView });
  
  // Force view to week for Lite Mode
  useEffect(() => {
    if (view !== "week") setView("week");
  }, [view, setView]);

  // 5. Schedule Data
  const {
    lessonsByDate, studentsWithDebt, studentsWithFinDebt, firstUpcomingLessonIdByStudent,
    getLessonTopic, getLessonDisplayData
  } = useScheduleLessonData({ lessons, students, groups, hwDebtOnly: false });

  // 6. Schedule Modals
  const { popover, setPopover } = useScheduleModals();

  // 7. Schedule DnD
  const {
    sensors, activeDragLesson, dragTimeDelta, dragWidth, dragHeight, isCopyMode,
    handleDragStart, handleDragMove, handleDragEnd
  } = useScheduleDragAndDrop({ view, hookCopyLesson: handleCopyLesson, handleSaveLesson, lessons });

  // Helpers
  const onSaveLessonComplete = async (id, data) => {
    await handleSaveLesson(id, data);
    handleCloseLessonDrawer();
    refreshDashboard();
  };
  const onDeleteLessonComplete = async (id) => {
    await handleDeleteLesson(id);
    handleCloseLessonDrawer();
    refreshDashboard();
  };
  const handleStudentSubmit = async (studentData, existingId) => {
    const tutorId = pb.authStore.record?.id;
    if (existingId) {
      await patchStudent(existingId, studentData);
    } else {
      await createStudent({ ...studentData, tutorId });
    }
    setStudentDrawerOpen(false);
    refreshDashboard();
  };

  const handlePaymentConfirm = async (studentId, amount) => {
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) return;
    const s = students.find(x => x.id === studentId);
    try {
      await addPayment({
        studentId: s.id,
        studentName: s.name,
        amount: parsedAmount,
        paidAt: new Date().toISOString(),
        note: "Быстрая оплата",
      });
    } catch (e) {
      console.error(e);
    } finally {
      setPaymentModalOpen(false);
      refreshDashboard();
    }
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragMove={handleDragMove} onDragEnd={handleDragEnd}>
      <div className="min-h-[calc(100vh-theme(spacing.16))] sm:min-h-[100dvh] bg-[#f8fafc] p-4 sm:p-6 lg:p-8 flex flex-col">
        <header className="max-w-[1400px] mx-auto w-full flex items-center justify-between gap-4 shrink-0 mb-4 sm:mb-6">
          <div className="flex items-center gap-3 shrink-0">
            <span className="p-2 sm:p-3 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm">
              <Sparkles size={24} strokeWidth={2} />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">Лёгкий старт</h1>
              <p className="text-xs sm:text-sm font-medium text-stone-500 mt-0.5">Всё самое важное под рукой</p>
            </div>
          </div>
        </header>

        <div className="max-w-[1400px] mx-auto w-full flex-1 flex flex-col xl:flex-row items-start gap-6 lg:gap-8 min-h-0">
          
          {/* LEFT: Bento Grid */}
          <div className="flex-1 w-full grid grid-cols-2 gap-4 shrink-0">
            <StudentsBento 
              students={students} 
              onCreateStudent={() => setStudentDrawerOpen(true)}
              onGoToProfile={(studentId) => navigate('/students', { state: { action: 'highlight', studentId } })}
            />
            <LessonBento 
              onCreateLesson={() => handleOpenLessonDrawer({})} 
            />
            <PaymentBento 
              onAddPayment={() => setPaymentModalOpen(true)}
            />
            <StatsBento 
              stats={stats} 
            />
          </div>

          {/* RIGHT: WeekView Schedule */}
          <div className="flex-1 w-full flex flex-col h-[600px] xl:h-[calc(100vh-10rem)] bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden relative">
            {/* Custom mini header for schedule */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-stone-100 bg-stone-50/50">
              <div className="flex items-center gap-2 sm:gap-3">
                <button onClick={prevPeriod} className="p-1 sm:p-1.5 hover:bg-stone-200 rounded-lg text-stone-500 transition-colors"><ChevronLeft size={20}/></button>
                <button onClick={goToday} className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-white border border-stone-200 rounded-lg text-xs sm:text-sm font-semibold text-stone-700 hover:bg-stone-50 shadow-sm transition-colors">Сегодня</button>
                <button onClick={nextPeriod} className="p-1 sm:p-1.5 hover:bg-stone-200 rounded-lg text-stone-500 transition-colors"><ChevronRight size={20}/></button>
              </div>
              <h2 className="text-sm sm:text-lg font-bold text-stone-800 capitalize truncate ml-2">{headerTitle}</h2>
            </div>
            
            <div className="flex-1 overflow-hidden relative">
              <WeekView
                currentDate={currentDate}
                lessonsByDate={lessonsByDate}
                students={students}
                groups={groups}
                firstUpcomingLessonIdByStudent={firstUpcomingLessonIdByStudent}
                studentsWithDebt={studentsWithDebt}
                studentsWithFinDebt={studentsWithFinDebt}
                periodLessons={periodLessons}
                handleOpenDrawer={handleOpenLessonDrawer}
                setPopover={setPopover}
                getLessonDisplayData={getLessonDisplayData}
                getLessonTopic={getLessonTopic}
                onFinClick={() => setPaymentModalOpen(true)}
                onHwClick={() => {}}
                onCreateStudent={() => setStudentDrawerOpen(true)}
                onGoToProfile={(student) => navigate('/students', { state: { action: 'highlight', studentId: student.id } })}
                selectedEntityId={null}
                onCardClick={(student) => {
                  if (student.type) handleOpenLessonDrawer({ id: student.id });
                }}
                onDateClick={() => {}}
                onDateDoubleClick={(dateStr) => handleOpenLessonDrawer({ date: dateStr })}
              />
            </div>
          </div>

        </div>
      </div>

      {/* DRAWERS & MODALS */}
      {studentDrawerOpen && (
        <StudentFormDrawer
          studentId={null}
          initialData={null}
          isOpen={studentDrawerOpen}
          onClose={() => setStudentDrawerOpen(false)}
          onSubmit={handleStudentSubmit}
          availablePrograms={programs}
        />
      )}

      {(selectedLessonId || createInitialLesson) && (
        <LessonInspector
          isOpen={true}
          onClose={handleCloseLessonDrawer}
          onSubmit={onSaveLessonComplete}
          onDelete={selectedLessonId ? onDeleteLessonComplete : undefined}
          initialData={selectedLessonId ? lessons.find(l => l.id === selectedLessonId) : createInitialLesson}
          students={students}
          groups={groups}
          lessons={lessons}
        />
      )}

      <LitePaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        students={students}
        onConfirm={handlePaymentConfirm}
      />

      <StatusPopover popover={popover} onClose={() => setPopover(null)} onQuickStatus={handleQuickStatus} />

      {createPortal(
        <DragOverlay zIndex={9999} dropAnimation={null}>
          {activeDragLesson && (
            <LessonCardOverlay 
              lesson={activeDragLesson} 
              isCopyMode={isCopyMode}
              dragTimeDelta={dragTimeDelta}
              width={dragWidth}
              height={dragHeight}
              displayData={getLessonDisplayData(activeDragLesson)}
            />
          )}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  );
}
