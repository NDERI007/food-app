import React, { useState } from 'react';
import { useAdminStore } from '@utils/hooks/adminStore';
import { Plus, Package, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useCategories, useMenuItems } from '@utils/hooks/productStore';
import { toast } from 'sonner';
import type { MenuItem } from '@utils/schemas/menu';
import { type MenuItemFormData, ProductFormSlideOver } from './components/form';
import { ProductCard } from './components/prodCard';
import { ProductVariantsManager } from './components/variantMng';
import { api } from '@utils/hooks/apiUtils';

const AdminProducts: React.FC = () => {
  const { deleteMenuItem, toggleAvailability } = useAdminStore();
  const queryClient = useQueryClient();
  const { data: menuItems = [], isLoading: loadingItems } = useMenuItems();
  const { data: categories = [], isLoading: loadingCategories } =
    useCategories();

  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [managingVariantsFor, setManagingVariantsFor] = useState<string | null>(
    null,
  );
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);

  const loading = loadingItems || loadingCategories;

  const handleFormSubmit = async (data: MenuItemFormData) => {
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', data.name);
      // Only append price if it's defined
      if (data.price !== undefined) {
        formDataToSend.append('price', data.price.toString());
      }
      formDataToSend.append('available', String(data.available));
      formDataToSend.append('category_id', data.category_id || '');
      if (data.image) formDataToSend.append('image', data.image);

      if (editingItem) {
        await api.put(
          `/api/prod/menu-items/${editingItem.id}`,
          formDataToSend,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
          },
        );
        toast.success('Product updated successfully!');
      } else {
        await api.post(`/api/prod/menu-items`, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Product added successfully!');
      }

      setIsSlideOverOpen(false);
      setEditingItem(null);
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
    } catch (error) {
      console.error('Error saving menu item:', error);
      toast.error('Failed to save product. Please try again.');
    }
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setIsSlideOverOpen(true);
  };

  const handleAddNew = () => {
    setEditingItem(null);
    setIsSlideOverOpen(true);
  };

  const handleCloseForm = () => {
    setIsSlideOverOpen(false);
    setEditingItem(null);
  };

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

          <button
            onClick={handleAddNew}
            className='inline-flex items-center gap-2 rounded-lg bg-purple-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-purple-600 sm:px-6'
          >
            <Plus className='h-4 w-4 sm:h-5 sm:w-5' />
            <span className='hidden sm:inline'>Add Product</span>
            <span className='sm:hidden'>Add</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className='mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8'>
        {loading ? (
          <div className='flex h-64 items-center justify-center'>
            <div className='text-center'>
              <div className='mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-600 border-t-purple-600'></div>
              <p className='mt-2 text-sm text-gray-400'>Loading products...</p>
            </div>
          </div>
        ) : menuItems.length === 0 ? (
          <div className='flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-gray-700 bg-gray-800 text-center'>
            <Package className='h-12 w-12 text-gray-500' />
            <div>
              <h3 className='text-lg font-semibold text-gray-100'>
                No products yet
              </h3>
              <p className='mt-1 text-sm text-gray-400'>
                Get started by adding your first product
              </p>
            </div>
            <button
              onClick={handleAddNew}
              className='mt-2 rounded-lg bg-purple-700 px-4 py-2 text-sm font-medium text-white hover:bg-purple-600'
            >
              Add Your First Product
            </button>
          </div>
        ) : (
          <div className='space-y-4'>
            {menuItems.map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                onToggleAvailability={(item) =>
                  toggleAvailability(item, queryClient)
                }
                onEdit={handleEdit}
                onDelete={(id) => deleteMenuItem(id, queryClient)}
                onManageVariants={setManagingVariantsFor}
              />
            ))}
          </div>
        )}
      </main>

      {/* Product Form Slide-over */}
      <ProductFormSlideOver
        isOpen={isSlideOverOpen}
        editingItem={editingItem}
        categories={categories}
        onClose={handleCloseForm}
        onSubmit={handleFormSubmit}
      />

      {/* Variants Manager Modal */}
      {managingVariantsFor && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm'>
          <div className='relative w-full max-w-lg rounded-2xl border border-gray-700 bg-gray-800 p-4 shadow-2xl sm:p-6'>
            <button
              onClick={() => setManagingVariantsFor(null)}
              className='absolute top-4 right-4 rounded-full p-1 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
            >
              <X className='h-5 w-5' />
            </button>
            <div className='mt-2 text-gray-200'>
              <ProductVariantsManager productId={managingVariantsFor} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProducts;
