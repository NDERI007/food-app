import { useState } from 'react';
import { api } from './apiUtils';
import { toast } from 'sonner';
import axios from 'axios';

export function useUpdateOrderStatus() {
  const [isUpdating, setIsUpdating] = useState(false);

  async function updateOrderStatus(
    orderID: string,
    action: 'complete' | 'cancel',
  ) {
    try {
      setIsUpdating(true);

      const { data } = await api.post('/api/orders/update-status', {
        orderID,
        action,
      });
      toast.success(
        action === 'complete'
          ? '✅ Order marked as completed'
          : '❌ Order cancelled',
      );

      return data;
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.error || err.message
        : 'Something went wrong';

      toast.error(message);
      console.error(message);
      throw new Error(message);
    } finally {
      setIsUpdating(false);
    }
  }

  return { updateOrderStatus, isUpdating };
}
