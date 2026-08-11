/**
 * GroupEditorView.jsx
 * ────────────────────────────────────────────────────────────────────────────
 * Полноэкранная форма создания / редактирования группы.
 * Повторяет паттерн StudentEditorView: секции с нумерацией, фиксированный SaveBar.
 */
import { useState, useEffect, useId } from 'react';
import { ArrowLeft, Save, Loader2, Trash2, Plus, Archive, ArchiveRestore, Monitor, Users, Layers } from 'lucide-react';
import { useConfirm } from "../../contexts/ConfirmContext.jsx";
import { cn } from '../../utils/cn.js';
import Button from '../ui/Button.jsx';
import Tooltip from '../ui/Tooltip.jsx';
import { Label, Input, Select, SegmentedToggle, SectionHeading } from './StudentFormAtoms.jsx';
import { useToast } from '../ui/Toast.jsx';

// ── Атом: Segmented toggle для формата/оплаты ────────────────────────────────
function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="flex p-1 bg-stone-100 rounded-xl ring-1 ring-slate-200">
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <Button
            variant="ghost"
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'w-auto h-auto flex-1 px-4 py-2 border-none rounded-lg text-sm font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-academic-blue active:scale-[0.98]',
              isActive
                ? 'bg-white text-stone-900 shadow-sm ring-1 ring-slate-200'
                : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'
            )}
          >
            {opt.label}
          </Button>
        );
      })}
    </div>
  );
}

