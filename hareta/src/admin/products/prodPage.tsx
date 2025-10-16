import React from 'react';
import AdminProducts from './components/form';

const ProductsPage: React.FC = () => {
  return (
    <div className='min-h-screen bg-gray-50 p-3 sm:p-6'>
      <header className='mb-4 border-b pb-3 sm:mb-6 sm:pb-4'>
        <h1 className='text-2xl font-semibold text-gray-800 sm:text-3xl'>
          Products
        </h1>
        <p className='text-sm text-gray-500 sm:text-base'>
          Add or manage your menu items here.
        </p>
      </header>

      {/* AdminProducts component would go here */}
      <div className='py-8 text-center text-gray-400'>
        <AdminProducts />
      </div>
    </div>
  );
};

export default ProductsPage;
