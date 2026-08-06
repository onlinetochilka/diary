/**
 * StudentFormSections.jsx
 * ────────────────────────────────────────────────────────────────────────────
 * Секции формы редактирования ученика.
 * Содержит: PersonalInfoSection, StudyProcessSection, FinancesSection,
 *           ContactsSection, SaveBar.
 *
 * Атомарные UI-компоненты (Label, Input, Select, SegmentedToggle,
 * SectionHeading, ParentCard) → StudentFormAtoms.jsx
 *
 * ПРАВИЛО: никакие Tailwind-классы и DOM-структура не меняются относительно
 * оригинального StudentEditorView.jsx.
 */

import { Plus, Save, Loader2, Trash2, Archive, ArchiveRestore } from 'lucide-react';
import { cn } from '../../utils/cn.js';
import { Label, Input, Select, SegmentedToggle, SectionHeading, ParentCard } from './StudentFormAtoms.jsx';
// Реэкспортируем атомы для обратной совместимости
export { Label, Input, Select, SegmentedToggle } from './StudentFormAtoms.jsx';
import Tooltip from '../ui/Tooltip.jsx';


// ── Секция 1: Личные данные ───────────────────────────────────────────────────

export function PersonalInfoSection({ formData, handleChange }) {
  return (
    <section>
      <SectionHeading number={1}>Личные данные</SectionHeading>
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
  );
}

// ── Секция 2: Учебный процесс и Финансы (Предметы) ────────────────────────────

