import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './components/sidebar';
import Navbar from './components/dashnav';

export default function AdminDashboard() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className='flex h-screen flex-col bg-gray-950 text-gray-100'>
      <Navbar onToggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />

      <Sidebar open={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Content Area */}

      {/* Main Content */}
      <main className='flex-1 overflow-y-auto'>
        <Outlet />
      </main>
    </div>
  );
}
