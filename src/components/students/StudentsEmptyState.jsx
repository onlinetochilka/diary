import React from 'react';
import { UserPlus, SearchX, CheckCheck, Archive, Layers } from 'lucide-react';

export default function StudentsEmptyState({
  searchQuery,
  activeFormat,
  showDebtorsOnly,
  activeStatus,
  onClearSearch,
  onResetDebtors,
  onCreate
}) {
  let title = "Учеников пока нет";
  let message = "Добавьте первого ученика, чтобы начать вести расписание и учет финансов.";
  let action = null;
  let Icon = UserPlus;
  let iconTheme = "bg-[#7A404D]/10 text-[#7A404D]";
  let isClickableIcon = true;

  if (searchQuery.trim()) {
    title = "Мы не нашли такого ученика";
    message = "Проверьте опечатку в имени или измените запрос.";
    Icon = SearchX;
    iconTheme = "bg-amber-100 text-amber-600";
    isClickableIcon = false;
    action = (
      <button
        onClick={onClearSearch}
        className="mt-6 px-6 py-2.5 text-sm font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors ring-1 ring-amber-200/50"
      >
        Очистить поиск
      </button>
    );
  } else if (showDebtorsOnly) {
    title = "Должников нет";
    message = "Все занятия оплачены вовремя. Отличная работа!";
    Icon = CheckCheck;
    iconTheme = "bg-emerald-100 text-emerald-600";
    isClickableIcon = false;
    action = (
      <button
        onClick={onResetDebtors}
        className="mt-6 px-6 py-2.5 text-sm font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors ring-1 ring-emerald-200/50"
      >
        Показать всех
      </button>
    );
  } else if (activeStatus === 'archive') {
    title = "Архив пуст";
    message = "Здесь будут отображаться ученики, с которыми вы завершили занятия.";
    Icon = Archive;
    iconTheme = "bg-stone-100 text-stone-500";
    isClickableIcon = false;
  } else if (activeFormat === 'groups') {
    title = "Нет активных групп";
    message = "Вы пока не создали ни одной группы.";
    Icon = Layers;
    iconTheme = "bg-violet-100 text-violet-600";
    isClickableIcon = false;
  }

  const iconElement = (
    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-5 transition-all ${iconTheme} ${isClickableIcon ? 'hover:scale-105 active:scale-95 shadow-sm hover:shadow-md cursor-pointer' : ''}`}>
      <Icon size={32} strokeWidth={1.5} />
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-white rounded-[28px] shadow-sm border border-stone-200 animate-fade-in w-full">
      {isClickableIcon && onCreate ? (
        <button onClick={onCreate} className="outline-none focus-visible:ring-4 focus-visible:ring-[#7A404D]/20 rounded-full">
          {iconElement}
        </button>
      ) : (
        iconElement
      )}
      <h3 className="text-xl font-bold text-stone-900 mb-2 tracking-tight">{title}</h3>
      <p className="text-stone-500 max-w-sm font-medium">{message}</p>
      {action}
    </div>
  );
}
