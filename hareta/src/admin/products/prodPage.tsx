import React from 'react';
import AdminProducts from './components/form';

const ProductsPage: React.FC = () => {
  return (
    <div className='min-h-screen bg-gray-50 p-6'>
      <header className='mb-6 border-b pb-4'>
        <h1 className='text-3xl font-semibold text-gray-800'>Products</h1>
        <p className='text-gray-500'>Add or manage your menu items here.</p>
      </header>

      <AdminProducts />
    </div>
  );
};

export default ProductsPage;
