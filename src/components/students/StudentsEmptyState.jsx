import React from 'react';
import { UserPlus, SearchX, CheckCheck, Archive, Layers } from 'lucide-react';
import { EmptyState, Button } from '../ui/index.js';

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
  let description = "Добавьте первого ученика, чтобы начать вести расписание и учёт финансов.";
  let action = null;
  let Icon = UserPlus;
  let iconTheme = "bg-[#7A404D]/10 text-[#7A404D]";
  let onIconClick = onCreate;

  if (searchQuery.trim()) {
    title = "Мы не нашли такого ученика";
    description = "Проверьте опечатку в имени или измените запрос.";
    Icon = SearchX;
    iconTheme = "bg-amber-100 text-amber-600";
    onIconClick = null;
    action = (
      <Button
        variant="ghost"
        onClick={onClearSearch}
        className="text-amber-700 bg-amber-50 hover:bg-amber-100 ring-1 ring-amber-200/50"
      >
        Очистить поиск
      </Button>
    );
  } else if (showDebtorsOnly) {
    title = "Должников нет";
    description = "Все занятия оплачены вовремя. Отличная работа!";
    Icon = CheckCheck;
    iconTheme = "bg-emerald-100 text-emerald-600";
    onIconClick = null;
    action = (
      <Button
        variant="ghost"
        onClick={onResetDebtors}
        className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 ring-1 ring-emerald-200/50"
      >
        Показать всех
      </Button>
    );
  } else if (activeStatus === 'archive') {
    title = "Архив пуст";
    description = "Здесь будут отображаться ученики, с которыми вы завершили занятия.";
    Icon = Archive;
    iconTheme = "bg-stone-100 text-stone-500";
    onIconClick = null;
  } else if (activeFormat === 'groups') {
    title = "Нет активных групп";
    description = "Вы пока не создали ни одной группы.";
    Icon = Layers;
    iconTheme = "bg-violet-100 text-violet-600";
    onIconClick = null;
  }

  return (
    <EmptyState 
      icon={Icon}
      title={title}
      description={description}
      iconTheme={iconTheme}
      onIconClick={onIconClick}
      action={action}
      size="lg"
    />
  );
}
