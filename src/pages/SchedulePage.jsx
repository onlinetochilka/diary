import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, Plus } from "lucide-react";
import { DndContext, DragOverlay, pointerWithin } from "@dnd-kit/core";

import { useSchedule } from "../hooks/useSchedule.js";
import { useScheduleModals } from "../hooks/useScheduleModals.js";
import { useScheduleNavigation } from "../hooks/useScheduleNavigation.js";
import { useScheduleLessonData } from "../hooks/useScheduleLessonData.js";
import { useScheduleDragAndDrop } from "../hooks/useScheduleDragAndDrop.js";

import LessonDrawer from "../components/schedule/LessonDrawer.jsx";
import ActionItemModal from "../components/dashboard/ActionItemModal.jsx";
import ScheduleStatsRow from "../components/schedule/ScheduleStatsRow.jsx";
import { ScheduleNavBar } from "../components/schedule/ScheduleNavBar.jsx";
import { StatusPopover } from "../components/schedule/StatusPopover.jsx";
import MonthView from "../components/schedule/MonthView.jsx";
import WeekView from "../components/schedule/WeekView.jsx";
import DayView from "../components/schedule/DayView.jsx";
import { LessonCardOverlay } from "../components/schedule/LessonCardOverlay.jsx";

import { addPayment } from "../services/database.js";

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

export default function SchedulePage({ pageState, onNavigate }) {
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
  } = useSchedule();

  const [hwDebtOnly, setHwDebtOnly] = useState(false);
  const [selectedEntityId, setSelectedEntityId] = useState(null);

  const handleCardClick = (student) => {
    setSelectedEntityId(prev => prev === student.id ? null : student.id);
  };

  // ── Навигация по периодам ───────────────────────────────────────────────
  const {
    view,
    setView,
    currentDate,
    setCurrentDate,
    navigatedFromMonth,
    setNavigatedFromMonth,
    year,
    headerTitle,
    periodLessons,
    prevPeriod,
    nextPeriod,
    goToday,
    handleViewChange,
  } = useScheduleNavigation({ pageState, lessons });

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
    isDrawerOpen,
    editingLesson,
    drawerInitialTab,
    handleOpenDrawer,
    handleCloseDrawer,
    popover,
    setPopover,
    actionModal,
    openActionModal,
    closeActionModal,
  } = useScheduleModals();

  // ── Drag & Drop ────────────────────────────────────────────────────────
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
  } = useScheduleDragAndDrop({ view, hookCopyLesson, handleSaveLesson: hookSaveLesson });

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
        openActionModal({ type: "money", student, count: 1 });
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
    <PageWrapper
      title="Рабочий календарь"
      subtitle="Ваше время под контролем"
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
          onViewChange={handleViewChange}
          onCreateLesson={() => handleOpenDrawer()}
        />

        {/* Область с видами */}
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
                onCreateStudent={() => onNavigate && onNavigate("students", { action: 'create' })}
                handleOpenDrawer={handleOpenDrawer}
                onGoToProfile={(student) => onNavigate && onNavigate("students", { action: 'highlight', studentId: student.id })}
                selectedEntityId={selectedEntityId}
                onCardClick={handleCardClick}
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
                onFinClick={handleFinClick}
                onHwClick={handleHwClick}
                onCreateStudent={() => onNavigate && onNavigate("students", { action: 'create' })}
                onGoToProfile={(student) => onNavigate && onNavigate("students", { action: 'highlight', studentId: student.id })}
                selectedEntityId={selectedEntityId}
                onCardClick={handleCardClick}
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
            {createPortal(
              <DragOverlay dropAnimation={null}>
                {activeDragLesson ? (
                  <LessonCardOverlay
                    lesson={activeDragLesson}
                    displayData={getLessonDisplayData(activeDragLesson)}
                    topic={getLessonTopic(activeDragLesson)}
                    compact={view === "month"}
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

        {/* Drawer урока */}
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

        {/* Попап статуса */}
        <StatusPopover
          popover={popover}
          onClose={() => setPopover(null)}
          onQuickStatus={hookQuickStatus}
        />

        {/* Подсказка drag-and-drop */}
        {view === "week" && (
          <div className="text-center text-[11px] text-stone-400 mt-2 flex items-center justify-center gap-3">
            <span>💡 <strong>Подсказка:</strong> Карточки можно перетаскивать мышкой.</span>
            <span>Если урок нужно скопировать — дополнительно зажмите <strong>Ctrl</strong> (или <strong>Alt</strong>) на клавиатуре.</span>
          </div>
        )}

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
              await addPayment({
                studentId:   item.student.id,
                studentName: item.student.name,
                amount:      selectedLessonsOrAmount,
                paidAt:      new Date().toISOString(),
                note:        note || "Оплата с расписания",
              });
              if (pageState?.refreshData) pageState.refreshData();
              window.dispatchEvent(new CustomEvent("force-refresh-data"));
            }
          }}
        />
      </div>
    </PageWrapper>
  );
}
