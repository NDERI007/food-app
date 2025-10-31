interface ErrorAlertProps {
  error: string;
}

export function ErrorAlert({ error }: ErrorAlertProps) {
  if (!error) return null;

  return (
    <div className='mb-6 rounded-lg border border-red-200 bg-red-50 p-4'>
      <p className='text-sm text-red-600'>{error}</p>
    </div>
  );
}
