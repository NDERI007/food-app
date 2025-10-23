import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UploadCloud, X } from 'lucide-react';
import type { MenuItem } from '@utils/schemas/menu';

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

export type MenuItemFormData = z.infer<typeof menuItemSchema>;

interface ProductFormSlideOverProps {
  isOpen: boolean;
  editingItem: MenuItem | null;
  categories: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSubmit: (data: MenuItemFormData) => Promise<void>;
}

export const ProductFormSlideOver: React.FC<ProductFormSlideOverProps> = ({
  isOpen,
  editingItem,
  categories,
  onClose,
  onSubmit,
}) => {
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    reset,
  } = useForm({
    resolver: zodResolver(menuItemSchema),
    defaultValues: {
      name: editingItem?.name || '',
      description: editingItem?.description || '',
      price: editingItem?.price || 0,
      available: editingItem?.available ?? true,
      category_id: editingItem?.category_id || '',
      image: null,
    },
  });

  React.useEffect(() => {
    if (editingItem) {
      reset({
        name: editingItem.name,
        description: editingItem.description || '',
        price: editingItem.price,
        available: editingItem.available,
        category_id: editingItem.category_id || '',
        image: null,
      });

      const previewImg =
        editingItem.image?.variants?.jpg?.[400] ||
        editingItem.image?.variants?.avif?.[400] ||
        editingItem.image?.lqip ||
        null;
      setImagePreview(previewImg);
    } else {
      reset({
        name: '',
        description: '',
        price: 0,
        available: true,
        category_id: '',
        image: null,
      });
      setImagePreview(null);
    }
  }, [editingItem, reset]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setValue('image', file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = async (data: MenuItemFormData) => {
    await onSubmit(data);
    reset();
    setImagePreview(null);
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 overflow-hidden'>
      <div
        className='absolute inset-0 bg-black/70 backdrop-blur-sm'
        onClick={onClose}
      />
      <div className='fixed inset-y-0 right-0 flex max-w-full pl-10'>
        <div className='w-screen max-w-md sm:max-w-lg'>
          <div className='flex h-full flex-col overflow-y-auto border-l border-gray-700 bg-gray-800 shadow-2xl'>
            {/* Header */}
            <div className='sticky top-0 z-10 border-b border-gray-700 bg-gray-900 px-4 py-4 sm:px-6'>
              <div className='flex items-center justify-between'>
                <h2 className='text-lg font-semibold text-gray-100 sm:text-xl'>
                  {editingItem ? 'Edit Product' : 'Add New Product'}
                </h2>
                <button
                  onClick={onClose}
                  className='rounded-lg p-2 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                >
                  <X className='h-5 w-5' />
                </button>
              </div>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit(handleFormSubmit)}
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
                  {errors.price && (
                    <p className='mt-1 text-xs text-red-400'>
                      {errors.price.message}
                    </p>
                  )}
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
                <label htmlFor='available' className='text-sm text-gray-300'>
                  Available for order
                </label>
              </div>
            </form>

            {/* Footer */}
            <div className='sticky bottom-0 border-t border-gray-700 bg-gray-900 px-4 py-4 sm:px-6'>
              <div className='flex gap-3'>
                <button
                  type='button'
                  onClick={onClose}
                  className='flex-1 rounded-lg border border-gray-600 bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-200 hover:bg-gray-700'
                >
                  Cancel
                </button>
                <button
                  type='submit'
                  onClick={handleSubmit(handleFormSubmit)}
                  disabled={isSubmitting}
                  className='flex-1 rounded-lg bg-purple-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-purple-600 disabled:bg-gray-500'
                >
                  {isSubmitting
                    ? 'Saving...'
                    : editingItem
                      ? 'Update Product'
                      : 'Add Product'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
