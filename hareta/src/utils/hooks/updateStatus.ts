import { useState } from 'react';
import { api } from './apiUtils';
import { toast } from 'sonner';

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
    } catch (err: any) {
      console.error(err?.response?.data?.error || err.message);
      toast.error(err?.response?.data?.error || 'Failed to update order');
      throw new Error(err?.response?.data?.error || 'Failed to update order');
    } finally {
      setIsUpdating(false);
    }
  }

  return { updateOrderStatus, isUpdating };
}
