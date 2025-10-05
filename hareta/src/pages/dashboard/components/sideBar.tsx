import { useAuth } from '@utils/hooks/useAuth';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type SidebarProps = {
  open: boolean;
  onClose: () => void;
};

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { isAuthenticated, user, logout, isLoading } = useAuth();

  const handleLogout = async () => {
    await logout();
    onClose();
  };
  const navigate = useNavigate();
  const handleNavigation = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <>
      {/* Backdrop - appears behind sidebar but above content */}
      {open && (
        <div
          className='bg-opacity-50 fixed inset-0 z-40 bg-black/90'
          onClick={onClose}
        />
      )}

      {/* Sidebar - highest z-index */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-white shadow-lg transition-transform ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className='flex items-center justify-between border-b p-4'>
          <h2 className='text-lg font-bold'>Menu</h2>
          <button onClick={onClose} className='rounded p-1 hover:bg-gray-100'>
            <X className='h-5 w-5' />
          </button>
        </div>

        <div className='space-y-4 p-4'>
          {isLoading ? (
            <div className='animate-pulse space-y-3'>
              <div className='h-10 rounded-lg bg-gray-200'></div>
              <div className='h-10 rounded-lg bg-gray-200'></div>
            </div>
          ) : !isAuthenticated ? (
            <>
              <button
                onClick={() => handleNavigation('/login')}
                className='w-full rounded-lg bg-green-600 py-2 text-white transition hover:bg-green-700'
              >
                Login
              </button>
              <button
                onClick={() => handleNavigation('/signup')}
                className='w-full rounded-lg border border-gray-300 py-2 transition hover:bg-gray-50'
              >
                Sign Up
              </button>

              <div className='mt-4 space-y-2 border-t pt-4'>
                <button
                  onClick={() => handleNavigation('/menu')}
                  className='w-full rounded-lg px-3 py-2 text-left hover:bg-gray-100'
                >
                  🍽️ Menu
                </button>
                <button
                  onClick={() => handleNavigation('/about')}
                  className='w-full rounded-lg px-3 py-2 text-left hover:bg-gray-100'
                >
                  ℹ️ About Us
                </button>
                <button
                  onClick={() => handleNavigation('/contact')}
                  className='w-full rounded-lg px-3 py-2 text-left hover:bg-gray-100'
                >
                  📧 Contact
                </button>
              </div>
            </>
          ) : (
            <>
              <div className='mb-4 border-b pb-4'>
                <div className='flex items-center gap-3'>
                  <div className='flex h-10 w-10 items-center justify-center rounded-full bg-green-600 font-bold text-white'>
                    {user?.email.charAt(0).toUpperCase()}
                  </div>
                  <div className='min-w-0 flex-1'>
                    <p className='truncate font-medium'>
                      {user?.email.split('@')[0]}
                    </p>
                    <p className='truncate text-xs text-gray-500'>
                      {user?.email}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleNavigation('/profile')}
                className='flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-gray-100'
              >
                <span>👤</span>
                <span>Profile</span>
              </button>

              <button
                onClick={() => handleNavigation('/orders')}
                className='flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-gray-100'
              >
                <span>📦</span>
                <span>Orders</span>
              </button>

              <button
                onClick={() => handleNavigation('/addresses')}
                className='flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-gray-100'
              >
                <span>📍</span>
                <span>Saved Addresses</span>
              </button>

              <button
                onClick={() => handleNavigation('/favorites')}
                className='flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-gray-100'
              >
                <span>❤️</span>
                <span>Favorites</span>
              </button>

              <button
                onClick={() => handleNavigation('/settings')}
                className='flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-gray-100'
              >
                <span>⚙️</span>
                <span>Settings</span>
              </button>

              <button
                onClick={handleLogout}
                className='mt-4 w-full rounded-lg border-t px-3 py-2 pt-4 text-left text-red-600 hover:bg-red-50'
              >
                🚪 Logout
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