// ── Главный компонент ─────────────────────────────────────────────────────────
export default function GroupEditorView({
  groupId = null,
  initialData = null,
  onBack,
  onSubmit,
  onDelete,
  onArchive,
  onNavigate,
  availableStudents = [],
  availablePrograms = [],
  existingSubjects = [],
}) {
  const isEditMode = !!groupId;
  const subjectsDatalistId = useId() + '-group-subjects';
  const confirm = useConfirm();
  const { showToast } = useToast();

  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const defaultForm = {
    name: '',
    subjectName: '',
    format: 'online',
    isHwNotAssigned: false,
    paymentType: 'per_lesson',
    price: '',
    duration: '90',
    subscriptionLessons: '4',
    programs: [],
    studentIds: [],
    studentFinances: {},
    isArchived: false,
  };

  const [formData, setFormData] = useState(defaultForm);

  // Заполнить при редактировании или из черновика
  useEffect(() => {
    const draft = sessionStorage.getItem('groupEditorDraft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.groupId === groupId) {
          setFormData(parsed.formData);
          sessionStorage.removeItem('groupEditorDraft');
          return;
        }
      } catch (e) {}
    }

    if (initialData) {
      setFormData({
        name: initialData.name || '',
        subjectName: initialData.subjectName || '',
        format: initialData.format || 'online',
        isHwNotAssigned: initialData.isHwNotAssigned || false,
        paymentType: initialData.paymentType || 'per_lesson',
        price: initialData.price?.toString() || '',
        duration: initialData.duration?.toString() || '90',
        subscriptionLessons: initialData.subscriptionLessons?.toString() || '4',
        programs: initialData.programs || [],
        studentIds: initialData.studentIds || [],
        studentFinances: initialData.studentFinances || {},
        isArchived: initialData.isArchived || false,
      });
    } else {
      setFormData(defaultForm);
    }
    setErrors({});
  }, [groupId, initialData]);

  const handleNavigateToPrograms = () => {
    sessionStorage.setItem('groupEditorDraft', JSON.stringify({ groupId, formData }));
    if (onNavigate) {
      onNavigate('programs', { action: 'create_program', returnTo: 'students', groupId });
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => { const next = { ...prev }; delete next[field]; return next; });
  };

  const toggleStudent = (id) => {
    setFormData(prev => {
      const isSelected = prev.studentIds.includes(id);
      const newStudentIds = isSelected
        ? prev.studentIds.filter(s => s !== id)
        : [...prev.studentIds, id];
      
      const newPriceOverrides = { ...prev.priceOverrides };
      if (isSelected) {
        delete newPriceOverrides[id];
      }

      return {
        ...prev,
        studentIds: newStudentIds,
        priceOverrides: newPriceOverrides,
      };
    });
    setErrors(prev => { const next = { ...prev }; delete next.students; return next; });
  };

  const handleStudentFinanceChange = (studentId, field, value) => {
    setFormData(prev => {
      const current = prev.studentFinances[studentId] || {};
      return {
        ...prev,
        studentFinances: {
          ...prev.studentFinances,
          [studentId]: {
            ...current,
            [field]: value
          }
        }
      };
    });
  };

  const handleAddProgram = (progId) => {
    if (!progId) return;
    const prog = availablePrograms.find(p => p.id === progId);
    if (!prog || formData.programs.some(p => p.id === progId)) return;
    const snapshot = {
      id: progId,
      name: prog.name,
      colorOklch: prog.colorOklch,
      topics: prog.topics?.map(t => ({ ...t, isCompleted: false })) || [],
    };
    setFormData(prev => ({ ...prev, programs: [...prev.programs, snapshot] }));
  };

  const handleRemoveProgram = async (idx) => {
    const prog = formData.programs[idx];
    if (prog.topics?.some(t => t.isCompleted)) {
      const proceed = await confirm({
        title: "Внимание",
        message: `Удалить программу «${prog.name}» и сбросить прогресс?`,
        confirmText: "Удалить",
        intent: "danger"
      });
      if (!proceed) return;
    }
    setFormData(prev => ({ ...prev, programs: prev.programs.filter((_, i) => i !== idx) }));
  };

  const validate = () => {
    const errs = {};
    if (!formData.name?.trim()) errs.name = 'Укажите название группы';
    if (!formData.subjectName?.trim()) errs.subjectName = 'Укажите предмет';
    if (!formData.studentIds?.length) errs.students = 'В группе должен быть минимум 1 ученик';
    return errs;
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    if (isSaving) return;

    setIsSaving(true);
    const payload = {
      name: formData.name,
      subjectName: formData.subjectName,
      format: formData.format || 'online',
      programs: formData.programs,
      studentIds: formData.studentIds,
      price: Number(formData.price) || 0,
      duration: Number(formData.duration) || 90,
      paymentType: formData.paymentType,
      subscriptionLessons: formData.paymentType === 'subscription'
        ? Number(formData.subscriptionLessons) : null,
      // Lock per-lesson price at subscription creation/update time
      lockedLessonPrice: formData.paymentType === 'subscription' && Number(formData.subscriptionLessons) > 0
        ? Math.round((Number(formData.price) || 0) / Number(formData.subscriptionLessons))
        : null,
      studentFinances: formData.studentFinances,
      isArchived: formData.isArchived || false,
    };

    try {
      await onSubmit(payload, groupId);
      showToast({ message: "Группа сохранена", type: "success" });
      onBack();
    } catch (err) {
      console.error(err);
      showToast({ message: "Ошибка при сохранении", type: "error" });
      setIsSaving(false);
    }
  };

  const handleBackAttempt = () => {
    onBack();
  };

  const handleDelete = async () => {
    const hasHistory = !!initialData && initialData.stats?.conductedLessons > 0;
    const isArchived = !!initialData?.isArchived;

    if (hasHistory && !isArchived) {
      showToast({ message: 'Группу с историей можно удалить только из архива', type: 'error' });
      return;
    }

    const message = hasHistory && isArchived
      ? 'ВНИМАНИЕ! Вместе с группой будут безвозвратно удалены ВСЕ её уроки. Вы уверены?'
      : 'Удалить группу? Это действие нельзя отменить.';

    const proceed = await confirm({
      title: "Удаление группы",
      message,
      confirmText: "Удалить",
      intent: "danger"
    });
    if (!proceed) return;
    
    onDelete?.(groupId);
  };

  const handleArchive = async () => {
    const isCurrentlyArchived = formData.isArchived;
    const message = isCurrentlyArchived
      ? 'Восстановить группу из архива?'
      : 'Перенести группу в архив?';
      
    const proceed = await confirm({
      title: isCurrentlyArchived ? "Восстановление" : "Архивация",
      message,
      confirmText: isCurrentlyArchived ? "Восстановить" : "В архив",
      intent: isCurrentlyArchived ? "info" : "warning"
    });
    if (!proceed) return;
    
    handleChange('isArchived', !isCurrentlyArchived);
  };

  const hasHistory = !!initialData && initialData.stats?.conductedLessons > 0;

  return (
    <div className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 pb-40 relative animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        {/* Левая часть */}
        <div className="flex items-center">
          <Button
            variant="ghost"
            onClick={handleBackAttempt}
            data-action="back_to_directory"
            className="w-auto h-auto flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors font-medium text-sm border-none outline-none focus-visible:ring-2 focus-visible:ring-[#7A404D] focus-visible:ring-offset-4 rounded-md px-2 py-1 -ml-2"
          >
            <ArrowLeft size={18} strokeWidth={2} />
            <span className="hidden sm:inline">К списку учеников</span>
          </Button>
        </div>
        
        {/* Центр */}
        <div className="flex items-center gap-4 absolute left-1/2 -translate-x-1/2">
          {!!groupId && (
            <SegmentedToggle
              options={[
                { label: 'Активная', value: false },
                { label: 'В архиве', value: true }
              ]}
              value={formData.isArchived || false}
              onChange={val => handleChange('isArchived', val)}
            />
          )}
          <div className="text-sm font-medium text-stone-400 hidden xl:block whitespace-nowrap">
            {isEditMode ? 'Редактирование группы' : 'Новая группа'}
          </div>
        </div>

        {/* Правая часть (Действия) */}
        <div className="flex items-center gap-2 sm:gap-3">
          {!!groupId && onDelete && (!hasHistory || formData.isArchived) && (
            <Button
              variant="ghost"
              onClick={handleDelete}
              disabled={isSaving}
              data-action="delete_group"
              className="w-auto h-auto p-2 border-none rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              title="Удалить группу"
            >
              <Trash2 size={18} />
            </Button>
          )}

          <Button
            onClick={handleSave}
            disabled={isSaving}
            data-action="save_group"
            className="w-auto h-auto px-4 sm:px-6 py-2 border-none bg-[#7A404D] text-white rounded-xl font-medium shadow-sm hover:bg-[#8A4C5A] transition-all outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#7A404D] active:scale-[0.98] disabled:opacity-70 flex items-center gap-2"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            <span className="hidden sm:inline">Сохранить</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Левая колонка */}
        <div className="xl:col-span-5 flex flex-col gap-8">

        {/* ── Секция 1: Основное ─────────────────────────────────── */}
        <section>
          <SectionHeading number={1}>Основное</SectionHeading>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-2xl shadow-sm ring-1 ring-slate-200">
            {/* Название */}
            <div className="md:col-span-2">
              <Label required>Название группы</Label>
              <Input
                placeholder="Например: ОГЭ Интенсив"
                value={formData.name}
                onChange={e => handleChange('name', e.target.value)}
                error={!!errors.name}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Предмет */}
            <div>
              <Label required>Предмет</Label>
              <Input
                placeholder="Например, Математика"
                value={formData.subjectName}
                onChange={e => handleChange('subjectName', e.target.value)}
                list={subjectsDatalistId}
                autoComplete="off"
                error={!!errors.subjectName}
              />
              {errors.subjectName && (
                <p className="mt-1 text-xs text-red-600">{errors.subjectName}</p>
              )}
              <datalist id={subjectsDatalistId}>
                {existingSubjects.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>

            {/* Программа обучения */}
            <div>
              <div className="flex items-center justify-end mb-1.5 min-h-[20px]">
                <Button
                  variant="ghost"
                  onClick={handleNavigateToPrograms}
                  type="button"
                  data-action="create_new_program_shortcut"
                  className="w-auto h-auto border-none text-xs font-medium text-[#7A404D] hover:text-[#8A4C5A] flex items-center gap-1 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#7A404D] rounded-sm px-1"
                >
                  + Новая программа
                </Button>
              </div>
              <div className="flex flex-col gap-4">
                <Select
                  value=""
                  onChange={e => handleAddProgram(e.target.value)}
                >
                  <option value="">Выберите программу...</option>

                  {availablePrograms
                    .filter(p => !formData.programs.some(sp => sp.id === p.id))
                    .map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                  }
                </Select>

                {formData.programs.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {formData.programs.map((prog, idx) => {
                      const done = prog.topics?.filter(t => t.isCompleted).length || 0;
                      const total = prog.topics?.length || 0;
                      return (
                        <div
                          key={prog.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-stone-50 ring-1 ring-slate-200 hover:bg-white transition-colors"
                        >
                          <div>
                            <p className="text-sm font-medium text-stone-800">{prog.name}</p>
                            <p className="text-xs text-stone-400 mt-0.5">
                              Пройдено: {done} из {total} тем
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            onClick={() => handleRemoveProgram(idx)}
                            className="w-auto h-auto p-1.5 border-none text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Формат */}
            <div>
              <Label required>Формат</Label>
              <SegmentedToggle
                options={[
                  { label: <Tooltip text="Онлайн" wrapperClassName="flex items-center justify-center w-full h-full"><Monitor size={18} /></Tooltip>, value: 'online' },
                  { label: <Tooltip text="Офлайн" wrapperClassName="flex items-center justify-center w-full h-full"><Users size={18} /></Tooltip>, value: 'offline' },
                  { label: <Tooltip text="Смешанный" wrapperClassName="flex items-center justify-center w-full h-full"><Layers size={18} /></Tooltip>, value: 'mixed' }
                ]}
                value={formData.format || 'online'}
                onChange={val => handleChange('format', val)}
              />
            </div>

            {/* ДЗ по умолчанию */}
            <div>
              <Label required>ДЗ по умолчанию</Label>
              <SegmentedToggle
                options={[
                  { label: 'Задано', value: false },
                  { label: 'Не задано', value: true }
                ]}
                value={formData.isHwNotAssigned || false}
                onChange={val => handleChange('isHwNotAssigned', val)}
              />
            </div>

            {/* Ссылка на онлайн-урок */}
            {(formData.format === 'online' || formData.format === 'mixed' || !formData.format) && (
              <div className="md:col-span-2 flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer w-fit">
                  <input 
                    type="checkbox" 
                    className="rounded text-academic-blue focus:ring-academic-blue"
                    checked={formData.isLinkPermanent !== false && (formData.isLinkPermanent || !!formData.videoLink)}
                    onChange={e => {
                      handleChange('isLinkPermanent', e.target.checked);
                      if (!e.target.checked) handleChange('videoLink', '');
                    }}
                  />
                  Постоянная ссылка на занятия
                </label>
                {formData.isLinkPermanent !== false && (formData.isLinkPermanent || !!formData.videoLink) && (
                  <Input
                    placeholder="https://..."
                    value={formData.videoLink || ''}
                    onChange={e => handleChange('videoLink', e.target.value)}
                  />
                )}
              </div>
            )}

          </div>
        </section>

        {/* ── Секция 2: Финансы ───────────────────────────────────── */}
        <section>
          <SectionHeading number={2}>Финансы</SectionHeading>
          <div className="flex flex-col gap-5 bg-white p-6 rounded-2xl shadow-sm ring-1 ring-slate-200">

            <div>
              <Label>Тип оплаты</Label>
              <SegmentedControl
                options={[
                  { label: 'Поурочно', value: 'per_lesson' },
                  { label: 'Абонемент', value: 'subscription' },
                ]}
                value={formData.paymentType}
                onChange={val => handleChange('paymentType', val)}
              />
            </div>

            <div className={cn(
              "grid gap-4 transition-all duration-300",
              formData.paymentType === 'subscription' ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-2"
            )}>
              <div>
                <Label required>Цена (₽)</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.price}
                  onChange={e => handleChange('price', e.target.value)}
                />
                <p className="mt-1 text-xs text-stone-400">
                  {formData.paymentType === 'subscription' ? 'за 1 ученика' : 'за 1 ученика за 1 урок'}
                </p>
              </div>
              
              <div>
                <Label required>Длительность урока</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={formData.duration || ''}
                    onChange={e => handleChange('duration', Number(e.target.value))}
                    className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none pr-12"
                    placeholder="Например, 90"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm pointer-events-none">мин</div>
                </div>
              </div>

              {formData.paymentType === 'subscription' && (
                <div className="animate-in fade-in duration-300">
                  <Label required>Кол-во уроков</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.subscriptionLessons}
                    onChange={e => handleChange('subscriptionLessons', e.target.value)}
                  />
                </div>
              )}
            </div>

          </div>
        </section>
        </div>

        {/* Правая колонка */}
        <div className="xl:col-span-7 flex flex-col gap-8">
        {/* ── Секция 3: Состав группы ────────────────────────────── */}
        <section>
          <SectionHeading number={3}>
            Состав группы
            {formData.studentIds.length > 0 && (
              <span className="ml-2 px-2.5 py-0.5 text-[11px] bg-academic-blue/10 text-academic-blue rounded-full font-semibold uppercase tracking-wider">
                {formData.studentIds.length} чел.
              </span>
            )}
          </SectionHeading>

          <div className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-slate-200">
            {errors.students && (
              <p className="mb-3 text-sm text-red-600 font-medium flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-[10px] font-bold shrink-0">!</span>
                {errors.students}
              </p>
            )}

            {availableStudents.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-stone-500 text-sm">Нет доступных учеников.</p>
                <p className="text-stone-400 text-xs mt-1">
                  Сначала создайте карточки учеников через кнопку «Новый ученик».
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availableStudents.map(student => {
                  const isSelected = formData.studentIds.includes(student.id);
                  const initials = student.name
                    ? student.name.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
                    : '?';
                  return (
                    <div
                      key={student.id}
                      className={cn(
                        'flex flex-col p-3 rounded-xl transition-all duration-150 ring-1',
                        isSelected
                          ? 'bg-academic-blue/5 ring-academic-blue/30'
                          : 'bg-stone-50 ring-slate-200 hover:bg-white hover:ring-stone-300'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={isSelected}
                            onChange={() => toggleStudent(student.id)}
                          />
                          {/* Custom checkbox */}
                          <span className={cn(
                            'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all',
                            isSelected
                              ? 'bg-academic-blue border-academic-blue'
                              : 'bg-white border-stone-300'
                          )}>
                            {isSelected && (
                              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </span>
                          {/* Avatar */}
                          <span className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-violet-600">{initials}</span>
                          </span>
                          <span className="text-sm font-medium text-stone-800 truncate">{student.name}</span>
                        </label>
                        
                        {isSelected && (
                          <div className="shrink-0 ml-3 flex items-center">
                            <label className="text-[11px] font-semibold tracking-wide uppercase text-stone-500 hover:text-academic-blue flex items-center gap-1.5 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                className="w-3.5 h-3.5 text-academic-blue rounded border-stone-300 focus:ring-academic-blue transition-colors"
                                checked={!!formData.studentFinances[student.id]}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    handleStudentFinanceChange(student.id, 'paymentType', formData.paymentType);
                                    handleStudentFinanceChange(student.id, 'price', formData.price);
                                    handleStudentFinanceChange(student.id, 'subscriptionLessons', formData.subscriptionLessons);
                                  } else {
                                    setFormData(prev => {
                                      const newFinances = { ...prev.studentFinances };
                                      delete newFinances[student.id];
                                      return { ...prev, studentFinances: newFinances };
                                    });
                                  }
                                }}
                              />
                              Свои условия
                            </label>
                          </div>
                        )}
                      </div>

                      {/* Индивидуальные настройки для ученика */}
                      {isSelected && formData.studentFinances[student.id] && (
                        <div className="mt-3 pt-3 border-t border-academic-blue/10 flex flex-col gap-3 pl-[3.25rem]">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wide mb-1">Тип оплаты</label>
                              <Select
                                value={formData.studentFinances[student.id].paymentType || 'per_lesson'}
                                onChange={e => handleStudentFinanceChange(student.id, 'paymentType', e.target.value)}
                              >
                                <option value="per_lesson">Поурочно</option>
                                <option value="subscription">Абонемент</option>
                              </Select>
                            </div>
                            
                            <div>
                              <label className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wide mb-1">
                                {formData.studentFinances[student.id].paymentType === 'subscription' ? 'Стоимость (₽)' : 'Ставка (₽)'}
                              </label>
                              <Input
                                type="number"
                                min="0"
                                className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                placeholder="0"
                                value={formData.studentFinances[student.id].price || ''}
                                onChange={e => handleStudentFinanceChange(student.id, 'price', e.target.value)}
                              />
                            </div>
                            
                            {formData.studentFinances[student.id].paymentType === 'subscription' && (
                              <div className="col-span-2">
                                <label className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wide mb-1">Кол-во занятий</label>
                                <Input
                                  type="number"
                                  min="1"
                                  className="w-full"
                                  value={formData.studentFinances[student.id].subscriptionLessons || ''}
                                  onChange={e => handleStudentFinanceChange(student.id, 'subscriptionLessons', e.target.value)}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
        </div>

      </div>
    </div>
  );
}
