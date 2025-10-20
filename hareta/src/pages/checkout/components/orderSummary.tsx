import { useState } from 'react';
import { useCartStore } from '@utils/hooks/useCrt';
import {
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  CreditCard,
  Banknote,
  Check,
  AlertCircle,
  Edit2,
  Clock,
} from 'lucide-react';

export default function OrderSummary() {
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'cod' | null>(
    null,
  );
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Calculate totals
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const deliveryFee = 0; // Free delivery
  const total = subtotal + deliveryFee;

  // Helper to get image URL
  const getImageUrl = (image: any) => {
    if (!image) return '';
    if (typeof image === 'string') return image;
    const imageData = image;
    const hasImageVariants = imageData?.variants?.jpg;
    if (hasImageVariants) {
      return imageData.variants.jpg[400] || imageData.variants.jpg[800] || '';
    }
    return '';
  };

  const handlePlaceOrder = () => {
    if (!paymentMethod) {
      alert('Please select a payment method');
      return;
    }

    if (paymentMethod === 'mpesa' && !mpesaPhone) {
      alert('Please enter your M-PESA phone number');
      return;
    }

    // Here you would integrate with your backend
    console.log('Order placed:', {
      items,
      paymentMethod,
      mpesaPhone: paymentMethod === 'mpesa' ? mpesaPhone : null,
      total,
    });

    alert('Order placed successfully!');
  };

  if (items.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center py-12 text-center'>
        <ShoppingBag className='mb-4 h-16 w-16 text-gray-300' />
        <h2 className='text-xl font-semibold text-gray-900'>
          Your cart is empty
        </h2>
        <p className='mt-2 text-gray-500'>Add some items to get started!</p>
      </div>
    );
  }

  return (
    <div className='mx-auto max-w-3xl space-y-6 p-4'>
      {/* Order Summary Header */}
      <div className='rounded-lg bg-white p-6 shadow-sm'>
        <div className='flex items-center justify-between'>
          <h2 className='text-2xl font-bold text-gray-900'>Order Summary</h2>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className='flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200'
          >
            <Edit2 className='h-4 w-4' />
            {isEditing ? 'Done' : 'Edit Order'}
          </button>
        </div>
      </div>

      {/* Order Items */}
      <div className='rounded-lg bg-white p-6 shadow-sm'>
        <h3 className='mb-4 text-lg font-semibold text-gray-900'>
          Items ({items.length})
        </h3>
        <div className='space-y-4'>
          {items.map((item) => {
            const imageUrl = getImageUrl(item.image);

            return (
              <div
                key={item.cartItemId}
                className='flex gap-4 rounded-lg border border-gray-200 p-4 transition hover:shadow-sm'
              >
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt={item.name}
                    className='h-20 w-20 flex-shrink-0 rounded-lg object-cover'
                  />
                )}
                <div className='flex min-w-0 flex-1 flex-col'>
                  <h4 className='font-semibold text-gray-900'>{item.name}</h4>
                  <div className='mt-1 flex items-center gap-1 text-xs text-gray-500'>
                    <Clock className='h-3 w-3' />
                    15-20 min
                  </div>
                  <div className='mt-2 flex items-center justify-between'>
                    <span className='text-lg font-bold text-green-600'>
                      KES {(item.price * item.quantity).toFixed(2)}
                    </span>
                    <span className='text-sm text-gray-500'>
                      KES {item.price.toFixed(2)} each
                    </span>
                  </div>
                </div>

                {/* Quantity Controls (only visible in edit mode) */}
                {isEditing ? (
                  <div className='flex flex-col items-end justify-between'>
                    <button
                      onClick={() => removeItem(item.cartItemId)}
                      className='rounded-full p-1.5 text-red-500 transition hover:bg-red-50'
                      aria-label='Remove item'
                    >
                      <Trash2 className='h-4 w-4' />
                    </button>
                    <div className='flex items-center gap-2 rounded-lg bg-gray-50 p-1'>
                      <button
                        onClick={() =>
                          updateQuantity(item.cartItemId, item.quantity - 1)
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
                          updateQuantity(item.cartItemId, item.quantity + 1)
                        }
                        className='rounded-md bg-white p-1.5 shadow-sm transition hover:bg-gray-100'
                        aria-label='Increase quantity'
                      >
                        <Plus className='h-3.5 w-3.5 text-gray-700' />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className='flex items-center'>
                    <span className='text-sm font-medium text-gray-600'>
                      Qty: {item.quantity}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment Method */}
      <div className='rounded-lg bg-white p-6 shadow-sm'>
        <h3 className='mb-4 text-lg font-semibold text-gray-900'>
          Payment Method
        </h3>
        <div className='space-y-3'>
          {/* M-PESA Option */}
          <button
            onClick={() => setPaymentMethod('mpesa')}
            className={`flex w-full items-center gap-4 rounded-lg border-2 p-4 transition ${
              paymentMethod === 'mpesa'
                ? 'border-green-600 bg-green-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full ${
                paymentMethod === 'mpesa' ? 'bg-green-600' : 'bg-gray-100'
              }`}
            >
              <CreditCard
                className={`h-5 w-5 ${
                  paymentMethod === 'mpesa' ? 'text-white' : 'text-gray-600'
                }`}
              />
            </div>
            <div className='flex-1 text-left'>
              <div className='font-semibold text-gray-900'>M-PESA</div>
              <div className='text-sm text-gray-500'>
                Pay with M-PESA mobile money
              </div>
            </div>
            {paymentMethod === 'mpesa' && (
              <Check className='h-5 w-5 text-green-600' />
            )}
          </button>

          {/* M-PESA Phone Input */}
          {paymentMethod === 'mpesa' && (
            <div className='ml-14 rounded-lg bg-gray-50 p-4'>
              <label className='mb-2 block text-sm font-medium text-gray-700'>
                M-PESA Phone Number
              </label>
              <input
                type='tel'
                value={mpesaPhone}
                onChange={(e) => setMpesaPhone(e.target.value)}
                placeholder='e.g., 0712345678'
                className='w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-green-600 focus:ring-2 focus:ring-green-600 focus:outline-none'
              />
              <p className='mt-2 flex items-start gap-2 text-xs text-gray-500'>
                <AlertCircle className='mt-0.5 h-3 w-3 flex-shrink-0' />
                You'll receive an M-PESA prompt on your phone to complete
                payment
              </p>
            </div>
          )}

          {/* Cash on Delivery Option */}
          <button
            onClick={() => setPaymentMethod('cod')}
            className={`flex w-full items-center gap-4 rounded-lg border-2 p-4 transition ${
              paymentMethod === 'cod'
                ? 'border-green-600 bg-green-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full ${
                paymentMethod === 'cod' ? 'bg-green-600' : 'bg-gray-100'
              }`}
            >
              <Banknote
                className={`h-5 w-5 ${
                  paymentMethod === 'cod' ? 'text-white' : 'text-gray-600'
                }`}
              />
            </div>
            <div className='flex-1 text-left'>
              <div className='font-semibold text-gray-900'>
                Cash on Delivery
              </div>
              <div className='text-sm text-gray-500'>
                Pay when you receive your order
              </div>
            </div>
            {paymentMethod === 'cod' && (
              <Check className='h-5 w-5 text-green-600' />
            )}
          </button>
        </div>
      </div>

      {/* Price Breakdown */}
      <div className='rounded-lg bg-white p-6 shadow-sm'>
        <h3 className='mb-4 text-lg font-semibold text-gray-900'>
          Price Details
        </h3>
        <div className='space-y-3'>
          <div className='flex justify-between text-gray-600'>
            <span>Subtotal</span>
            <span className='font-medium'>KES {subtotal.toFixed(2)}</span>
          </div>
          <div className='flex justify-between text-gray-600'>
            <span>Delivery Fee</span>
            <span className='font-medium text-green-600'>Free</span>
          </div>
          <div className='border-t border-gray-200 pt-3'>
            <div className='flex justify-between'>
              <span className='text-lg font-semibold text-gray-900'>Total</span>
              <span className='text-2xl font-bold text-green-600'>
                KES {total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Place Order Button */}
      <button
        onClick={handlePlaceOrder}
        disabled={!paymentMethod}
        className={`w-full rounded-lg py-4 text-lg font-semibold text-white transition ${
          paymentMethod
            ? 'bg-green-600 hover:bg-green-700'
            : 'cursor-not-allowed bg-gray-300'
        }`}
      >
        {paymentMethod === 'mpesa' ? 'Pay with M-PESA' : 'Place Order'}
      </button>

      {!paymentMethod && (
        <p className='text-center text-sm text-gray-500'>
          Please select a payment method to continue
        </p>
      )}
    </div>
  );
}
