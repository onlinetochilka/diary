import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLessonsPaginated } from '../api/databaseApi.js';
import { 
  getLessons as apiGetLessons, 
  getLesson as apiGetLesson, 
  addLesson as apiAddLesson, 
  updateLesson as apiUpdateLesson, 
  patchLesson as apiPatchLesson, 
  deleteLesson as apiDeleteLesson 
} from '../services/database.js';

export function useLessons(filters = {}) {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: ['lessons', filters],
    queryFn: ({ pageParam = 1 }) => getLessonsPaginated({ ...filters, page: pageParam, limit: 50 }),
    getNextPageParam: (lastPage) => (lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined),
    initialPageParam: 1,
  });

  const addMut = useMutation({
    mutationFn: apiAddLesson,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
    }
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => apiUpdateLesson(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
    }
  });

  const patchMut = useMutation({
    mutationFn: ({ id, partial }) => apiPatchLesson(id, partial),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
    }
  });

  const deleteMut = useMutation({
    mutationFn: apiDeleteLesson,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
    }
  });

  return {
    ...query,
    lessons: query.data?.pages.flatMap(page => page.items) || [],
    addLesson: addMut.mutateAsync,
    updateLesson: async (id, data) => updateMut.mutateAsync({ id, data }),
    patchLesson: async (id, partial) => patchMut.mutateAsync({ id, partial }),
    deleteLesson: deleteMut.mutateAsync,
    // Preserve old methods for aggregates
    getLessons: apiGetLessons,
    getLesson: apiGetLesson,
  };
}
