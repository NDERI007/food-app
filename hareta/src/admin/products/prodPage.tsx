import React from 'react';
import AdminProducts from './components/form';
import { Package } from 'lucide-react';

const ProductsPage: React.FC = () => {
  return (
    <div className='min-h-screen bg-gray-900 text-gray-100'>
      {/* Header */}
      <header className='mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8'>
        <div className='flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center'>
          <div>
            <h1 className='text-3xl font-bold text-gray-300'>Products</h1>
            <p className='mt-1 text-sm text-gray-400'>
              Add or manage your menu items here.
            </p>
          </div>

          {/* Optional decorative icon */}
          <div className='hidden items-center justify-center rounded-full bg-purple-700/10 p-3 sm:flex'>
            <Package className='h-6 w-6 text-purple-400' />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className='mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8'>
        <div className='rounded-2xl bg-gray-950/50 p-4 shadow-lg ring-1 ring-purple-800/30 backdrop-blur-sm sm:p-6'>
          <AdminProducts />
        </div>
      </main>
    </div>
  );
};

export default ProductsPage;
