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
import { ArrowLeft, Trash2, Save, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn.js';
import Button from '../ui/Button.jsx';
import { useStudentForm } from '../../hooks/useStudentForm.js';
import { useConfirm } from '../../contexts/ConfirmContext.jsx';
import { useToast } from '../ui/Toast.jsx';
import {
  PersonalInfoSection,
  SubjectsSection,
  ContactsSection,
  SegmentedToggle,
} from './StudentFormSections.jsx';

export default function StudentEditorView({ studentId, initialData, onBack, onNavigate, onSubmit, onDelete, onArchive, availablePrograms = [] }) {
  const confirm = useConfirm();
  const { showToast } = useToast();
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

  const handleDelete = async () => {
    const hasHistory = !!initialData && (initialData.stats?.conductedHours > 0 || initialData.ltv > 0);
    const isArchived = !!initialData?.isArchived;

    if (hasHistory && !isArchived) {
      showToast({ message: 'Ученика с историей можно удалить только из архива', type: 'error' });
      return;
    }
    
    const message = hasHistory && isArchived 
      ? 'ВНИМАНИЕ! Вместе с учеником будут безвозвратно удалены ВСЕ его проведенные уроки и история оплат. Вы уверены, что хотите продолжить?'
      : 'Удалить ученика? Это действие нельзя отменить. Все его данные будут стерты.';
      
    const proceed = await confirm({
      title: "Удаление ученика",
      message,
      confirmText: "Удалить",
      intent: "danger"
    });
    if (!proceed) return;
    
    onDelete?.(studentId);
  };


  const hasHistory = !!initialData && (initialData.stats?.conductedHours > 0 || initialData.ltv > 0);
  const isArchived = !!initialData?.isArchived;

  return (
    <div className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 pb-40 relative">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        {/* Левая часть */}
        <div className="flex items-center">
          <Button
            variant="ghost"
            onClick={handleBackAttempt}
            className="w-auto h-auto flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors font-medium text-sm border-none outline-none focus-visible:ring-2 focus-visible:ring-[#7A404D] focus-visible:ring-offset-4 rounded-md px-2 py-1 -ml-2"
          >
            <ArrowLeft size={18} strokeWidth={2} />
            <span className="hidden sm:inline">К списку учеников</span>
          </Button>
        </div>
        
        {/* Центр */}
        <div className="flex items-center gap-4 absolute left-1/2 -translate-x-1/2">
          {!!studentId && (
            <SegmentedToggle
              options={[
                { label: 'Активный', value: false },
                { label: 'В архиве', value: true }
              ]}
              value={formData.isArchived || false}
              onChange={val => handleChange('isArchived', val)}
            />
          )}
          <div className="text-sm font-medium text-stone-400 hidden xl:block whitespace-nowrap">
            {studentId ? 'Редактирование ученика' : 'Новый ученик'}
          </div>
        </div>

        {/* Правая часть (Действия) */}
        <div className="flex items-center gap-2 sm:gap-3">
          {!!studentId && onDelete && (!hasHistory || isArchived) && (
            <Button
              variant="ghost"
              onClick={handleDelete}
              disabled={isSaving}
              data-action="delete_student"
              className="w-auto h-auto p-2 border-none rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              title="Удалить ученика"
            >
              <Trash2 size={18} />
            </Button>
          )}

          <Button
            onClick={handleSave}
            disabled={isSaving}
            data-action="save_student"
            className="w-auto h-auto px-4 sm:px-6 py-2 border-none bg-[#7A404D] text-white rounded-xl font-medium shadow-sm hover:bg-[#8A4C5A] transition-all outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#7A404D] active:scale-[0.98] disabled:opacity-70 flex items-center gap-2"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            <span className="hidden sm:inline">Сохранить</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start animate-fade-in">
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

        {/* Правая колонка: Предметы и Финансы */}
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

      {/* Padding at the bottom to ensure content isn't flush with viewport edge */}
      <div className="h-12 shrink-0"></div>
    </div>
  );
}
