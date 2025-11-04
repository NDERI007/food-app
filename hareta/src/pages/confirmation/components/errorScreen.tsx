import { AlertCircle } from 'lucide-react';

interface ErrorScreenProps {
  error: string;
  onRetry: () => void;
  onViewOrders: () => void;
}

export const ErrorScreen = ({
  error,
  onRetry,
  onViewOrders,
}: ErrorScreenProps) => {
  return (
    <div
      className='flex min-h-screen items-center justify-center px-4'
      style={{ backgroundColor: '#fefaef' }}
    >
      <div className='w-full max-w-md rounded-2xl bg-white p-12 text-center shadow-lg'>
        <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100'>
          <AlertCircle className='h-8 w-8 text-red-600' />
        </div>
        <h2 className='mb-2 text-2xl font-bold text-green-900'>
          Payment Verification Delayed
        </h2>
        <p className='mb-6 text-gray-700'>{error}</p>
        <div className='space-y-3'>
          <button
            onClick={onRetry}
            className='w-full rounded-xl bg-green-900 py-3 font-semibold text-white transition-colors hover:bg-green-800'
          >
            Try Again
          </button>
          <button
            onClick={onViewOrders}
            className='w-full rounded-xl border-2 border-green-900 bg-white py-3 font-semibold text-green-900 transition-colors hover:bg-green-50'
          >
            View My Orders
          </button>
        </div>
      </div>
    </div>
  );
};
