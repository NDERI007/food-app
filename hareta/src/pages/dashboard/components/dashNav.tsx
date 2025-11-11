import { ShoppingCart, Menu } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import DeliveryPickupToggle from './addrChange';
import { useAuth } from '@utils/hooks/useAuth';

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
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  return (
    <header className='sticky top-0 z-50 bg-[#fefaef] shadow-sm'>
      <div className='flex items-center justify-between gap-3 px-4 py-3 sm:px-6'>
        {/* Left: Hamburger (mobile) + Logo + Toggle */}
        <div className='flex items-center gap-2 sm:gap-3'>
          {/* Mobile hamburger */}
          <button
            onClick={onToggleSidebar}
            className='rounded-lg p-2 transition hover:bg-green-50 active:bg-green-100 md:hidden'
            aria-label='Toggle menu'
          >
            <Menu className='h-5 w-5 text-gray-700 sm:h-6 sm:w-6' />
          </button>

          <Link
            to={'/'}
            className='text-lg font-bold text-green-600 sm:text-xl'
          >
            Weddyskitchen
          </Link>

          <DeliveryPickupToggle />
        </div>

        {/* Right: Auth Buttons / Avatar + Cart */}
        <div className='flex items-center gap-2 sm:gap-3'>
          {/* Desktop - Show Login/Signup buttons OR user avatar */}
          {isAuthenticated && user?.email ? (
            <button
              onClick={onToggleSidebar}
              className='hidden cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 transition md:flex'
              aria-label='Open account menu'
            >
              <div className='flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-sm font-semibold text-green-700'>
                {user.email[0].toUpperCase()}
              </div>
            </button>
          ) : (
            <div className='hidden items-center gap-2 md:flex'>
              <button
                onClick={() => navigate('/login')}
                className='rounded-lg px-4 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-green-50'
              >
                Login
              </button>
              <button
                onClick={() => navigate('/signup')}
                className='rounded-lg bg-green-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-green-700'
              >
                Sign Up
              </button>
            </div>
          )}

          {/* Cart */}
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
      </div>
    </header>
  );
}
