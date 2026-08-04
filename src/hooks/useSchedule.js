import { useState, useCallback, useEffect } from 'react';
import { 
  getLessons, updateLesson, addLesson, deleteLesson,
  getStudents, getGroups 
} from "../services/database.js";

export function useSchedule() {
  const [lessons, setLessons] = useState([]);
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [lessonsData, studentsData, groupsData] = await Promise.all([
        getLessons(),
        getStudents(),
        getGroups(),
      ]);
      setLessons(lessonsData);
      setStudents(studentsData);
      setGroups(groupsData);
    } catch (err) {
      console.error("Error fetching schedule data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
        const { updateTheme } = await import('../services/database.js');
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
      status: 'planned',
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
      const confirmed = window.confirm(
        'Этот урок уже проведён и деньги списаны. Если вы удалите его, стоимость вернётся на баланс ученика. Продолжить?'
      );
      if (!confirmed) return;
    }
    await deleteLesson(id);
    await fetchData();
  };


  const handleQuickStatus = async (lesson, status) => {
    // Optimistic update
    setLessons(prev => prev.map(l => l.id === lesson.id ? { ...l, status } : l));

    const { patchLesson } = await import('../services/database.js');
    await patchLesson(lesson.id, { status });

    // Если урок стал «проведён» и у него есть тема — отмечаем тему пройденной
    if (status === 'conducted' && lesson.programId && lesson.topicId) {
      try {
        const { updateTheme } = await import('../services/database.js');
        await updateTheme(lesson.programId, lesson.topicId, { isCompleted: true });
      } catch (err) {
        console.error('Failed to mark topic as completed on status change:', err);
      }
    }

    await fetchData();
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

    const { patchLesson } = await import('../services/database.js');
    await patchLesson(lessonId, partial);

    // Если изменился статус на conducted и есть тема — отмечаем пройденной
    if (partial.status === 'conducted') {
      const lesson = lessons.find(l => l.id === lessonId);
      if (lesson?.programId && lesson?.topicId) {
        try {
          const { updateTheme } = await import('../services/database.js');
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
