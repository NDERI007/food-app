import { ShoppingCart, Menu } from 'lucide-react';
import { Link } from 'react-router-dom';

type NavbarProps = {
  onToggleSidebar: () => void;
  onToggleCart: () => void;
  cartItemCount?: number;
};

export default function Navbar({ onToggleSidebar, onToggleCart }: NavbarProps) {
  return (
    <header className='sticky top-0 z-50 flex items-center justify-between bg-[#fefaef] px-6 py-3 shadow'>
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
        <button onClick={onToggleCart} className='relative px-2'>
          <ShoppingCart className='h-6 w-6' />
        </button>
      </div>
    </header>
  );
}
