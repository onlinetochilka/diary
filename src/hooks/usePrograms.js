import { useState, useCallback } from 'react';
import { getPrograms as apiGetPrograms, getProgram as apiGetProgram, addProgram as apiAddProgram, updateProgram as apiUpdateProgram, deleteProgram as apiDeleteProgram } from '../services/database.js';

export function usePrograms() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getPrograms = useCallback(async (tutorId) => {
    setLoading(true);
    try {
      return await apiGetPrograms(tutorId);
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getProgram = useCallback(async (id) => {
    setLoading(true);
    try {
      return await apiGetProgram(id);
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const addProgram = useCallback(async (data) => {
    setLoading(true);
    try {
      return await apiAddProgram(data);
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProgram = useCallback(async (id, data) => {
    setLoading(true);
    try {
      return await apiUpdateProgram(id, data);
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteProgram = useCallback(async (id) => {
    setLoading(true);
    try {
      return await apiDeleteProgram(id);
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    getPrograms,
    getProgram,
    addProgram,
    updateProgram,
    deleteProgram,
  };
}
