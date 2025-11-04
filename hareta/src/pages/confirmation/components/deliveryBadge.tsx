import { CheckCircle } from 'lucide-react';

interface DeliveryConfirmedBadgeProps {
  deliveryType: 'pickup' | 'delivery';
}

export const DeliveryConfirmedBadge = ({
  deliveryType,
}: DeliveryConfirmedBadgeProps) => {
  return (
    <div className='mb-6 rounded-2xl border-2 border-green-200 bg-green-50 p-6 shadow-lg'>
      <div className='flex items-center gap-3'>
        <div className='flex h-12 w-12 items-center justify-center rounded-full bg-green-600'>
          <CheckCircle className='h-6 w-6 text-white' />
        </div>
        <div>
          <h3 className='text-lg font-bold text-green-900'>
            {deliveryType === 'pickup'
              ? 'Order Picked Up'
              : 'Delivery Confirmed'}
          </h3>
        </div>
      </div>
    </div>
  );
};
