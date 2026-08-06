import React from 'react';
import { Search, ArrowUpDown } from 'lucide-react';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';

export default function ProgramsFilterBar({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
}) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
      {/* Поиск */}
      <div className="w-full sm:w-80">
        <Input
          leftIcon={<Search size={16} />}
          placeholder="Поиск по названию или предмету..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* Сортировка */}
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <span className="text-sm font-medium text-stone-500 hidden sm:inline whitespace-nowrap">
          Сортировка:
        </span>
        <div className="w-full sm:w-56">
          <Select
            leftIcon={<ArrowUpDown size={14} />}
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
          >
            <option value="name_asc">По алфавиту (А-Я)</option>
            <option value="name_desc">По алфавиту (Я-А)</option>
            <option value="topics_desc">Больше тем</option>
            <option value="topics_asc">Меньше тем</option>
          </Select>
        </div>
      </div>
    </div>
  );
}
