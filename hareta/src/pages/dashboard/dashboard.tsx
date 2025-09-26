// src/App.tsx
import { useState } from 'react';
import Navbar from '../../components/dashC/dashNav';
import CartDrawer from '../../components/dashC/cartDrawer';
import Sidebar from '../../components/dashC/sideBar';

function Dashboard() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isCartOpen, setCartOpen] = useState(false);
  const [isSignedIn, setSignedIn] = useState(false); // mock state

  return (
    <div className='flex min-h-screen flex-col'>
      {/* Navbar */}
      <Navbar
        onToggleSidebar={() => setSidebarOpen(!isSidebarOpen)}
        onToggleCart={() => setCartOpen(!isCartOpen)}
        isSignedIn={isSignedIn}
      />

      {/* Sidebar */}
      <Sidebar
        open={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isSignedIn={isSignedIn}
      />

      {/* Cart Drawer */}
      <CartDrawer open={isCartOpen} onClose={() => setCartOpen(false)} />

      {/* Main Content */}
      <main className='flex-1 bg-gray-50 p-6'>
        <h1 className='mb-4 text-2xl font-bold'>Home</h1>
        <p>This is where categories and product cards will go...</p>
      </main>
    </div>
  );
}

export default Dashboard;
