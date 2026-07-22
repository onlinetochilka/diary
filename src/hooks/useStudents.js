import { useState, useCallback, useEffect } from 'react';
import { 
  getStudents, getGroups, getPrograms, 
  addStudent, updateStudent, deleteStudent, 
  addGroup, updateGroup, deleteGroup, 
  getLessons, updateLesson 
} from "../services/database.js";

export function useStudents() {
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [studentsData, groupsData, programsData] = await Promise.all([
        getStudents(),
        getGroups(),
        getPrograms(),
      ]);
      setStudents(studentsData);
      setGroups(groupsData);
      setPrograms(programsData);
    } catch (err) {
      console.error("Error fetching students data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveStudent = async (studentData, id, options = {}) => {
    const { skipPriceCheck = false } = options;
    
    if (id && !skipPriceCheck) {
      // Check for price changes
      const oldStudent = students.find(s => s.id === id);
      if (oldStudent && oldStudent.subjects) {
        let changedSubject = null;
        let oldPrice = 0;
        let newPrice = 0;
        
        for (const newSubj of studentData.subjects) {
          const oldSubj = oldStudent.subjects.find(s => s.name === newSubj.name);
          if (oldSubj && Number(newSubj.price) !== Number(oldSubj.price)) {
            changedSubject = newSubj.name;
            oldPrice = Number(oldSubj.price);
            newPrice = Number(newSubj.price);
            break;
          }
        }

        if (changedSubject) {
          const stLessons = await getLessons({ studentId: id });
          const scheduledLessons = stLessons.filter(l => 
            l.status === 'scheduled' && l.subjectName === changedSubject
          );

          if (scheduledLessons.length > 0) {
            // Signal to the UI that a price change confirmation is needed
            return {
              needsPriceConfirmation: true,
              priceChangeDetails: {
                subjectName: changedSubject,
                oldPrice,
                newPrice,
                lessonsCount: scheduledLessons.length,
                lessonsToUpdate: scheduledLessons,
                studentData,
                studentId: id
              }
            };
          }
        }
      }
    }

    if (id) {
      await updateStudent(id, studentData);
    } else {
      await addStudent(studentData);
    }
    await fetchData();
    return { success: true };
  };

  const confirmPriceChange = async (details, updateOldLessons) => {
    const { studentData, studentId, newPrice, lessonsToUpdate } = details;
    
    await updateStudent(studentId, studentData);
    
    if (updateOldLessons && lessonsToUpdate.length > 0) {
      for (const lesson of lessonsToUpdate) {
        await updateLesson(lesson.id, { price: newPrice });
      }
    }
    await fetchData();
  };

  const handleDeleteStudent = async (id) => {
    await deleteStudent(id);
    await fetchData();
  };

  const handleSaveGroup = async (groupData, id) => {
    if (id) {
      await updateGroup(id, groupData);
    } else {
      await addGroup(groupData);
    }
    await fetchData();
  };

  const handleDeleteGroup = async (id) => {
    await deleteGroup(id);
    await fetchData();
  };

  return {
    students,
    groups,
    programs,
    isLoading,
    fetchData,
    handleSaveStudent,
    confirmPriceChange,
    handleDeleteStudent,
    handleSaveGroup,
    handleDeleteGroup
  };
}
