import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { useAdminStore } from '@utils/hooks/adminStore';
import { UploadCloud, X, Plus, Edit, Trash2, Package } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useCategories, useMenuItems } from '@utils/hooks/productStore';
import { ProductVariantsManager } from './prodManager';
import { toast } from 'sonner';
import type { MenuItem } from '@utils/schemas/menu';

// Zod schema for validation
const menuItemSchema = z.object({
  name: z
    .string()
    .min(1, 'Product name is required')
    .min(3, 'Name must be at least 3 characters'),
  description: z.string().optional().default(''),
  price: z.coerce.number().min(0.01, 'Price must be greater than 0'),
  available: z.boolean().default(true),
  category_id: z.string().optional().default(''),
  image: z
    .union([z.string(), z.instanceof(File)])
    .optional()
    .nullable(),
});

type MenuItemFormData = z.infer<typeof menuItemSchema>;

const AdminProducts: React.FC = () => {
  const { deleteMenuItem, toggleAvailability } = useAdminStore();
  const queryClient = useQueryClient();
  const { data: menuItems = [], isLoading: loadingItems } = useMenuItems();
  const { data: categories = [], isLoading: loadingCategories } =
    useCategories();

  const [isOpen, setIsOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [managingVariantsFor, setManagingVariantsFor] = useState<string | null>(
    null,
  );
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm({
    resolver: zodResolver(menuItemSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      available: true,
      category_id: '',
      image: null,
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setValue('image', file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: MenuItemFormData) => {
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', data.name);
      formDataToSend.append('description', data.description || '');
      formDataToSend.append('price', data.price.toString());
      formDataToSend.append('available', String(data.available));
      formDataToSend.append('category_id', data.category_id || '');
      if (data.image) formDataToSend.append('image', data.image);

      if (editingId) {
        await axios.put(`/api/prod/menu-items/${editingId}`, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Product updated successfully!');
      } else {
        await axios.post(`/api/prod/menu-items`, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Product added successfully!');
      }

      resetForm();
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
    } catch (error) {
      console.error('Error saving menu item:', error);
      toast.error('Failed to save product. Please try again.');
    }
  };

  const getPreviewImage = (item: MenuItem) => {
    return (
      item.image?.variants?.jpg?.[400] ||
      item.image?.variants?.avif?.[400] ||
      item.image?.lqip ||
      null
    );
  };

  const handleEdit = (item: MenuItem) => {
    setEditingId(item.id);
    reset({
      name: item.name,
      description: item.description || '',
      price: item.price,
      available: item.available,
      category_id: item.category_id || '',
      image: null,
    });
    setImagePreview(getPreviewImage(item));
    setIsSlideOverOpen(true);
  };

  const handleAddNew = () => {
    resetForm();
    setIsSlideOverOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    reset({
      name: '',
      description: '',
      price: 0,
      available: true,
      category_id: '',
      image: null,
    });
    setImagePreview(null);
    setIsSlideOverOpen(false);
  };

  const loading = loadingItems || loadingCategories;

  return (
    <div className='mx-auto min-h-screen max-w-7xl bg-gray-900 p-3 text-gray-100 sm:p-6'>
      {/* Header */}
      <div className='mb-6 flex items-center justify-end'>
        <button
          onClick={handleAddNew}
          className='inline-flex items-center gap-2 rounded-lg bg-purple-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-purple-600 sm:px-6'
        >
          <Plus className='h-4 w-4 sm:h-5 sm:w-5' />
          <span className='hidden sm:inline'>Add Product</span>
          <span className='sm:hidden'>Add</span>
        </button>
      </div>

      {/* Product Grid */}
      {/* Product Grid */}
      <div className='mx-auto max-w-6xl rounded-xl border border-gray-700 bg-gray-800 p-4 shadow-inner sm:p-6'>
        {loading ? (
          <div className='flex h-64 items-center justify-center'>
            <div className='text-center'>
              <div className='mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-600 border-t-purple-600'></div>
              <p className='mt-2 text-sm text-gray-400'>Loading products...</p>
            </div>
          </div>
        ) : menuItems.length === 0 ? (
          <div className='flex h-64 flex-col items-center justify-center gap-3 text-center'>
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
          <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 md:gap-5 xl:grid-cols-4'>
            {menuItems.map((item) => {
              return (
                <div
                  key={item.id}
                  className='group relative flex flex-col overflow-hidden rounded-xl bg-gray-800 shadow ring-1 ring-gray-700 transition hover:shadow-lg sm:flex-col'
                >
                  {/* Top section */}
                  <div className='flex flex-row sm:flex-col'>
                    {/* Image */}
                    <div className='relative w-32 flex-shrink-0 overflow-hidden sm:h-40 sm:w-full'>
                      {item.image ? (
                        <picture>
                          <source
                            srcSet={item.image?.variants?.avif?.[400]}
                            type='image/avif'
                          />
                          <img
                            src={item.image?.variants?.jpg?.[400]}
                            alt={item.name}
                            className='h-full w-full object-cover transition-transform duration-300 group-hover:scale-105'
                          />
                        </picture>
                      ) : (
                        <div className='flex h-full w-full items-center justify-center bg-gray-700 text-gray-500'>
                          <Package className='h-10 w-10' />
                        </div>
                      )}

                      <span
                        className={`absolute top-2 left-2 rounded-full px-2.5 py-0.5 text-[10px] font-medium backdrop-blur-md ${
                          item.available
                            ? 'bg-green-900/70 text-green-200'
                            : 'bg-red-900/70 text-red-300'
                        }`}
                      >
                        {item.available ? 'Available' : 'Unavailable'}
                      </span>
                    </div>

                    {/* Content */}
                    <div className='flex flex-1 flex-col justify-between p-3 sm:p-4'>
                      <div>
                        <h3 className='line-clamp-1 text-sm font-semibold text-gray-100 sm:text-base'>
                          {item.name}
                        </h3>
                        <p className='mt-0.5 line-clamp-2 text-xs text-gray-400 sm:text-sm'>
                          {item.description || 'No description available.'}
                        </p>
                      </div>

                      <div className='mt-2 flex items-center justify-between'>
                        <p className='text-sm font-bold text-green-400 sm:text-base'>
                          KES {item.price.toFixed(2)}
                        </p>
                        <button
                          onClick={() => setIsOpen(!isOpen)}
                          className='rounded p-1 text-gray-400 hover:bg-gray-700 hover:text-gray-100 sm:hidden'
                        >
                          <svg
                            xmlns='http://www.w3.org/2000/svg'
                            className='h-5 w-5'
                            fill='none'
                            viewBox='0 0 24 24'
                            stroke='currentColor'
                            strokeWidth='2'
                          >
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              d='M6 12h12M6 6h12M6 18h12'
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div
                    className={`flex flex-col gap-2 bg-gray-900/50 p-3 text-xs text-gray-200 transition-all sm:flex-row sm:flex-wrap sm:justify-between sm:gap-2 ${
                      isOpen
                        ? 'visible max-h-40 opacity-100'
                        : 'invisible max-h-0 opacity-0 sm:visible sm:max-h-none sm:opacity-100'
                    }`}
                  >
                    <button
                      onClick={() => toggleAvailability(item, queryClient)}
                      className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-3 py-2 transition ${
                        item.available
                          ? 'bg-green-800 text-green-200 hover:bg-green-700'
                          : 'bg-red-800 text-red-200 hover:bg-red-700'
                      }`}
                    >
                      {item.available ? 'Available' : 'Unavailable'}
                    </button>

                    <button
                      onClick={() => setManagingVariantsFor(item.id)}
                      className='flex flex-1 items-center justify-center gap-1 rounded-lg bg-purple-800 px-3 py-2 text-purple-200 hover:bg-purple-700'
                    >
                      <Package className='h-3.5 w-3.5' />
                      Variants
                    </button>

                    <button
                      onClick={() => handleEdit(item)}
                      className='flex flex-1 items-center justify-center gap-1 rounded-lg bg-blue-800 px-3 py-2 text-blue-200 hover:bg-blue-700'
                    >
                      <Edit className='h-3.5 w-3.5' />
                      Edit
                    </button>

                    <button
                      onClick={() => deleteMenuItem(item.id, queryClient)}
                      className='flex flex-1 items-center justify-center gap-1 rounded-lg bg-red-800 px-3 py-2 text-red-200 hover:bg-red-700'
                    >
                      <Trash2 className='h-3.5 w-3.5' />
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Slide-over form */}
      {isSlideOverOpen && (
        <div className='fixed inset-0 z-50 overflow-hidden'>
          <div
            className='absolute inset-0 bg-black/70 backdrop-blur-sm'
            onClick={resetForm}
          />
          <div className='fixed inset-y-0 right-0 flex max-w-full pl-10'>
            <div className='w-screen max-w-md sm:max-w-lg'>
              <div className='flex h-full flex-col overflow-y-auto border-l border-gray-700 bg-gray-800 shadow-2xl'>
                {/* Header */}
                <div className='sticky top-0 z-10 border-b border-gray-700 bg-gray-900 px-4 py-4 sm:px-6'>
                  <div className='flex items-center justify-between'>
                    <h2 className='text-lg font-semibold text-gray-100 sm:text-xl'>
                      {editingId ? 'Edit Product' : 'Add New Product'}
                    </h2>
                    <button
                      onClick={resetForm}
                      className='rounded-lg p-2 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                    >
                      <X className='h-5 w-5' />
                    </button>
                  </div>
                </div>

                {/* Form */}
                <form
                  onSubmit={handleSubmit(onSubmit)}
                  className='flex-1 space-y-5 px-4 py-6 text-gray-200 sm:px-6'
                >
                  {/* Product Name */}
                  <div>
                    <label className='mb-1.5 block text-sm font-medium text-gray-300'>
                      Product Name *
                    </label>
                    <input
                      type='text'
                      {...register('name')}
                      className='w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-100 focus:ring-2 focus:ring-purple-600 focus:outline-none'
                      placeholder='e.g., Margherita Pizza'
                    />
                    {errors.name && (
                      <p className='mt-1 text-xs text-red-400'>
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  {/* Price & Category */}
                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <label className='mb-1.5 block text-sm font-medium text-gray-300'>
                        Price *
                      </label>
                      <input
                        type='number'
                        step='0.01'
                        {...register('price')}
                        className='w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-100 focus:ring-2 focus:ring-purple-600 focus:outline-none'
                        placeholder='0.00'
                      />
                    </div>

                    <div>
                      <label className='mb-1.5 block text-sm font-medium text-gray-300'>
                        Category
                      </label>
                      <select
                        {...register('category_id')}
                        className='w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-100 focus:ring-2 focus:ring-purple-600 focus:outline-none'
                      >
                        <option value=''>Select category</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className='mb-1.5 block text-sm font-medium text-gray-300'>
                      Description
                    </label>
                    <textarea
                      {...register('description')}
                      rows={4}
                      className='w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-100 focus:ring-2 focus:ring-purple-600 focus:outline-none'
                      placeholder='Describe your product...'
                    />
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label className='mb-1.5 block text-sm font-medium text-gray-300'>
                      Product Image
                    </label>
                    <label
                      htmlFor='image'
                      className={`group relative flex aspect-square w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-600 bg-gray-900 transition hover:border-purple-600 hover:bg-gray-800 ${
                        imagePreview ? 'overflow-hidden' : ''
                      }`}
                    >
                      {imagePreview ? (
                        <>
                          <img
                            src={imagePreview}
                            alt='Preview'
                            className='absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105'
                          />
                          <div className='absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100'>
                            <p className='rounded-md bg-white/20 px-3 py-1.5 text-sm font-medium text-gray-100'>
                              Change Image
                            </p>
                          </div>
                        </>
                      ) : (
                        <div className='flex flex-col items-center text-gray-400'>
                          <UploadCloud className='mb-2 h-10 w-10 text-gray-500' />
                          <p className='text-sm font-medium text-gray-300'>
                            Click to upload
                          </p>
                          <p className='mt-1 text-xs text-gray-500'>
                            Max size: 3MB
                          </p>
                        </div>
                      )}
                      <input
                        id='image'
                        type='file'
                        accept='image/*'
                        onChange={handleImageChange}
                        className='hidden'
                      />
                    </label>
                  </div>

                  {/* Availability */}
                  <div className='flex items-center gap-2'>
                    <input
                      type='checkbox'
                      id='available'
                      {...register('available')}
                      className='h-4 w-4 rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-600'
                    />
                    <label
                      htmlFor='available'
                      className='text-sm text-gray-300'
                    >
                      Available for order
                    </label>
                  </div>
                </form>

                {/* Footer */}
                <div className='sticky bottom-0 border-t border-gray-700 bg-gray-900 px-4 py-4 sm:px-6'>
                  <div className='flex gap-3'>
                    <button
                      type='button'
                      onClick={resetForm}
                      className='flex-1 rounded-lg border border-gray-600 bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-200 hover:bg-gray-700'
                    >
                      Cancel
                    </button>
                    <button
                      type='submit'
                      onClick={handleSubmit(onSubmit)}
                      disabled={isSubmitting}
                      className='flex-1 rounded-lg bg-purple-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-purple-600 disabled:bg-gray-500'
                    >
                      {isSubmitting
                        ? 'Saving...'
                        : editingId
                          ? 'Update Product'
                          : 'Add Product'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
