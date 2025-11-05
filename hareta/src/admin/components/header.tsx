import Navbar from '@admin/dashboard/components/dashnav';
import Sidebar from '@admin/dashboard/components/sidebar';
import { useState } from 'react';

import { Outlet } from 'react-router-dom';

export default function AdminLayout() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className='flex min-h-screen flex-col'>
      {/* Company Header */}
      <Navbar onToggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />

      {/* Sidebar (for navigation) */}
      <Sidebar open={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Page content area */}

      <Outlet />
    </div>
  );
}
