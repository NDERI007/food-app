import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  Package,
  ShoppingCart,
  LayoutDashboard,
  X,
  ChevronLeft,
  ChevronRight,
  List,
  LogOut,
  Menu,
} from 'lucide-react';
import { useAuth } from '@utils/hooks/useAuth';

export default function AdminDashboard() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedDesktop, setExpandedDesktop] = useState(true);
  const { user, isAuthenticated, logout } = useAuth();

  const navItems = [
    { to: '/admin', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { to: '/admin/orders', label: 'Orders', icon: <ShoppingCart size={20} /> },
    { to: '/admin/products', label: 'Products', icon: <Package size={20} /> },
    { to: '/admin/categories', label: 'Categories', icon: <List size={20} /> },
  ];

  return (
    <div className='flex h-screen bg-gray-950 text-gray-100'>
      {/* Overlay for small screens */}
      {mobileOpen && (
        <div
          className='fixed inset-0 z-20 bg-black/50 lg:hidden'
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed z-30 flex h-full flex-col border-r border-gray-800 bg-gray-900/95 backdrop-blur-md transition-transform duration-300 ease-in-out lg:static lg:z-auto ${
          mobileOpen
            ? 'w-64 translate-x-0'
            : 'w-64 -translate-x-full lg:translate-x-0'
        } ${expandedDesktop ? 'lg:w-64' : 'lg:w-20'}`}
      >
        {/* Sidebar Header with Avatar and Close */}
        <div className='flex items-center justify-between border-b border-gray-800 px-4 py-5'>
          <div className='flex items-center gap-3'>
            {isAuthenticated && user ? (
              <>
                <div className='flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-sm font-semibold text-purple-300 shadow-inner ring-1 ring-purple-500/30'>
                  {user.email?.[0]?.toUpperCase() ?? 'A'}
                </div>
                {(expandedDesktop || mobileOpen) && (
                  <div className='flex flex-col'>
                    <span className='text-sm font-medium text-purple-200'>
                      {user.email ?? 'Admin'}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className='h-10 w-10 rounded-full bg-gray-700' />
            )}
          </div>

          {/* Close / Expand Buttons */}
          <div className='flex items-center gap-1'>
            {/* Mobile close */}
            <button
              className='rounded p-1 hover:bg-gray-800 lg:hidden'
              onClick={() => setMobileOpen(false)}
              aria-label='Close sidebar'
            >
              <X size={20} />
            </button>

            {/* Desktop expand toggle */}
            <button
              className='hidden rounded p-1 hover:bg-gray-800 lg:block'
              onClick={() => setExpandedDesktop(!expandedDesktop)}
              aria-label='Toggle sidebar width'
            >
              {expandedDesktop ? (
                <ChevronLeft size={20} />
              ) : (
                <ChevronRight size={20} />
              )}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className='mt-4 flex-1 space-y-1'>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `group relative mx-2 flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-all hover:bg-purple-900/20 ${
                  isActive
                    ? 'bg-purple-900/40 font-medium text-purple-300'
                    : 'text-gray-300'
                }`
              }
            >
              <div className='text-purple-300 group-hover:text-purple-400'>
                {item.icon}
              </div>
              {(expandedDesktop || mobileOpen) && <span>{item.label}</span>}

              {/* Tooltip when collapsed */}
              {!expandedDesktop && (
                <span className='absolute left-14 hidden rounded-md bg-gray-800 px-2 py-1 text-xs text-gray-200 opacity-0 transition-all group-hover:opacity-100 lg:block'>
                  {item.label}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer section */}
        <div className='mt-auto border-t border-gray-800 p-3'>
          <button
            onClick={logout}
            className='flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-400 transition hover:bg-red-900/20 hover:text-red-400'
          >
            <LogOut size={18} />
            {(expandedDesktop || mobileOpen) && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className='flex flex-1 flex-col overflow-hidden'>
        {/* ✅ Mobile Header with Menu Button */}
        <header className='flex items-center justify-between border-b border-gray-800 bg-gray-900/60 px-4 py-3 backdrop-blur-md lg:hidden'>
          <div className='flex items-center gap-3'>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className='rounded-lg p-2 text-purple-300 transition hover:bg-gray-800'
              aria-label='Open sidebar'
            >
              <Menu size={22} />
            </button>
            <h2 className='text-base font-semibold text-purple-300'>
              Admin Dashboard
            </h2>
          </div>
        </header>

        <main className='flex-1 overflow-y-auto bg-gray-950 p-6'>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
