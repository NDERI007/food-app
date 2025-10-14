import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  Package,
  ShoppingCart,
  LayoutDashboard,
  Menu,
  X,
  Tag,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export default function AdminDashboard() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedDesktop, setExpandedDesktop] = useState(false); // desktop expand toggle

  const navItems = [
    { to: '/admin', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { to: '/admin/orders', label: 'Orders', icon: <ShoppingCart size={20} /> },
    { to: '/admin/products', label: 'Products', icon: <Package size={20} /> },
    { to: '/admin/categories', label: 'Categories', icon: <Tag size={20} /> },
  ];

  return (
    <div className='flex h-screen bg-gray-100'>
      {/* Overlay for small screens */}
      {mobileOpen && (
        <div
          className='fixed inset-0 z-20 bg-black/40 lg:hidden'
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed z-30 flex h-full flex-col bg-slate-800 text-white transition-all duration-300 lg:static lg:z-auto ${
          mobileOpen
            ? 'w-64 translate-x-0'
            : 'w-64 -translate-x-full lg:translate-x-0'
        } ${expandedDesktop ? 'lg:w-64' : 'lg:w-20'}`}
      >
        {/* Header */}
        <div className='flex items-center justify-between border-b border-slate-700 p-6'>
          <h1 className='flex items-center gap-2 truncate text-2xl font-bold'>
            <LayoutDashboard size={26} />
            {/* Always show label on mobile, show on desktop only if expanded */}
            {(!expandedDesktop ? false : true) && (
              <span className='hidden lg:inline'>Admin</span>
            )}
            <span className='lg:hidden'>Admin</span>
          </h1>
          {/* Mobile close */}
          <button
            className='rounded p-1 hover:bg-slate-700 lg:hidden'
            onClick={() => setMobileOpen(false)}
          >
            <X size={22} />
          </button>
          {/* Desktop expand toggle */}
          <button
            className='hidden rounded p-1 hover:bg-slate-700 lg:block'
            onClick={() => setExpandedDesktop(!expandedDesktop)}
          >
            {expandedDesktop ? (
              <ChevronLeft size={22} />
            ) : (
              <ChevronRight size={22} />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className='mt-4 space-y-1'>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 px-6 py-3 transition-colors hover:bg-slate-700 ${
                  isActive
                    ? 'border-l-4 border-blue-500 bg-slate-700 font-medium'
                    : ''
                }`
              }
            >
              {item.icon}

              {/* Always show label on mobile, show on desktop only if expanded */}
              {expandedDesktop && (
                <span className='hidden lg:inline'>{item.label}</span>
              )}
              <span className='lg:hidden'>{item.label}</span>

              {/* Tooltip on desktop when collapsed */}
              {!expandedDesktop && (
                <span className='absolute left-16 hidden rounded bg-slate-900 px-2 py-1 text-xs whitespace-nowrap opacity-0 transition-opacity group-hover:opacity-100 lg:block'>
                  {item.label}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className='flex flex-1 flex-col overflow-hidden'>
        {/* Header */}
        <header className='flex items-center gap-4 bg-white p-4 shadow-sm'>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className='rounded-lg p-2 transition-colors hover:bg-gray-100 lg:hidden'
          >
            <Menu size={24} />
          </button>
          <h2 className='text-2xl font-semibold text-gray-800'>Admin Panel</h2>
        </header>

        {/* Nested content */}
        <main className='flex-1 overflow-y-auto p-6'>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
