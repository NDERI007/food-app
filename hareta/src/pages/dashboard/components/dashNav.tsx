import { ShoppingCart, Menu } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
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
      <div className='flex items-center justify-between gap-3 px-3 py-3 sm:px-4 lg:px-6'>
        {/* Left: Hamburger (mobile) + Logo */}
        <div className='flex items-center gap-2 sm:gap-3'>
          {/* Mobile hamburger */}
          <button
            onClick={onToggleSidebar}
            className='flex-shrink-0 rounded-lg p-2 transition hover:bg-green-50 active:bg-green-100 md:hidden'
            aria-label='Toggle menu'
          >
            <Menu className='h-5 w-5 text-gray-700' />
          </button>

          {/* Logo - Show "WK" on mobile, full name on larger screens */}
          <Link
            to={'/'}
            className='flex-shrink-0 text-base font-bold text-green-600 sm:text-lg lg:text-xl'
          >
            <span className='inline sm:hidden'>WK</span>
            <span className='hidden sm:inline'>Weddyskitchen</span>
          </Link>
        </div>

        {/* Right: Auth Buttons / Avatar + Cart */}
        <div className='flex flex-shrink-0 items-center gap-2 sm:gap-3'>
          {/* Desktop - Show Login/Signup buttons OR user avatar */}
          {isAuthenticated && user?.email ? (
            <button
              onClick={onToggleSidebar}
              className='hidden cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-green-50 md:flex lg:px-3'
              aria-label='Open account menu'
            >
              <div className='flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-xs font-semibold text-green-700 sm:h-8 sm:w-8 sm:text-sm'>
                {user.email[0].toUpperCase()}
              </div>
            </button>
          ) : (
            <div className='hidden items-center gap-2 md:flex'>
              <button
                onClick={() => navigate('/login')}
                className='rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-green-50'
              >
                Login
              </button>
              <button
                onClick={() => navigate('/signup')}
                className='rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-green-700'
              >
                Sign Up
              </button>
            </div>
          )}

          {/* Cart - Always visible */}
          <button
            onClick={onToggleCart}
            className='relative flex-shrink-0 rounded-lg p-2 transition hover:bg-green-50 active:bg-green-100'
            aria-label='Shopping cart'
          >
            <ShoppingCart className='h-5 w-5 text-gray-700 sm:h-6 sm:w-6' />

            {/* Cart Badge */}
            {cartItemCount > 0 && (
              <span className='absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-green-600 text-[9px] font-bold text-white sm:-top-1 sm:-right-1 sm:h-5 sm:w-5 sm:text-[10px]'>
                {cartItemCount > 99 ? '99+' : cartItemCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
