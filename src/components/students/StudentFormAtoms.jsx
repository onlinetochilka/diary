/**
 * StudentFormAtoms.jsx
 * ────────────────────────────────────────────────────────────────────────────
 * Атомарные UI-компоненты, локальные для форм редактирования ученика.
 * Используются в StudentFormSections.jsx и StudentFormDrawer.jsx.
 *
 *   Label           — метка поля с опциональной звёздочкой «обязательное»
 *   Input           — поле ввода с состояниями error/success/loading
 *   Select          — выпадающий список с теми же состояниями
 *   SegmentedToggle — переключатель между вариантами (pill-стиль)
 *   SectionHeading  — нумерованный заголовок секции
 *   ParentCard      — карточка родителя/контакта ученика
 */

import { Trash2, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn.js';
import UISelect from '../ui/Select.jsx';
import Tooltip from '../ui/Tooltip.jsx';
import Button from '../ui/Button.jsx';

export const getChannelPlaceholder = (type) => {
  switch (type) {
    case 'telegram': return 'Телефон или @username';
    case 'whatsapp': return 'Номер телефона';
    case 'max': return 'Имя пользователя или телефон';
    case 'vk': return 'Ссылка на страницу';
    case 'email': return 'Адрес эл. почты';
    case 'phone': return 'Номер телефона';
    default: return 'Имя пользователя или телефон';
  }
};

export const Label = ({ children, required }) => (
  <label className="block text-sm font-medium text-stone-700 mb-1.5">
    {children} {required && <span className="text-red-500">*</span>}
  </label>
);

export const Input = ({ className, error, success, isLoading, ...props }) => (
  <div className="relative">
    <input
      disabled={isLoading}
      className={cn(
        "w-full bg-white border-0 rounded-xl px-4 py-2 text-stone-900 placeholder:text-stone-400 transition-all duration-200 outline-none shadow-sm ring-1 ring-inset h-[42px]",
        "hover:ring-stone-300",
        "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-academic-blue focus-visible:shadow-md",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-stone-50",
        props.type === 'number' && "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
        error   ? "ring-red-300 focus-visible:ring-red-500" :
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

export const Select = ({ className, error, success, isLoading, children, ...props }) => (
  <UISelect
    disabled={isLoading}
    error={error}
    className={className}
    {...props}
  >
    {children}
  </UISelect>
);

export const SegmentedToggle = ({ options, value, onChange }) => {
  return (
    <div className="p-1 bg-stone-100 rounded-xl ring-1 ring-slate-200 flex">
      {options.map((opt, index) => {
        const isActive = value === opt.value;
        return (
          <Button
            variant="ghost"
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "w-auto h-auto border-none rounded-lg font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-academic-blue active:scale-[0.98] whitespace-nowrap",
              isActive
                ? "bg-[#7A404D]/10 text-[#7A404D] shadow-sm ring-1 ring-[#7A404D]/20"
                : "text-stone-500 hover:text-stone-700 hover:bg-stone-50",
              "flex-1 px-3 py-2 text-[13px] md:text-sm flex items-center justify-center gap-1.5"
            )}
          >
            {opt.label}
          </Button>
        );
      })}
    </div>
  );
};

export function SectionHeading({ number, children }) {
  return (
    <h2 className="text-lg font-bold text-stone-900 tracking-tight mb-6 flex items-center gap-2">
      <span className="w-6 h-6 rounded-full bg-academic-blue/10 text-academic-blue flex items-center justify-center text-xs">
        {number}
      </span>
      {children}
    </h2>
  );
}

export function ParentCard({ idx, parent, formData, handleContactChange }) {
  const updateParent = (field, value) => {
    const newParents = [...formData.contacts.parents];
    newParents[idx] = { ...newParents[idx], [field]: value };
    handleContactChange('parents', newParents);
  };

  const updateChannel = (field, value) => {
    const newParents = [...formData.contacts.parents];
    if (!newParents[idx].channel) newParents[idx] = { ...newParents[idx], channel: { type: 'telegram', value: '' } };
    newParents[idx] = { ...newParents[idx], channel: { ...newParents[idx].channel, [field]: value } };
    handleContactChange('parents', newParents);
  };

  return (
    <div className="p-5 bg-stone-50 rounded-2xl ring-1 ring-slate-200 relative group">
      <Tooltip text="Удалить контакт" position="top" wrapperClassName="absolute top-3 right-3 opacity-0 group-hover:opacity-100 z-10">
        <Button
          variant="ghost"
          size="icon"
          type="button"
          onClick={() => {
            const newParents = [...formData.contacts.parents];
            newParents.splice(idx, 1);
            handleContactChange('parents', newParents);
          }}
          className="w-auto h-auto p-1.5 border-none text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 size={16} />
        </Button>
      </Tooltip>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        <div>
          <Label>Роль (кем приходится)</Label>
          <Input
            placeholder="Например, Мама"
            value={parent.role || ''}
            onChange={e => updateParent('role', e.target.value)}
          />
        </div>
        <div>
          <Label>Пол</Label>
          <Select value={parent.gender} onChange={e => updateParent('gender', e.target.value)}>
            <option value="unknown">Не выбрано</option>
            <option value="male">Мужской</option>
            <option value="female">Женский</option>
          </Select>
        </div>
        
        <div className="md:col-span-2">
          <Label>Имя</Label>
          <Input
            placeholder="Например, Анна Николаевна"
            value={parent.name}
            onChange={e => updateParent('name', e.target.value)}
          />
        </div>

        <div>
          <Label>Канал связи</Label>
          <Select value={parent.channel?.type || 'telegram'} onChange={e => updateChannel('type', e.target.value)}>
            <option value="telegram">Telegram</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="max">MAX</option>
            <option value="vk">ВКонтакте</option>
            <option value="email">Email</option>
            <option value="phone">Телефон</option>
          </Select>
        </div>
        <div>
          <Label>Куда писать</Label>
          <Input
            placeholder={getChannelPlaceholder(parent.channel?.type || 'telegram')}
            value={parent.channel?.value || ''}
            onChange={e => updateChannel('value', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
