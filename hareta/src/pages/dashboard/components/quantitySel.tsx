import { memo } from 'react';
import { Minus, Plus } from 'lucide-react';

interface QuantitySelectorProps {
  quantity: number;
  setQuantity: (updater: (prev: number) => number) => void;
}

const QuantitySelector = memo(
  ({ quantity, setQuantity }: QuantitySelectorProps) => {
    const handleDecrement = () => {
      setQuantity((q) => Math.max(1, q - 1));
    };

    const handleIncrement = () => {
      setQuantity((q) => q + 1);
    };

    return (
      <div className='flex items-center gap-2'>
        <label className='text-sm font-medium'>Quantity</label>
        <div className='flex items-center rounded-lg border border-gray-300'>
          <button
            onClick={handleDecrement}
            className='p-2 text-gray-600 transition hover:bg-gray-100'
            aria-label='Decrease quantity'
          >
            <Minus size={16} />
          </button>
          <div className='w-10 text-center font-medium'>{quantity}</div>
          <button
            onClick={handleIncrement}
            className='p-2 text-gray-600 transition hover:bg-gray-100'
            aria-label='Increase quantity'
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
    );
  },
);

export default QuantitySelector;
