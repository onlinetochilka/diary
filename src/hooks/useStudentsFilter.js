import { useState, useMemo, useEffect } from 'react';

export function getStudentType(student, groupStudentIds) {
  const hasIndividual = student.subjects && student.subjects.length > 0;
  const isInGroup = groupStudentIds.has(student.id);

  if (hasIndividual && isInGroup) return 'both';
  if (!hasIndividual && isInGroup) return 'group_only';
  return 'individual';
}

export function useStudentsFilter(initialStudents = [], initialGroups = [], lessons = []) {
  const [activeStatus, setActiveStatus] = useState('active'); // 'active' | 'archive'
  const [activeFormat, setActiveFormat] = useState('all'); // 'all' | 'individuals' | 'groups'
  const [showDebtorsOnly, setShowDebtorsOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('createdAt'); // 'alphabetical', 'balance', 'createdAt', 'nextLesson', 'kpi', 'price'
  const [sortOrder, setSortOrder] = useState('desc');

  // Counts per format segment (ignores activeFormat, respects status/debtors/search)
  const formatCounts = useMemo(() => {
    const groupStudentIds = new Set();
    initialGroups.forEach(g => {
      (g.studentIds || []).forEach(id => groupStudentIds.add(id));
    });

    let individualsCount = 0;
    let groupsCount = 0;

    initialStudents.forEach(student => {
      if (activeStatus === 'archive' && !student.isArchived) return;
      if (activeStatus === 'active' && student.isArchived) return;
      if (showDebtorsOnly && !student._isDebtor) return;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        if (!student.name.toLowerCase().includes(query)) return;
      }
      const studentType = getStudentType(student, groupStudentIds);
      if (studentType !== 'group_only') individualsCount++;
    });

    if (activeStatus !== 'archive' && !showDebtorsOnly) {
      initialGroups.forEach(group => {
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          if (
            !group.name.toLowerCase().includes(query) &&
            !(group.subjectName || '').toLowerCase().includes(query)
          ) return;
        }
        groupsCount++;
      });
    }

    return {
      all: individualsCount + groupsCount,
      individuals: individualsCount,
      groups: groupsCount,
    };
  }, [initialStudents, initialGroups, activeStatus, showDebtorsOnly, searchQuery]);

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

    // 3. Sorting
    items.sort((a, b) => {
      let valA, valB;
      const getNextLessonTime = (id, type) => {
        const entityLessons = lessons.filter(l => 
          type === 'student' ? l.studentId === id : l.groupId === id
        );
        const futureLessons = entityLessons
          .map(l => new Date(`${l.date}T${l.startTime}`).getTime())
          .filter(time => time > Date.now());
        return futureLessons.length > 0 ? Math.min(...futureLessons) : Infinity;
      };

      if (sortBy === 'alphabetical') {
        valA = a.data.name.toLowerCase();
        valB = b.data.name.toLowerCase();
      } else if (sortBy === 'balance') {
        valA = a.type === 'student' ? (a.data.balance || 0) : 0;
        valB = b.type === 'student' ? (b.data.balance || 0) : 0;
      } else if (sortBy === 'createdAt') {
        valA = new Date(a.data.createdAt || 0).getTime();
        valB = new Date(b.data.createdAt || 0).getTime();
      } else if (sortBy === 'nextLesson') {
        valA = getNextLessonTime(a.data.id, a.type);
        valB = getNextLessonTime(b.data.id, b.type);
      } else if (sortBy === 'kpi') {
        valA = a.data.stats?.homeworkRate ?? 0;
        valB = b.data.stats?.homeworkRate ?? 0;
      } else if (sortBy === 'price') {
        valA = a.type === 'student' 
          ? (a.data.subjects?.[0]?.price || 0) 
          : (a.data.paymentType === 'subscription' ? (a.data.price / (a.data.subscriptionLessons || 1)) : (a.data.price || 0));
        valB = b.type === 'student' 
          ? (b.data.subjects?.[0]?.price || 0) 
          : (b.data.paymentType === 'subscription' ? (b.data.price / (b.data.subscriptionLessons || 1)) : (b.data.price || 0));
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return items;
  }, [initialStudents, initialGroups, activeStatus, activeFormat, showDebtorsOnly, searchQuery, sortBy, sortOrder, lessons]);

  useEffect(() => {
    if (formatCounts.individuals === 0 || formatCounts.groups === 0) {
      if (activeFormat !== 'all') {
        setActiveFormat('all');
      }
    }
  }, [formatCounts.individuals, formatCounts.groups, activeFormat]);

  return {
    filteredItems,
    formatCounts,
    activeStatus,
    setActiveStatus,
    activeFormat,
    setActiveFormat,
    showDebtorsOnly,
    setShowDebtorsOnly,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    hasDebtors: initialStudents.some(s => s._isDebtor)
  };
}