export function SubjectsSection({
  formData,
  handleSubjectChange,
  handleProgramChange,
  availablePrograms,
  handleNavigateToPrograms,
  handleAddSubject,
  handleRemoveSubject,
  handleContactChange,
}) {
  return (
    <section>
      <SectionHeading number={2}>Учебный процесс и Финансы</SectionHeading>
      <div className="flex flex-col gap-6">
        {formData.subjects.map((subject, index) => {
          const currentSubjectName = (subject.name || '').trim().toLowerCase();
          const filteredPrograms = availablePrograms.filter(p => {
            if (!currentSubjectName) return true;
            return p.subject && p.subject.toLowerCase().includes(currentSubjectName);
          });

          const duration = subject.duration || 60;
          const price = subject.price || 0;
          const subLessons = subject.subscriptionLessons || 0;
          const showSubscription = subject.paymentType === 'subscription';

          const hourlyRatePerLesson = duration > 0 && price > 0 ? Math.round((price / duration) * 60) : 0;
          const hourlyRateSub = (duration > 0 && price > 0 && subLessons > 0)
            ? Math.round((price / (duration * subLessons)) * 60)
            : 0;

          return (
            <div key={subject.id || index} className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-slate-200 flex flex-col gap-6 relative group">
              {formData.subjects.length > 1 && (
                <Tooltip text="Удалить предмет" position="top" wrapperClassName="absolute top-4 right-4 z-10">
                  <button
                    type="button"
                    onClick={() => handleRemoveSubject(index)}
                    className="p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </Tooltip>
              )}

              {/* Учебный процесс */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={formData.subjects.length > 1 ? "pr-10" : ""}>
                  <Label required>Предмет</Label>
                  <Input
                    placeholder="Например, Математика"
                    value={subject.name || ''}
                    onChange={e => handleSubjectChange(index, 'name', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Формат</Label>
                  <SegmentedToggle
                    options={[
                      { label: 'Онлайн', value: 'online' },
                      { label: 'Офлайн', value: 'offline' },
                      { label: 'Смешанный', value: 'mixed' }
                    ]}
                    value={subject.format || 'online'}
                    onChange={val => handleSubjectChange(index, 'format', val)}
                  />
                </div>
                {(subject.format === 'online' || subject.format === 'mixed' || !subject.format) && (
                  <div className="md:col-span-2">
                    <Label>Ссылка на занятие (Zoom, Meet...)</Label>
                    <Input
                      placeholder="https://..."
                      value={subject.videoLink || ''}
                      onChange={e => handleSubjectChange(index, 'videoLink', e.target.value)}
                    />
                  </div>
                )}

                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium text-stone-700">Программа обучения</label>
                    <button
                      onClick={handleNavigateToPrograms}
                      type="button"
                      data-action="create_new_program_shortcut"
                      className="text-xs font-medium text-[#7A404D] hover:text-[#8A4C5A] flex items-center gap-1 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#7A404D] rounded-sm px-1"
                    >
                      + Новая программа
                    </button>
                  </div>
                  <Select
                    value={subject.programs?.[0]?.id || ''}
                    onChange={e => handleProgramChange(index, e.target.value, availablePrograms)}
                  >
                    <option value="">Не выбрано</option>
                    {filteredPrograms.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </Select>
                </div>
              </div>

              {/* РАЗДЕЛИТЕЛЬ */}
              <div className="h-px bg-stone-100 my-2"></div>

              {/* Финансы */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <Label required>Тип оплаты</Label>
                  <SegmentedToggle
                    options={[
                      { label: 'Поурочно', value: 'per_lesson' },
                      { label: 'Абонемент', value: 'subscription' }
                    ]}
                    value={subject.paymentType || 'per_lesson'}
                    onChange={val => handleSubjectChange(index, 'paymentType', val)}
                  />
                </div>

                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 transition-all duration-300">
                  <div>
                    <Label required>Длительность урока</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={subject.duration || ''}
                        onChange={e => handleSubjectChange(index, 'duration', Number(e.target.value))}
                        className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none pr-12"
                        placeholder="Например, 60"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm pointer-events-none">мин</div>
                    </div>
                  </div>

                  {!showSubscription ? (
                    <div>
                      <Label required>Стоимость одного занятия (₽)</Label>
                      <Input
                        type="number"
                        className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="Например, 1500"
                        value={subject.price || ''}
                        onChange={e => handleSubjectChange(index, 'price', Number(e.target.value))}
                      />
                      {hourlyRatePerLesson > 0 && duration !== 60 && (
                        <p className="text-xs text-stone-400 mt-1.5 font-medium">~{hourlyRatePerLesson} ₽ за час (60 мин)</p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <Label required>Кол-во занятий в абонементе</Label>
                      <Input
                        type="number"
                        className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="Например, 4 или 8"
                        value={subject.subscriptionLessons || ''}
                        onChange={e => handleSubjectChange(index, 'subscriptionLessons', Number(e.target.value))}
                      />
                    </div>
                  )}
                </div>

                {showSubscription && (
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 mt-[-8px]">
                    <div className="md:col-start-2">
                      <Label required>Общая стоимость абонемента (₽)</Label>
                      <Input
                        type="number"
                        className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="Например, 12000"
                        value={subject.price || ''}
                        onChange={e => handleSubjectChange(index, 'price', Number(e.target.value))}
                      />
                      {hourlyRateSub > 0 && (
                        <p className="text-xs text-stone-400 mt-1.5 font-medium">~{hourlyRateSub} ₽ за час (60 мин)</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <button
          type="button"
          onClick={handleAddSubject}
          className="flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-stone-200 text-stone-500 hover:text-[#7A404D] hover:bg-[#7A404D]/5 hover:border-[#7A404D]/30 transition-colors font-medium text-sm w-full"
        >
          <Plus size={18} />
          Добавить ещё предмет
        </button>

        {/* Кто оплачивает занятия */}
        <div className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-slate-200">
          <Label required>Кто оплачивает занятия?</Label>
          <SegmentedToggle
            options={[
              { label: 'Сам ученик', value: 'student' },
              { label: 'Другой человек', value: 'parent' }
            ]}
            value={formData.contacts.billingTo}
            onChange={val => handleContactChange('billingTo', val)}
          />
        </div>
      </div>
    </section>
  );
}

// ── Карточка родителя (общий компонент, используется и в Финансах, и в Контактах)


// ── Секция 4: Связь ───────────────────────────────────────────────────────────

export function ContactsSection({ formData, handleContactChange, showParent }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-stone-900 tracking-tight mb-6 flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-[#7A404D]/10 text-[#7A404D] flex items-center justify-center text-xs">3</span>
        Связь
      </h2>

      <div className="flex flex-col gap-6">
        {/* Контакты ученика */}
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
                      newChannels[idx] = { ...newChannels[idx], type: e.target.value };
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
                  <div className="flex-1 relative">
                    <Label>Куда писать</Label>
                    <div className="relative flex items-stretch bg-white rounded-xl shadow-sm border border-stone-200 focus-within:border-academic-blue focus-within:ring-1 focus-within:ring-academic-blue focus-within:shadow-md transition-all overflow-hidden">
                      <input
                        placeholder="Телефон или Telegram"
                        value={channel.value}
                        onChange={e => {
                          const newChannels = [...(formData.contacts.studentChannels || [])];
                          newChannels[idx] = { ...newChannels[idx], value: e.target.value };
                          handleContactChange('studentChannels', newChannels);
                        }}
                        className="flex-1 bg-transparent border-0 px-4 py-2.5 text-stone-900 placeholder:text-stone-400 !outline-none !ring-0 !shadow-none focus:ring-0 focus:shadow-none focus:outline-none w-full min-w-0"
                      />
                      <Tooltip text={channel.isPrimary ? "Основной канал связи" : "Сделать основным"} position="top" wrapperClassName="shrink-0 flex">
                        <button
                          type="button"
                          onClick={() => {
                            const newChannels = (formData.contacts.studentChannels || []).map((ch, i) => ({
                              ...ch,
                              isPrimary: i === idx
                            }));
                            handleContactChange('studentChannels', newChannels);
                          }}
                          className={cn(
                            "px-3 border-l border-stone-200 h-full flex items-center justify-center transition-colors outline-none",
                            channel.isPrimary ? "bg-[#7A404D]/10 text-[#7A404D] border-[#7A404D]/20" : "bg-stone-50 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                          )}
                        >
                          {/* If no channel is marked primary, fallback to first in consumer code. So explicit true is visually indicated. */}
                          <svg width="16" height="16" viewBox="0 0 24 24" fill={channel.isPrimary ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                  <Tooltip text="Удалить канал" position="top" wrapperClassName="shrink-0 self-end mb-[2px] z-10">
                    <button
                      type="button"
                      onClick={() => {
                        const newChannels = [...(formData.contacts.studentChannels || [])];
                        newChannels.splice(idx, 1);
                        handleContactChange('studentChannels', newChannels);
                      }}
                      className="p-3 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </Tooltip>
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
              className="flex items-center justify-center gap-2 py-3 mt-2 rounded-xl border border-dashed border-stone-300 text-stone-500 hover:text-[#7A404D] hover:bg-[#7A404D]/5 hover:border-[#7A404D]/30 transition-colors font-medium text-sm w-full"
            >
              <Plus size={16} />
              Добавить канал ученика
            </button>
          </div>
        </div>

        {/* Контакты родителя / представителя */}
        <div className={cn(
          "bg-white p-6 rounded-2xl shadow-sm ring-1 ring-slate-200 transition-all duration-300 ease-in-out",
          showParent ? "block" : "hidden"
        )}>
          <h3 className="text-base font-semibold text-stone-800 mb-4">Контакты родителя / представителя</h3>
          <div className="flex flex-col gap-4">
            {(formData.contacts.parents || []).length > 0 && (
              (formData.contacts.parents || []).map((parent, idx) => (
                <ParentCard
                  key={idx}
                  idx={idx}
                  parent={parent}
                  formData={formData}
                  handleContactChange={handleContactChange}
                />
              ))
            )}
            <button
              type="button"
              onClick={() => {
                const newParents = [...(formData.contacts.parents || [])];
                newParents.push({ role: '', name: '', gender: 'unknown', channel: { type: 'telegram', value: '' } });
                handleContactChange('parents', newParents);
              }}
              className="flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-stone-300 text-stone-500 hover:text-[#7A404D] hover:bg-[#7A404D]/5 hover:border-[#7A404D]/30 transition-colors font-medium text-sm w-full"
            >
              <Plus size={16} />
              Добавить представителя
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Плавающая кнопка сохранения ───────────────────────────────────────────────

export function SaveBar({ onBack, onSave, isSaving, isEditMode, onDelete, onArchive, isArchived }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 p-3 px-4 bg-white/95 backdrop-blur-md border border-stone-200/80 rounded-2xl flex justify-between items-center z-50 shadow-2xl shadow-stone-900/10 w-[calc(100%-2rem)] max-w-4xl transition-all duration-300">
      <div className="flex w-full justify-between items-center">
        <div className="flex items-center gap-2">
          {isEditMode && onArchive && (
            <button
              onClick={onArchive}
              disabled={isSaving}
              data-action="archive_student"
              className={`px-4 py-2.5 rounded-xl font-medium transition-colors outline-none focus-visible:ring-2 flex items-center gap-2 ${
                isArchived
                  ? 'text-teal-700 hover:bg-teal-50 focus-visible:ring-teal-400'
                  : 'text-amber-700 hover:bg-amber-50 focus-visible:ring-amber-400'
              }`}
            >
              {isArchived ? <ArchiveRestore size={18} /> : <Archive size={18} />}
              <span className="hidden sm:inline">
                {isArchived ? 'Восстановить' : 'В архив'}
              </span>
            </button>
          )}
          {isEditMode && onDelete && (
            <button
              onClick={onDelete}
              disabled={isSaving}
              data-action="delete_student"
              className="px-4 py-2.5 rounded-xl font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-red-400 flex items-center gap-2"
            >
              <Trash2 size={18} />
              <span className="hidden sm:inline">Удалить</span>
            </button>
          )}
        </div>
        <div className="flex gap-4">
          <button
            onClick={onBack}
            disabled={isSaving}
            data-action="cancel_edit"
            className="px-6 py-2.5 rounded-xl font-medium text-stone-600 hover:bg-stone-100 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-stone-400 active:scale-[0.98] disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            onClick={onSave}
            disabled={isSaving}
            data-action="save_student"
            className="px-8 py-2.5 bg-[#7A404D] text-white rounded-xl font-medium shadow-sm hover:bg-[#8A4C5A] transition-all outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#7A404D] active:scale-[0.98] disabled:opacity-70 flex items-center gap-2"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
