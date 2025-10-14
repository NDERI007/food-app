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
    setImagePreview(item.image_url);
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

          <div className='w-full'>
            <label
              htmlFor='image'
              className='flex h-40 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 transition hover:bg-gray-100'
            >
              <div className='flex flex-col items-center justify-center pt-5 pb-6'>
                <UploadCloud
                  className='mb-3 h-10 w-10 text-gray-400'
                  strokeWidth={1.5}
                />
                <p className='text-sm font-medium text-gray-600'>
                  Add your files here
                </p>
                <p className='mt-1 text-xs text-gray-500'>
                  Max file size up to 5 MB
                </p>
              </div>

              <input
                id='image'
                type='file'
                accept='image/*'
                onChange={handleImageChange}
                className='hidden'
              />
            </label>

            {imagePreview && (
              <div className='mt-4 flex justify-center'>
                <img
                  src={imagePreview}
                  alt='Preview'
                  className='h-40 w-40 rounded-lg object-cover shadow'
                />
              </div>
            )}
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
                className='overflow-hidden rounded-lg border border-gray-200 bg-white shadow transition hover:shadow-lg'
              >
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className='h-48 w-full object-cover'
                  />
                ) : (
                  <div className='flex h-48 items-center justify-center bg-gray-100 text-gray-400'>
                    No Image
                  </div>
                )}
                <div className='p-4'>
                  <div className='mb-2 flex items-start justify-between'>
                    <h3 className='text-lg font-bold text-gray-800'>
                      {item.name}
                    </h3>
                    <p className='font-semibold text-green-600'>
                      ${item.price.toFixed(2)}
                    </p>
                  </div>
                  <p className='mb-3 text-sm text-gray-600'>
                    {item.description || 'No description available'}
                  </p>
                  <div className='flex items-center justify-between border-t pt-3'>
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-medium ${
                        item.available
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {item.available ? 'Available' : 'Unavailable'}
                    </span>
                    <div className='flex gap-2'>
                      <button
                        onClick={() => toggleAvailability(item)}
                        className='rounded-lg bg-sky-500 px-3 py-1 text-sm text-white hover:bg-sky-600'
                      >
                        Toggle
                      </button>
                      <button
                        onClick={() => handleEdit(item)}
                        className='rounded-lg bg-yellow-400 px-3 py-1 text-sm text-black hover:bg-yellow-500'
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteMenuItem(item.id)}
                        className='rounded-lg bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700'
                      >
                        Delete
                      </button>
                    </div>
                  </div>
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
