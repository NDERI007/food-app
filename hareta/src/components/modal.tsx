import { useState } from 'react';

interface FallbackModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; landmark?: string }) => void;
}

export default function FallbackModal({
  open,
  onClose,
  onSubmit,
}: FallbackModalProps) {
  const [name, setName] = useState('');
  const [landmark, setLandmark] = useState('');

  if (!open) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40'>
      <div className='w-[90%] max-w-md rounded-lg bg-white p-6 shadow-lg'>
        <h2 className='mb-4 text-xl font-semibold'>Enter Hostel Details</h2>
        <label className='mb-1 text-sm font-medium text-gray-700'>
          {' '}
          Location's name
          <input
            type='text'
            value={name}
            onChange={(e) => setName(e.target.value)}
            className='mb-3 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none'
          />
        </label>
        <label className='mb-1 text-sm font-medium text-gray-700'>
          Nearest Landmark
          <input
            type='text'
            placeholder='e.g. Near Rubis station'
            value={landmark}
            onChange={(e) => setLandmark(e.target.value)}
            className='mb-3 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none'
          />
        </label>

        <div className='flex justify-end gap-2'>
          <button
            onClick={onClose}
            className='rounded-md bg-gray-100 px-4 py-2 text-sm hover:bg-gray-200'
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (!name.trim()) return;
              onSubmit({ name, landmark });
              onClose();
            }}
            className='rounded-md bg-green-800 px-4 py-2 text-sm text-white hover:bg-green-900'
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
