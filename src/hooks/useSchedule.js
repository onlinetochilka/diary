import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getStudents } from "../services/database.js";
import { useLessons } from "./useLessons.js";
import { useGroups } from "./useGroups.js";
import { useConfirm } from '../contexts/ConfirmContext.jsx';

const EMPTY_ARRAY = [];

export function useSchedule({ currentDate, view } = {}) {
  const queryClient = useQueryClient();
  const { getLessons, updateLesson, addLesson, patchLesson, deleteLesson } = useLessons();
  const { getGroups } = useGroups();
  const updatingStatusRef = useRef(new Set());
  const [lessons, setLessons] = useState([]);
  const confirm = useConfirm();

  const { dateFrom, dateTo } = useMemo(() => {
    const d = currentDate ? new Date(currentDate) : new Date();
    // Fetch a 3-month window for smooth calendar scrolling
    const start = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 2, 0);
    return {
      dateFrom: start.toISOString().split('T')[0],
      dateTo: end.toISOString().split('T')[0],
    };
  }, [currentDate]);

  const { data: serverLessons = EMPTY_ARRAY, isLoading: lessonsLoading, refetch: refetchLessons } = useQuery({
    queryKey: ['schedule-lessons', dateFrom, dateTo],
    queryFn: () => getLessons({ dateFrom, dateTo }),
  });

  const { data: students = EMPTY_ARRAY, isLoading: studentsLoading } = useQuery({
    queryKey: ['students'],
    queryFn: () => getStudents(),
  });

  const { data: groups = EMPTY_ARRAY, isLoading: groupsLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => getGroups(),
  });

  const isLoading = lessonsLoading || studentsLoading || groupsLoading;

  useEffect(() => {
    setLessons(serverLessons);
  }, [serverLessons]);

  const fetchData = async () => {
    await refetchLessons();
  };

  const handleSaveLesson = async (id, data) => {
    if (id) {
      setLessons(prev => prev.map(l => l.id === id ? { ...l, ...data } : l));
      await updateLesson(id, data);
    } else {
      await addLesson(data);
    }
    
    // Отметить тему программы как пройденную при проведении урока
    if (
      data._markTopicCompleted &&
      data.programId &&
      data.topicId
    ) {
      try {
        const { updateTheme } = await import('../api/databaseApi.js');
        await updateTheme(data.programId, data.topicId, { isCompleted: true });
      } catch (err) {
        console.error('Failed to mark topic as completed:', err);
      }
    }

    await fetchData();
  };

  // Optimistic copy: shows the copy immediately, then replaces temp id with real one
  const handleCopyLesson = async (lessonData) => {
    const tempId = `temp_copy_${Date.now()}`;
    
    // Clean up past specific states
    const cleanData = {
      ...lessonData,
      status: 'scheduled',
      hwDoneBy: [],
      hwStatuses: {},
      presentStudentIds: [],
      reschedules: []
    };

    const optimisticCopy = { ...cleanData, id: tempId };
    
    // Add to local state immediately — card appears without delay
    setLessons(prev => [...prev, optimisticCopy]);
    try {
      const { id: _srcId, _tempId, ...dataToSave } = cleanData;
      const realId = await addLesson(dataToSave);
      // Replace temp entry with real id
      setLessons(prev => prev.map(l => l.id === tempId ? { ...l, id: realId } : l));
    } catch (err) {
      console.error('Copy lesson failed:', err);
      // Roll back optimistic update on error
      setLessons(prev => prev.filter(l => l.id !== tempId));
    }
  };

  const handleDeleteLesson = async (id) => {
    // Check if this lesson was conducted/paid — warn that balance will be reverted
    const lesson = lessons.find(l => l.id === id);
    if (lesson && (lesson.status === 'conducted' || lesson.status === 'skipped_paid')) {
      const confirmed = await confirm({
        title: "Удаление проведенного урока",
        message: 'Этот урок уже проведён и деньги списаны. Если вы удалите его, стоимость вернётся на баланс ученика. Продолжить?',
        confirmText: "Удалить",
        intent: "danger"
      });
      if (!confirmed) return;
    }
    await deleteLesson(id);
    await fetchData();
  };


  const handleQuickStatus = async (lesson, status) => {
    if (updatingStatusRef.current.has(lesson.id)) return;
    updatingStatusRef.current.add(lesson.id);
    try {
      // Optimistic update
      setLessons(prev => prev.map(l => l.id === lesson.id ? { ...l, status } : l));

      await patchLesson(lesson.id, { status });

      // Если урок стал «проведён» и у него есть тема — отмечаем тему пройденной
      if (status === 'conducted' && lesson.programId && lesson.topicId) {
        try {
          const { updateTheme } = await import('../api/databaseApi.js');
          await updateTheme(lesson.programId, lesson.topicId, { isCompleted: true });
        } catch (err) {
          console.error('Failed to mark topic as completed on status change:', err);
        }
      }

      await fetchData();
      queryClient.invalidateQueries();
    } finally {
      updatingStatusRef.current.delete(lesson.id);
    }
  };

  /**
   * Атомарный патч урока из инспектора (статус, ДЗ, заметки, тема).
   * Оптимистично обновляет локальное состояние до ответа PocketBase.
   *
   * @param {string} lessonId
   * @param {object} partial — только изменившиеся поля
   */
  const handlePatchLesson = async (lessonId, partial) => {
    // Оптимистичное обновление
    setLessons(prev => prev.map(l => l.id === lessonId ? { ...l, ...partial } : l));

    await patchLesson(lessonId, partial);

    // Если изменился статус на conducted и есть тема — отмечаем пройденной
    if (partial.status === 'conducted') {
      const lesson = lessons.find(l => l.id === lessonId);
      if (lesson?.programId && lesson?.topicId) {
        try {
          const { updateTheme } = await import('../api/databaseApi.js');
          await updateTheme(lesson.programId, lesson.topicId, { isCompleted: true });
        } catch (err) {
          console.error('Failed to mark topic as completed:', err);
        }
      }
    }

    // Перезагружаем данные только при изменении полей, влияющих на серверные расчёты (баланс, статус)
    const needsRefetch = ['status', 'paymentAmount', 'paymentStatus', 'studentPayments', 'attendance'].some(k => k in partial);
    if (needsRefetch) {
      await fetchData();
      queryClient.invalidateQueries();
    }
  };

  const handleQuickHomework = async (lesson, studentId, isDone, hwStatus = 'on_time') => {
    const currentHwDoneBy = lesson.hwDoneBy || [];
    const currentHwStatuses = lesson.hwStatuses || {};

    const newHwDoneBy = isDone 
      ? (currentHwDoneBy.includes(studentId) ? currentHwDoneBy : [...currentHwDoneBy, studentId])
      : currentHwDoneBy.filter(id => id !== studentId);

    const newHwStatuses = { ...currentHwStatuses };
    if (isDone) {
      newHwStatuses[studentId] = hwStatus;
    } else {
      delete newHwStatuses[studentId];
    }
      
    // Optimistic update locally
    setLessons(prev => prev.map(l => l.id === lesson.id 
      ? { ...l, hwDoneBy: newHwDoneBy, hwStatuses: newHwStatuses } 
      : l
    ));
    
    await updateLesson(lesson.id, { hwDoneBy: newHwDoneBy, hwStatuses: newHwStatuses });
    return newHwDoneBy; // Returns new value so UI can update local state (e.g. popovers)
  };

  return {
    lessons,
    students,
    groups,
    isLoading,
    fetchData,
    handleSaveLesson,
    handleCopyLesson,
    handleDeleteLesson,
    handleQuickStatus,
    handlePatchLesson,
    handleQuickHomework
  };
}
