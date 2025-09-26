import { useState } from 'react';

interface FallbackModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; room?: string }) => void;
}

export default function FallbackModal({
  open,
  onClose,
  onSubmit,
}: FallbackModalProps) {
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');

  if (!open) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40'>
      <div className='w-[90%] max-w-md rounded-lg bg-[#fefaef] p-6 shadow-lg'>
        <h2 className='mb-4 text-xl font-semibold'>Enter Hostel Details</h2>
        <label>
          {' '}
          Location's name
          <input
            type='text'
            placeholder='Enter landmark/hostel name'
            value={name}
            onChange={(e) => setName(e.target.value)}
            className='focus-outline mb-3 w-full rounded-md px-3 py-2'
          />
        </label>

        <input
          type='text'
          placeholder='Room number (optional)'
          value={room}
          onChange={(e) => setRoom(e.target.value)}
          className='mb-3 w-full rounded-md border px-3 py-2'
        />

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
              onSubmit({ name, room });
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
