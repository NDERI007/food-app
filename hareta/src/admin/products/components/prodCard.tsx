import React, { useState } from 'react';
import { Edit, Trash2, Package, Eye, EyeOff } from 'lucide-react';
import type { MenuItem } from '@utils/schemas/menu';
import { ConfirmModal } from '@admin/components/confirmModal';

interface ProductCardProps {
  item: MenuItem;
  onToggleAvailability: (item: MenuItem) => void;
  onEdit: (item: MenuItem) => void;
  onDelete: (id: string) => void;
  onManageVariants: (id: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  item,
  onToggleAvailability,
  onEdit,
  onDelete,
  onManageVariants,
}) => {
  const [showConfirm, setShowConfirm] = useState(false);
  return (
    <div className='overflow-hidden rounded-lg border border-gray-700 bg-gray-800 shadow-md transition-shadow duration-200 hover:shadow-xl'>
      <div className='flex flex-col gap-4 p-4 md:flex-row'>
        {/* Product Image */}
        <div className='h-32 w-full flex-shrink-0 overflow-hidden rounded-lg bg-gray-700 md:w-32'>
          {item.image ? (
            <picture>
              <source
                srcSet={item.image?.variants?.avif?.[400]}
                type='image/avif'
              />
              <img
                src={item.image?.variants?.jpg?.[400]}
                alt={item.name}
                className='h-full w-full object-cover'
              />
            </picture>
          ) : (
            <div className='flex h-full w-full items-center justify-center text-gray-500'>
              <Package className='h-12 w-12' />
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className='min-w-0 flex-grow'>
          <div className='mb-2 flex items-start justify-between gap-2'>
            <h3 className='truncate text-lg font-semibold text-gray-100'>
              {item.name}
            </h3>
            {/* Mobile: Availability toggle at top */}
            <div className='md:hidden'>
              <button
                onClick={() => onToggleAvailability(item)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  item.available
                    ? 'bg-green-900/70 text-green-200 hover:bg-green-800'
                    : 'bg-red-900/70 text-red-300 hover:bg-red-800'
                }`}
              >
                {item.available ? (
                  <>
                    <Eye className='h-3.5 w-3.5' />
                    <span>Available</span>
                  </>
                ) : (
                  <>
                    <EyeOff className='h-3.5 w-3.5' />
                    <span>Unavailable</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className='mb-3 space-y-1 text-sm text-gray-400'>
            <p className='font-medium text-green-400'>
              KES {item.price.toFixed(2)}
            </p>
            <p className='line-clamp-2'>
              {item.description || 'No description available.'}
            </p>
          </div>

          {/* Mobile: Action buttons */}
          <div className='mt-3 flex gap-2 md:hidden'>
            <button
              onClick={() => onEdit(item)}
              className='flex flex-1 items-center justify-center gap-2 rounded-lg border border-blue-800 bg-blue-900/50 px-4 py-2 text-blue-300 transition-colors hover:bg-blue-800/50'
            >
              <Edit className='h-4 w-4' />
              <span className='text-sm font-medium'>Edit</span>
            </button>
            <button
              onClick={() => onManageVariants(item.id)}
              className='flex flex-1 items-center justify-center gap-2 rounded-lg border border-purple-800 bg-purple-900/50 px-4 py-2 text-purple-300 transition-colors hover:bg-purple-800/50'
            >
              <Package className='h-4 w-4' />
              <span className='text-sm font-medium'>Variants</span>
            </button>
            <button
              onClick={() => setShowConfirm(true)}
              className='flex items-center justify-center gap-2 rounded-lg border border-red-800 bg-red-900/50 px-4 py-2 text-red-300 transition-colors hover:bg-red-800/50'
            >
              <Trash2 className='h-4 w-4' />
            </button>
          </div>
        </div>

        {/* Desktop: Action Buttons */}
        <div className='hidden flex-col items-end justify-between gap-2 md:flex'>
          {/* Availability Toggle */}
          <button
            onClick={() => onToggleAvailability(item)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              item.available
                ? 'bg-green-900/70 text-green-200 hover:bg-green-800'
                : 'bg-red-900/70 text-red-300 hover:bg-red-800'
            }`}
          >
            {item.available ? (
              <>
                <Eye className='h-4 w-4' />
                <span>Available</span>
              </>
            ) : (
              <>
                <EyeOff className='h-4 w-4' />
                <span>Unavailable</span>
              </>
            )}
          </button>

          {/* Action Buttons */}
          <div className='flex gap-2'>
            <button
              onClick={() => onEdit(item)}
              className='rounded-lg border border-blue-800 bg-blue-900/50 p-2 text-blue-300 transition-colors hover:bg-blue-800/50'
              title='Edit product'
            >
              <Edit className='h-5 w-5' />
            </button>
            <button
              onClick={() => onManageVariants(item.id)}
              className='rounded-lg border border-purple-800 bg-purple-900/50 p-2 text-purple-300 transition-colors hover:bg-purple-800/50'
              title='Manage variants'
            >
              <Package className='h-5 w-5' />
            </button>
            <button
              onClick={() => setShowConfirm(true)}
              className='rounded-lg border border-red-800 bg-red-900/50 p-2 text-red-300 transition-colors hover:bg-red-800/50'
              title='Delete product'
            >
              <Trash2 className='h-5 w-5' />
            </button>
          </div>
        </div>
      </div>
      <ConfirmModal
        show={showConfirm}
        message={`Delete "${item.name}"?`}
        onCancel={() => setShowConfirm(false)}
        onConfirm={() => {
          onDelete(item.id);
          setShowConfirm(false);
        }}
      />
    </div>
  );
};
