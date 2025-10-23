import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import type { ProductVariant } from '@utils/schemas/menu';
import { useAdminStore } from '@utils/hooks/adminStore';
import { Check, Loader2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const variantSchema = z.object({
  size_name: z.string().min(1, 'Size name is required'),
  price: z.coerce.number().min(0, 'Price must be positive'),
  is_available: z.boolean().default(true),
});

type VariantFormValues = z.infer<typeof variantSchema>;

interface VariantFormProps {
  productId: string;
  variant?: ProductVariant;
  onClose?: () => void;
  onCancel?: () => void;
}

export const VariantForm: React.FC<VariantFormProps> = ({
  productId,
  variant,
  onClose,
  onCancel,
}) => {
  const queryClient = useQueryClient();
  const { addVariant, updateVariant } = useAdminStore();

  const form = useForm({
    resolver: zodResolver(variantSchema),
    defaultValues: variant
      ? {
          size_name: variant.size_name,
          price: variant.price,
          is_available: variant.is_available ?? true,
        }
      : {
          size_name: '',
          price: 0,
          is_available: true,
        },
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = form;

  const onSubmit = async (values: VariantFormValues) => {
    try {
      if (variant) {
        await updateVariant(variant.id, productId, values, queryClient);
        toast.success('Variant updated successfully');
      } else {
        await addVariant(productId, values, queryClient);
        toast.success('Variant added successfully');
      }
      onClose?.();
    } catch (error) {
      console.error('Variant save failed:', error);
      if (axios.isAxiosError(error)) {
        const msg =
          error.response?.data?.message || error.response?.data?.error;
        toast.error(msg || 'Failed to save variant');
      } else if (error instanceof Error) toast.error(error.message);
      else toast.error('Unexpected error');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
      <div>
        <label
          htmlFor='size_name'
          className='mb-1 block text-sm font-medium text-gray-300'
        >
          Size Name
        </label>
        <input
          id='size_name'
          placeholder='e.g., Small, Medium, Large'
          {...register('size_name')}
          className='w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none'
        />
        {errors.size_name && (
          <p className='mt-1 text-xs text-red-400'>
            {errors.size_name.message}
          </p>
        )}
      </div>

      <div className='grid grid-cols-2 gap-4'>
        <div>
          <label
            htmlFor='price'
            className='mb-1 block text-sm font-medium text-gray-300'
          >
            Price ($)
          </label>
          <input
            id='price'
            type='number'
            step='0.01'
            {...register('price', { valueAsNumber: true })}
            placeholder='0.00'
            className='w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none'
          />
          {errors.price && (
            <p className='mt-1 text-xs text-red-400'>{errors.price.message}</p>
          )}
        </div>

        <div className='flex flex-col justify-end'>
          <label className='mb-1 flex items-center gap-2 text-sm font-medium text-gray-300'>
            <input
              id='is_available'
              type='checkbox'
              {...register('is_available')}
              checked={watch('is_available')}
              className='h-4 w-4 rounded border-gray-700 bg-gray-800'
            />
            Available for sale
          </label>
        </div>
      </div>

      <div className='flex gap-3 pt-2'>
        <button
          type='submit'
          disabled={isSubmitting}
          className='flex flex-1 items-center justify-center gap-2 rounded-md bg-purple-900 py-2 text-sm font-medium text-[#FEFAEF] transition hover:bg-purple-800 disabled:bg-purple-950'
        >
          {isSubmitting ? (
            <Loader2 size={16} className='animate-spin' />
          ) : (
            <Check size={16} />
          )}
          {variant ? 'Update Variant' : 'Save Variant'}
        </button>

        <button
          type='button'
          onClick={onCancel}
          disabled={isSubmitting}
          className='flex flex-1 items-center justify-center rounded-md border border-gray-700 bg-gray-800 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 disabled:opacity-50'
        >
          Cancel
        </button>
      </div>
    </form>
  );
};
