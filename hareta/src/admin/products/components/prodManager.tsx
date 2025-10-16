import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAdminStore } from '@utils/hooks/adminStore';
import { useMenuItem } from '@utils/hooks/productStore';
import type { ProductVariant } from '@utils/schemas/menu';
import { VariantForm } from './variant-form';
import { Plus, Edit2, Trash2 } from 'lucide-react';

export const ProductVariantsManager: React.FC<{ productId: string }> = ({
  productId,
}) => {
  const queryClient = useQueryClient();
  const { deleteVariant } = useAdminStore();
  const [showForm, setShowForm] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(
    null,
  );
  const { data: product, isLoading } = useMenuItem(productId);

  const variants = product?.product_variants || [];

  const handleAddNew = () => {
    setEditingVariant(null);
    setShowForm(true);
  };

  const handleEdit = (variant: ProductVariant) => {
    setEditingVariant(variant);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingVariant(null);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingVariant(null);
  };

  const handleDelete = async (variant: ProductVariant) => {
    if (confirm(`Delete variant "${variant.size_name}"?`)) {
      try {
        await deleteVariant(variant.id, productId, queryClient);
        toast.success('Variant deleted successfully');
      } catch {
        toast.error('Failed to delete variant');
      }
    }
  };

  return (
    <div className='rounded-xl border border-[#d9e0d0] bg-[#faf8f2] p-4 shadow-sm sm:p-6'>
      <h3 className='mb-4 text-base font-semibold text-[#1b4d2b] sm:text-lg'>
        Manage Variants
      </h3>

      {/* Variants List */}
      <div
        className={`transition-all duration-300 ${showForm ? 'opacity-50' : 'opacity-100'}`}
      >
        <ul className='mb-4 space-y-2'>
          {isLoading ? (
            <p className='text-[#1b4d2b]'>Loading...</p>
          ) : variants.length > 0 ? (
            variants.map((v) => (
              <li
                key={v.id}
                className='flex flex-col rounded-lg border border-[#e0e7db] bg-[#fffefc] p-3 shadow-sm transition hover:shadow-md sm:flex-row sm:items-center sm:justify-between sm:p-4'
              >
                <div className='mb-2 sm:mb-0'>
                  <span className='text-sm font-medium text-[#1b4d2b] sm:text-base'>
                    {v.size_name}
                  </span>
                  <span className='ml-2 text-sm text-[#4b6045]'>
                    ${v.price.toFixed(2)}
                  </span>
                  {!v.is_available && (
                    <span className='ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700'>
                      Unavailable
                    </span>
                  )}
                </div>
                <div className='flex gap-2'>
                  <button
                    onClick={() => handleEdit(v)}
                    disabled={showForm}
                    className='flex items-center gap-1 rounded-md bg-[#e3e9e0] px-3 py-1.5 text-xs text-[#2c5b36] transition hover:bg-[#d3decf] disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm'
                  >
                    <Edit2 size={14} />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(v)}
                    disabled={showForm}
                    className='flex items-center gap-1 rounded-md bg-[#f9e0dd] px-3 py-1.5 text-xs text-[#a94442] transition hover:bg-[#f2c9c5] disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm'
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </li>
            ))
          ) : (
            <p className='text-sm text-[#1b4d2b] italic'>No variants found</p>
          )}
        </ul>

        {!showForm && (
          <button
            onClick={handleAddNew}
            className='flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#d9e0d0] bg-[#fefcf7] p-4 text-[#3a7d44] transition hover:border-[#3a7d44] hover:bg-[#f5f8f2]'
          >
            <Plus size={20} />
            <span className='font-medium'>Add New Variant</span>
          </button>
        )}
      </div>

      {/* Inline Form */}
      {showForm && (
        <div className='animate-in fade-in slide-in-from-top-4 mt-4 rounded-xl border-2 border-[#3a7d44] bg-[#f5f8f2] p-4 shadow-lg duration-300 sm:p-5'>
          <h4 className='mb-3 text-base font-semibold text-[#1b4d2b] sm:text-lg'>
            {editingVariant ? 'Edit Variant' : 'Add New Variant'}
          </h4>
          <VariantForm
            productId={productId}
            variant={editingVariant || undefined}
            onClose={handleFormSuccess}
            onCancel={handleCancel}
          />
        </div>
      )}
    </div>
  );
};
