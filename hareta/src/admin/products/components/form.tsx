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

  const getPreviewImage = (item: any) => {
    return (
      item.images?.variants?.jpg?.[400] ||
      item.images?.variants?.avif?.[400] ||
      item.images?.lqip ||
      null
    );
  };

  const handleEdit = (item: any) => {
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
    <div className='mx-auto max-w-7xl p-3 sm:p-6'>
      {/* Header with Add Button */}
      <div className='mb-6 flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900 sm:text-3xl'>
            Products
          </h1>
          <p className='mt-1 text-sm text-gray-600'>
            Manage your product catalog
          </p>
        </div>
        <button
          onClick={handleAddNew}
          className='flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-green-700 sm:px-6'
        >
          <Plus className='h-4 w-4 sm:h-5 sm:w-5' />
          <span className='hidden sm:inline'>Add Product</span>
          <span className='sm:hidden'>Add</span>
        </button>
      </div>

      {/* Product Grid */}
      <div className='rounded-xl bg-white p-4 shadow sm:p-6'>
        {loading ? (
          <div className='flex h-64 items-center justify-center'>
            <div className='text-center'>
              <div className='mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-green-600'></div>
              <p className='mt-2 text-sm text-gray-600'>Loading products...</p>
            </div>
          </div>
        ) : menuItems.length === 0 ? (
          <div className='flex h-64 flex-col items-center justify-center gap-3 text-center'>
            <Package className='h-12 w-12 text-gray-400' />
            <div>
              <h3 className='text-lg font-semibold text-gray-900'>
                No products yet
              </h3>
              <p className='mt-1 text-sm text-gray-600'>
                Get started by adding your first product
              </p>
            </div>
            <button
              onClick={handleAddNew}
              className='mt-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700'
            >
              Add Your First Product
            </button>
          </div>
        ) : (
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4'>
            {menuItems.map((item) => (
              <div
                key={item.id}
                className='group relative flex flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200 transition hover:shadow-md'
              >
                {/* Image */}
                {item.image ? (
                  <div className='relative overflow-hidden'>
                    <picture>
                      <source
                        srcSet={item.image?.variants?.avif?.[400]}
                        type='image/avif'
                      />
                      <img
                        src={item.image?.variants?.jpg?.[400]}
                        alt={item.name}
                        className='h-48 w-full object-cover transition-transform duration-300 group-hover:scale-105'
                      />
                    </picture>

                    <span
                      className={`absolute top-3 left-3 rounded-full px-3 py-1 text-xs font-medium backdrop-blur-md ${
                        item.available
                          ? 'bg-green-100/80 text-green-700'
                          : 'bg-red-100/80 text-red-700'
                      }`}
                    >
                      {item.available ? 'Available' : 'Unavailable'}
                    </span>

                    {/* Desktop: Floating controls */}
                    <div className='absolute top-3 right-3 hidden gap-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:flex'>
                      <button
                        onClick={() => handleEdit(item)}
                        className='rounded-full bg-white/90 p-2 text-blue-600 shadow-lg hover:bg-blue-50'
                        title='Edit'
                      >
                        <Edit className='h-4 w-4' />
                      </button>
                      <button
                        onClick={() => deleteMenuItem(item.id, queryClient)}
                        className='rounded-full bg-white/90 p-2 text-red-600 shadow-lg hover:bg-red-50'
                        title='Delete'
                      >
                        <Trash2 className='h-4 w-4' />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className='flex h-48 items-center justify-center bg-gray-100 text-gray-400'>
                    <Package className='h-12 w-12' />
                  </div>
                )}

                {/* Content */}
                <div className='flex flex-1 flex-col p-4'>
                  <h3 className='line-clamp-2 text-base font-semibold text-gray-900'>
                    {item.name}
                  </h3>
                  <p className='mt-1 line-clamp-2 text-sm text-gray-600'>
                    {item.description || 'No description available.'}
                  </p>

                  <div className='mt-auto pt-3'>
                    <p className='text-lg font-bold text-green-600'>
                      KES {item.price.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Mobile: Bottom action bar */}
                <div className='flex items-center justify-around border-t border-gray-200 py-2 text-sm sm:hidden'>
                  <button
                    onClick={() => toggleAvailability(item, queryClient)}
                    className='flex flex-col items-center gap-1 px-2'
                  >
                    <span className='text-xs text-gray-600'>Toggle</span>
                  </button>
                  <button
                    onClick={() => handleEdit(item)}
                    className='flex flex-col items-center gap-1 px-2'
                  >
                    <Edit className='h-4 w-4 text-blue-500' />
                    <span className='text-xs text-gray-600'>Edit</span>
                  </button>
                  <button
                    onClick={() => setManagingVariantsFor(item.id)}
                    className='flex flex-col items-center gap-1 px-2'
                  >
                    <Package className='h-4 w-4 text-purple-500' />
                    <span className='text-xs text-gray-600'>Variants</span>
                  </button>
                  <button
                    onClick={() => deleteMenuItem(item.id, queryClient)}
                    className='flex flex-col items-center gap-1 px-2'
                  >
                    <Trash2 className='h-4 w-4 text-red-500' />
                    <span className='text-xs text-gray-600'>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Slide-Over Panel */}
      {isSlideOverOpen && (
        <div className='fixed inset-0 z-50 overflow-hidden'>
          <div
            className='absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity'
            onClick={resetForm}
          />

          <div className='fixed inset-y-0 right-0 flex max-w-full pl-10'>
            <div className='w-screen max-w-md sm:max-w-lg'>
              <div className='flex h-full flex-col overflow-y-auto bg-white shadow-2xl'>
                {/* Header */}
                <div className='sticky top-0 z-10 border-b border-gray-200 bg-gray-50 px-4 py-4 sm:px-6'>
                  <div className='flex items-center justify-between'>
                    <h2 className='text-lg font-semibold text-gray-900 sm:text-xl'>
                      {editingId ? 'Edit Product' : 'Add New Product'}
                    </h2>
                    <button
                      onClick={resetForm}
                      className='rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600'
                    >
                      <X className='h-5 w-5' />
                    </button>
                  </div>
                </div>

                {/* Form */}
                <form
                  onSubmit={handleSubmit(onSubmit)}
                  className='flex-1 px-4 py-6 sm:px-6'
                >
                  <div className='space-y-5'>
                    {/* Product Name */}
                    <div>
                      <label className='mb-1.5 block text-sm font-medium text-gray-700'>
                        Product Name *
                      </label>
                      <input
                        type='text'
                        {...register('name')}
                        className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none'
                        placeholder='e.g., Margherita Pizza'
                      />
                      {errors.name && (
                        <p className='mt-1 text-xs text-red-600'>
                          {errors.name.message}
                        </p>
                      )}
                    </div>

                    {/* Price & Category */}
                    <div className='grid grid-cols-2 gap-4'>
                      <div>
                        <label className='mb-1.5 block text-sm font-medium text-gray-700'>
                          Price *
                        </label>
                        <input
                          type='number'
                          step='0.01'
                          {...register('price')}
                          className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none'
                          placeholder='0.00'
                        />
                        {errors.price && (
                          <p className='mt-1 text-xs text-red-600'>
                            {errors.price.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className='mb-1.5 block text-sm font-medium text-gray-700'>
                          Category
                        </label>
                        <select
                          {...register('category_id')}
                          className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none'
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
                      <label className='mb-1.5 block text-sm font-medium text-gray-700'>
                        Description
                      </label>
                      <textarea
                        {...register('description')}
                        rows={4}
                        className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none'
                        placeholder='Describe your product...'
                      />
                    </div>

                    {/* Image Upload */}
                    <div>
                      <label className='mb-1.5 block text-sm font-medium text-gray-700'>
                        Product Image
                      </label>
                      <label
                        htmlFor='image'
                        className={`group relative flex aspect-square w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 transition hover:border-green-500 hover:bg-green-50 ${
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
                              <p className='rounded-md bg-white/90 px-3 py-1.5 text-sm font-medium text-gray-800'>
                                Change Image
                              </p>
                            </div>
                          </>
                        ) : (
                          <div className='flex flex-col items-center text-gray-500'>
                            <UploadCloud className='mb-2 h-10 w-10 text-gray-400' />
                            <p className='text-sm font-medium text-gray-600'>
                              Click to upload
                            </p>
                            <p className='mt-1 text-xs text-gray-400'>
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

                    {/* Available Checkbox */}
                    <div className='flex items-center gap-2'>
                      <input
                        type='checkbox'
                        id='available'
                        {...register('available')}
                        className='h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500'
                      />
                      <label
                        htmlFor='available'
                        className='text-sm text-gray-700'
                      >
                        Available for order
                      </label>
                    </div>
                  </div>
                </form>

                {/* Footer */}
                <div className='sticky bottom-0 border-t border-gray-200 bg-gray-50 px-4 py-4 sm:px-6'>
                  <div className='flex gap-3'>
                    <button
                      type='button'
                      onClick={resetForm}
                      className='flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100'
                    >
                      Cancel
                    </button>
                    <button
                      type='submit'
                      onClick={handleSubmit(onSubmit)}
                      disabled={isSubmitting}
                      className='flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-green-700 disabled:bg-gray-400'
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
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm'>
          <div className='relative w-full max-w-lg rounded-2xl bg-white p-4 shadow-2xl sm:p-6'>
            <button
              onClick={() => setManagingVariantsFor(null)}
              className='absolute top-4 right-4 rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600'
            >
              <X className='h-5 w-5' />
            </button>
            <div className='mt-2'>
              <ProductVariantsManager productId={managingVariantsFor} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProducts;
