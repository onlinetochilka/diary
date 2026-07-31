const fs = require('fs');

let text = fs.readFileSync("src/pages/SchedulePage.jsx", "utf8");

// 1. Imports
text = text.replace(
    'import LessonDrawer from "../components/schedule/LessonDrawer.jsx";',
    'import LessonInspector from "../components/schedule/LessonInspector.jsx";\nimport ScheduleSidebar from "../components/schedule/ScheduleSidebar.jsx";'
);
text = text.replace('import { DndContext, DragOverlay, pointerWithin } from "@dnd-kit/core";\n', '');
text = text.replace('import { useScheduleDragAndDrop } from "../hooks/useScheduleDragAndDrop.js";\n', '');
text = text.replace('import { LessonCardOverlay } from "../components/schedule/LessonCardOverlay.jsx";\n', '');
text = text.replace('import { createPortal } from "react-dom";\n', '');

// 2. Modals destruct
text = text.replace(`  const {
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
  } = useScheduleModals();`, `  const {
    popover,
    setPopover,
    actionModal,
    openActionModal,
    closeActionModal,
  } = useScheduleModals();`);

// 3. Dnd Hook
text = text.replace(`  // ── Drag & Drop ────────────────────────────────────────────────────────
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

`, "");

// 4. State
text = text.replace(`  const [selectedEntityId, setSelectedEntityId] = useState(null);

  const handleCardClick = (student) => {
    setSelectedEntityId(prev => prev === student.id ? null : student.id);
  };`, `  const [selectedEntityId, setSelectedEntityId] = useState(null);
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
  };`);

// 5. onViewChange
text = text.replace("onViewChange={handleViewChange}", "onViewChange={(v) => { setSelectedDateStr(null); handleViewChange(v); }}");

// 6. Grid
text = text.replace('<div className="max-w-[1400px] mx-auto w-full flex-1 min-h-0 flex flex-col overflow-hidden rounded-2xl p-0 sm:p-2 px-2 sm:px-0">',
                    '<div className="max-w-[1400px] mx-auto w-full flex-1 min-h-0 flex overflow-hidden rounded-2xl p-0 sm:p-2 px-2 sm:px-0 gap-4 sm:gap-6">\n          <div className="flex-1 min-w-0 flex flex-col overflow-hidden">');

// 7. DndContext start
text = text.replace(`          <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
            onDragCancel={() => {
              handleDragEnd({ active: null, over: null, delta: { x: 0, y: 0 } });
            }}
          >
`, "");

// 8. DndContext end
text = text.replace(`            {createPortal(
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
          </DndContext>`, "");

// 9. MonthView update
text = text.replace(`<MonthView
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
              />`, `<MonthView
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
              />`);

// 10. Drawer to Context Panel
text = text.replace(`        </div>

        {/* Drawer урока */}
        <LessonDrawer
          isOpen={isDrawerOpen}
          onClose={handleCloseDrawer}
          editingLesson={editingLesson}
          initialTab={drawerInitialTab}
        />`, `          </div>

          {/* Правая панель (Dynamic Context Panel) */}
          <div className={\`\${view === 'day' ? 'hidden lg:flex flex-1 max-w-[50%]' : 'hidden xl:flex flex-[0_0_320px] xl:flex-[0_0_380px]'} flex-col min-w-0 overflow-hidden relative\`}>
            {rightPanelMode === 'students' ? (
              <ScheduleSidebar
                lessons={selectedDateStr ? periodLessons.filter(l => l.date === selectedDateStr) : periodLessons}
                students={students}
                groups={groups}
                periodLabel={view === "month" ? "в этом месяце" : view === "week" ? "на этой неделе" : "сегодня"}
                onCreateLesson={() => handleOpenDrawer({})}
                onCreateStudent={() => onNavigate && onNavigate("students", { action: 'create' })}
                onAddLesson={(entity) => {
                  const isGroup = !entity.grade && entity.subjects?.[0]?.name === "Групповое занятие";
                  handleOpenDrawer(
                    isGroup
                      ? { type: "group",      groupId:   entity.id }
                      : { type: "individual", studentId: entity.id }
                  );
                }}
                onGoToProfile={(student) => onNavigate && onNavigate("students", { action: 'highlight', studentId: student.id })}
                selectedEntityId={selectedEntityId}
                onCardClick={handleCardClick}
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
          </div>
        </div>`);

// 11. Podskazka
text = text.replace(`        {/* Подсказка drag-and-drop */}
        {view === "week" && (
          <div className="text-center text-[11px] text-stone-400 mt-2 flex items-center justify-center gap-3">
            <span>💡 <strong>Подсказка:</strong> Карточки можно перетаскивать мышкой.</span>
            <span>Если урок нужно скопировать — дополнительно зажмите <strong>Ctrl</strong> (или <strong>Alt</strong>) на клавиатуре.</span>
          </div>
        )}

`, "");

fs.writeFileSync("src/pages/SchedulePage.jsx", text);
console.log("Done patching with node string replace exact match.");
