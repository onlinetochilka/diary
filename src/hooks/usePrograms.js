import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getPrograms as apiGetPrograms, 
  getProgram as apiGetProgram, 
  addProgram as apiAddProgram, 
  updateProgram as apiUpdateProgram, 
  deleteProgram as apiDeleteProgram 
} from '../services/database.js';

export function usePrograms(tutorId = null) {
  const queryClient = useQueryClient();

  // Query for all programs
  const programsQuery = useQuery({
    queryKey: ['programs', tutorId],
    queryFn: () => apiGetPrograms(tutorId),
  });

  // Mutations
  const addProgramMutation = useMutation({
    mutationFn: apiAddProgram,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
    },
  });

  const updateProgramMutation = useMutation({
    mutationFn: ({ id, data }) => apiUpdateProgram(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
    },
  });

  const deleteProgramMutation = useMutation({
    mutationFn: apiDeleteProgram,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
    },
  });

  // Helper for backward compatibility or direct fetch
  const getProgram = async (id) => {
    return await apiGetProgram(id);
  };
  
  // Helper for backward compatibility
  const getPrograms = async (tid) => {
    return await apiGetPrograms(tid);
  };

  return {
    programs: programsQuery.data || [],
    isLoading: programsQuery.isLoading,
    isError: programsQuery.isError,
    
    // Legacy mapping (loading and error were used collectively for all operations)
    loading: programsQuery.isLoading || addProgramMutation.isPending || updateProgramMutation.isPending || deleteProgramMutation.isPending,
    error: programsQuery.error || addProgramMutation.error || updateProgramMutation.error || deleteProgramMutation.error,
    
    getPrograms,
    getProgram,
    addProgram: addProgramMutation.mutateAsync,
    updateProgram: (id, data) => updateProgramMutation.mutateAsync({ id, data }),
    deleteProgram: deleteProgramMutation.mutateAsync,
    
    refetchPrograms: programsQuery.refetch,
  };
}
