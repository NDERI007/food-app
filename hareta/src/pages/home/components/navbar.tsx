import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className='fixed top-0 left-0 z-30 w-full border-b border-green-700 bg-[#faf7ef]'>
      <div className='mx-auto flex max-w-6xl items-center justify-between px-2 py-2'>
        {/* App name / logo */}
        <Link to={'/'} className='text-2xl font-bold text-green-900'>
          Iura
        </Link>

        {/* Login button */}
        <Link
          to={'login'}
          className='rounded-lg text-xl font-medium text-green-900 transition hover:bg-amber-100'
        >
          Login
        </Link>
      </div>
    </nav>
  );
}
