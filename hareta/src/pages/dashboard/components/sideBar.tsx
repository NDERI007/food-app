import { X } from 'lucide-react';

type SidebarProps = {
  open: boolean;
  onClose: () => void;
  isSignedIn: boolean;
};

export default function Sidebar({ open, onClose, isSignedIn }: SidebarProps) {
  return (
    <div
      className={`fixed inset-y-0 left-0 w-64 transform bg-white shadow transition-transform ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className='flex items-center justify-between border-b p-4'>
        <h2 className='text-lg font-bold'>Menu</h2>
        <button onClick={onClose}>
          <X className='h-5 w-5' />
        </button>
      </div>

      <div className='space-y-4 p-4'>
        {!isSignedIn ? (
          <>
            <button className='w-full rounded-lg bg-green-600 py-2 text-white'>
              Login
            </button>
            <button className='w-full rounded-lg border py-2'>Sign Up</button>
          </>
        ) : (
          <>
            <div className='mb-4 flex items-center gap-3'>
              <span className='font-medium'>John Doe</span>
            </div>
            <button className='w-full rounded-lg py-2 text-left hover:bg-gray-100'>
              Orders
            </button>
            <button className='w-full rounded-lg py-2 text-left hover:bg-gray-100'>
              Favorites
            </button>
            <button className='w-full rounded-lg py-2 text-left text-red-600 hover:bg-red-50'>
              Logout
            </button>
          </>
        )}
      </div>
    </div>
  );
}
