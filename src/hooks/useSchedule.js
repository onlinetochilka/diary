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
    
    if (data._markTopicCompleted && data.type === "individual" && data.studentId && data.programId && data.topicId) {
      // Logic for marking topic as completed
    }

    await fetchData();
  };

  const handleDeleteLesson = async (id) => {
    await deleteLesson(id);
    await fetchData();
  };

  const handleQuickStatus = async (lesson, status) => {
    await updateLesson(lesson.id, { status });
    await fetchData();
  };

  const handleQuickHomework = async (lesson, studentId, isDone) => {
    const currentHwDoneBy = lesson.hwDoneBy || [];
    const newHwDoneBy = isDone 
      ? [...currentHwDoneBy, studentId]
      : currentHwDoneBy.filter(id => id !== studentId);
      
    // Optimistic update locally
    setLessons(prev => prev.map(l => l.id === lesson.id ? { ...l, hwDoneBy: newHwDoneBy } : l));
    
    await updateLesson(lesson.id, { hwDoneBy: newHwDoneBy });
    return newHwDoneBy; // Returns new value so UI can update local state (e.g. popovers)
  };

  return {
    lessons,
    students,
    groups,
    isLoading,
    fetchData,
    handleSaveLesson,
    handleDeleteLesson,
    handleQuickStatus,
    handleQuickHomework
  };
}
