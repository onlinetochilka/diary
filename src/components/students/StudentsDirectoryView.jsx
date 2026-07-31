import React, { useState, useEffect } from 'react';
import { Users, UserPlus, FolderPlus } from 'lucide-react';
import StudentsFilterBar from './StudentsFilterBar.jsx';
import StudentTile from './StudentTile.jsx';
import ActionItemModal from '../dashboard/ActionItemModal.jsx';
import GroupCard from './GroupCard.jsx';
import { useStudentsFilter } from '../../hooks/useStudentsFilter.js';
import StudentsEmptyState from './StudentsEmptyState.jsx';

export default function StudentsDirectoryView({ students = [], groups = [], onEdit, onEditGroup, onCreate, onCreateGroup, highlightStudentId, onHighlightDone, onOpenGuestLink, onOpenReport, onOpenLessonHistory, onOpenGroupLessonHistory, onOpenGroupReport }) {
  // Состояние модалки ДЗ
  const [hwModal, setHwModal] = useState({ isOpen: false, item: null });

  // Логика фильтрации вынесена в кастомный хук
  const {
    filteredItems,
    activeStatus,
    setActiveStatus,
    activeFormat,
    setActiveFormat,
    showDebtorsOnly,
    setShowDebtorsOnly,
    searchQuery,
    setSearchQuery
  } = useStudentsFilter(students, groups);

  // Скролл к подсвеченному ученику
  useEffect(() => {
    if (!highlightStudentId || students.length === 0) return;

    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-student-id="${highlightStudentId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      // Снять подсветку через 2.5 секунды
      const clearTimer = setTimeout(() => {
        onHighlightDone?.();
      }, 2500);
      return () => clearTimeout(clearTimer);
    }, 200);

    return () => clearTimeout(timer);
  }, [highlightStudentId, students.length]);

  // Обработчик "Внести оплату" (заглушка для модалки)
  const handlePayment = (studentId) => {
    // TODO: открыть модалку оплаты (dispatch / контекст)
  };

  const handleHomeworkClick = (studentId, subjectId) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    const subject = student.subjects?.find(s => s.id === subjectId) || student.subjects?.[0];
    const pendingCount = subject?.stats?.pendingHomeworks || 1;

    // Формируем mock item для ActionItemModal
    const mockItem = {
      type: 'hw',
      student: student,
      count: pendingCount,
      lessons: Array.from({ length: pendingCount }).map((_, i) => ({
        id: `mock_hw_${i}`,
        date: `Долг ${i + 1}`,
        homework: "Домашнее задание"
      }))
    };

    setHwModal({ isOpen: true, item: mockItem });
  };

  const handleHwConfirm = (item, statuses) => {
    // TODO: обновление БД статусов ДЗ
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6 sm:space-y-8 animate-fade-in">
      {/* Шапка */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-2xl bg-[#7A404D]/10 text-[#7A404D]">
            <Users size={24} strokeWidth={1.5} />
          </span>
          <div>
            <h1 className="sr-only">Ученики</h1>
            <p className="text-xl font-semibold text-stone-800 tracking-tight">
              Профили учеников и статистика занятий
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={onCreateGroup}
            data-action="create_group"
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-[#7A404D] rounded-xl text-sm font-medium border border-[#7A404D]/30 hover:bg-[#7A404D]/5 hover:border-[#7A404D]/50 transition-colors shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#7A404D] active:scale-[0.98]"
          >
            <FolderPlus size={18} strokeWidth={2} />
            Новая группа
          </button>
          
          <button
            onClick={onCreate}
            data-action="create_student"
            className="flex items-center gap-2 px-5 py-2.5 bg-[#7A404D] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#7A404D] active:scale-[0.98]"
          >
            <UserPlus size={18} strokeWidth={2} />
            Новый ученик
          </button>
        </div>
      </header>

      {/* Панель фильтров */}
      <StudentsFilterBar
        activeStatus={activeStatus}
        onStatusChange={setActiveStatus}
        activeFormat={activeFormat}
        onFormatChange={setActiveFormat}
        showDebtorsOnly={showDebtorsOnly}
        onToggleDebtors={setShowDebtorsOnly}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Сетка карточек */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6 items-start">
          {filteredItems.map((item) => {
            if (item.type === 'group') {
              const group = item.data;
              const studentsInGroup = group.studentIds
                ? group.studentIds.map(id => students.find(s => s.id === id)).filter(Boolean)
                : [];
              return (
                <GroupCard
                  key={`group-${group.id}`}
                  group={group}
                  studentsInGroup={studentsInGroup}
                  onOpenDrawer={() => onEditGroup(group)}
                  onOpenProgressModal={() => {}}
                  onOpenLessonHistory={onOpenGroupLessonHistory}
                  onOpenReport={onOpenGroupReport}
                />
              );
            }
            // type === 'student'
            const student = item.data;
            return (
              <StudentTile
                key={`student-${student.id}`}
                student={student}
                studentType={item.studentType}
                showTypeBadge={activeFormat === 'all'}
                onEdit={onEdit}
                onPayment={handlePayment}
                onHomeworkClick={handleHomeworkClick}
                onOpenGuestLink={onOpenGuestLink}
                onOpenReport={onOpenReport}
                onOpenLessonHistory={onOpenLessonHistory}
                isHighlighted={student.id === highlightStudentId}
              />
            );
          })}
        </div>
      ) : (
        <StudentsEmptyState
          searchQuery={searchQuery}
          activeFormat={activeFormat}
          showDebtorsOnly={showDebtorsOnly}
          activeStatus={activeStatus}
          onClearSearch={() => setSearchQuery('')}
          onResetDebtors={() => setShowDebtorsOnly(false)}
          onCreate={onCreate}
        />
      )}

      {/* Модалка ДЗ */}
      <ActionItemModal
        isOpen={hwModal.isOpen}
        onClose={() => setHwModal({ isOpen: false, item: null })}
        item={hwModal.item}
        mode="action"
        onConfirm={handleHwConfirm}
      />
    </div>
  );
}
