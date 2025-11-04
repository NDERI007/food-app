import { useQuery } from '@tanstack/react-query';
import { api } from './apiUtils';
import type { OrderDetails } from '@utils/schemas/order';

export function useOrderDetails(orderID: string | null) {
  return useQuery<OrderDetails | null, Error>({
    queryKey: ['order-details', orderID],
    queryFn: async () => {
      if (!orderID) {
        console.debug('[useOrderDetails] no orderID, skipping fetch');
        return null;
      }

      console.debug('[useOrderDetails] fetching orderID', orderID);

      try {
        const response = await api.get(`/api/orders/${orderID}/details`);
        console.debug('[useOrderDetails] axios response:', response);

        const payload = (response as any).data;
        console.debug('[useOrderDetails] payload:', payload);

        // Support either { order: OrderDetails } or the raw OrderDetails
        const order = payload?.order ?? payload ?? null;
        console.debug('[useOrderDetails] normalized order:', order);

        return order as OrderDetails | null;
      } catch (err) {
        console.error('[useOrderDetails] query error:', err);
        throw err; // Re-throw so React Query can handle it
      }
    },
    enabled: !!orderID,
    staleTime: 1000 * 60, // 1 minute
    retry: 2, // Retry failed requests twice
  });
}
