import { Package } from 'lucide-react';
import { formatCurrency } from '@utils/hooks/confirmfun';
import type { Order_Item } from '@utils/schemas/order';

interface OrderItemsCardProps {
  items: Order_Item[];
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  deliveryType: 'pickup' | 'delivery';
}

export const OrderItemsCard = ({
  items,
  subtotal,
  deliveryFee,
  totalAmount,
  deliveryType,
}: OrderItemsCardProps) => {
  return (
    <div className='mb-6 rounded-2xl bg-white p-8 shadow-lg'>
      <h2 className='mb-6 text-xl font-bold text-green-900'>Order Items</h2>

      <div className='space-y-4'>
        {items.map((item) => (
          <div
            key={item.id}
            className='flex items-center justify-between border-b border-gray-200 py-4 last:border-b-0'
          >
            <div className='flex items-center'>
              <div
                className='mr-4 flex h-16 w-16 items-center justify-center rounded-lg bg-green-50 text-green-900'
                aria-hidden
              >
                <Package className='h-8 w-8' />
              </div>

              <div>
                <p className='font-semibold text-green-900'>
                  {item.product_name}
                </p>
                <p className='text-sm text-gray-600'>
                  Quantity: {item.quantity}
                  {item.variant_size && (
                    <span className='ml-2 text-gray-500'>
                      • Size: {item.variant_size}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <p className='font-semibold text-green-900'>
              {formatCurrency(item.price)}
            </p>
          </div>
        ))}
      </div>

      <div className='mt-6 space-y-2 border-t border-gray-200 pt-6'>
        <div className='flex justify-between text-gray-700'>
          <p>Subtotal</p>
          <p>{formatCurrency(subtotal)}</p>
        </div>

        <div className='flex justify-between text-gray-700'>
          <p>{deliveryType === 'delivery' ? 'Delivery Fee' : 'Pickup'}</p>
          <p>{formatCurrency(deliveryFee)}</p>
        </div>

        <div className='flex items-center justify-between border-t border-green-900 pt-2'>
          <p className='text-lg font-bold text-green-900'>Total</p>
          <p className='text-2xl font-bold text-green-900'>
            {formatCurrency(totalAmount)}
          </p>
        </div>
      </div>
    </div>
  );
};
