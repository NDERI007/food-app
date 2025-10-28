import { useState, useEffect } from 'react';
import { useCartStore } from '@utils/hooks/useCrt';
import { useDeliveryStore } from '@utils/hooks/deliveryStore';
import {
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  CreditCard,
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
import { toast } from 'sonner';
import axios from 'axios';

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
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

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

  const handlePlaceOrder = async () => {
    if (isDelivery && !place) {
      toast.error('Please select a delivery address');
      return;
    }

    if (!mpesaPhone) {
      toast.error('Please enter your M-PESA phone number');
      return;
    }

    // Validate phone number format
    const phoneRegex = /^(?:254|\+254|0)?(7\d{8}|1\d{8})$/;
    if (!phoneRegex.test(mpesaPhone)) {
      toast.error(
        'Please enter a valid M-PESA phone number (e.g., 0712345678)',
      );
      return;
    }

    // Normalize phone number to format expected by M-PESA (254XXXXXXXXX)
    let normalizedPhone = mpesaPhone.replace(/\s+/g, '');
    if (normalizedPhone.startsWith('0')) {
      normalizedPhone = '254' + normalizedPhone.substring(1);
    } else if (normalizedPhone.startsWith('+')) {
      normalizedPhone = normalizedPhone.substring(1);
    } else if (!normalizedPhone.startsWith('254')) {
      normalizedPhone = '254' + normalizedPhone;
    }

    setIsProcessing(true);

    // Prepare order data matching the backend schema
    const orderData = {
      delivery_type: isDelivery ? 'delivery' : 'pickup',

      // Delivery address fields (only for delivery)
      ...(isDelivery && {
        delivery_address_main_text: place?.main_text,
        delivery_address_secondary_text: place?.secondary_text,
        delivery_place_id: place?.place_id,
        delivery_lat: place?.lat,
        delivery_lng: place?.lng,
      }),

      // Payment
      payment_method: 'mpesa',
      mpesa_phone: normalizedPhone,

      // Amounts
      subtotal: Number(subtotal.toFixed(2)),
      delivery_fee: Number(deliveryFee.toFixed(2)),
      total_amount: Number(total.toFixed(2)),

      // Optional notes
      order_notes: orderNotes || null,

      // Items with correct field names
      items: items.map((item) => ({
        product_id: item.product_id,
        variant_id: item.variantId || null,
        quantity: item.quantity,
      })),
    };

    console.log('📦 Creating order:', orderData);

    try {
      // Step 1: Create the order (backend validates everything)
      const orderResponse = await api.post('/api/orders/create', orderData);

      if (!orderResponse.data?.success) {
        toast.error(orderResponse.data?.message || 'Failed to create order');
        setIsProcessing(false);
        return;
      }

      const orderId = orderResponse.data.order_id;

      if (!orderId) {
        toast.error('Order created but ID not returned');
        setIsProcessing(false);
        return;
      }

      toast.success('✅ Order created successfully!');
      console.log('Order created:', orderId);

      // Step 2: Initiate M-PESA payment
      try {
        const paymentResponse = await api.post('/api/payments/mpesa/initiate', {
          order_id: orderId,
          phone_number: normalizedPhone,
          amount: total,
        });

        if (!paymentResponse.data?.success) {
          toast.warning(
            'Order created but payment failed to initiate. Please contact support.',
          );
          setIsProcessing(false);
          return;
        }

        // Success! Clear cart and show success message
        clearCart();

        toast.success('📱 Check your phone for M-PESA prompt!', {
          duration: 6000,
        });

        toast.info('Your order will be confirmed once payment is complete', {
          duration: 5000,
        });

        // Optional: Redirect to order status page after a delay
        setTimeout(() => {
          // window.location.href = `/orders/${orderId}`;
        }, 3000);
      } catch (paymentErr) {
        console.error('Payment initiation failed:', paymentErr);

        if (axios.isAxiosError(paymentErr)) {
          const message =
            paymentErr.response?.data?.message ||
            'Failed to initiate payment. Order was created. Please contact support.';
          toast.error(message);
        } else {
          toast.error('Payment initiation failed. Order was created.');
        }
      }
    } catch (err: unknown) {
      console.error('Order creation failed:', err);

      if (axios.isAxiosError(err)) {
        const message =
          err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          'Failed to create order';

        // Show specific error messages
        if (err.response?.data?.unavailable_items) {
          toast.error(
            `Items unavailable: ${err.response.data.unavailable_items.join(', ')}`,
          );
        } else if (err.response?.data?.out_of_stock_items) {
          toast.error(
            `Out of stock: ${err.response.data.out_of_stock_items.join(', ')}`,
          );
        } else {
          toast.error(message);
        }
      } else {
        toast.error('Unexpected error occurred');
      }
    } finally {
      setIsProcessing(false);
    }
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
                    disabled={isProcessing}
                    className='rounded-lg bg-green-100 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-200 disabled:opacity-50'
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
                  disabled={isProcessing}
                  className='flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200 disabled:opacity-50'
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
                        <div className='mt-1 flex items-center justify-between'>
                          <span className='font-bold text-green-600'>
                            KES {(item.price * item.quantity).toFixed(2)}
                          </span>
                          <span className='text-xs text-gray-500'>
                            KES {item.price.toFixed(2)} each
                          </span>
                        </div>
                      </div>

                      {isEditing ? (
                        <div className='flex flex-col items-end justify-between'>
                          <button
                            onClick={() => removeItem(item.cartItemId)}
                            disabled={isProcessing}
                            className='rounded-full p-1 text-red-500 transition hover:bg-red-50 disabled:opacity-50'
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
                              disabled={isProcessing}
                              className='rounded-md bg-white p-1 shadow-sm transition hover:bg-gray-100 disabled:opacity-50'
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
                              disabled={isProcessing}
                              className='rounded-md bg-white p-1 shadow-sm transition hover:bg-gray-100 disabled:opacity-50'
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
                  disabled={isProcessing}
                  placeholder='Any special instructions for your order...'
                  rows={3}
                  className='w-full rounded-lg border border-gray-300 py-2 pr-4 pl-10 focus:border-green-600 focus:ring-2 focus:ring-green-600 focus:outline-none disabled:bg-gray-50 disabled:opacity-50'
                />
              </div>
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className='lg:col-span-1'>
            <div className='sticky top-6 space-y-4'>
              {/* M-PESA Payment */}
              <div className='rounded-xl border border-gray-100 bg-white p-6 shadow-sm'>
                <h3 className='mb-4 text-lg font-bold text-gray-900'>
                  M-PESA Payment
                </h3>

                <div className='mb-4 flex items-center gap-3 rounded-lg border-2 border-green-600 bg-green-50 p-3'>
                  <div className='flex h-10 w-10 items-center justify-center rounded-full bg-green-600'>
                    <CreditCard className='h-5 w-5 text-white' />
                  </div>
                  <div className='flex-1 text-left'>
                    <div className='text-sm font-semibold text-gray-900'>
                      M-PESA
                    </div>
                    <div className='text-xs text-gray-500'>
                      Mobile money payment
                    </div>
                  </div>
                </div>

                <div className='space-y-3'>
                  <div>
                    <label className='mb-1 block text-sm font-medium text-gray-700'>
                      Phone Number
                    </label>
                    <input
                      type='tel'
                      value={mpesaPhone}
                      onChange={(e) => setMpesaPhone(e.target.value)}
                      disabled={isProcessing}
                      placeholder='0712345678'
                      className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:ring-2 focus:ring-green-600 focus:outline-none disabled:bg-gray-50 disabled:opacity-50'
                    />
                  </div>
                  <div className='flex items-start gap-2 rounded-lg bg-blue-50 p-3'>
                    <AlertCircle className='mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600' />
                    <p className='text-xs text-blue-900'>
                      Your order will be created first, then you'll receive an
                      M-PESA prompt to complete payment.
                    </p>
                  </div>
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
                  disabled={
                    !mpesaPhone || (isDelivery && !place) || isProcessing
                  }
                  className={`mt-4 w-full rounded-lg py-3 font-semibold text-white transition ${
                    mpesaPhone && (!isDelivery || place) && !isProcessing
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'cursor-not-allowed bg-gray-300'
                  }`}
                >
                  {isProcessing ? (
                    <span className='flex items-center justify-center gap-2'>
                      <svg className='h-5 w-5 animate-spin' viewBox='0 0 24 24'>
                        <circle
                          className='opacity-25'
                          cx='12'
                          cy='12'
                          r='10'
                          stroke='currentColor'
                          strokeWidth='4'
                          fill='none'
                        />
                        <path
                          className='opacity-75'
                          fill='currentColor'
                          d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                        />
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    'Pay with M-PESA'
                  )}
                </button>

                {(!mpesaPhone || (isDelivery && !place)) && !isProcessing && (
                  <p className='mt-2 text-center text-xs text-gray-500'>
                    {!mpesaPhone && 'Enter M-PESA phone number'}
                    {mpesaPhone &&
                      isDelivery &&
                      !place &&
                      'Select delivery address'}
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
