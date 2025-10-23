import { ConfirmModal } from '@components/confirmModal';
import { getImageUrl } from '@utils/hooks/getImage';
import { useCartStore } from '@utils/hooks/useCrt';
import { X, Plus, Minus, Trash2, ShoppingCart, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CartDrawer() {
  const navigate = useNavigate();

  // Read all state directly from Zustand - no props needed!
  const isOpen = useCartStore((state) => state.isOpen);
  const closeCart = useCartStore((state) => state.closeCart);
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const [showConfirm, setShowConfirm] = useState(false);
  // Calculate totals
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

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

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-md transform bg-white shadow-xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className='flex h-full flex-col'>
          {/* Header */}
          <div className='flex-shrink-0 border-b border-gray-200 bg-white p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <h2 className='text-xl font-bold text-gray-900'>Your Cart</h2>
                <p className='text-sm text-gray-500'>
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

          {/* Items */}
          <div className='flex-1 overflow-y-auto bg-[#fefaef] p-4'>
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
                {items.map((item) => {
                  const imageUrl = getImageUrl(item.image);
                  return (
                    <div
                      key={item.cartItemId}
                      className='overflow-hidden rounded-xl bg-white shadow-sm transition hover:shadow-md'
                    >
                      <div className='flex gap-3 p-3'>
                        {imageUrl && (
                          <img
                            src={imageUrl}
                            alt={item.name}
                            className='h-24 w-24 flex-shrink-0 rounded-lg object-cover'
                          />
                        )}
                        <div className='flex min-w-0 flex-1 flex-col'>
                          <h3 className='font-semibold text-gray-900'>
                            {item.name}
                          </h3>
                          <div className='mt-auto flex items-center justify-between pt-2'>
                            <span className='text-lg font-bold text-green-600'>
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
                      <div className='border-t border-gray-100 bg-gray-50 px-3 py-2'>
                        <div className='flex items-center justify-between'>
                          <span className='text-sm text-gray-600'>
                            Quantity
                          </span>
                          <div className='flex items-center gap-3'>
                            <button
                              onClick={() =>
                                updateQuantity(
                                  item.cartItemId,
                                  item.quantity - 1,
                                )
                              }
                              className='rounded-md bg-white p-1.5 shadow-sm transition hover:bg-gray-100'
                              aria-label='Decrease quantity'
                            >
                              <Minus className='h-3.5 w-3.5 text-gray-700' />
                            </button>
                            <span className='w-8 text-center font-medium text-gray-900'>
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateQuantity(
                                  item.cartItemId,
                                  item.quantity + 1,
                                )
                              }
                              className='rounded-md bg-white p-1.5 shadow-sm transition hover:bg-gray-100'
                              aria-label='Increase quantity'
                            >
                              <Plus className='h-3.5 w-3.5 text-gray-700' />
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

          {/* Footer */}
          {items.length > 0 && (
            <div className='flex-shrink-0 border-t border-gray-200 bg-white p-4'>
              <div className='mb-3 space-y-2 rounded-lg bg-gray-50 p-3'>
                <div className='flex justify-between text-sm'>
                  <span className='text-gray-600'>Subtotal</span>
                  <span className='font-medium text-gray-900'>
                    KES {totalPrice.toFixed(2)}
                  </span>
                </div>
                <div className='flex justify-between text-sm'>
                  <span className='text-gray-600'>Delivery</span>
                  <span className='font-medium text-green-600'>Free</span>
                </div>
                <div className='flex justify-between border-t border-gray-200 pt-2'>
                  <span className='font-semibold text-gray-900'>Total</span>
                  <span className='text-xl font-bold text-green-600'>
                    KES {totalPrice.toFixed(2)}
                  </span>
                </div>
              </div>
              <button
                onClick={handleCheckout}
                className='mb-2 flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-3 font-medium text-white transition hover:bg-green-700'
              >
                Checkout
                <ArrowRight className='h-4 w-4' />
              </button>
              <button
                onClick={handleClearCart}
                className='w-full text-sm text-red-600 transition hover:text-red-700'
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
