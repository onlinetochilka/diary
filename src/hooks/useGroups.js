import { useState, useCallback } from 'react';
import { getGroups as apiGetGroups, getGroup as apiGetGroup, addGroup as apiAddGroup, updateGroup as apiUpdateGroup, deleteGroup as apiDeleteGroup } from '../services/database.js';

export function useGroups() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getGroups = useCallback(async (tutorId) => {
    setLoading(true);
    try {
      return await apiGetGroups(tutorId);
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getGroup = useCallback(async (id) => {
    setLoading(true);
    try {
      return await apiGetGroup(id);
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const addGroup = useCallback(async (data) => {
    setLoading(true);
    try {
      return await apiAddGroup(data);
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateGroup = useCallback(async (id, data) => {
    setLoading(true);
    try {
      return await apiUpdateGroup(id, data);
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteGroup = useCallback(async (id) => {
    setLoading(true);
    try {
      return await apiDeleteGroup(id);
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
    getGroups,
    getGroup,
    addGroup,
    updateGroup,
    deleteGroup,
  };
}
