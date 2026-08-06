import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from "react-router-dom";
import { CalendarDays, Plus } from "lucide-react";
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { createPortal } from 'react-dom';

import { useSchedule } from "../hooks/useSchedule.js";
import { useScheduleDragAndDrop } from '../hooks/useScheduleDragAndDrop.js';
import { useScheduleModals } from "../hooks/useScheduleModals.js";
import { useScheduleNavigation } from "../hooks/useScheduleNavigation.js";
import { useScheduleLessonData } from "../hooks/useScheduleLessonData.js";

import LessonInspector from "../components/schedule/LessonInspector.jsx";
import ScheduleSidebar from "../components/schedule/ScheduleSidebar.jsx";
import ActionItemModal from "../components/dashboard/ActionItemModal.jsx";
import ScheduleStatsRow from "../components/schedule/ScheduleStatsRow.jsx";
import { ScheduleNavBar } from "../components/schedule/ScheduleNavBar.jsx";
import { StatusPopover } from "../components/schedule/StatusPopover.jsx";
import MonthView from "../components/schedule/MonthView.jsx";
import WeekView from "../components/schedule/WeekView.jsx";
import DayView from "../components/schedule/DayView.jsx";
import { LessonCardOverlay } from '../components/schedule/LessonCardOverlay.jsx';
import { WidgetErrorBoundary } from "../components/ui/WidgetErrorBoundary.jsx";

import { usePayments } from "../hooks/usePayments.js";

// ── Shared Section Wrapper ─────────────────────────────────────────────────
function PageWrapper({ children, title, subtitle, icon: Icon, iconBgClass, iconTextClass, extraHeader }) {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 flex flex-col h-[calc(100vh-theme(spacing.16))] sm:h-[100dvh]">
      <header className="max-w-[1400px] mx-auto w-full flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 shrink-0">
          <span className={`p-2.5 rounded-2xl ${iconBgClass} ${iconTextClass}`}>
            <Icon size={24} strokeWidth={1.5} />
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
        {extraHeader && <div className="flex-1 min-w-0 flex justify-end items-center">{extraHeader}</div>}
      </header>
      <div className="flex-1 flex flex-col min-h-0 w-full">
        {children}
      </div>
    </div>
  );
}

