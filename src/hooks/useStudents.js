import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchStudents as adapterFetchStudents, 
  fetchStudent as adapterFetchStudent, 
  createStudent as adapterCreate, 
  patchStudent as adapterPatch, 
  removeStudent as adapterRemove 
} from '../services/studentsAdapter.js';

export function useStudents() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['students'],
    queryFn: () => adapterFetchStudents(),
  });

  const addMut = useMutation({
    mutationFn: adapterCreate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['students'] }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => adapterPatch(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['students'] }),
  });

  const deleteMut = useMutation({
    mutationFn: adapterRemove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['students'] }),
  });

  return {
    // react-query state
    data: query.data || [],
    students: query.data || [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,

    // manual fetch methods (backward compatibility)
    getStudents: adapterFetchStudents,
    fetchStudents: adapterFetchStudents,
    getStudent: adapterFetchStudent,
    fetchStudent: adapterFetchStudent,

    // mutation methods (backward compatibility)
    addStudent: addMut.mutateAsync,
    createStudent: addMut.mutateAsync,
    updateStudent: async (id, data) => updateMut.mutateAsync({ id, data }),
    patchStudent: async (id, data) => updateMut.mutateAsync({ id, data }),
    deleteStudent: deleteMut.mutateAsync,
    removeStudent: deleteMut.mutateAsync,
  };
}
