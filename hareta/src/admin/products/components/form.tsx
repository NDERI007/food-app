import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { useAdminStore } from '@utils/hooks/productStore';
import { UploadCloud } from 'lucide-react';

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
    .union([
      z.string(), // For existing image_url
      z.instanceof(File), // For new uploads
    ])
    .optional()
    .nullable(),
});

type MenuItemFormData = z.infer<typeof menuItemSchema>;

const AdminProducts: React.FC = () => {
  const {
    menuItems,
    categories,
    loading,
    fetchMenuItems,
    fetchCategories,
    deleteMenuItem,
    toggleAvailability,
  } = useAdminStore();

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

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

  useEffect(() => {
    fetchMenuItems();
    fetchCategories();
  }, [fetchMenuItems, fetchCategories]);

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
      } else {
        await axios.post(`/api/prod/menu-items`, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      resetForm();
      await fetchMenuItems();
    } catch (error) {
      console.error('Error saving menu item:', error);
      alert('Error saving menu item. Please try again.');
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
  };

  return (
    <div className='mx-auto max-w-6xl p-6'>
      {/* Form */}
      <div className='mb-8 rounded-xl bg-white p-6 shadow'>
        <h2 className='mb-4 text-xl font-semibold'>
          {editingId ? 'Edit Product' : 'Add New Product'}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
          {/* Name, Price, Category */}
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
            <div>
              <label className='mb-1 block font-medium text-gray-700'>
                Product Name *
              </label>
              <input
                type='text'
                {...register('name')}
                className='w-full rounded-lg border border-gray-300 p-2 focus:ring-2 focus:ring-green-500 focus:outline-none'
              />
              {errors.name && (
                <p className='mt-1 text-sm text-red-600'>
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label className='mb-1 block font-medium text-gray-700'>
                Price *
              </label>
              <input
                type='number'
                step='0.01'
                {...register('price')}
                className='w-full rounded-lg border border-gray-300 p-2 focus:ring-2 focus:ring-green-500 focus:outline-none'
              />
              {errors.price && (
                <p className='mt-1 text-sm text-red-600'>
                  {errors.price.message}
                </p>
              )}
            </div>

            <div>
              <label className='mb-1 block font-medium text-gray-700'>
                Category
              </label>
              <select
                {...register('category_id')}
                className='w-full rounded-lg border border-gray-300 p-2 focus:ring-2 focus:ring-green-500 focus:outline-none'
              >
                <option value=''>Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className='flex items-center space-x-2'>
            <input
              type='checkbox'
              id='available'
              {...register('available')}
              className='h-5 w-5 accent-green-600'
            />
            <label htmlFor='available' className='text-gray-700'>
              Available for order
            </label>
          </div>

          <div>
            <label className='mb-1 block font-medium text-gray-700'>
              Description
            </label>
            <textarea
              {...register('description')}
              className='min-h-[100px] w-full rounded-lg border border-gray-300 p-2 focus:ring-2 focus:ring-green-500 focus:outline-none'
            />
          </div>

          {/* Image Upload */}
          <div className='w-full'>
            <label
              htmlFor='image'
              className={`group relative flex aspect-square w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 transition duration-200 ease-in-out hover:border-green-500 hover:bg-green-50 ${
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
                  <div className='absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100'>
                    <p className='rounded-md bg-white/80 px-3 py-1 text-sm font-medium text-gray-800'>
                      Change Image
                    </p>
                  </div>
                </>
              ) : (
                <div className='flex flex-col items-center justify-center text-gray-500'>
                  <UploadCloud
                    className='mb-3 h-10 w-10 text-gray-400'
                    strokeWidth={1.5}
                  />
                  <p className='text-sm font-medium text-gray-600'>
                    Click or drag to upload
                  </p>
                  <p className='mt-1 text-xs text-gray-400'>Max size: 3MB</p>
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

          <div className='flex gap-3'>
            <button
              type='submit'
              disabled={isSubmitting || loading}
              className='rounded-lg bg-green-600 px-6 py-2 text-white transition hover:bg-green-700 disabled:bg-gray-400'
            >
              {isSubmitting || loading
                ? 'Saving...'
                : editingId
                  ? 'Update Product'
                  : 'Add Product'}
            </button>
            {editingId && (
              <button
                type='button'
                onClick={resetForm}
                className='rounded-lg bg-gray-500 px-6 py-2 text-white transition hover:bg-gray-600'
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Product List */}
      <div className='rounded-xl bg-white p-6 shadow'>
        <h2 className='mb-4 text-xl font-semibold'>Product List</h2>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
            {menuItems.map((item) => (
              <div
                key={item.id}
                className='group relative flex flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-orange-50 to-yellow-50 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl'
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

                    {/* Availability badge */}
                    <span
                      className={`absolute top-3 left-3 rounded-full px-3 py-1 text-xs font-medium backdrop-blur-md ${
                        item.available
                          ? 'bg-green-100/80 text-green-700'
                          : 'bg-red-100/80 text-red-700'
                      }`}
                    >
                      {item.available ? 'Available' : 'Unavailable'}
                    </span>

                    {/* Desktop: floating admin controls */}
                    <div className='absolute top-3 right-3 hidden gap-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:flex'>
                      <button
                        onClick={() => toggleAvailability(item)}
                        className='rounded-full bg-white/80 p-2 text-sky-600 shadow hover:bg-sky-50 hover:text-sky-700'
                        title='Toggle Availability'
                      >
                        <svg
                          xmlns='http://www.w3.org/2000/svg'
                          className='h-4 w-4'
                          fill='none'
                          viewBox='0 0 24 24'
                          stroke='currentColor'
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            d='M12 6v6l4 2'
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleEdit(item)}
                        className='rounded-full bg-white/80 p-2 text-yellow-600 shadow hover:bg-yellow-50 hover:text-yellow-700'
                        title='Edit'
                      >
                        <svg
                          xmlns='http://www.w3.org/2000/svg'
                          className='h-4 w-4'
                          fill='none'
                          viewBox='0 0 24 24'
                          stroke='currentColor'
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            d='M16.862 4.487a2.118 2.118 0 013 3L7.5 19.849l-4 1 1-4L16.862 4.487z'
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => deleteMenuItem(item.id)}
                        className='rounded-full bg-white/80 p-2 text-red-600 shadow hover:bg-red-50 hover:text-red-700'
                        title='Delete'
                      >
                        <svg
                          xmlns='http://www.w3.org/2000/svg'
                          className='h-4 w-4'
                          fill='none'
                          viewBox='0 0 24 24'
                          stroke='currentColor'
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4H9v3m10 0H5'
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className='flex h-48 items-center justify-center bg-gray-100 text-gray-400'>
                    No Image
                  </div>
                )}

                {/* Content */}
                <div className='flex flex-col p-5'>
                  <h3 className='text-lg font-semibold text-gray-800'>
                    {item.name}
                  </h3>
                  <p className='mt-2 line-clamp-2 text-sm text-gray-600'>
                    {item.description || 'No description available.'}
                  </p>

                  <div className='mt-4 flex items-center justify-between'>
                    <p className='text-lg font-bold text-amber-600'>
                      ${item.price.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Mobile: fixed admin controls */}
                <div className='flex items-center justify-around border-t border-gray-200 bg-white/80 px-2 py-2 text-sm text-gray-600 sm:hidden'>
                  <button
                    onClick={() => toggleAvailability(item)}
                    className='flex flex-col items-center gap-0.5'
                  >
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      className='h-4 w-4 text-sky-500'
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        d='M12 6v6l4 2'
                      />
                    </svg>
                    <span className='text-xs'>Toggle</span>
                  </button>
                  <button
                    onClick={() => handleEdit(item)}
                    className='flex flex-col items-center gap-0.5'
                  >
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      className='h-4 w-4 text-yellow-500'
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        d='M16.862 4.487a2.118 2.118 0 013 3L7.5 19.849l-4 1 1-4L16.862 4.487z'
                      />
                    </svg>
                    <span className='text-xs'>Edit</span>
                  </button>
                  <button
                    onClick={() => deleteMenuItem(item.id)}
                    className='flex flex-col items-center gap-0.5'
                  >
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      className='h-4 w-4 text-red-500'
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4H9v3m10 0H5'
                      />
                    </svg>
                    <span className='text-xs'>Delete</span>
                  </button>
                </div>
              </div>
            ))}

            {menuItems.length === 0 && (
              <p className='col-span-full text-center text-gray-500'>
                No products found.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminProducts;
