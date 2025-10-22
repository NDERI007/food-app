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
      } else {
        await addVariant(productId, values, queryClient);
      }
      onClose?.();
    } catch (error) {
      console.error('Variant save failed:', error);

      // Better error handling
      if (axios.isAxiosError(error)) {
        const message =
          error.response?.data?.message || error.response?.data?.error;
        toast.error(message || 'Failed to save variant. Please try again.');
      } else if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('An unexpected error occurred');
      }
    }
  };

  return (
    <div className='space-y-4'>
      <div>
        <label
          htmlFor='size_name'
          className='mb-1 block text-sm font-medium text-[#4b6045]'
        >
          Size Name
        </label>
        <input
          id='size_name'
          placeholder='e.g., Small, Medium, Large'
          {...register('size_name')}
          className='w-full rounded-md border border-[#ccd5c5] bg-[#fafaf7] px-3 py-2 text-sm text-[#1b4d2b] placeholder:text-[#7a8a72] focus:border-[#3a7d44] focus:ring-2 focus:ring-[#a8c3a3] focus:outline-none'
        />
        {errors.size_name && (
          <p className='mt-1 text-xs text-[#a94442]'>
            {errors.size_name.message}
          </p>
        )}
      </div>

      <div className='grid grid-cols-2 gap-4'>
        <div>
          <label
            htmlFor='price'
            className='mb-1 block text-sm font-medium text-[#4b6045]'
          >
            Price ($)
          </label>
          <input
            id='price'
            type='number'
            step='0.01'
            {...register('price', { valueAsNumber: true })}
            placeholder='0.00'
            className='w-full rounded-md border border-[#ccd5c5] bg-[#fafaf7] px-3 py-2 text-sm text-[#1b4d2b] focus:border-[#3a7d44] focus:ring-2 focus:ring-[#a8c3a3] focus:outline-none'
          />
          {errors.price && (
            <p className='mt-1 text-xs text-[#a94442]'>
              {errors.price.message}
            </p>
          )}
        </div>

        <div className='flex flex-col justify-end'>
          <label className='mb-1 flex items-center gap-2 text-sm font-medium text-[#4b6045]'>
            <input
              id='is_available'
              type='checkbox'
              {...register('is_available')}
              checked={watch('is_available')}
              className='h-4 w-4 rounded border-[#a8c3a3] text-[#3a7d44] focus:ring-[#3a7d44]'
            />
            Available for sale
          </label>
        </div>
      </div>

      <div className='flex gap-3 pt-2'>
        <button
          type='button'
          onClick={() => handleSubmit(onSubmit)()}
          disabled={isSubmitting}
          className='flex flex-1 items-center justify-center gap-2 rounded-md bg-[#3a7d44] py-2 text-sm font-medium text-white transition hover:bg-[#326c3a] disabled:bg-[#9cb79f]'
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
          className='flex flex-1 items-center justify-center rounded-md border border-[#ccd5c5] bg-white py-2 text-sm font-medium text-[#4b6045] transition hover:bg-[#f5f8f2] disabled:opacity-50'
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
