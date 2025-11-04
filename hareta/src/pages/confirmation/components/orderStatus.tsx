import { getEstimatedDelivery } from '@utils/hooks/confirmfun';
import { Check, Package, Clock } from 'lucide-react';

interface OrderStatusCardProps {
  status: string;
  deliveryType: 'pickup' | 'delivery';
  createdAt: string;
}

export const OrderStatusCard = ({
  status,
  deliveryType,
  createdAt,
}: OrderStatusCardProps) => {
  return (
    <div className='mb-6 rounded-2xl bg-white p-8 shadow-lg'>
      <h2 className='mb-4 text-xl font-bold text-green-900'>Order Status</h2>

      <div className='space-y-4'>
        <div className='flex items-start gap-4'>
          <div className='flex h-10 w-10 items-center justify-center rounded-full bg-green-900 text-white'>
            <Check className='h-5 w-5' />
          </div>
          <div className='flex-1'>
            <p className='font-semibold text-green-900'>Order Confirmed</p>
            <p className='text-sm text-gray-600'>
              Payment received and order is being prepared
            </p>
          </div>
        </div>

        {status === 'out_for_delivery' ? (
          <div className='flex items-start gap-4'>
            <div className='flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white'>
              <Clock className='h-5 w-5' />
            </div>
            <div className='flex-1'>
              <p className='font-semibold text-blue-900'>
                {deliveryType === 'pickup'
                  ? 'Ready for Pickup'
                  : 'Out for Delivery'}
              </p>
              <p className='text-sm text-gray-600'>
                {deliveryType === 'pickup'
                  ? 'Your order is ready! Come pick it up anytime.'
                  : 'Your order is on its way to you'}
              </p>
            </div>
          </div>
        ) : (
          <div className='flex items-start gap-4'>
            <div className='flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-gray-400'>
              <Package className='h-5 w-5' />
            </div>
            <div className='flex-1'>
              <p className='font-semibold text-gray-500'>Preparing Order</p>
              <p className='text-sm text-gray-600'>
                {deliveryType === 'pickup'
                  ? "We'll notify you when your order is ready for pickup"
                  : `Estimated delivery: ${getEstimatedDelivery(createdAt)}`}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
