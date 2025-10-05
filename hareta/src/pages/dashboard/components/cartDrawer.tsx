import { useCartStore } from '@utils/hooks/useCrt';
import { X, Plus, Minus, Trash2 } from 'lucide-react';

export default function CartDrawer() {
  // Read all state directly from Zustand - no props needed!
  const isOpen = useCartStore((state) => state.isOpen);
  const closeCart = useCartStore((state) => state.closeCart);
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);

  // Calculate totals
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  // Helper to format selected choices for display
  const formatChoices = (item: any) => {
    if (!item.selectedChoices || item.selectedChoices.length === 0) return null;

    const choiceLabels: string[] = [];

    item.selectedChoices.forEach((selected: any) => {
      const option = item.options?.find(
        (opt: any) => opt.id === selected.optionId,
      );
      if (option) {
        const choice = option.choices.find(
          (c: any) => c.id === selected.choiceId,
        );
        if (choice) {
          choiceLabels.push(choice.label);
        }
      }
    });

    return choiceLabels.length > 0 ? choiceLabels.join(', ') : null;
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div className='fixed inset-0 z-40 bg-black/50' onClick={closeCart} />
      )}

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-md transform bg-white shadow-lg transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className='flex items-center justify-between border-b p-4'>
          <h2 className='text-lg font-bold'>Your Cart ({totalItems})</h2>
          <button
            onClick={closeCart}
            className='rounded p-1 transition hover:bg-gray-100'
            aria-label='Close cart'
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        {/* Cart Items */}
        <div
          className='flex-1 overflow-y-auto p-4'
          style={{ maxHeight: 'calc(100vh - 180px)' }}
        >
          {items.length === 0 ? (
            <div className='mt-16 flex flex-col items-center justify-center text-center text-gray-500'>
              <div className='mb-4 text-6xl'>🛒</div>
              <p className='text-lg font-medium'>Your cart is empty</p>
              <p className='mt-2 text-sm'>
                Add some delicious items to get started!
              </p>
            </div>
          ) : (
            <div className='space-y-4'>
              {items.map((item) => {
                const choices = formatChoices(item);

                return (
                  <div
                    key={item.cartItemId}
                    className='flex gap-3 border-b pb-4 last:border-b-0'
                  >
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.name}
                        className='h-20 w-20 flex-shrink-0 rounded object-cover'
                      />
                    )}

                    <div className='min-w-0 flex-1'>
                      <div className='flex items-start justify-between gap-2'>
                        <h3 className='text-sm font-semibold'>{item.name}</h3>
                        <button
                          onClick={() => removeItem(item.cartItemId)}
                          className='flex-shrink-0 text-red-600 hover:text-red-700'
                          aria-label='Remove item'
                        >
                          <Trash2 className='h-4 w-4' />
                        </button>
                      </div>

                      {/* Show selected options */}
                      {choices && (
                        <p className='mt-1 line-clamp-2 text-xs text-gray-600'>
                          {choices}
                        </p>
                      )}

                      <div className='mt-2 flex items-center justify-between'>
                        <p className='text-sm font-bold text-green-600'>
                          ${item.price.toFixed(2)}
                        </p>

                        {/* Quantity Controls */}
                        <div className='flex items-center gap-2'>
                          <button
                            onClick={() =>
                              updateQuantity(item.cartItemId, item.quantity - 1)
                            }
                            className='rounded border border-gray-300 p-1 transition hover:bg-gray-50'
                            aria-label='Decrease quantity'
                          >
                            <Minus className='h-4 w-4' />
                          </button>

                          <span className='w-8 text-center text-sm font-medium'>
                            {item.quantity}
                          </span>

                          <button
                            onClick={() =>
                              updateQuantity(item.cartItemId, item.quantity + 1)
                            }
                            className='rounded border border-gray-300 p-1 transition hover:bg-gray-50'
                            aria-label='Increase quantity'
                          >
                            <Plus className='h-4 w-4' />
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
          <div className='border-t bg-gray-50 p-4'>
            <div className='mb-3 flex justify-between text-lg font-bold'>
              <span>Total:</span>
              <span className='text-green-600'>${totalPrice.toFixed(2)}</span>
            </div>

            <button
              onClick={() => {
                // Handle checkout
                console.log('Proceeding to checkout with items:', items);
                // Close cart and navigate to checkout
                closeCart();
                // navigate('/checkout');
              }}
              className='w-full rounded-lg bg-green-600 py-3 font-medium text-white transition hover:bg-green-700'
            >
              Proceed to Checkout
            </button>

            <button
              onClick={() => {
                if (
                  window.confirm('Are you sure you want to clear your cart?')
                ) {
                  clearCart();
                }
              }}
              className='mt-2 w-full py-2 text-sm text-red-600 hover:text-red-700'
            >
              Clear Cart
            </button>
          </div>
        )}
      </div>
    </>
  );
}
