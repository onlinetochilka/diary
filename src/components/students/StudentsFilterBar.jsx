import React from 'react';
import { Search, User, Users, Archive, LayoutGrid, ArrowDown, ArrowUp, ArrowUpDown, ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn.js';
import Button from '../ui/Button.jsx';
import Select from '../ui/Select.jsx';

export default function StudentsFilterBar({
  activeStatus,
  onStatusChange,
  activeFormat,
  onFormatChange,
  formatCounts = { all: 0, individuals: 0, groups: 0 },
  showDebtorsOnly,
  onToggleDebtors,
  hasDebtors,
  searchQuery,
  onSearchChange,
  sortBy = 'createdAt',
  onSortByChange,
  sortOrder = 'desc',
  onSortOrderChange,
}) {
  const statusTabs = [
    { id: 'active', label: 'Активные' },
    { id: 'archive', label: 'Архив', icon: Archive },
  ];

  const formatSegments = [
    { id: 'all', label: 'Все', icon: LayoutGrid },
    { id: 'individuals', label: 'Индивидуальные', icon: User },
    { id: 'groups', label: 'Группы', icon: Users },
  ];

  return (
    <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 w-full">
      
      {/* Левая часть: Статус и Формат */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full xl:w-auto">
        {/* Status Tabs (Активные / Архив) */}
        <div className="flex p-1 bg-stone-100 rounded-lg shadow-sm ring-1 ring-slate-200 overflow-x-auto scrollbar-hide shrink-0">
          {statusTabs.map((tab) => {
            const isActive = activeStatus === tab.id;
            const Icon = tab.icon;
            return (
              <Button
                variant="ghost"
                key={tab.id}
                onClick={() => onStatusChange(tab.id)}
                data-action={`status_${tab.id}`}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 h-auto border-none rounded-md text-sm font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-academic-blue",
                  isActive 
                    ? "bg-white text-stone-900 shadow-sm" 
                    : "text-stone-500 hover:text-stone-700 hover:bg-stone-50"
                )}
              >
                {Icon && <Icon size={16} strokeWidth={2} />}
                <span>{tab.label}</span>
              </Button>
            );
          })}
        </div>

        {/* Format Segments (Все / Индивидуальные / Группы) */}
        {(formatCounts.individuals > 0 && formatCounts.groups > 0) && (
          <div className="flex items-center gap-2 w-full overflow-x-auto scrollbar-hide pb-1 md:pb-0">
          {formatSegments.map((segment) => {
            const isActive = activeFormat === segment.id;
            const Icon = segment.icon;
            return (
              <Button
                variant="ghost"
                key={segment.id}
                onClick={() => onFormatChange(segment.id)}
                data-action={`format_${segment.id}`}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 h-auto border-none rounded-md text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-academic-blue",
                  isActive
                    ? "bg-academic-blue/10 text-academic-blue"
                    : "text-stone-500 hover:bg-stone-100 hover:text-stone-700"
                )}
              >
                <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                <span className="hidden sm:inline">{segment.label}</span>
                <span className={cn(
                  "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold leading-none tabular-nums transition-colors",
                  isActive
                    ? "bg-academic-blue/20 text-academic-blue"
                    : "bg-stone-200 text-stone-500"
                )}>
                  {formatCounts[segment.id] ?? 0}
                </span>
              </Button>
            );
          })}
        </div>
        )}
      </div>

      {/* Правая часть: Поиск и Должники */}
      <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto shrink-0">
        {/* Debtors Toggle */}
        {hasDebtors && (
          <Button
            variant="ghost"
            onClick={() => onToggleDebtors(!showDebtorsOnly)}
            data-action="toggle_debtors"
            className={cn(
              "flex items-center justify-center sm:justify-start gap-2 px-4 py-2 h-auto border-none rounded-lg text-sm font-medium transition-all duration-200 shadow-sm ring-1 outline-none focus-visible:ring-2 focus-visible:ring-academic-blue whitespace-nowrap w-full sm:w-auto",
              showDebtorsOnly
                ? "bg-red-50 text-red-700 ring-red-200"
                : "bg-white text-stone-600 ring-slate-200 hover:bg-stone-50"
            )}
          >
            <span className={cn(
              "w-2 h-2 rounded-full transition-colors",
              showDebtorsOnly ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" : "bg-stone-300"
            )} />
            Неоплаченные занятия
          </Button>
        )}

        {/* Sort */}
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto shrink-0">
          <Select 
            value={sortBy} 
            onChange={e => onSortByChange?.(e.target.value)}
            className="w-full sm:w-56 [&>div>div]:!min-h-[38px] [&>div>div]:!rounded-lg [&>div>div]:!bg-white [&>div>div]:!text-[13px] [&>div>div]:!font-medium [&>div>div]:!text-stone-600 [&>div>div]:!border-none [&>div>div]:!ring-1 [&>div>div]:!ring-slate-200 [&>div>div]:!shadow-sm"
            leftIcon={<ArrowUpDown size={14} className="text-stone-400" />}
          >
            <option value="createdAt">Сначала новые</option>
            <option value="alphabetical">По алфавиту</option>
            <option value="balance">По балансу</option>
            <option value="nextLesson">По ближайшему занятию</option>
            <option value="kpi">По успеваемости</option>
            <option value="price">По стоимости за урок</option>
          </Select>
          
          <Button
            variant="ghost"
            onClick={() => onSortOrderChange?.(sortOrder === 'asc' ? 'desc' : 'asc')}
            title={sortOrder === 'asc' ? "По возрастанию" : "По убыванию"}
            className="w-full sm:w-auto p-0 h-[38px] px-3 rounded-lg bg-white shadow-sm ring-1 ring-slate-200 text-stone-500 hover:text-stone-700 hover:bg-stone-50 border-none shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-academic-blue"
          >
            {sortOrder === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
          </Button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-stone-400" strokeWidth={2} />
          </div>
          <input
            type="text"
            placeholder="Поиск учеников..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 h-[38px] py-2 bg-white border-none rounded-lg shadow-sm ring-1 ring-slate-200 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-academic-blue transition-all"
          />
        </div>
      </div>
    </div>
  );
}
