/**
 * GroupEditorView.jsx
 * ────────────────────────────────────────────────────────────────────────────
 * Полноэкранная форма создания / редактирования группы.
 * Повторяет паттерн StudentEditorView: секции с нумерацией, фиксированный SaveBar.
 */
import { useState, useEffect, useId } from 'react';
import { ArrowLeft, Save, Loader2, Trash2, Plus } from 'lucide-react';
import { cn } from '../../utils/cn.js';
import { Label, Input, Select, SegmentedToggle, SectionHeading } from './StudentFormAtoms.jsx';

// ── Атом: Segmented toggle для формата/оплаты ────────────────────────────────
function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="flex p-1 bg-stone-100 rounded-xl ring-1 ring-slate-200 shadow-inner">
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-academic-blue active:scale-[0.98]',
              isActive
                ? 'bg-white text-stone-900 shadow-sm ring-1 ring-slate-200'
                : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ── SaveBar ───────────────────────────────────────────────────────────────────
function GroupSaveBar({ onBack, onSave, isSaving, isEditMode, onDelete }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-stone-200/50 flex justify-end items-center px-6 lg:px-12 z-50 shadow-[0_-4px_24px_rgba(0,0,0,0.02)]">
      <div className="flex gap-4 w-full max-w-3xl mx-auto justify-between">
        {/* Удалить (только при редактировании) */}
        {isEditMode && onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-red-600 hover:bg-red-50 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-red-400 active:scale-[0.98] disabled:opacity-50"
          >
            <Trash2 size={16} />
            Удалить группу
          </button>
        ) : (
          <div />
        )}

        {/* Отмена + Сохранить */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onBack}
            disabled={isSaving}
            data-action="cancel_group_edit"
            className="px-6 py-2.5 rounded-xl font-medium text-stone-600 hover:bg-stone-100 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-stone-400 active:scale-[0.98] disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            data-action="save_group"
            className="px-8 py-2.5 bg-academic-blue text-white rounded-xl font-medium shadow-sm hover:bg-academic-blue-light transition-all outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-academic-blue active:scale-[0.98] disabled:opacity-70 flex items-center gap-2"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Сохранить
          </button>
        </div>
      </div>
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
  availableStudents = [],
  availablePrograms = [],
  existingSubjects = [],
}) {
  const isEditMode = !!groupId;
  const subjectsDatalistId = useId() + '-group-subjects';

  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const defaultForm = {
    name: '',
    subjectName: '',
    format: 'online',
    paymentType: 'per_lesson',
    price: '',
    duration: '90',
    subscriptionLessons: '4',
    programs: [],
    studentIds: [],
    studentFinances: {},
  };

  const [formData, setFormData] = useState(defaultForm);

  // Заполнить при редактировании
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        subjectName: initialData.subjectName || '',
        format: initialData.format || 'online',
        paymentType: initialData.paymentType || 'per_lesson',
        price: initialData.price?.toString() || '',
        duration: initialData.duration?.toString() || '90',
        subscriptionLessons: initialData.subscriptionLessons?.toString() || '4',
        programs: initialData.programs || [],
        studentIds: initialData.studentIds || [],
        studentFinances: initialData.studentFinances || {},
      });
    } else {
      setFormData(defaultForm);
    }
    setErrors({});
  }, [groupId, initialData]);

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

  const handleRemoveProgram = (idx) => {
    const prog = formData.programs[idx];
    if (prog.topics?.some(t => t.isCompleted)) {
      if (!window.confirm(`Удалить программу «${prog.name}» и сбросить прогресс?`)) return;
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
    };

    try {
      await onSubmit(payload, groupId);
    } catch (err) {
      console.error(err);
      setIsSaving(false);
    }
  };

  const handleBackAttempt = () => {
    onBack();
  };

  const handleDelete = () => {
    if (!window.confirm('Удалить группу? Это действие нельзя отменить.')) return;
    onDelete?.(groupId);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 lg:p-8 animate-fade-in pb-40">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <button
          onClick={handleBackAttempt}
          data-action="back_to_directory"
          className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors font-medium text-sm outline-none focus-visible:ring-2 focus-visible:ring-academic-blue focus-visible:ring-offset-4 rounded-md px-2 py-1 -ml-2"
        >
          <ArrowLeft size={18} strokeWidth={2} />
          К списку учеников
        </button>
        <div className="text-sm font-medium text-stone-400">
          {isEditMode ? 'Редактирование группы' : 'Новая группа'}
        </div>
      </div>

      <div className="flex flex-col gap-12">

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

            {/* Формат */}
            <div>
              <Label>Формат</Label>
              <SegmentedControl
                options={[
                  { label: 'Онлайн', value: 'online' },
                  { label: 'Офлайн', value: 'offline' },
                  { label: 'Смешанный', value: 'mixed' },
                ]}
                value={formData.format}
                onChange={val => handleChange('format', val)}
              />
            </div>

          </div>
        </section>

        {/* ── Секция 2: Оплата ───────────────────────────────────── */}
        <section>
          <SectionHeading number={2}>Оплата и занятия</SectionHeading>
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label required>
                  {formData.paymentType === 'subscription' ? 'Абонемент (₽)' : 'Ставка (₽)'}
                </Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.price}
                  onChange={e => handleChange('price', e.target.value)}
                />
                <p className="mt-1 text-xs text-stone-400">Цена за 1 ученика</p>
              </div>
              <div>
                <Label>Длительность урока</Label>
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
            </div>

            {/* Кол-во занятий абонемента */}
            <div
              className={cn(
                'grid transition-all duration-300',
                formData.paymentType === 'subscription'
                  ? 'grid-rows-[1fr] opacity-100'
                  : 'grid-rows-[0fr] opacity-0 pointer-events-none'
              )}
            >
              <div className="overflow-hidden">
                <Label>Занятий в абонементе</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.subscriptionLessons}
                  onChange={e => handleChange('subscriptionLessons', e.target.value)}
                />
              </div>
            </div>

          </div>
        </section>

        {/* ── Секция 3: Программа обучения ───────────────────────── */}
        {availablePrograms.length > 0 && (
          <section>
            <SectionHeading number={3}>Программа обучения</SectionHeading>
            <div className="flex flex-col gap-4 bg-white p-6 rounded-2xl shadow-sm ring-1 ring-slate-200">

              <Select
                value=""
                onChange={e => handleAddProgram(e.target.value)}
              >
                <option value="" disabled>+ Добавить программу</option>
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
                        <button
                          type="button"
                          onClick={() => handleRemoveProgram(idx)}
                          className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          </section>
        )}

        {/* ── Секция 4: Состав группы ────────────────────────────── */}
        <section>
          <SectionHeading number={availablePrograms.length > 0 ? 4 : 3}>
            Состав группы
            {formData.studentIds.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-academic-blue/10 text-academic-blue rounded-full font-semibold">
                {formData.studentIds.length}
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
                                className="text-sm py-1.5 px-3 min-h-0 h-9"
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
                                className="text-sm py-1.5 px-3 min-h-0 h-9 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                                  className="text-sm py-1.5 px-3 min-h-0 h-9"
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

        <div className="h-32 shrink-0" />
      </div>

      <GroupSaveBar
        onBack={handleBackAttempt}
        onSave={handleSave}
        isSaving={isSaving}
        isEditMode={isEditMode}
        onDelete={isEditMode ? handleDelete : undefined}
      />
    </div>
  );
}
