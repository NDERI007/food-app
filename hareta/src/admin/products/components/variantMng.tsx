import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAdminStore } from '@utils/hooks/adminStore';
import { useProductVariants } from '@utils/hooks/productStore';
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
  const { data: variants = [], isLoading } = useProductVariants(productId);

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
    <div className='rounded-xl border border-gray-800 bg-gray-900 p-4 shadow-lg sm:p-6'>
      <h3 className='mb-4 text-base font-semibold text-gray-100 sm:text-lg'>
        Manage Variants
      </h3>

      <div
        className={`transition-all duration-300 ${showForm ? 'opacity-50' : 'opacity-100'}`}
      >
        <ul className='mb-4 space-y-2'>
          {isLoading ? (
            <p className='text-gray-400'>Loading...</p>
          ) : variants.length > 0 ? (
            variants.map((v) => (
              <li
                key={v.id}
                className='hover:bg-gray-750 flex flex-col rounded-lg border border-gray-800 bg-gray-800 p-3 shadow-sm transition hover:shadow-md sm:flex-row sm:items-center sm:justify-between sm:p-4'
              >
                <div className='mb-2 sm:mb-0'>
                  <span className='text-sm font-medium text-gray-100 sm:text-base'>
                    {v.size_name}
                  </span>
                  <span className='ml-2 text-sm text-gray-400'>
                    ${v.price.toFixed(2)}
                  </span>
                  {!v.is_available && (
                    <span className='ml-2 rounded-full bg-red-900/40 px-2 py-0.5 text-xs text-red-300'>
                      Unavailable
                    </span>
                  )}
                </div>
                <div className='flex gap-2'>
                  <button
                    onClick={() => handleEdit(v)}
                    disabled={showForm}
                    className='flex items-center gap-1 rounded-md bg-gray-700 px-3 py-1.5 text-xs text-gray-200 transition hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm'
                  >
                    <Edit2 size={14} />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(v)}
                    disabled={showForm}
                    className='flex items-center gap-1 rounded-md bg-red-900/50 px-3 py-1.5 text-xs text-red-300 transition hover:bg-red-800/70 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm'
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </li>
            ))
          ) : (
            <p className='text-sm text-gray-500 italic'>No variants found</p>
          )}
        </ul>

        {!showForm && (
          <button
            onClick={handleAddNew}
            className='flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-700 bg-gray-800 p-4 text-[#FEFAEF] transition hover:border-purple-900 hover:bg-purple-900/40'
          >
            <Plus size={20} />
            <span className='font-medium'>Add New Variant</span>
          </button>
        )}
      </div>

      {showForm && (
        <div className='mt-4 rounded-xl bg-gray-800 p-4 shadow-lg sm:p-5'>
          <h4 className='mb-3 text-base font-semibold text-[#FEFAEF] sm:text-lg'>
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
