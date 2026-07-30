import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Save, Loader2, Trash2, Plus } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { createEmptyStudent } from '../../services/studentsAdapter.js';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// ── UI Components with 8 States ──

const Label = ({ children, required }) => (
  <label className="block text-sm font-medium text-stone-700 mb-1.5">
    {children} {required && <span className="text-red-500">*</span>}
  </label>
);

const Input = ({ className, error, success, isLoading, ...props }) => {
  return (
    <div className="relative">
      <input
        disabled={isLoading}
        className={cn(
          "w-full bg-white border-0 rounded-xl px-4 py-2.5 text-stone-900 placeholder:text-stone-400 transition-all duration-200 outline-none shadow-sm ring-1 ring-inset",
          "hover:ring-stone-300",
          "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-academic-blue focus-visible:shadow-md",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-stone-50",
          error ? "ring-red-300 focus-visible:ring-red-500" : 
          success ? "ring-green-300 focus-visible:ring-green-500" : 
          "ring-stone-200",
          className
        )}
        {...props}
      />
      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <Loader2 size={16} className="text-stone-400 animate-spin" />
        </div>
      )}
    </div>
  );
};

const Select = ({ className, error, success, isLoading, children, ...props }) => {
  return (
    <select
      disabled={isLoading}
      className={cn(
        "w-full bg-white border-0 rounded-xl px-4 py-2.5 text-stone-900 transition-all duration-200 outline-none shadow-sm ring-1 ring-inset appearance-none",
        "hover:ring-stone-300",
        "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-academic-blue focus-visible:shadow-md",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-stone-50",
        error ? "ring-red-300 focus-visible:ring-red-500" : 
        success ? "ring-green-300 focus-visible:ring-green-500" : 
        "ring-stone-200",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
};

const SegmentedToggle = ({ options, value, onChange }) => {
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
              "flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-academic-blue active:scale-[0.98]",
              isActive 
                ? "bg-white text-stone-900 shadow-sm ring-1 ring-slate-200" 
                : "text-stone-500 hover:text-stone-700 hover:bg-stone-50"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};


export default function StudentEditorView({ studentId, onBack, onNavigate, availablePrograms = [] }) {
  // Mock form state
  const initialState = createEmptyStudent();
  const [formData, setFormData] = useState(initialState);
  const [isSaving, setIsSaving] = useState(false);
  const [initialDataStr, setInitialDataStr] = useState(JSON.stringify(initialState));
  
  // Determine if the form is dirty
  const isDirty = useMemo(() => {
    return JSON.stringify(formData) !== initialDataStr;
  }, [formData, initialDataStr]);

  const handleBackAttempt = () => {
    if (isDirty) {
      if (window.confirm('Остались несохраненные данные. Точно выйти?')) {
        onBack();
      }
    } else {
      onBack();
    }
  };

  // Deriving visibility from toggles
  const showSubscription = formData.subjects[0]?.paymentType === 'subscription';
  const showParent = formData.contacts.billingTo === 'parent';

  // State handlers
  const handleChange = (field, val) => setFormData(p => ({ ...p, [field]: val }));
  const handleSubjectChange = (field, val) => setFormData(p => {
    const s = [...p.subjects];
    s[0] = { ...s[0], [field]: val };
    return { ...p, subjects: s };
  });
  const handleContactChange = (field, val) => setFormData(p => {
    const newContacts = { ...p.contacts, [field]: val };
    
    // Auto-add an empty parent if switching to 'parent' billing and there are no parents yet
    if (field === 'billingTo' && val === 'parent' && (!newContacts.parents || newContacts.parents.length === 0)) {
      newContacts.parents = [{ role: '', name: '', gender: 'unknown', channel: { type: 'telegram', value: '' } }];
    }
    
    return { ...p, contacts: newContacts };
  });

  const handleProgramChange = (progId) => {
    const prog = availablePrograms.find(p => p.id === progId);
    setFormData(p => {
      const s = [...p.subjects];
      s[0] = {
        ...s[0],
        programs: prog ? [{ id: prog.id, name: prog.name, topics: prog.topics, colorOklch: prog.colorOklch }] : []
      };
      return { ...p, subjects: s };
    });
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setInitialDataStr(JSON.stringify(formData)); // Reset dirty state
      setIsSaving(false);
      onBack();
    }, 800);
  };

  const handleNavigateToPrograms = () => {
    // Save draft state before leaving
    sessionStorage.setItem('studentEditorDraft', JSON.stringify(formData));
    if (onNavigate) {
      onNavigate('programs', { action: 'create_program', returnTo: 'students', studentId });
    }
  };

  // Restore draft if any
  useEffect(() => {
    const draft = sessionStorage.getItem('studentEditorDraft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setFormData(parsed);
        sessionStorage.removeItem('studentEditorDraft');
      } catch (e) {}
    }
  }, []);

  // Filter programs by the typed subject name
  const currentSubjectName = (formData.subjects[0]?.name || '').trim().toLowerCase();
  const filteredPrograms = availablePrograms.filter(p => {
    if (!currentSubjectName) return true;
    return p.subject && p.subject.toLowerCase().includes(currentSubjectName);
  });

  // Calculations for hourly rates
  const duration = formData.subjects[0]?.duration || 60;
  const price = formData.subjects[0]?.price || 0;
  const subLessons = formData.subjects[0]?.subscriptionLessons || 0;

  const hourlyRatePerLesson = duration > 0 && price > 0 ? Math.round((price / duration) * 60) : 0;
  const hourlyRateSub = (duration > 0 && price > 0 && subLessons > 0) ? Math.round((price / (duration * subLessons)) * 60) : 0;

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
          {studentId ? 'Редактирование ученика' : 'Новый ученик'}
        </div>
      </div>

      <div className="flex flex-col gap-12">
        
        {/* ── Блок 1: Личное ── */}
        <section>
          <h2 className="text-lg font-bold text-stone-900 tracking-tight mb-6 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-academic-blue/10 text-academic-blue flex items-center justify-center text-xs">1</span>
            Личные данные
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-2xl shadow-sm ring-1 ring-slate-200">
            <div className="md:col-span-2">
              <Label required>Полное имя</Label>
              <Input 
                placeholder="Например, Александр Пушкин" 
                value={formData.name}
                onChange={e => handleChange('name', e.target.value)}
              />
            </div>
            <div>
              <Label>Возраст</Label>
              <Input 
                placeholder="Например, 14 лет"
                value={formData.age || ''}
                onChange={e => handleChange('age', e.target.value)}
              />
            </div>
            <div>
              <Label>Класс</Label>
              <Input 
                placeholder="Например, 8 класс"
                value={formData.grade || ''}
                onChange={e => handleChange('grade', e.target.value)}
              />
            </div>
            <div>
              <Label>Пол</Label>
              <Select value={formData.gender} onChange={e => handleChange('gender', e.target.value)}>
                <option value="unknown">Не выбрано</option>
                <option value="male">Мужской</option>
                <option value="female">Женский</option>
              </Select>
            </div>
            <div>
              <Label>Статус</Label>
              <SegmentedToggle
                options={[
                  { label: 'Активный', value: false },
                  { label: 'В архиве', value: true }
                ]}
                value={formData.isArchived || false}
                onChange={val => handleChange('isArchived', val)}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Часовой пояс</Label>
              <Select value={formData.timezone} onChange={e => handleChange('timezone', e.target.value)}>
                <option value="UTC-8 (Лос-Анджелес)">UTC-8 (Лос-Анджелес)</option>
                <option value="UTC-5 (Нью-Йорк)">UTC-5 (Нью-Йорк)</option>
                <option value="UTC+0 (Лондон)">UTC+0 (Лондон)</option>
                <option value="UTC+1 (Берлин, Париж)">UTC+1 (Берлин, Париж)</option>
                <option value="UTC+2 (Калининград)">UTC+2 (Калининград)</option>
                <option value="UTC+3 (Москва)">UTC+3 (Москва, Минск)</option>
                <option value="UTC+4 (Самара, Дубай)">UTC+4 (Самара, Дубай)</option>
                <option value="UTC+5 (Екатеринбург, Ташкент)">UTC+5 (Екатеринбург, Ташкент)</option>
                <option value="UTC+6 (Омск, Алматы)">UTC+6 (Омск, Алматы)</option>
                <option value="UTC+7 (Красноярск)">UTC+7 (Красноярск)</option>
                <option value="UTC+8 (Иркутск, Пекин)">UTC+8 (Иркутск, Пекин)</option>
                <option value="UTC+9 (Якутск, Токио)">UTC+9 (Якутск, Токио)</option>
                <option value="UTC+10 (Владивосток)">UTC+10 (Владивосток)</option>
                <option value="UTC+11 (Магадан)">UTC+11 (Магадан)</option>
                <option value="UTC+12 (Камчатка)">UTC+12 (Камчатка)</option>
              </Select>
            </div>
          </div>
        </section>

        {/* ── Блок 2: Учеба ── */}
        <section>
          <h2 className="text-lg font-bold text-stone-900 tracking-tight mb-6 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-academic-blue/10 text-academic-blue flex items-center justify-center text-xs">2</span>
            Учебный процесс
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-2xl shadow-sm ring-1 ring-slate-200">
            <div>
              <Label required>Предмет</Label>
              <Input 
                placeholder="Например, Математика"
                value={formData.subjects[0]?.name || ''}
                onChange={e => handleSubjectChange('name', e.target.value)}
              />
            </div>
            <div>
              <Label>Формат</Label>
              <SegmentedToggle
                options={[
                  { label: 'Онлайн', value: 'online' },
                  { label: 'Офлайн', value: 'offline' }
                ]}
                value={formData.subjects[0]?.format || 'online'}
                onChange={val => handleSubjectChange('format', val)}
              />
            </div>
            
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                 <label className="block text-sm font-medium text-stone-700">Программа обучения</label>
                 <button 
                   onClick={handleNavigateToPrograms} 
                   type="button" 
                   data-action="create_new_program_shortcut"
                   className="text-xs font-medium text-academic-blue hover:text-academic-blue-light flex items-center gap-1 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-academic-blue rounded-sm px-1"
                 >
                   + Новая программа
                 </button>
              </div>
              <Select 
                value={formData.subjects[0]?.programs?.[0]?.id || ''} 
                onChange={e => handleProgramChange(e.target.value)}
              >
                <option value="">Не выбрано</option>
                {filteredPrograms.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </div>
          </div>
        </section>

        {/* ── Блок 3: Финансы ── */}
        <section>
          <h2 className="text-lg font-bold text-stone-900 tracking-tight mb-6 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-academic-blue/10 text-academic-blue flex items-center justify-center text-xs">3</span>
            Финансы
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-2xl shadow-sm ring-1 ring-slate-200">
            <div className="md:col-span-2">
              <Label>Тип оплаты</Label>
              <SegmentedToggle
                options={[
                  { label: 'Поурочно', value: 'per_lesson' },
                  { label: 'Абонемент', value: 'subscription' }
                ]}
                value={formData.subjects[0]?.paymentType || 'per_lesson'}
                onChange={val => handleSubjectChange('paymentType', val)}
              />
            </div>

            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 transition-all duration-300">
                <div>
                    <Label>Длительность урока</Label>
                    <div className="relative">
                        <Input 
                            type="number" 
                            value={formData.subjects[0]?.duration || ''} 
                            onChange={e => handleSubjectChange('duration', Number(e.target.value))} 
                            className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none pr-12"
                            placeholder="Например, 60"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm pointer-events-none">мин</div>
                    </div>
                </div>

                { !showSubscription ? (
                    <div>
                        <Label>Стоимость одного занятия (₽)</Label>
                        <Input 
                            type="number" 
                            className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            placeholder="Например, 1500"
                            value={formData.subjects[0]?.price || ''}
                            onChange={e => handleSubjectChange('price', Number(e.target.value))}
                        />
                        {hourlyRatePerLesson > 0 && duration !== 60 && (
                            <p className="text-xs text-stone-400 mt-1.5 font-medium">~{hourlyRatePerLesson} ₽ за час (60 мин)</p>
                        )}
                    </div>
                ) : (
                    <div>
                        <Label>Кол-во занятий в абонементе</Label>
                        <Input 
                            type="number" 
                            className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            placeholder="Например, 4 или 8"
                            value={formData.subjects[0]?.subscriptionLessons || ''}
                            onChange={e => handleSubjectChange('subscriptionLessons', Number(e.target.value))}
                        />
                    </div>
                )}
            </div>

            { showSubscription && (
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 mt-[-8px]">
                    <div className="md:col-start-2">
                        <Label>Общая стоимость абонемента (₽)</Label>
                        <Input 
                            type="number" 
                            className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            placeholder="Например, 12000"
                            value={formData.subjects[0]?.price || ''}
                            onChange={e => handleSubjectChange('price', Number(e.target.value))}
                        />
                         {hourlyRateSub > 0 && (
                            <p className="text-xs text-stone-400 mt-1.5 font-medium">~{hourlyRateSub} ₽ за час (60 мин)</p>
                         )}
                    </div>
                </div>
            )}

            {/* РАЗДЕЛИТЕЛЬ */}
            <div className="md:col-span-2 h-px bg-stone-100 my-2"></div>
            
            <div className="md:col-span-2">
              <Label>Кто оплачивает занятия?</Label>
              <SegmentedToggle
                options={[
                  { label: 'Сам ученик', value: 'student' },
                  { label: 'Другой человек', value: 'parent' }
                ]}
                value={formData.contacts.billingTo}
                onChange={val => handleContactChange('billingTo', val)}
              />
            </div>

            {/* Smooth height transition for Parent fields */}
            <div className={cn(
              "md:col-span-2 grid transition-all duration-300 ease-in-out",
              showParent ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            )}>
              <div className="overflow-hidden">
                <div className="flex flex-col gap-4 pt-2 pb-4">
                  {(formData.contacts.parents || []).map((parent, idx) => (
                    <div key={idx} className="p-5 bg-stone-50 rounded-2xl ring-1 ring-slate-200 relative group">
                      <button 
                        type="button"
                        onClick={() => {
                          const newParents = [...formData.contacts.parents];
                          newParents.splice(idx, 1);
                          handleContactChange('parents', newParents);
                        }}
                        className="absolute top-3 right-3 p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Удалить контакт"
                      >
                         <Trash2 size={16} />
                      </button>
                      <input
                        type="text"
                        value={parent.role || ''}
                        placeholder="Кем приходится ученику"
                        onFocus={e => e.target.placeholder = "Мама"}
                        onBlur={e => e.target.placeholder = "Кем приходится ученику"}
                        onChange={e => {
                          const newParents = [...formData.contacts.parents];
                          newParents[idx].role = e.target.value;
                          handleContactChange('parents', newParents);
                        }}
                        className="block text-sm font-semibold text-stone-800 mb-4 bg-transparent border-0 border-b border-dashed border-stone-300 py-1 px-0 focus:ring-0 focus:border-academic-blue focus:outline-none placeholder:text-stone-400 placeholder:font-normal w-full md:w-1/2 transition-colors rounded-none shadow-none appearance-none"
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Имя</Label>
                          <Input 
                            placeholder="Например, Анна Николаевна"
                            value={parent.name}
                            onChange={e => {
                              const newParents = [...formData.contacts.parents];
                              newParents[idx].name = e.target.value;
                              handleContactChange('parents', newParents);
                            }}
                          />
                        </div>
                        <div>
                          <Label>Пол</Label>
                          <Select 
                            value={parent.gender} 
                            onChange={e => {
                              const newParents = [...formData.contacts.parents];
                              newParents[idx].gender = e.target.value;
                              handleContactChange('parents', newParents);
                            }}
                          >
                            <option value="unknown">Не выбрано</option>
                            <option value="male">Мужской</option>
                            <option value="female">Женский</option>
                          </Select>
                        </div>
                        <div>
                          <Label>Канал связи</Label>
                          <Select 
                            value={parent.channel?.type || 'telegram'} 
                            onChange={e => {
                              const newParents = [...formData.contacts.parents];
                              if (!newParents[idx].channel) newParents[idx].channel = { type: 'telegram', value: '' };
                              newParents[idx].channel.type = e.target.value;
                              handleContactChange('parents', newParents);
                            }}
                          >
                            <option value="telegram">Telegram</option>
                            <option value="whatsapp">WhatsApp</option>
                            <option value="vk">ВКонтакте</option>
                            <option value="email">Email</option>
                            <option value="phone">Телефон</option>
                          </Select>
                        </div>
                        <div>
                          <Label>Куда писать</Label>
                          <Input 
                            placeholder="Телефон или Telegram"
                            value={parent.channel?.value || ''}
                            onChange={e => {
                              const newParents = [...formData.contacts.parents];
                              if (!newParents[idx].channel) newParents[idx].channel = { type: 'telegram', value: '' };
                              newParents[idx].channel.value = e.target.value;
                              handleContactChange('parents', newParents);
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const newParents = [...(formData.contacts.parents || [])];
                      newParents.push({ role: '', name: '', gender: 'unknown', channel: { type: 'telegram', value: '' } });
                      handleContactChange('parents', newParents);
                    }}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-stone-300 text-stone-500 hover:text-academic-blue hover:bg-academic-blue/5 hover:border-academic-blue/30 transition-colors font-medium text-sm w-full"
                  >
                    <Plus size={16} />
                    Добавить ещё плательщика
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Блок 4: Связь ── */}
        <section>
          <h2 className="text-lg font-bold text-stone-900 tracking-tight mb-6 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-academic-blue/10 text-academic-blue flex items-center justify-center text-xs">4</span>
            Связь
          </h2>
          
          <div className="flex flex-col gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-slate-200">
              <h3 className="text-base font-semibold text-stone-800 mb-4">Контакты ученика</h3>
              <div className="flex flex-col gap-4">
                {(formData.contacts.studentChannels || [{ type: 'telegram', value: '' }]).map((channel, idx) => (
                  <div key={idx} className="flex flex-col md:flex-row gap-4 relative group items-end">
                    <div className="w-full md:w-1/3">
                      <Label>Канал связи</Label>
                      <Select 
                        value={channel.type} 
                        onChange={e => {
                          const newChannels = [...(formData.contacts.studentChannels || [])];
                          newChannels[idx].type = e.target.value;
                          handleContactChange('studentChannels', newChannels);
                        }}
                      >
                        <option value="telegram">Telegram</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="vk">ВКонтакте</option>
                        <option value="email">Email</option>
                        <option value="phone">Телефон</option>
                      </Select>
                    </div>
                    <div className="w-full md:w-2/3 flex gap-2">
                      <div className="flex-1">
                        <Label>Куда писать</Label>
                        <Input 
                          placeholder="Телефон или Telegram"
                          value={channel.value}
                          onChange={e => {
                            const newChannels = [...(formData.contacts.studentChannels || [])];
                            newChannels[idx].value = e.target.value;
                            handleContactChange('studentChannels', newChannels);
                          }}
                        />
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          const newChannels = [...(formData.contacts.studentChannels || [])];
                          newChannels.splice(idx, 1);
                          handleContactChange('studentChannels', newChannels);
                        }}
                        className="shrink-0 p-3 mb-[2px] text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors self-end"
                        title="Удалить канал"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={() => {
                    const newChannels = [...(formData.contacts.studentChannels || [])];
                    newChannels.push({ type: 'telegram', value: '' });
                    handleContactChange('studentChannels', newChannels);
                  }}
                  className="flex items-center justify-center gap-2 py-3 mt-2 rounded-xl border border-dashed border-stone-300 text-stone-500 hover:text-academic-blue hover:bg-academic-blue/5 hover:border-academic-blue/30 transition-colors font-medium text-sm w-full"
                >
                  <Plus size={16} />
                  Добавить канал ученика
                </button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-slate-200">
              <h3 className="text-base font-semibold text-stone-800 mb-4">Контакты родителя / представителя</h3>
              <div className="flex flex-col gap-4">
                {(formData.contacts.parents || []).length > 0 && (
                  (formData.contacts.parents || []).map((parent, idx) => (
                    <div key={idx} className="p-5 bg-stone-50 rounded-2xl ring-1 ring-slate-200 relative group">
                      <button 
                        type="button"
                        onClick={() => {
                          const newParents = [...formData.contacts.parents];
                          newParents.splice(idx, 1);
                          handleContactChange('parents', newParents);
                        }}
                        className="absolute top-3 right-3 p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Удалить контакт"
                      >
                         <Trash2 size={16} />
                      </button>
                      <input
                        type="text"
                        value={parent.role || ''}
                        placeholder="Кем приходится ученику"
                        onFocus={e => e.target.placeholder = "Мама"}
                        onBlur={e => e.target.placeholder = "Кем приходится ученику"}
                        onChange={e => {
                          const newParents = [...formData.contacts.parents];
                          newParents[idx].role = e.target.value;
                          handleContactChange('parents', newParents);
                        }}
                        className="block text-sm font-semibold text-stone-800 mb-4 bg-transparent border-0 border-b border-dashed border-stone-300 py-1 px-0 focus:ring-0 focus:border-academic-blue focus:outline-none placeholder:text-stone-400 placeholder:font-normal w-full md:w-1/2 transition-colors rounded-none shadow-none appearance-none"
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Имя</Label>
                          <Input 
                            placeholder="Например, Анна Николаевна"
                            value={parent.name}
                            onChange={e => {
                              const newParents = [...formData.contacts.parents];
                              newParents[idx].name = e.target.value;
                              handleContactChange('parents', newParents);
                            }}
                          />
                        </div>
                        <div>
                          <Label>Пол</Label>
                          <Select 
                            value={parent.gender} 
                            onChange={e => {
                              const newParents = [...formData.contacts.parents];
                              newParents[idx].gender = e.target.value;
                              handleContactChange('parents', newParents);
                            }}
                          >
                            <option value="unknown">Не выбрано</option>
                            <option value="male">Мужской</option>
                            <option value="female">Женский</option>
                          </Select>
                        </div>
                        <div>
                          <Label>Канал связи</Label>
                          <Select 
                            value={parent.channel?.type || 'telegram'} 
                            onChange={e => {
                              const newParents = [...formData.contacts.parents];
                              if (!newParents[idx].channel) newParents[idx].channel = { type: 'telegram', value: '' };
                              newParents[idx].channel.type = e.target.value;
                              handleContactChange('parents', newParents);
                            }}
                          >
                            <option value="telegram">Telegram</option>
                            <option value="whatsapp">WhatsApp</option>
                            <option value="vk">ВКонтакте</option>
                            <option value="email">Email</option>
                            <option value="phone">Телефон</option>
                          </Select>
                        </div>
                        <div>
                          <Label>Куда писать</Label>
                          <Input 
                            placeholder="Телефон или Telegram"
                            value={parent.channel?.value || ''}
                            onChange={e => {
                              const newParents = [...formData.contacts.parents];
                              if (!newParents[idx].channel) newParents[idx].channel = { type: 'telegram', value: '' };
                              newParents[idx].channel.value = e.target.value;
                              handleContactChange('parents', newParents);
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <button
                  type="button"
                  onClick={() => {
                    const newParents = [...(formData.contacts.parents || [])];
                    newParents.push({ role: '', name: '', gender: 'unknown', channel: { type: 'telegram', value: '' } });
                    handleContactChange('parents', newParents);
                  }}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-stone-300 text-stone-500 hover:text-academic-blue hover:bg-academic-blue/5 hover:border-academic-blue/30 transition-colors font-medium text-sm w-full"
                >
                  <Plus size={16} />
                  Добавить представителя
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Dummy spacer for scrolling past fixed bottom bar */}
        <div className="h-32 shrink-0"></div>
      </div>

      {/* Floating Save Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-stone-200/50 flex justify-end items-center px-6 lg:px-12 z-50 shadow-[0_-4px_24px_rgba(0,0,0,0.02)]">
        <div className="flex gap-4 w-full max-w-3xl mx-auto justify-end">
          <button
            onClick={handleBackAttempt}
            disabled={isSaving}
            data-action="cancel_edit"
            className="px-6 py-2.5 rounded-xl font-medium text-stone-600 hover:bg-stone-100 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-stone-400 active:scale-[0.98] disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            data-action="save_student"
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
