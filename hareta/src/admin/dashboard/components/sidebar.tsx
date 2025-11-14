import { useAuth } from '@utils/hooks/useAuth';
import {
  X,
  Package,
  LogOut,
  List,
  ChartSpline,
  MessagesSquare,
} from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

type SidebarProps = {
  open: boolean;
  onClose: () => void;
};

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { logout, isLoading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      onClose(); // ✅ just close the sidebar — no redirect needed
    } catch (err) {
      console.error('Logout failed:', err);
    }
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
            ? 'bg-gray-800 font-medium text-white'
            : 'text-gray-300 hover:bg-gray-800 hover:text-white'
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
      {/* Backdrop */}
      <div
        className='fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none'
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 right-0 left-0 z-50 flex flex-col bg-gray-900 shadow-2xl transition-all duration-200 sm:right-auto sm:w-80 md:inset-auto md:top-14 md:right-5 md:left-auto md:w-64 md:rounded-xl md:border md:border-gray-700`}
      >
        {/* Mobile header */}
        <div className='flex flex-shrink-0 items-center justify-between border-b border-gray-700 px-4 py-3 md:hidden'>
          <div className='flex items-center gap-2.5'>
            <div className='flex h-7 w-7 items-center justify-center rounded-lg bg-green-600 text-xs font-bold text-white'>
              IF
            </div>
            <span className='text-base font-semibold text-gray-100'>
              IuraFoods
            </span>
          </div>
          <button
            onClick={onClose}
            className='rounded-md p-1.5 text-gray-400 transition hover:text-white'
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        {/* Desktop close */}
        <button
          onClick={onClose}
          className='absolute top-2 right-2 z-10 hidden rounded-md p-1.5 text-gray-400 transition hover:bg-gray-600 md:block'
        >
          <X className='h-4 w-4' />
        </button>

        {/* Sidebar Content */}
        <div className='flex-1 overflow-y-auto text-gray-200'>
          {isLoading ? (
            <div className='space-y-2 p-3'>
              <div className='h-9 animate-pulse rounded-md bg-gray-800'></div>
              <div className='h-9 animate-pulse rounded-md bg-gray-800'></div>
              <div className='h-9 animate-pulse rounded-md bg-gray-800'></div>
            </div>
          ) : (
            <>
              {/* User Info */}
              <div className='border-b border-gray-700 p-3'>
                <div className='flex items-center gap-2.5'>
                  <div className='flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-sm font-semibold text-green-700'>
                    {user?.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className='min-w-0 flex-1'>
                    <div className='truncate text-sm font-medium text-white'>
                      {user?.email?.split('@')[0] || 'User'}
                    </div>
                    <div className='truncate text-xs text-gray-400'>
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
                <NavButton
                  icon={Package}
                  label='Products'
                  path='/admin/products'
                />
                <NavButton
                  icon={List}
                  label='Categories'
                  path='/admin/categories'
                />
                <NavButton
                  icon={ChartSpline}
                  label='Analytics'
                  path='/admin/analytics'
                />
                <NavButton
                  icon={MessagesSquare}
                  label='feedback'
                  path='/admin/feedback'
                />
              </div>

              {/* Logout */}
              <div className='border-t border-gray-700 p-3'>
                <button
                  onClick={handleLogout}
                  className='flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-red-400 hover:bg-red-900/30 hover:text-red-300'
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
