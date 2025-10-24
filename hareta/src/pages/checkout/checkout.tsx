import { useState, useEffect } from 'react';
import { useCartStore } from '@utils/hooks/useCrt';
import { useDeliveryStore } from '@utils/hooks/deliveryStore';
import {
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  CreditCard,
  Banknote,
  Check,
  AlertCircle,
  Clock,
  MapPin,
  Store,
  Phone,
  MessageSquare,
} from 'lucide-react';
import type { SavedAddress } from '@utils/schemas/address';
import AddressModal from '@components/searchModal';
import { getImageUrl } from '../../utils/hooks/getImage';
import { api } from '@utils/hooks/apiUtils';

export default function CheckoutPage() {
  // Cart Store
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);

  // Delivery Store
  const { deliveryOption, place, setDeliveryAddress, changeLocation } =
    useDeliveryStore();

  // Local State
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'cod' | null>(
    null,
  );
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');

  const isDelivery = deliveryOption === 'delivery';

  // Calculate totals
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const deliveryFee = isDelivery ? 0 : 0; // You can add logic for delivery fee calculation
  const total = subtotal + deliveryFee;

  // Restaurant info for pickup
  const restaurantInfo = {
    name: 'FCL Restaurant',
    address: '123 Main Street, Downtown',
    phone: '0727922764',
    hours: '11:00 AM – 10:00 PM',
  };

  useEffect(() => {
    if (!showModal) return;

    let cancelled = false;
    const fetchSavedAddresses = async () => {
      setIsLoading(true);
      try {
        const res = await api.get<SavedAddress[]>('/api/addr/look-up');
        if (!cancelled) setSavedAddresses(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetchSavedAddresses();

    return () => {
      cancelled = true;
    };
  }, [showModal]);

  const handleChangeAddress = () => {
    changeLocation();
    setShowModal(true);
  };

  const handlePlaceOrder = () => {
    if (isDelivery && !place) {
      alert('Please select a delivery address');
      return;
    }

    if (!paymentMethod) {
      alert('Please select a payment method');
      return;
    }

    if (paymentMethod === 'mpesa' && !mpesaPhone) {
      alert('Please enter your M-PESA phone number');
      return;
    }

    // Prepare order data
    const orderData = {
      // Delivery Info
      delivery: {
        type: deliveryOption,
        address: isDelivery
          ? {
              main_text: place?.main_text,
              secondary_text: place?.secondary_text,
              place_id: place?.place_id,
            }
          : null,
        restaurant: !isDelivery ? restaurantInfo : null,
      },

      // Order Items
      items: items.map((item) => ({
        cartItemId: item.cartItemId,
        product_id: item.product_id,
        variantId: item.variantId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        total: item.price * item.quantity,
      })),

      // Payment Info
      payment: {
        method: paymentMethod,
        mpesaPhone: paymentMethod === 'mpesa' ? mpesaPhone : null,
      },

      // Totals
      pricing: {
        subtotal,
        deliveryFee,
        total,
      },

      // Notes
      notes: orderNotes,

      // Timestamp
      createdAt: new Date().toISOString(),
    };

    // Here you would send this to your backend
    console.log('📦 Complete Order Data:', orderData);

    // For now, just show success
    alert('Order placed successfully!');

    // Optionally clear cart after successful order
    clearCart();
  };

  if (items.length === 0) {
    return (
      <div className='flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 text-center'>
        <ShoppingBag className='mb-4 h-16 w-16 text-gray-300' />
        <h2 className='text-xl font-semibold text-gray-900'>
          Your cart is empty
        </h2>
        <p className='mt-2 text-gray-500'>Add some items to get started!</p>
      </div>
    );
  }

  return (
    <div className='min-h-screen py-6'>
      <div className='mx-auto max-w-6xl px-4'>
        <div className='grid gap-6 lg:grid-cols-3'>
          {/* Left Column - Main Content */}
          <div className='space-y-6 lg:col-span-2'>
            {/* Delivery Details */}
            <div className='rounded-xl border border-gray-100 bg-white p-6 shadow-sm'>
              <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
                <h2 className='text-xl font-bold text-gray-900'>
                  Delivery Details
                </h2>
              </div>

              {isDelivery ? (
                <div className='flex items-start gap-3'>
                  <MapPin className='mt-1 h-5 w-5 text-gray-500' />
                  <div className='flex-1'>
                    {place ? (
                      <div>
                        <p className='font-medium text-gray-900'>
                          {place.main_text}
                        </p>
                        {place.secondary_text && (
                          <p className='text-sm text-gray-600'>
                            {place.secondary_text}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className='text-sm text-gray-500'>
                        No address selected yet
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleChangeAddress}
                    className='rounded-lg bg-green-100 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-200'
                  >
                    {place ? 'Change' : 'Select'}
                  </button>
                </div>
              ) : (
                <div className='flex items-start gap-3'>
                  <Store className='mt-1 h-5 w-5 text-gray-500' />
                  <div>
                    <p className='font-medium text-gray-900'>
                      {restaurantInfo.name}
                    </p>
                    <p className='text-sm text-gray-600'>
                      {restaurantInfo.address}
                    </p>
                    <p className='mt-1 flex items-center gap-1 text-xs text-gray-500'>
                      <Clock className='h-3 w-3' />
                      {restaurantInfo.hours}
                    </p>
                    <p className='flex items-center gap-1 text-xs text-gray-500'>
                      <Phone className='h-3 w-3' />
                      {restaurantInfo.phone}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Order Items */}
            <div className='rounded-xl border border-gray-100 bg-white p-6 shadow-sm'>
              <div className='mb-4 flex items-center justify-between'>
                <h2 className='text-xl font-bold text-gray-900'>
                  Order Items ({items.length})
                </h2>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className='flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200'
                >
                  {isEditing ? 'Done' : 'Edit'}
                </button>
              </div>

              <div className='space-y-3'>
                {items.map((item) => {
                  const imageUrl = getImageUrl(item.image);
                  return (
                    <div
                      key={item.cartItemId}
                      className='flex gap-4 rounded-lg border border-gray-200 p-3 transition hover:shadow-sm'
                    >
                      {imageUrl && (
                        <img
                          src={imageUrl}
                          alt={item.name}
                          className='h-16 w-16 flex-shrink-0 rounded-lg object-cover'
                        />
                      )}
                      <div className='flex min-w-0 flex-1 flex-col'>
                        <h4 className='font-semibold text-gray-900'>
                          {item.name}
                        </h4>
                        <div className='mt-1 flex items-center gap-1 text-xs text-gray-500'></div>
                        <div className='mt-1 flex items-center justify-between'>
                          <span className='font-bold text-green-600'>
                            KES {(item.price * item.quantity).toFixed(2)}
                          </span>
                          <span className='text-xs text-gray-500'>
                            KES {item.price.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {isEditing ? (
                        <div className='flex flex-col items-end justify-between'>
                          <button
                            onClick={() => removeItem(item.cartItemId)}
                            className='rounded-full p-1 text-red-500 transition hover:bg-red-50'
                          >
                            <Trash2 className='h-4 w-4' />
                          </button>
                          <div className='flex items-center gap-2 rounded-lg bg-gray-50 p-1'>
                            <button
                              onClick={() =>
                                updateQuantity(
                                  item.cartItemId,
                                  item.quantity - 1,
                                )
                              }
                              className='rounded-md bg-white p-1 shadow-sm transition hover:bg-gray-100'
                            >
                              <Minus className='h-3 w-3 text-gray-700' />
                            </button>
                            <span className='w-6 text-center text-sm font-medium'>
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateQuantity(
                                  item.cartItemId,
                                  item.quantity + 1,
                                )
                              }
                              className='rounded-md bg-white p-1 shadow-sm transition hover:bg-gray-100'
                            >
                              <Plus className='h-3 w-3 text-gray-700' />
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

            {/* Order Notes */}
            <div className='rounded-xl border border-gray-100 bg-white p-6 shadow-sm'>
              <h2 className='mb-3 text-xl font-bold text-gray-900'>
                Order Notes (Optional)
              </h2>
              <div className='relative'>
                <MessageSquare className='absolute top-3 left-3 h-5 w-5 text-gray-400' />
                <textarea
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder='Any special instructions for your order...'
                  rows={3}
                  className='w-full rounded-lg border border-gray-300 py-2 pr-4 pl-10 focus:border-green-600 focus:ring-2 focus:ring-green-600 focus:outline-none'
                />
              </div>
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className='lg:col-span-1'>
            <div className='sticky top-6 space-y-4'>
              {/* Payment Method */}
              <div className='rounded-xl border border-gray-100 bg-white p-6 shadow-sm'>
                <h3 className='mb-4 text-lg font-bold text-gray-900'>
                  Payment Method
                </h3>
                <div className='space-y-3'>
                  {/* M-PESA */}
                  <button
                    onClick={() => setPaymentMethod('mpesa')}
                    className={`flex w-full items-center gap-3 rounded-lg border-2 p-3 transition ${
                      paymentMethod === 'mpesa'
                        ? 'border-green-600 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        paymentMethod === 'mpesa'
                          ? 'bg-green-600'
                          : 'bg-gray-100'
                      }`}
                    >
                      <CreditCard
                        className={`h-5 w-5 ${
                          paymentMethod === 'mpesa'
                            ? 'text-white'
                            : 'text-gray-600'
                        }`}
                      />
                    </div>
                    <div className='flex-1 text-left'>
                      <div className='text-sm font-semibold text-gray-900'>
                        M-PESA
                      </div>
                      <div className='text-xs text-gray-500'>Mobile money</div>
                    </div>
                    {paymentMethod === 'mpesa' && (
                      <Check className='h-5 w-5 text-green-600' />
                    )}
                  </button>

                  {paymentMethod === 'mpesa' && (
                    <div className='ml-13 rounded-lg bg-gray-50 p-3'>
                      <input
                        type='tel'
                        value={mpesaPhone}
                        onChange={(e) => setMpesaPhone(e.target.value)}
                        placeholder='0712345678'
                        className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:ring-2 focus:ring-green-600 focus:outline-none'
                      />
                      <p className='mt-2 flex items-start gap-1 text-xs text-gray-500'>
                        <AlertCircle className='mt-0.5 h-3 w-3 flex-shrink-0' />
                        You'll receive an M-PESA prompt
                      </p>
                    </div>
                  )}

                  {/* Cash on Delivery */}
                  <button
                    onClick={() => setPaymentMethod('cod')}
                    className={`flex w-full items-center gap-3 rounded-lg border-2 p-3 transition ${
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
                          paymentMethod === 'cod'
                            ? 'text-white'
                            : 'text-gray-600'
                        }`}
                      />
                    </div>
                    <div className='flex-1 text-left'>
                      <div className='text-sm font-semibold text-gray-900'>
                        Cash on Delivery
                      </div>
                      <div className='text-xs text-gray-500'>
                        Pay on arrival
                      </div>
                    </div>
                    {paymentMethod === 'cod' && (
                      <Check className='h-5 w-5 text-green-600' />
                    )}
                  </button>
                </div>
              </div>

              {/* Price Summary */}
              <div className='rounded-xl border border-gray-100 bg-white p-6 shadow-sm'>
                <h3 className='mb-4 text-lg font-bold text-gray-900'>
                  Order Summary
                </h3>
                <div className='space-y-3'>
                  <div className='flex justify-between text-sm text-gray-600'>
                    <span>Subtotal</span>
                    <span className='font-medium'>
                      KES {subtotal.toFixed(2)}
                    </span>
                  </div>
                  <div className='flex justify-between text-sm text-gray-600'>
                    <span>Delivery Fee</span>
                    <span className='font-medium text-green-600'>Free</span>
                  </div>
                  <div className='border-t border-gray-200 pt-3'>
                    <div className='flex justify-between'>
                      <span className='font-semibold text-gray-900'>Total</span>
                      <span className='text-xl font-bold text-green-600'>
                        KES {total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handlePlaceOrder}
                  disabled={!paymentMethod || (isDelivery && !place)}
                  className={`mt-4 w-full rounded-lg py-3 font-semibold text-white transition ${
                    paymentMethod && (!isDelivery || place)
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'cursor-not-allowed bg-gray-300'
                  }`}
                >
                  {paymentMethod === 'mpesa'
                    ? 'Pay with M-PESA'
                    : 'Place Order'}
                </button>

                {(!paymentMethod || (isDelivery && !place)) && (
                  <p className='mt-2 text-center text-xs text-gray-500'>
                    Complete all required fields
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Address Modal */}
      <AddressModal
        show={showModal}
        onClose={() => setShowModal(false)}
        onSelect={(selectedAddress) => {
          setDeliveryAddress(selectedAddress);
          setShowModal(false);
        }}
        savedAddresses={savedAddresses}
        isLoading={isLoading}
      />
    </div>
  );
}
