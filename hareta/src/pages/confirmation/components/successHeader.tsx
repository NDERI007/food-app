import { formatDate } from '@utils/hooks/confirmfun';
import { Check } from 'lucide-react';

interface SuccessHeaderProps {
  orderId: string;
  createdAt: string;
}

export const SuccessHeader = ({ orderId, createdAt }: SuccessHeaderProps) => {
  return (
    <div className='mb-6 rounded-2xl bg-white p-8 text-center shadow-lg'>
      <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100'>
        <Check className='h-8 w-8 text-green-900' />
      </div>
      <h1 className='mb-2 text-3xl font-bold text-green-900'>
        Order Confirmed
      </h1>
      <p className='mb-4 text-gray-700'>Thank you for your purchase!</p>
      <p className='text-sm text-gray-600'>
        Order{' '}
        <span className='font-mono font-semibold text-green-900'>
          #{orderId.slice(0, 8).toUpperCase()}
        </span>
      </p>
      <p className='mt-2 text-xs text-gray-500'>{formatDate(createdAt)}</p>
    </div>
  );
};
