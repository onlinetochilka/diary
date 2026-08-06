import { useState, useCallback } from 'react';
import { fetchStudents, fetchStudent, createStudent as adapterCreate, patchStudent as adapterPatch, removeStudent as adapterRemove } from '../services/studentsAdapter.js';
import { deleteStudent as apiDeleteStudent, getStudents as apiGetStudents, getStudent as apiGetStudent, addStudent as apiAddStudent, updateStudent as apiUpdateStudent } from '../services/database.js';

export function useStudents() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Wrapped adapter methods (for UI that expects normalized data)
  const getStudents = useCallback(async (tutorId) => {
    setLoading(true);
    try {
      return await fetchStudents(tutorId);
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getStudent = useCallback(async (id) => {
    setLoading(true);
    try {
      return await fetchStudent(id);
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const addStudent = useCallback(async (data) => {
    setLoading(true);
    try {
      // Some components might pass normalized data directly to addStudent.
      // Usually UI uses createStudent from adapter.
      return await adapterCreate(data);
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStudent = useCallback(async (id, data) => {
    setLoading(true);
    try {
      return await adapterPatch(id, data);
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteStudent = useCallback(async (id) => {
    setLoading(true);
    try {
      // adapter uses removeStudent, but some UI uses deleteStudent
      return await adapterRemove(id);
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Expose both naming conventions to make migration seamless
  return {
    loading,
    error,
    getStudents,
    fetchStudents: getStudents,
    getStudent,
    fetchStudent: getStudent,
    addStudent,
    createStudent: addStudent,
    updateStudent,
    patchStudent: updateStudent,
    deleteStudent,
    removeStudent: deleteStudent,
  };
}
