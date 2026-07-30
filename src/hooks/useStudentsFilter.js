import { useState, useMemo } from 'react';

export function useStudentsFilter(initialStudents = []) {
  const [activeStatus, setActiveStatus] = useState('active'); // 'active' | 'archive'
  const [activeFormat, setActiveFormat] = useState('all'); // 'all' | 'individuals' | 'groups'
  const [showDebtorsOnly, setShowDebtorsOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStudents = useMemo(() => {
    return initialStudents.filter((student) => {
      // 1. Статус (Активные / Архив)
      if (activeStatus === 'archive' && !student.isArchived) return false;
      if (activeStatus === 'active' && student.isArchived) return false;

      // 2. Формат (Все / Индивидуальные / Группы)
      if (activeFormat === 'individuals') {
        // Упрощенная логика: считаем всех моковых индивидуальными
        // В реальности здесь была бы проверка student.type === 'individual'
      } else if (activeFormat === 'groups') {
        // Упрощенная логика: в моковых данных нет групп
        return false; 
      }

      // 3. Должники
      if (showDebtorsOnly && !student._isDebtor) {
        return false;
      }

      // 4. Поиск
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        if (!student.name.toLowerCase().includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [initialStudents, activeStatus, activeFormat, showDebtorsOnly, searchQuery]);

  return {
    filteredStudents,
    activeStatus,
    setActiveStatus,
    activeFormat,
    setActiveFormat,
    showDebtorsOnly,
    setShowDebtorsOnly,
    searchQuery,
    setSearchQuery
  };
}
