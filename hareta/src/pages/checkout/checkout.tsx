import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '@utils/hooks/useCrt';
import {
  FREE_DELIVERY_THRESHOLD,
  useDeliveryStore,
} from '@utils/hooks/deliveryStore';
import { useAuth } from '@utils/hooks/useAuth';
import {
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  AlertCircle,
  Clock,
  MapPin,
  Phone,
  LogIn,
  Check,
} from 'lucide-react';
import type { SavedAddress } from '@utils/schemas/address';
import AddressModal from '@components/searchModal';
import { getImageUrl } from '../../utils/hooks/getImage';
import { api } from '@utils/hooks/apiUtils';
import { toast } from 'sonner';
import axios from 'axios';
import FallbackModal from '@components/modal';
import { v4 as uuidv4 } from 'uuid'; // Import uuid

export default function CheckoutPage() {
  const navigate = useNavigate();
  // ✅ Get both isAuthenticated AND isLoading
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Cart Store
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);

  // Delivery Store
  const {
    deliveryOption,
    place,
    setDeliveryOption,
    setDeliveryAddress,
    changeLocation,
    clearDelivery,
    getDeliveryFee,
  } = useDeliveryStore();

  // Local State
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [fallbackOpen, setFallbackOpen] = useState(false); // Add fallback modal state
  const [isProcessing, setIsProcessing] = useState(false);

  const isDelivery = deliveryOption === 'delivery';

  const restaurantInfo = {
    name: "Weddy's Kitchen",
    address: 'Moringa Centre, Near playstation',
    phone: '0745340424',
    hours: '9:00 AM - 9:30 PM',
    mapUrl: 'https://maps.google.com/?q=Moringa+Centre',
  };

  // Calculate totals
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const deliveryFee = getDeliveryFee(subtotal);
  const total = subtotal + deliveryFee;

  const amountUntilFreeDelivery = Math.max(
    0,
    FREE_DELIVERY_THRESHOLD - subtotal,
  );
  const qualifiesForFreeDelivery = subtotal >= FREE_DELIVERY_THRESHOLD;

  // ✅ Fixed auth check - only redirect after loading is complete
  useEffect(() => {
    // Don't do anything while auth is still loading
    if (authLoading) return;

    // Only redirect if auth check is done AND user is not authenticated
    if (!isAuthenticated) {
      toast.error('Please login to continue with checkout');
      navigate('/login', { state: { from: '/checkout' } });
    }
  }, [isAuthenticated, authLoading, navigate]);

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
    if (!isAuthenticated) {
      toast.error('Please login to place an order');
      navigate('/login', { state: { from: '/checkout' } });
      return;
    }

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

    try {
      const orderResponse = await api.post('/api/orders/create', orderData);

      if (!orderResponse.data?.success) {
        toast.error(orderResponse.data?.message || 'Failed to create order');
        setIsProcessing(false);
        return;
      }

      const orderID = orderResponse.data?.order;

      if (!orderID) {
        toast.error('Failed to get order ID');
        setIsProcessing(false);
        return;
      }

      toast.success(
        'Order created successfully! Check your phone for M-PESA prompt.',
      );

      // Clear cart && delivery
      clearCart();
      clearDelivery();

      navigate(`/order-confirmation?orderID=${orderID}`);
    } catch (err: unknown) {
      console.error('Order creation failed:', err);

      if (axios.isAxiosError(err)) {
        const message =
          err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          'Failed to create order';

        toast.error(message);
      } else {
        toast.error('Unexpected error occurred');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // ✅ Show loading spinner while auth is being checked
  if (authLoading) {
    return (
      <div className='flex min-h-screen flex-col items-center justify-center bg-gray-50'>
        <div className='h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-green-600'></div>
        <p className='mt-4 text-gray-500'>Loading...</p>
      </div>
    );
  }

  // ✅ This will only show after auth check completes and user is not authenticated
  if (!isAuthenticated) {
    return (
      <div className='flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 text-center'>
        <div className='rounded-xl bg-white p-8 shadow-sm'>
          <LogIn className='mx-auto mb-4 h-16 w-16 text-green-600' />
          <h2 className='text-xl font-semibold text-gray-900'>
            Login Required
          </h2>
          <p className='mt-2 text-gray-500'>
            Please login to continue with checkout
          </p>
          <button
            onClick={() => navigate('/login', { state: { from: '/checkout' } })}
            className='mt-4 rounded-lg bg-green-600 px-6 py-2 font-semibold text-white transition hover:bg-green-700'
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

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
            {/* Delivery / Pickup Selection - NEW SECTION */}
            <div className='rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6'>
              <h2 className='mb-4 text-lg font-bold text-gray-900 sm:text-xl'>
                How would you like to receive your order?
              </h2>

              <div className='grid gap-3 sm:grid-cols-2'>
                {/* Delivery Option */}
                <button
                  onClick={() => setDeliveryOption('delivery')}
                  disabled={isProcessing}
                  className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition sm:p-5 ${
                    deliveryOption === 'delivery'
                      ? 'border-green-600 bg-green-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  } disabled:opacity-50`}
                >
                  <div className='flex-1'>
                    <h3 className='font-semibold text-gray-900'>Delivery</h3>
                    <p className='mt-0.5 text-sm text-gray-600'>
                      Get your order delivered to your doorstep
                    </p>
                    {deliveryOption === 'delivery' && (
                      <div className='mt-2 flex items-center gap-1 text-xs font-medium text-green-700'>
                        <Check className='h-3.5 w-3.5' />
                        Selected
                      </div>
                    )}
                  </div>
                </button>

                {/* Pickup Option */}
                <button
                  onClick={() => setDeliveryOption('pickup')}
                  disabled={isProcessing}
                  className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition sm:p-5 ${
                    deliveryOption === 'pickup'
                      ? 'border-green-600 bg-green-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  } disabled:opacity-50`}
                >
                  <div className='flex-1'>
                    <h3 className='font-semibold text-gray-900'>Pickup</h3>
                    <p className='mt-0.5 text-sm text-gray-600'>
                      Collect your order from our location
                    </p>
                    {deliveryOption === 'pickup' && (
                      <div className='mt-2 flex items-center gap-1 text-xs font-medium text-green-700'>
                        <Check className='h-3.5 w-3.5' />
                        Selected
                      </div>
                    )}
                  </div>
                </button>
              </div>
            </div>
            {/* 2️⃣ ADD THIS NEW SECTION - Shows address or pickup location */}
            <div className='rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6'>
              <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
                <h2 className='text-lg font-bold text-gray-900 sm:text-xl'>
                  {isDelivery ? 'Delivery Address' : 'Pickup Location'}
                </h2>
              </div>

              {isDelivery ? (
                <div className='flex items-start gap-3'>
                  <MapPin className='mt-1 h-5 w-5 flex-shrink-0 text-gray-500' />
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
                    className='flex-shrink-0 rounded-lg bg-green-100 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-200 disabled:opacity-50'
                  >
                    {place ? 'Change' : 'Select'}
                  </button>
                </div>
              ) : (
                <div className='flex items-start gap-3'>
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
                    <button
                      onClick={() =>
                        window.open(restaurantInfo.mapUrl, '_blank')
                      }
                      className='mt-2 text-sm font-medium text-green-600 hover:text-green-700'
                    >
                      Get Directions →
                    </button>
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
                <textarea
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  disabled={isProcessing}
                  placeholder='Any special instructions for your order...'
                  rows={3}
                  className='w-full rounded-lg border border-gray-300 py-2 pr-4 pl-5 focus:border-green-600 focus:ring-2 focus:ring-green-600 focus:outline-none disabled:bg-gray-50 disabled:opacity-50'
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
                      You'll receive an M-PESA prompt on your phone to complete
                      payment.
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
                    <span
                      className={`font-medium ${deliveryFee === 0 ? 'text-green-600' : 'text-gray-900'}`}
                    >
                      {deliveryFee === 0
                        ? 'Free'
                        : `KES ${deliveryFee.toFixed(2)}`}
                    </span>
                  </div>

                  {/* Free Delivery Progress Banner */}
                  {isDelivery &&
                    !qualifiesForFreeDelivery &&
                    amountUntilFreeDelivery > 0 &&
                    amountUntilFreeDelivery <= 50 && (
                      <div className='rounded-lg border border-amber-200 bg-amber-50 p-3'>
                        <p className='text-xs text-amber-800'>
                          Add{' '}
                          <span className='font-bold'>
                            KES {amountUntilFreeDelivery.toFixed(2)}
                          </span>{' '}
                          more for free delivery!
                        </p>
                        <div className='mt-2 h-2 w-full rounded-full bg-amber-200'>
                          <div
                            className='h-full rounded-full bg-amber-500 transition-all'
                            style={{
                              width: `${Math.min((subtotal / FREE_DELIVERY_THRESHOLD) * 100, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                  {/* Free Delivery Badge */}
                  {isDelivery && qualifiesForFreeDelivery && (
                    <div className='rounded-lg border border-green-200 bg-green-50 p-3'>
                      <p className='flex items-center gap-1 text-xs font-semibold text-green-800'>
                        <span className='text-base'>🎉</span> You've unlocked
                        free delivery!
                      </p>
                    </div>
                  )}
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
        onFallbackOpen={() => setFallbackOpen(true)}
      />

      {/* Fallback Modal - ADD THIS ENTIRE SECTION */}
      <FallbackModal
        open={fallbackOpen}
        onClose={() => setFallbackOpen(false)}
        onSubmit={(data) => {
          const customPlace = {
            id: uuidv4(),
            place_id: null,
            secondary_text: data.landmark,
            main_text: data.name,
            source: 'manual',
          };

          // Save to store with properly formatted address
          setDeliveryAddress(customPlace);

          // Close both modals
          setFallbackOpen(false);
          setShowModal(false);

          toast.success('Custom address added!');
        }}
      />
    </div>
  );
}
