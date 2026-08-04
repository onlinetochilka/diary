/**
 * StudentEditorView.jsx
 * ────────────────────────────────────────────────────────────────────────────
 * Главный компонент экрана добавления / редактирования ученика.
 *
 * Логика управления формой → useStudentForm
 * Секции UI              → StudentFormSections
 *
 * Визуально интерфейс идентичен оригинальной версии.
 */
import { ArrowLeft } from 'lucide-react';
import { useStudentForm } from '../../hooks/useStudentForm.js';
import {
  PersonalInfoSection,
  SubjectsSection,
  ContactsSection,
  SaveBar,
} from './StudentFormSections.jsx';

export default function StudentEditorView({ studentId, initialData, onBack, onNavigate, onSubmit, onDelete, onArchive, availablePrograms = [] }) {
  const {
    formData,
    isSaving,
    showParent,
    handleChange,
    handleSubjectChange,
    handleAddSubject,
    handleRemoveSubject,
    handleContactChange,
    handleProgramChange,
    handleBackAttempt,
    handleSave,
  } = useStudentForm({ studentId, initialData, availablePrograms, onBack, onSubmit });

  const handleNavigateToPrograms = () => {
    sessionStorage.setItem('studentEditorDraft', JSON.stringify(formData));
    if (onNavigate) {
      onNavigate('programs', { action: 'create_program', returnTo: 'students', studentId });
    }
  };

  const handleDelete = () => {
    if (!window.confirm('Удалить ученика? Это действие нельзя отменить.')) return;
    onDelete?.(studentId);
  };

  const handleArchive = () => {
    const isCurrentlyArchived = initialData?.isArchived;
    const message = isCurrentlyArchived
      ? 'Восстановить ученика из архива?'
      : 'Перенести ученика в архив? Его можно будет восстановить в любой момент.';
    if (!window.confirm(message)) return;
    onArchive?.(studentId, !isCurrentlyArchived);
  };

  return (
    <div className="max-w-[1400px] mx-auto p-6 lg:p-8 animate-fade-in pb-40">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <button
          onClick={handleBackAttempt}
          className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors font-medium text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#7A404D] focus-visible:ring-offset-4 rounded-md px-2 py-1 -ml-2"
        >
          <ArrowLeft size={18} strokeWidth={2} />
          К списку учеников
        </button>
        <div className="text-sm font-medium text-stone-400">
          {studentId ? 'Редактирование ученика' : 'Новый ученик'}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Левая колонка: Личные данные и Связь */}
        <div className="xl:col-span-5 flex flex-col gap-8">
          <PersonalInfoSection
            formData={formData}
            handleChange={handleChange}
          />
          <ContactsSection
            formData={formData}
            handleContactChange={handleContactChange}
            showParent={showParent}
          />
        </div>

        {/* Правая колонка: Учебный процесс и Финансы */}
        <div className="xl:col-span-7 flex flex-col gap-8">
          <SubjectsSection
            formData={formData}
            handleSubjectChange={handleSubjectChange}
            handleProgramChange={handleProgramChange}
            availablePrograms={availablePrograms}
            handleNavigateToPrograms={handleNavigateToPrograms}
            handleAddSubject={handleAddSubject}
            handleRemoveSubject={handleRemoveSubject}
            handleContactChange={handleContactChange}
          />
        </div>
      </div>

      {/* Dummy spacer for scrolling past fixed bottom bar */}
      <div className="h-32 shrink-0"></div>

      <SaveBar
        onBack={handleBackAttempt}
        onSave={handleSave}
        isSaving={isSaving}
        isEditMode={!!studentId}
        onDelete={!!studentId ? handleDelete : undefined}
        onArchive={!!studentId && onArchive ? handleArchive : undefined}
        isArchived={!!initialData?.isArchived}
      />
    </div>
  );
}
