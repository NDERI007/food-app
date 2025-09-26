import { ShoppingCart, Menu } from 'lucide-react';
import { Link } from 'react-router-dom';

type NavbarProps = {
  onToggleSidebar: () => void;
  onToggleCart: () => void;
  isSignedIn: boolean;
};

export default function Navbar({
  onToggleSidebar,
  onToggleCart,
  isSignedIn,
}: NavbarProps) {
  return (
    <header className='flex items-center justify-between bg-white px-6 py-3 shadow'>
      {/* Left: Logo + Hamburger */}
      <div className='flex items-center gap-3'>
        <button onClick={onToggleSidebar}>
          <Menu className='h-6 w-6' />
        </button>
        <Link to={'/'} className='text-xl font-bold text-green-600'>
          Iura
        </Link>
      </div>

      {/* Right: Auth + Cart */}
      <div className='flex items-center gap-4'>
        {!isSignedIn && (
          <>
            <button className='text-sm'>Log in</button>
            <button className='rounded-lg bg-green-600 px-4 py-2 text-white'>
              Sign Up
            </button>
          </>
        )}
        <button onClick={onToggleCart} className='relative px-2'>
          <ShoppingCart className='h-6 w-6' />
        </button>
      </div>
    </header>
  );
}
