import { ShoppingCart, Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DeliveryPickupToggle } from './addrChange';

type NavbarProps = {
  onToggleSidebar: () => void;
  onToggleCart: () => void;
  cartItemCount?: number;
};

export default function Navbar({
  onToggleSidebar,
  onToggleCart,
  cartItemCount = 0,
}: NavbarProps) {
  return (
    <header className='sticky top-0 z-50 bg-[#fefaef] shadow-sm'>
      <div className='flex items-center justify-between gap-3 px-4 py-3 sm:px-6'>
        {/* Left: Hamburger + Logo + Toggle */}
        <div className='flex items-center gap-2 sm:gap-3'>
          <button
            onClick={onToggleSidebar}
            className='rounded-lg p-2 transition hover:bg-green-50 active:bg-green-100'
            aria-label='Toggle menu'
          >
            <Menu className='h-5 w-5 text-gray-700 sm:h-6 sm:w-6' />
          </button>

          <Link
            to={'/'}
            className='text-lg font-bold text-green-600 sm:text-xl'
          >
            Iura
          </Link>

          <DeliveryPickupToggle />
        </div>

        {/* Right: Cart */}
        <button
          onClick={onToggleCart}
          className='relative rounded-lg p-2 transition hover:bg-green-50 active:bg-green-100'
          aria-label='Shopping cart'
        >
          <ShoppingCart className='h-5 w-5 text-gray-700 sm:h-6 sm:w-6' />

          {/* Cart Badge */}
          {cartItemCount > 0 && (
            <span className='absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-[10px] font-bold text-white sm:h-6 sm:w-6 sm:text-xs'>
              {cartItemCount > 99 ? '99+' : cartItemCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
