import React, { useState } from 'react';
import { Users } from 'lucide-react';
import StudentsFilterBar from './StudentsFilterBar.jsx';
import StudentTile from './StudentTile.jsx';
import ActionItemModal from '../dashboard/ActionItemModal.jsx';
import { MOCK_STUDENTS } from '../../services/studentsAdapter.js';
import { useStudentsFilter } from '../../hooks/useStudentsFilter.js';
import StudentsEmptyState from './StudentsEmptyState.jsx';

export default function StudentsDirectoryView({ onEdit, onCreate }) {
  // Состояние модалки ДЗ
  const [hwModal, setHwModal] = useState({ isOpen: false, item: null });

  // Логика фильтрации вынесена в кастомный хук
  const {
    filteredStudents,
    activeStatus,
    setActiveStatus,
    activeFormat,
    setActiveFormat,
    showDebtorsOnly,
    setShowDebtorsOnly,
    searchQuery,
    setSearchQuery
  } = useStudentsFilter(MOCK_STUDENTS);

  // Обработчик "Внести оплату" (заглушка для модалки)
  const handlePayment = (studentId) => {
    console.log('Open payment modal for student:', studentId);
    // В будущем здесь будет вызов dispatch / контекста для открытия модалки
  };

  const handleHomeworkClick = (studentId, subjectId) => {
    const student = MOCK_STUDENTS.find(s => s.id === studentId);
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
    console.log('Homework confirmed', statuses);
    // Здесь должна быть логика обновления БД
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6 sm:space-y-8 animate-fade-in">
      {/* Шапка */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-2xl bg-academic-blue/10 text-academic-blue">
            <Users size={24} strokeWidth={1.5} />
          </span>
          <div>
            <h1 className="sr-only">Ученики</h1>
            <p className="text-xl font-semibold text-stone-800 tracking-tight">
              Профили учеников и статистика занятий
            </p>
          </div>
        </div>
        
        <button
          onClick={onCreate}
          data-action="create_student"
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-academic-blue text-white rounded-xl text-sm font-medium hover:bg-academic-blue-light transition-colors shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-academic-blue active:scale-[0.98]"
        >
          <Users size={18} strokeWidth={2} />
          Новый ученик
        </button>
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
      {filteredStudents.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6 items-start">
          {filteredStudents.map((student) => (
            <StudentTile
              key={student.id}
              student={student}
              onEdit={onEdit}
              onPayment={handlePayment}
              onHomeworkClick={handleHomeworkClick}
            />
          ))}
        </div>
      ) : (
        <StudentsEmptyState
          searchQuery={searchQuery}
          activeFormat={activeFormat}
          showDebtorsOnly={showDebtorsOnly}
          activeStatus={activeStatus}
          onClearSearch={() => setSearchQuery('')}
          onResetDebtors={() => setShowDebtorsOnly(false)}
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
