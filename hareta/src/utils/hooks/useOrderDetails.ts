import { useQuery } from '@tanstack/react-query';
import { api } from './apiUtils';
import type { OrderDetails } from '@utils/schemas/order';
import type { AxiosResponse } from 'axios';

export function useOrderDetails(orderID: string | null) {
  return useQuery<OrderDetails | null, Error>({
    queryKey: ['order-details', orderID],
    queryFn: async (): Promise<OrderDetails | null> => {
      if (!orderID) {
        console.debug('[useOrderDetails] no orderID, skipping fetch');
        return null;
      }

      console.debug('[useOrderDetails] fetching orderID', orderID);

      try {
        const response: AxiosResponse<OrderDetails> = await api.get(
          `/api/orders/${orderID}/details`,
        );

        console.debug('[useOrderDetails] axios response:', response);
        console.debug('[useOrderDetails] order data:', response.data);

        // Backend returns OrderDetails directly with guaranteed 'id' field
        return response.data;
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
