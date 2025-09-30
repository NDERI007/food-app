import { X } from 'lucide-react';

type CartDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export default function CartDrawer({ open, onClose }: CartDrawerProps) {
  return (
    <div
      className={`fixed inset-y-0 right-0 w-80 transform bg-white shadow-lg transition-transform ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className='flex items-center justify-between border-b p-4'>
        <h2 className='text-lg font-bold'>Your Cart</h2>
        <button onClick={onClose}>
          <X className='h-5 w-5' />
        </button>
      </div>

      <div className='p-4'>
        <p className='text-gray-500'>Your order items will appear here...</p>
      </div>
    </div>
  );
}
