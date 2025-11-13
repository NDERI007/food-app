import { ConfirmModal } from '@components/confirmModal';
import { getImageUrl } from '@utils/hooks/getImage';
import { useCartStore } from '@utils/hooks/useCrt';
import {
  useDeliveryStore,
  FREE_DELIVERY_THRESHOLD,
} from '@utils/hooks/deliveryStore';
import {
  X,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  ArrowRight,
  TruckIcon,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CartDrawer() {
  const navigate = useNavigate();

  // Cart store
  const isOpen = useCartStore((state) => state.isOpen);
  const closeCart = useCartStore((state) => state.closeCart);
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);

  // Delivery store
  const deliveryOption = useDeliveryStore((state) => state.deliveryOption);
  const getDeliveryFee = useDeliveryStore((state) => state.getDeliveryFee);

  const [showConfirm, setShowConfirm] = useState(false);

  // Calculate totals
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const deliveryFee = getDeliveryFee(subtotal);
  const totalPrice = subtotal + deliveryFee;

  // Free delivery calculations
  const amountUntilFreeDelivery = Math.max(
    0,
    FREE_DELIVERY_THRESHOLD - subtotal,
  );
  const qualifiesForFreeDelivery = subtotal >= FREE_DELIVERY_THRESHOLD;
  const isDelivery = deliveryOption === 'delivery';
  const showFreeDeliveryPrompt =
    isDelivery && !qualifiesForFreeDelivery && amountUntilFreeDelivery <= 50;

  const handleCheckout = () => {
    closeCart();
    navigate('/checkout');
  };

  const handleClearCart = () => setShowConfirm(true);

  const confirmClearCart = () => {
    clearCart();
    setShowConfirm(false);
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className='fixed inset-0 z-40 bg-black/50 backdrop-blur-sm'
          onClick={closeCart}
        />
      )}

      {/* Drawer - FIXED: Reduced max-width for better mobile fit */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-sm transform bg-white shadow-xl transition-transform duration-300 sm:max-w-md ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className='flex h-full flex-col'>
          {/* Header */}
          <div className='flex-shrink-0 border-b border-gray-200 bg-white p-3 sm:p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <h2 className='text-lg font-bold text-gray-900 sm:text-xl'>
                  Your Cart
                </h2>
                <p className='text-xs text-gray-500 sm:text-sm'>
                  {totalItems} {totalItems === 1 ? 'item' : 'items'}
                </p>
              </div>
              <button
                onClick={closeCart}
                className='rounded-full p-2 transition hover:bg-gray-100'
                aria-label='Close cart'
              >
                <X className='h-5 w-5 text-gray-600' />
              </button>
            </div>
          </div>

          {/* Items - FIXED: Better mobile padding */}
          <div className='flex-1 overflow-y-auto bg-[#fefaef] p-3 sm:p-4'>
            {items.length === 0 ? (
              <div className='flex h-full flex-col items-center justify-center text-center'>
                <ShoppingCart className='mb-4 h-16 w-16 text-gray-300' />
                <p className='text-lg font-medium text-gray-600'>
                  Your cart is empty
                </p>
                <p className='mt-2 text-sm text-gray-500'>
                  Add some delicious items to get started!
                </p>
              </div>
            ) : (
              <div className='space-y-3'>
                {/* Free Delivery Banner */}
                {showFreeDeliveryPrompt && (
                  <div className='rounded-lg border-2 border-amber-300 bg-amber-50 p-2.5 shadow-sm sm:p-3'>
                    <div className='flex items-start gap-2'>
                      <TruckIcon className='h-4 w-4 flex-shrink-0 text-amber-600 sm:h-5 sm:w-5' />
                      <div className='flex-1'>
                        <p className='text-xs font-semibold text-amber-900 sm:text-sm'>
                          Almost there!
                        </p>
                        <p className='text-xs text-amber-800'>
                          Add{' '}
                          <span className='font-bold'>
                            KES {amountUntilFreeDelivery.toFixed(2)}
                          </span>{' '}
                          more for free delivery
                        </p>
                        <div className='mt-2 h-1.5 w-full rounded-full bg-amber-200'>
                          <div
                            className='h-full rounded-full bg-amber-500 transition-all duration-300'
                            style={{
                              width: `${Math.min((subtotal / FREE_DELIVERY_THRESHOLD) * 100, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cart Items - FIXED: Smaller image on mobile */}
                {items.map((item) => {
                  const imageUrl = getImageUrl(item.image);
                  return (
                    <div
                      key={item.cartItemId}
                      className='overflow-hidden rounded-xl bg-white shadow-sm transition hover:shadow-md'
                    >
                      <div className='flex gap-2 p-2.5 sm:gap-3 sm:p-3'>
                        {imageUrl && (
                          <img
                            src={imageUrl}
                            alt={item.name}
                            className='h-20 w-20 flex-shrink-0 rounded-lg object-cover sm:h-24 sm:w-24'
                          />
                        )}
                        <div className='flex min-w-0 flex-1 flex-col'>
                          <h3 className='text-sm font-semibold text-gray-900 sm:text-base'>
                            {item.name}
                          </h3>
                          <div className='mt-auto flex items-center justify-between pt-2'>
                            <span className='text-base font-bold text-green-600 sm:text-lg'>
                              KES {item.price.toFixed(2)}
                            </span>
                            <button
                              onClick={() => removeItem(item.cartItemId)}
                              className='text-red-500 transition hover:text-red-600'
                              aria-label='Remove item'
                            >
                              <Trash2 className='h-4 w-4' />
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className='border-t border-gray-100 bg-gray-50 px-2.5 py-2 sm:px-3'>
                        <div className='flex items-center justify-between'>
                          <span className='text-xs text-gray-600 sm:text-sm'>
                            Quantity
                          </span>
                          <div className='flex items-center gap-2 sm:gap-3'>
                            <button
                              onClick={() =>
                                updateQuantity(
                                  item.cartItemId,
                                  item.quantity - 1,
                                )
                              }
                              className='rounded-md bg-white p-1 shadow-sm transition hover:bg-gray-100 sm:p-1.5'
                              aria-label='Decrease quantity'
                            >
                              <Minus className='h-3 w-3 text-gray-700 sm:h-3.5 sm:w-3.5' />
                            </button>
                            <span className='w-6 text-center text-sm font-medium text-gray-900 sm:w-8'>
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateQuantity(
                                  item.cartItemId,
                                  item.quantity + 1,
                                )
                              }
                              className='rounded-md bg-white p-1 shadow-sm transition hover:bg-gray-100 sm:p-1.5'
                              aria-label='Increase quantity'
                            >
                              <Plus className='h-3 w-3 text-gray-700 sm:h-3.5 sm:w-3.5' />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer - FIXED: Better mobile padding */}
          {items.length > 0 && (
            <div className='flex-shrink-0 border-t border-gray-200 bg-white p-3 sm:p-4'>
              {/* Free Delivery Success Badge */}
              {isDelivery && qualifiesForFreeDelivery && (
                <div className='mb-3 rounded-lg border border-green-200 bg-green-50 p-2.5'>
                  <p className='flex items-center gap-1.5 text-xs font-semibold text-green-800'>
                    <span className='text-base'>🎉</span>
                    You've unlocked free delivery!
                  </p>
                </div>
              )}

              <div className='mb-3 space-y-2 rounded-lg bg-gray-50 p-2.5 sm:p-3'>
                <div className='flex justify-between text-xs sm:text-sm'>
                  <span className='text-gray-600'>Subtotal</span>
                  <span className='font-medium text-gray-900'>
                    KES {subtotal.toFixed(2)}
                  </span>
                </div>
                <div className='flex justify-between text-xs sm:text-sm'>
                  <span className='text-gray-600'>Delivery</span>
                  <span
                    className={`font-medium ${
                      deliveryFee === 0 ? 'text-green-600' : 'text-gray-900'
                    }`}
                  >
                    {deliveryFee === 0
                      ? 'Free'
                      : `KES ${deliveryFee.toFixed(2)}`}
                  </span>
                </div>
                <div className='flex justify-between border-t border-gray-200 pt-2'>
                  <span className='text-sm font-semibold text-gray-900 sm:text-base'>
                    Total
                  </span>
                  <span className='text-lg font-bold text-green-600 sm:text-xl'>
                    KES {totalPrice.toFixed(2)}
                  </span>
                </div>
              </div>
              <button
                onClick={handleCheckout}
                className='mb-2 flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-2.5 text-sm font-medium text-white transition hover:bg-green-700 sm:py-3 sm:text-base'
              >
                Checkout
                <ArrowRight className='h-4 w-4' />
              </button>
              <button
                onClick={handleClearCart}
                className='w-full text-xs text-red-600 transition hover:text-red-700 sm:text-sm'
              >
                Clear Cart
              </button>
              <ConfirmModal
                show={showConfirm}
                message='Are you sure you want to clear your cart?'
                onConfirm={confirmClearCart}
                onCancel={() => setShowConfirm(false)}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
