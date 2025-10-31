import { Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@utils/hooks/useAuth';

type NavbarProps = {
  onToggleSidebar: () => void;
};

export default function Navbar({ onToggleSidebar }: NavbarProps) {
  const { user } = useAuth();

  return (
    <header className='sticky top-0 z-50 border-b-1 border-gray-700 bg-gray-900'>
      <div className='flex items-center justify-between gap-3 px-4 py-2 sm:px-6'>
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
            to={'/admin'}
            className='text-lg font-bold text-green-600 sm:text-xl'
          >
            Iura
          </Link>
        </div>

        {/* Right: Auth Buttons / Avatar + Cart */}
        <div className='flex items-center gap-2 sm:gap-3'>
          <button
            onClick={onToggleSidebar}
            className='hidden cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 transition md:flex'
            aria-label='Open account menu'
          >
            <div className='flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-sm font-semibold text-green-700'>
              {user?.email[0].toUpperCase()}
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
