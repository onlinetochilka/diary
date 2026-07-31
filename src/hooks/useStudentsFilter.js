import { useState, useMemo } from 'react';

export function getStudentType(student, groupStudentIds) {
  const hasIndividual = student.subjects && student.subjects.length > 0;
  const isInGroup = groupStudentIds.has(student.id);

  if (hasIndividual && isInGroup) return 'both';
  if (!hasIndividual && isInGroup) return 'group_only';
  return 'individual';
}

export function useStudentsFilter(initialStudents = [], initialGroups = []) {
  const [activeStatus, setActiveStatus] = useState('active'); // 'active' | 'archive'
  const [activeFormat, setActiveFormat] = useState('all'); // 'all' | 'individuals' | 'groups'
  const [showDebtorsOnly, setShowDebtorsOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    const groupStudentIds = new Set();
    initialGroups.forEach(g => {
      (g.studentIds || []).forEach(id => groupStudentIds.add(id));
    });

    const items = [];

    // 1. Process students
    if (activeFormat === 'all' || activeFormat === 'individuals') {
      initialStudents.forEach(student => {
        // Status filter
        if (activeStatus === 'archive' && !student.isArchived) return;
        if (activeStatus === 'active' && student.isArchived) return;

        const studentType = getStudentType(student, groupStudentIds);

        // Format filter
        if (activeFormat === 'individuals') {
          if (studentType === 'group_only') return;
        }

        // Debtors filter
        if (showDebtorsOnly && !student._isDebtor) return;

        // Search filter
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          if (!student.name.toLowerCase().includes(query)) return;
        }

        items.push({ type: 'student', data: student, studentType });
      });
    }

    // 2. Process groups
    if (activeFormat === 'all' || activeFormat === 'groups') {
      initialGroups.forEach(group => {
        // Status filter: Groups are considered active for now. We skip them in 'archive' view.
        if (activeStatus === 'archive') return;

        // Debtors filter: currently not applied to groups themselves
        if (showDebtorsOnly) return;

        // Search filter
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          if (
            !group.name.toLowerCase().includes(query) &&
            !(group.subjectName || '').toLowerCase().includes(query)
          ) {
            return;
          }
        }

        items.push({ type: 'group', data: group });
      });
    }

    return items;
  }, [initialStudents, initialGroups, activeStatus, activeFormat, showDebtorsOnly, searchQuery]);

  return {
    filteredItems,
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
