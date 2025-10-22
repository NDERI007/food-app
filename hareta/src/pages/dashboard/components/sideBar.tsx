import { useAuth } from '@utils/hooks/useAuth';
import { Bookmark, X, Package, Heart, Settings, LogOut } from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

type SidebarProps = {
  open: boolean;
  onClose: () => void;
};

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { isAuthenticated, logout, isLoading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose();
  };

  const isActive = (path: string) => location.pathname === path;

  const NavButton = ({
    icon: Icon,
    label,
    path,
    onClick,
  }: {
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    label: string;
    path?: string;
    onClick?: () => void;
  }) => {
    const active = path ? isActive(path) : false;

    return (
      <button
        onClick={onClick || (() => path && handleNavigation(path))}
        className={`group flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-all ${
          active
            ? 'bg-gray-100 font-medium text-gray-900'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`}
      >
        <Icon className='h-4 w-4' />
        <span>{label}</span>
      </button>
    );
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop - full screen on mobile, subtle on desktop */}
      <div
        className='fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none'
        onClick={onClose}
      />

      {/* Sidebar - full screen on mobile, floating on desktop */}
      <div
        className={`fixed z-50 flex flex-col bg-white shadow-2xl transition-all duration-200 ${
          // Mobile: full screen slide from left
          'inset-y-0 right-0 left-0 sm:right-auto sm:w-80'
        } ${
          // Desktop: floating dropdown from top-right
          'md:inset-auto md:top-16 md:right-4 md:left-auto md:w-64 md:rounded-xl md:border md:border-gray-200'
        } `}
      >
        {/* Mobile-only header with close button */}
        <div className='flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3 md:hidden'>
          <div className='flex items-center gap-2.5'>
            <div className='flex h-7 w-7 items-center justify-center rounded-lg bg-green-600 text-xs font-bold text-white'>
              IF
            </div>
            <span className='text-base font-semibold text-gray-900'>
              IuraFoods
            </span>
          </div>
          <button
            onClick={onClose}
            className='rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600'
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        {/* Desktop-only close button (top-right corner) */}
        <button
          onClick={onClose}
          className='absolute top-2 right-2 z-10 hidden rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 md:block'
        >
          <X className='h-4 w-4' />
        </button>

        {/* Content - scrollable */}
        <div className='flex-1 overflow-y-auto'>
          {isLoading ? (
            <div className='space-y-2 p-3'>
              <div className='h-9 animate-pulse rounded-md bg-gray-100'></div>
              <div className='h-9 animate-pulse rounded-md bg-gray-100'></div>
              <div className='h-9 animate-pulse rounded-md bg-gray-100'></div>
            </div>
          ) : !isAuthenticated ? (
            <>
              {/* Auth Actions */}
              <div className='space-y-2 border-b border-gray-200 p-3'>
                <button
                  onClick={() => handleNavigation('/login')}
                  className='w-full rounded-md bg-green-600 py-2 text-sm font-medium text-white transition hover:bg-green-700'
                >
                  Sign In
                </button>
                <button
                  onClick={() => handleNavigation('/signup')}
                  className='w-full rounded-md border border-gray-300 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50'
                >
                  Create Account
                </button>
              </div>
            </>
          ) : (
            <>
              {/* User Info */}
              <div className='border-b border-gray-200 p-3'>
                <div className='flex items-center gap-2.5'>
                  <div className='flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-sm font-semibold text-green-700'>
                    {user?.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className='min-w-0 flex-1'>
                    <div className='truncate text-sm font-medium text-gray-900'>
                      {user?.email?.split('@')[0] || 'User'}
                    </div>
                    <div className='truncate text-xs text-gray-500'>
                      {user?.email}
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className='space-y-0.5 p-3'>
                <div className='mb-2 px-2.5 text-xs font-semibold text-gray-500'>
                  ACCOUNT
                </div>
                <NavButton icon={Package} label='Orders' path='/orders' />
                <NavButton
                  icon={Bookmark}
                  label='Saved Addresses'
                  path='/address'
                />
                <NavButton icon={Heart} label='Favorites' path='/favorites' />
                <NavButton
                  icon={Settings}
                  label='Account Settings'
                  path='/settings'
                />
              </div>

              {/* Logout */}
              <div className='border-t border-gray-200 p-3'>
                <button
                  onClick={handleLogout}
                  className='flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-red-600 transition hover:bg-red-50'
                >
                  <LogOut className='h-4 w-4' />
                  <span>Sign Out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
