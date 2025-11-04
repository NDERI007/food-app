import { Loader2 } from 'lucide-react';

interface LoadingScreenProps {
  message: string;
  description?: string;
  waitingTime?: number;
  maxWaitTime?: number;
  connectionStatus?: 'connecting' | 'connected' | 'error';
}

export const LoadingScreen = ({
  message,
  description,
  waitingTime,
  maxWaitTime,
  connectionStatus,
}: LoadingScreenProps) => {
  return (
    <div
      className='flex min-h-screen items-center justify-center px-4'
      style={{ backgroundColor: '#fefaef' }}
    >
      <div className='w-full max-w-md rounded-2xl bg-white p-12 text-center shadow-lg'>
        <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100'>
          <Loader2 className='h-8 w-8 animate-spin text-green-900' />
        </div>
        <h2 className='mb-2 text-2xl font-bold text-green-900'>{message}</h2>
        {description && <p className='mb-4 text-gray-700'>{description}</p>}

        {connectionStatus && waitingTime !== undefined && maxWaitTime && (
          <div
            className='rounded-lg p-4'
            style={{ backgroundColor: '#fefaef' }}
          >
            <div className='mb-2 flex items-center justify-center gap-2'>
              <div
                className={`h-2 w-2 rounded-full ${
                  connectionStatus === 'connected'
                    ? 'bg-green-500'
                    : connectionStatus === 'error'
                      ? 'bg-red-500'
                      : 'animate-pulse bg-yellow-500'
                }`}
              ></div>
              <p className='text-xs text-gray-600'>
                {connectionStatus === 'connected'
                  ? 'Connected'
                  : connectionStatus === 'error'
                    ? 'Connection error'
                    : 'Connecting...'}
              </p>
            </div>
            <p className='text-sm text-gray-700'>
              This usually takes a few seconds
            </p>
            <p className='mt-2 text-xs text-gray-600'>
              Waiting: {waitingTime}s / {maxWaitTime}s
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
