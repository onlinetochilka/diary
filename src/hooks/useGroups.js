import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getGroups as apiGetGroups, getGroup as apiGetGroup, addGroup as apiAddGroup, updateGroup as apiUpdateGroup, deleteGroup as apiDeleteGroup } from '../services/database.js';

export function useGroups() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['groups'],
    queryFn: () => apiGetGroups(),
  });

  const addMut = useMutation({
    mutationFn: apiAddGroup,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => apiUpdateGroup(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] }),
  });

  const deleteMut = useMutation({
    mutationFn: apiDeleteGroup,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] }),
  });

  return {
    // React Query state
    groups: query.data || [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,

    // Backward compatibility methods
    getGroups: apiGetGroups,
    getGroup: apiGetGroup,
    addGroup: addMut.mutateAsync,
    updateGroup: async (id, data) => updateMut.mutateAsync({ id, data }),
    deleteGroup: deleteMut.mutateAsync,
  };
}
