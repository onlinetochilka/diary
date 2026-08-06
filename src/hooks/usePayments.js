import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPaymentsPaginated, getPayments, addPayment, updatePayment, deletePayment } from '../api/databaseApi.js';

export function usePayments(filters = {}) {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: ['payments', filters],
    queryFn: ({ pageParam = 1 }) => getPaymentsPaginated({ ...filters, page: pageParam, limit: 50 }),
    getNextPageParam: (lastPage) => (lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined),
    initialPageParam: 1,
  });

  const addMut = useMutation({
    mutationFn: addPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      // We also might want to invalidate students if balances changed, but let's stick to payments for now
    }
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updatePayment(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payments'] })
  });

  const deleteMut = useMutation({
    mutationFn: deletePayment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payments'] })
  });

  return {
    ...query,
    payments: query.data?.pages.flatMap(page => page.items) || [],
    addPayment: addMut.mutateAsync,
    updatePayment: async (id, data) => updateMut.mutateAsync({ id, data }),
    deletePayment: deleteMut.mutateAsync,
    getPayments: getPayments, // keeping for backward compatibility where manual fetch is used (e.g. useFinanceData)
  };
}
