import React from 'react';
import { Users } from 'lucide-react';

export default function StudentsEmptyState({
  searchQuery,
  activeFormat,
  showDebtorsOnly,
  activeStatus,
  onClearSearch,
  onResetDebtors
}) {
  let title = "Ученик не найден";
  let message = "Кажется, такого ученика здесь нет. Попробуем поискать иначе?";
  let action = null;

  if (searchQuery.trim()) {
    message = `По запросу «${searchQuery}» ничего не найдено.`;
    action = (
      <button
        onClick={onClearSearch}
        className="mt-6 px-4 py-2 text-sm font-medium text-academic-blue hover:text-academic-blue-light transition-colors"
      >
        Очистить поиск
      </button>
    );
  } else if (activeFormat === 'groups') {
    title = "Нет активных групп";
    message = "В этом разделе пока нет созданных групп.";
  } else if (showDebtorsOnly) {
    message = "Все занятия оплачены.";
    action = (
      <button
        onClick={onResetDebtors}
        className="mt-6 px-4 py-2 text-sm font-medium text-academic-blue hover:text-academic-blue-light transition-colors"
      >
        Сбросить фильтр "Неоплаченные занятия"
      </button>
    );
  } else if (activeStatus === 'archive') {
    title = "Архив пуст";
    message = "Здесь будут отображаться ученики, с которыми вы завершили занятия.";
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 animate-fade-in">
      <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center text-stone-400 mb-4">
        <Users size={32} strokeWidth={1.5} />
      </div>
      <h3 className="text-lg font-medium text-stone-900 mb-1">{title}</h3>
      <p className="text-stone-500 max-w-sm">{message}</p>
      {action}
    </div>
  );
}
