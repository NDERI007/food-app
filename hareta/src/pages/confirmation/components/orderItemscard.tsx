import { formatCurrency } from '@utils/hooks/confirmfun';
import type { Order_Item } from '@utils/schemas/order';
import { Package } from 'lucide-react';

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
        {items.map((item) => {
          // ✅ Extract best available image resolutions
          const fullRes =
            item.image_url?.variants?.avif?.['800'] ||
            item.image_url?.variants?.jpg?.['800'];

          const lqip = item.image_url?.lqip;

          return (
            <div
              key={item.id}
              className='flex items-center justify-between border-b border-gray-200 py-4 last:border-b-0'
            >
              <div className='flex items-center'>
                <div
                  className='relative mr-4 h-16 w-16 overflow-hidden rounded-lg'
                  style={{ backgroundColor: '#fefaef' }}
                >
                  {fullRes ? (
                    <picture>
                      {/* prefer AVIF */}
                      <source
                        srcSet={item.image_url?.variants?.avif?.['800']}
                        type='image/avif'
                      />
                      {/* fallback to JPG */}
                      <source
                        srcSet={item.image_url?.variants?.jpg?.['800']}
                        type='image/jpeg'
                      />

                      <img
                        src={lqip}
                        data-full={fullRes}
                        alt={item.product_name}
                        className='h-full w-full scale-105 object-cover blur-sm transition-all duration-[600ms] ease-out'
                        onLoad={(e) => {
                          const img = e.currentTarget;
                          const high = new Image();
                          high.src = fullRes;
                          high.onload = () => {
                            img.src = fullRes;
                            img.classList.remove('blur-sm', 'scale-105');
                          };
                        }}
                      />
                    </picture>
                  ) : (
                    <Package className='h-8 w-8 text-green-900' />
                  )}
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
          );
        })}
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
