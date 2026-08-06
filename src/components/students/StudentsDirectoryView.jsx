import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Users, UserPlus, FolderPlus } from 'lucide-react';
import StudentsFilterBar from './StudentsFilterBar.jsx';
import StudentTile from './StudentTile.jsx';
import ActionItemModal from '../dashboard/ActionItemModal.jsx';
import GroupCard from './GroupCard.jsx';
import Button from '../ui/Button.jsx';
import { useStudentsFilter } from '../../hooks/useStudentsFilter.js';
import StudentsEmptyState from './StudentsEmptyState.jsx';
import { useLessons } from '../../hooks/useLessons.js';
import { useToast } from '../ui/Toast.jsx';
import { usePayments } from "../../hooks/usePayments.js";

export default function StudentsDirectoryView({ students = [], groups = [], onEdit, onEditGroup, onCreate, onCreateGroup, highlightStudentId, onHighlightDone, onOpenGuestLink, onOpenReport, onOpenLessonHistory, onOpenGroupLessonHistory, onOpenGroupReport }) {
  const queryClient = useQueryClient();
  // Состояние модалки ДЗ
  const [hwModal, setHwModal] = useState({ isOpen: false, item: null, isGroup: false });
  // Состояние модалки оплаты
  const [payModal, setPayModal] = useState({ isOpen: false, item: null });
  const { showToast } = useToast();
  const { addPayment } = usePayments();
  const { getLessons, updateLesson } = useLessons();

  // Логика фильтрации вынесена в кастомный хук
  const {
    filteredItems,
    formatCounts,
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

  // Обработчик "Внести оплату"
  const handlePayment = (studentId) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    const balance = student.balance || 0;
    const isDebtor = balance < 0;
    const debt = isDebtor ? Math.abs(balance) : 0;
    const payItem = {
      type: 'money',
      student,
      amount: debt > 0 ? debt : "",
    };
    setPayModal({ isOpen: true, item: payItem });
  };

  const handleHomeworkClick = async (studentId, subjectId) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    try {
      const allLessons = await getLessons({ studentId });
      // Урок считается с долгом, если у него задано homework, и ученика нет в hwDoneBy
      const pendingLessons = allLessons.filter(l => 
        l.homework && (!l.hwDoneBy || !l.hwDoneBy.includes(studentId)) && l.type === 'individual'
      );

      if (pendingLessons.length === 0) {
        showToast({ message: "Нет невыполненного ДЗ для этого ученика!", type: "error" });
        return;
      }

      const item = {
        type: 'hw',
        student: student,
        count: pendingLessons.length,
        lessons: pendingLessons
      };

      setHwModal({ isOpen: true, item });
    } catch (err) {
      console.error("Ошибка загрузки уроков:", err);
      showToast({ message: "Не удалось загрузить историю ДЗ", type: "error" });
    }
  };

  const handleHwConfirm = async (item, selectedLessons) => {
    try {
      const updates = [];
      if (item.count === 1 && item.lessons) {
        const l = item.lessons[0];
        updates.push(updateLesson(l.id, { 
          hwDoneBy: [...(l.hwDoneBy || []), item.student.id]
        }));
      } else if (item.lessons && selectedLessons) {
        item.lessons.forEach(l => {
          if (selectedLessons[l.id] === "on_time") {
            updates.push(updateLesson(l.id, { 
              hwDoneBy: [...(l.hwDoneBy || []), item.student.id]
            }));
          }
        });
      }
      await Promise.all(updates);
      queryClient.invalidateQueries();
    } catch (err) {
      console.error("Ошибка при сохранении ДЗ:", err);
      showToast({ message: "Не удалось сохранить статусы ДЗ", type: "error" });
    } finally {
      setHwModal({ isOpen: false, item: null });
    }
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
              Все ваши ученики на одной странице
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={onCreateGroup}
            data-action="create_group"
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-[#7A404D] rounded-xl text-sm font-medium border border-[#7A404D]/30 hover:bg-[#7A404D]/5 hover:border-[#7A404D]/50 transition-colors shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#7A404D] active:scale-[0.98]"
          >
            <FolderPlus size={18} strokeWidth={2} />
            Новая группа
          </Button>
          
          <Button
            onClick={onCreate}
            data-action="create_student"
            className="flex items-center gap-2 px-5 py-2.5 bg-[#7A404D] text-white rounded-xl text-sm font-medium hover:bg-[#7A404D]/90 transition-colors shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#7A404D] active:scale-[0.98] border-none"
          >
            <UserPlus size={18} strokeWidth={2} />
            Новый ученик
          </Button>
        </div>
      </header>

      {/* Панель фильтров */}
      <StudentsFilterBar
        activeStatus={activeStatus}
        onStatusChange={setActiveStatus}
        activeFormat={activeFormat}
        onFormatChange={setActiveFormat}
        formatCounts={formatCounts}
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

      {/* Модалка оплаты */}
      <ActionItemModal
        isOpen={payModal.isOpen}
        onClose={() => setPayModal({ isOpen: false, item: null })}
        item={payModal.item}
        mode="action"
        onConfirm={async (item, amount, note) => {
          const parsedAmount = Number(amount);
          if (!parsedAmount || parsedAmount <= 0) return;
          try {
            await addPayment({
              studentId:   item.student.id,
              studentName: item.student.name,
              amount:      parsedAmount,
              paidAt:      new Date().toISOString(),
              note:        note || 'Оплата занятий',
            });
          } finally {
            setPayModal({ isOpen: false, item: null });
            queryClient.invalidateQueries();
          }
        }}
      />
    </div>
  );
}