export default function SchedulePage() {
  const queryClient = useQueryClient();
  const { addPayment } = usePayments();
  const navigate = useNavigate();
  const location = useLocation();
  const onNavigate = (path, state) => navigate(`/${path}`, { state });
  const pageState = location.state;

  const [view, setView] = useState(pageState?.view || (window.innerWidth < 1024 ? "day" : "week"));
  const [currentDate, setCurrentDate] = useState(new Date());

  // ── Данные ──────────────────────────────────────────────────────────────
  const {
    lessons,
    students,
    groups,
    isLoading,
    handleSaveLesson: hookSaveLesson,
    handleCopyLesson: hookCopyLesson,
    handleDeleteLesson: hookDeleteLesson,
    handleQuickStatus: hookQuickStatus,
    handleQuickHomework: hookQuickHomework,
    handlePatchLesson: hookPatchLesson,
  } = useSchedule({ currentDate, view });

  const [hwDebtOnly, setHwDebtOnly] = useState(false);
  const [selectedEntityId, setSelectedEntityId] = useState(null);
  const [selectedLessonId, setSelectedLessonId] = useState(null);
  const [createInitial, setCreateInitial] = useState(null);
  const [selectedDateStr, setSelectedDateStr] = useState(null);

  const rightPanelMode = createInitial ? 'create' : selectedLessonId ? 'inspector' : 'students';
  const selectedLesson = lessons.find(l => l.id === selectedLessonId) || null;

  const handleOpenDrawer = (initialData = null) => {
    if (initialData?.id) {
      setSelectedLessonId(initialData.id);
      setCreateInitial(null);
      setSelectedEntityId(null);
    } else {
      setSelectedLessonId(null);
      setCreateInitial(initialData || {});
      setSelectedEntityId(null);
    }
  };

  const handleCloseDrawer = () => {
    setSelectedLessonId(null);
    setCreateInitial(null);
  };

  const handleCardClick = (student) => {
    if (student.type) {
      setSelectedLessonId(prev => prev === student.id ? null : student.id);
      setCreateInitial(null);
    } else {
      setSelectedEntityId(prev => prev === student.id ? null : student.id);
      handleCloseDrawer();
    }
  };

  // ── Навигация по периодам ───────────────────────────────────────────────
  const {
    navigatedFromMonth,
    setNavigatedFromMonth,
    year,
    headerTitle,
    periodLessons,
    prevPeriod,
    nextPeriod,
    goToday,
    handleViewChange,
  } = useScheduleNavigation({ pageState, lessons, currentDate, setCurrentDate, view, setView });

  // ── Вычисляемые данные карточек ─────────────────────────────────────────
  const {
    lessonsByDate,
    studentsWithDebt,
    studentsWithFinDebt,
    firstUpcomingLessonIdByStudent,
    getLessonTopic,
    getLessonDisplayData,
  } = useScheduleLessonData({ lessons, students, groups, hwDebtOnly });

  // ── Модалки ────────────────────────────────────────────────────────────
  const {
    popover,
    setPopover,
    actionModal,
    openActionModal,
    closeActionModal,
  } = useScheduleModals();

  const {
    sensors,
    activeDragLesson,
    dragTimeDelta,
    dragWidth,
    dragHeight,
    isCopyMode,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
  } = useScheduleDragAndDrop({
    view,
    hookCopyLesson,
    handleSaveLesson: hookSaveLesson,
    lessons,
  });

  // ── Intent: открыть drawer при переходе с другого экрана ───────────────
  useEffect(() => {
    const intent = localStorage.getItem("intent_schedule_entity");
    if (intent) {
      try {
        const parsed = JSON.parse(intent);
        localStorage.removeItem("intent_schedule_entity");
        setTimeout(() => {
          handleOpenDrawer({
            type:      parsed.type,
            studentId: parsed.type === "individual" ? parsed.id : "",
            groupId:   parsed.type === "group"      ? parsed.id : "",
          });
        }, 300);
      } catch (e) {}
    }
  }, []);

  // ── Обёртки над hookSave/Delete с закрытием drawer ─────────────────────
  const handleSaveLesson = async (id, data) => {
    await hookSaveLesson(id, data);
    handleCloseDrawer();
  };

  const handleDeleteLesson = async (id) => {
    await hookDeleteLesson(id);
    handleCloseDrawer();
  };

  // ── Клики по иконкам долга прямо из карточек ────────────────────────────
  const handleFinClick = (lesson) => {
    if (lesson.type === "individual" && lesson.studentId) {
      const student = students.find(s => s.id === lesson.studentId);
      if (student) {
        openActionModal({ type: "money", student, count: 1, amount: Math.abs(student.balance) || 0 });
      }
    }
  };

  const handleHwClick = (lesson) => {
    if (lesson.type === "individual" && lesson.studentId) {
      const student = students.find(s => s.id === lesson.studentId);
      if (student) {
        openActionModal({ type: "hw", student, count: 1, lessons: [lesson] });
      }
    }
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      <PageWrapper
      title="План занятий"
      subtitle="Расписание и материалы"
      icon={CalendarDays}
      iconBgClass="bg-[#1B4F72]/10"
      iconTextClass="text-[#1B4F72]"
      extraHeader={
        <ScheduleStatsRow
          lessons={periodLessons}
          students={students}
          periodLabel={view === "month" ? "в месяц" : view === "week" ? "на неделе" : "сегодня"}
        />
      }
    >
      <div className="h-full flex flex-col pt-4 relative">
        {/* Панель навигации */}
        <ScheduleNavBar
          view={view}
          headerTitle={headerTitle}
          onPrev={prevPeriod}
          onNext={nextPeriod}
          onToday={goToday}
          onViewChange={(v) => { setSelectedDateStr(null); handleViewChange(v); }}
          onCreateLesson={() => handleOpenDrawer()}
        />

        {/* Область с видами */}
        <div className="max-w-[1400px] mx-auto w-full flex-1 min-h-0 flex overflow-hidden rounded-2xl p-0 sm:p-2 px-2 sm:px-0 gap-4 sm:gap-6">
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
            <WidgetErrorBoundary className="h-full w-full flex flex-col min-h-0">
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
                onCreateStudent={() => onNavigate && onNavigate("students", { action: 'create' })}
                handleOpenDrawer={handleOpenDrawer}
                onGoToProfile={(student) => onNavigate && onNavigate("students", { action: 'highlight', studentId: student.id })}
                selectedEntityId={selectedEntityId}
                onCardClick={handleCardClick}
                selectedDateStr={selectedDateStr}
                onDateClick={(dateStr) => setSelectedDateStr(prev => prev === dateStr ? null : dateStr)}
                onDateDoubleClick={(date) => { setCurrentDate(date); setView("day"); setNavigatedFromMonth(true); setSelectedDateStr(null); }}
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
                getLessonDisplayData={getLessonDisplayData}
                getLessonTopic={getLessonTopic}
                onFinClick={handleFinClick}
                onHwClick={handleHwClick}
                onCreateStudent={() => onNavigate && onNavigate("students", { action: 'create' })}
                onGoToProfile={(student) => onNavigate && onNavigate("students", { action: 'highlight', studentId: student.id })}
                selectedEntityId={selectedEntityId}
                onCardClick={handleCardClick}
                onDateClick={(dateStr) => setSelectedDateStr(prev => prev === dateStr ? null : dateStr)}
                onDateDoubleClick={(date) => { setCurrentDate(date); setView("day"); setSelectedDateStr(null); }}
              />
            )}
            {view === "day" && (
              <DayView
                currentDate={currentDate}
                setCurrentDate={setCurrentDate}
                lessonsByDate={lessonsByDate}
                students={students}
                groups={groups}
                firstUpcomingLessonIdByStudent={firstUpcomingLessonIdByStudent}
                studentsWithDebt={studentsWithDebt}
                studentsWithFinDebt={studentsWithFinDebt}
                handleOpenDrawer={handleOpenDrawer}
                selectedLessonId={selectedLessonId}
                setSelectedLessonId={setSelectedLessonId}
                createInitial={createInitial}
                setCreateInitial={setCreateInitial}
                setView={setView}
                setNavigatedFromMonth={setNavigatedFromMonth}
                navigatedFromMonth={navigatedFromMonth}
                getLessonDisplayData={getLessonDisplayData}
                getLessonTopic={getLessonTopic}
                onFinClick={handleFinClick}
                onHwClick={handleHwClick}
                onPatchLesson={hookPatchLesson}
                onGoToProfile={(studentId) => onNavigate && onNavigate("students", { action: 'highlight', studentId })}
                onSaveLesson={hookSaveLesson}
                allLessons={lessons}
              />
            )}
            </WidgetErrorBoundary>
          </div>

          {/* Правая панель (Dynamic Context Panel) */}
          <div 
            className={`
              flex-col min-w-0 overflow-hidden relative transition-all duration-300
              ${view === 'day' 
                ? (rightPanelMode === 'inspector' || rightPanelMode === 'create' 
                    ? 'fixed inset-x-0 bottom-0 z-[100] h-[85vh] rounded-t-[32px] bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.2)] flex xl:hidden' 
                    : 'hidden') 
                : (rightPanelMode === 'inspector' || rightPanelMode === 'create'
                    ? 'fixed inset-x-0 bottom-0 z-[100] h-[85vh] rounded-t-[32px] bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.2)] flex xl:relative xl:h-auto xl:inset-auto xl:rounded-[28px] xl:bg-white xl:shadow-sm xl:border xl:border-stone-100/50 xl:flex-[0_0_320px] 2xl:flex-[0_0_380px]'
                    : 'hidden xl:flex xl:flex-[0_0_320px] 2xl:flex-[0_0_380px] xl:rounded-[28px] xl:bg-white xl:shadow-sm xl:border xl:border-stone-100/50')
              }
            `}
          >
            {/* Backdrop for mobile */}
            {(rightPanelMode === 'inspector' || rightPanelMode === 'create') && (
              <div 
                className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm -z-10 xl:hidden"
                onClick={handleCloseDrawer}
                style={{ top: '-100vh', height: '200vh' }}
              />
            )}
            <WidgetErrorBoundary className="h-full w-full flex flex-col min-h-0">
              {rightPanelMode === 'students' ? (
              <ScheduleSidebar
                lessons={selectedDateStr ? periodLessons.filter(l => l.date === selectedDateStr) : periodLessons}
                students={students}
                groups={groups}
                periodLabel={view === "month" ? "в этом месяце" : view === "week" ? "на этой неделе" : "сегодня"}
                onCreateLesson={() => handleOpenDrawer(selectedDateStr ? { date: selectedDateStr } : {})}
                onCreateStudent={() => onNavigate && onNavigate("students", { action: 'create' })}
                onAddLesson={(entity) => {
                  const isGroup = !entity.grade && entity.subjects?.[0]?.name === "Групповое занятие";
                  handleOpenDrawer(
                    isGroup
                      ? { type: "group",      groupId:   entity.id, date: selectedDateStr }
                      : { type: "individual", studentId: entity.id, date: selectedDateStr }
                  );
                }}
                onGoToProfile={(student) => onNavigate && onNavigate("students", { action: 'highlight', studentId: student.id })}
                selectedEntityId={selectedEntityId}
                onCardClick={handleCardClick}
                isTimelineMode={view === "month" && !!selectedDateStr}
                selectedDateStr={selectedDateStr}
              />
            ) : (
              <LessonInspector
                isOpen={true}
                onClose={handleCloseDrawer}
                onSubmit={handleSaveLesson}
                onDelete={selectedLessonId ? handleDeleteLesson : undefined}
                initialData={rightPanelMode === 'inspector' ? selectedLesson : createInitial}
                students={students}
                groups={groups}
                lessons={lessons}
              />
            )}
            </WidgetErrorBoundary>
          </div>
        </div>

        {/* Попап статуса */}
        <StatusPopover
          popover={popover}
          onClose={() => setPopover(null)}
          onQuickStatus={hookQuickStatus}
        />

        

        {/* ActionItemModal (оплата / ДЗ) */}
        <ActionItemModal
          isOpen={actionModal.isOpen}
          onClose={closeActionModal}
          item={actionModal.item}
          mode={actionModal.mode}
          onConfirm={async (item, selectedLessonsOrAmount, note) => {
            if (item.type === "hw") {
              const l = item.lessons[0];
              await hookQuickHomework(l, item.student.id, true);
            } else if (item.type === "money") {
              const parsedAmount = Number(selectedLessonsOrAmount);
              if (!parsedAmount || parsedAmount <= 0) return;
              try {
                await addPayment({
                  studentId:   item.student.id,
                  studentName: item.student.name,
                  amount:      parsedAmount,
                  paidAt:      new Date().toISOString(),
                  note:        note || "Оплата с расписания",
                });
              } finally {
                if (pageState?.refreshData) pageState.refreshData();
                queryClient.invalidateQueries();
              }
            }
          }}
        />
      </div>
    </PageWrapper>

      {createPortal(
        <DragOverlay zIndex={9999} dropAnimation={null}>
          {activeDragLesson ? (
            <LessonCardOverlay 
              lesson={activeDragLesson} 
              isCopyMode={isCopyMode}
              dragTimeDelta={dragTimeDelta}
              width={dragWidth}
              height={dragHeight}
              displayData={getLessonDisplayData(activeDragLesson)}
            />
          ) : null}
        </DragOverlay>,
        document.body
      )}

      {/* Подсказка drag-and-drop */}
      {activeDragLesson && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-800/90 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium z-[10000] pointer-events-none flex items-center gap-2 backdrop-blur-sm transition-all duration-300">
          {isCopyMode ? (
            <span className="text-emerald-400 font-bold">Копирование</span>
          ) : (
            <span className="text-blue-400 font-bold">Перенос</span>
          )}
          <span>урока</span>
          <span className="text-stone-400 text-xs ml-2 opacity-80">(Ctrl / Alt — изменить режим)</span>
        </div>
      )}
    </DndContext>
  );
}
