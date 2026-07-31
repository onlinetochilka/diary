import React from 'react';
import { Search, ArrowUpDown } from 'lucide-react';
import { cn } from '../../utils/cn.js';

export default function ProgramsFilterBar({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
}) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
      {/* Поиск */}
      <div className="relative w-full sm:w-80">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={16} className="text-stone-400" strokeWidth={2} />
        </div>
        <input
          type="text"
          placeholder="Поиск по названию или предмету..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-white border-none rounded-lg shadow-sm ring-1 ring-slate-200 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-600 transition-all"
        />
      </div>

      {/* Сортировка */}
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <span className="text-sm font-medium text-stone-500 hidden sm:inline whitespace-nowrap">
          Сортировка:
        </span>
        <div className="relative w-full sm:w-48">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <ArrowUpDown size={14} className="text-stone-400" strokeWidth={2} />
          </div>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-white border-none rounded-lg shadow-sm ring-1 ring-slate-200 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-fuchsia-600 transition-all appearance-none cursor-pointer"
          >
            <option value="name_asc">По алфавиту (А-Я)</option>
            <option value="name_desc">По алфавиту (Я-А)</option>
            <option value="topics_desc">Больше тем</option>
            <option value="topics_asc">Меньше тем</option>
          </select>
        </div>
      </div>
    </div>
  );
}
