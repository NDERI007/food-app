import { Link } from 'react-router-dom';

export function Header() {
  return (
    <header className='sticky top-0 z-50 bg-[#fefaef] text-green-600 shadow-sm'>
      <div className='mx-auto flex h-14 max-w-7xl items-center px-4'>
        <Link
          to='/dashboard'
          className='text-lg font-bold tracking-tight transition-colors hover:text-green-700'
        >
          iura
        </Link>
      </div>
    </header>
  );
}
