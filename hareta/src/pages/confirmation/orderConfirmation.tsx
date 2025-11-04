import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@utils/hooks/useAuth';
import { io, Socket } from 'socket.io-client';
import {
  Check,
  Package,
  Mail,
  Download,
  Loader2,
  AlertCircle,
  Phone,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { api } from '@utils/hooks/apiUtils';

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
  image_url?: string;
}

interface OrderData {
  id: string;
  delivery_type: 'pickup' | 'delivery';
  delivery_address_main_text?: string;
  delivery_address_secondary_text?: string;
  delivery_instructions?: string;
  status:
    | 'pending'
    | 'confirmed'
    | 'out_for_delivery'
    | 'delivered'
    | 'cancelled';
  payment_method: string;
  payment_status: string;
  payment_reference?: string;
  mpesa_phone?: string;
  subtotal: number;
  delivery_fee: number;
  total_amount: number;
  order_notes?: string;
  created_at: string;
  delivery_code?: string;
  delivered_at?: string;
  items?: OrderItem[];
}

const OrderConfirmation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [waitingTime, setWaitingTime] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'error'
  >('connecting');
  const [confirmingDelivery, setConfirmingDelivery] = useState(false);

  const MAX_WAIT_TIME = 60;
  const socketRef = useRef<Socket | null>(null);
  const orderID = searchParams.get('orderID');

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/order-confirmation' } });
    }
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    if (!orderID || !isAuthenticated || authLoading) {
      if (!orderID && !authLoading) {
        setError('Missing order ID');
        setLoading(false);
      }
      return;
    }

    let timeoutId: NodeJS.Timeout;
    let waitingInterval: NodeJS.Timeout;
    let isMounted = true;

    const fetchOrderDetails = async () => {
      try {
        const statusResponse = await api.get(
          `/api/orders/${orderID}/payment-status`,
        );
        if (!isMounted) return true;

        if (statusResponse.data.has_failed) {
          setError(
            `Payment ${statusResponse.data.payment_status}. Please try again or contact support.`,
          );
          setLoading(false);
          return true;
        }

        if (statusResponse.data.is_complete) {
          const orderResponse = await api.get(`/api/orders/${orderID}`);
          if (!isMounted) return true;
          setOrderData(orderResponse.data.order);
          setLoading(false);
          return true;
        }

        return false;
      } catch (err) {
        console.error('Error fetching order details:', err);
        if (!isMounted) return false;
        setError('Failed to load order details');
        setLoading(false);
        return false;
      }
    };

    const setupSocketConnection = () => {
      const socket = io(`${import.meta.env.VITE_API_URL}/orders`, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('✅ Connected to Socket.IO');
        setConnectionStatus('connected');
        socket.emit('join_order', orderID);
      });

      socket.on('joined_order', (data) => {
        console.log('✅ Joined order room:', data);
      });

      socket.on('order_update', async (data) => {
        console.log('📦 Received order update:', data);

        // If order just got paid → fetch full details
        if (data.payment_status === 'paid') {
          clearTimeout(timeoutId);
          clearInterval(waitingInterval);
          await fetchOrderDetails();
        }

        // If payment failed or cancelled
        if (
          data.payment_status === 'failed' ||
          data.payment_status === 'cancelled'
        ) {
          clearTimeout(timeoutId);
          clearInterval(waitingInterval);
          setError(
            `Payment ${data.payment_status}. Please try again or contact support.`,
          );
          setLoading(false);
          return;
        }

        // ✅ Always update the order state live
        setOrderData((prev) =>
          prev
            ? { ...prev, ...data } // Merge changes into existing data
            : data.id === orderID // If we had no data loaded yet
              ? { ...data } // Set initial data
              : prev,
        );
      });

      socket.on('connect_error', (err) => {
        console.error('❌ Socket connection error:', err);
        setConnectionStatus('error');
      });

      socket.on('disconnect', (reason) => {
        console.log('👋 Socket disconnected:', reason);
        if (reason === 'io server disconnect') {
          socket.connect();
        }
      });

      return socket;
    };

    const initialize = async () => {
      const isResolved = await fetchOrderDetails();

      if (!isResolved && isMounted) {
        setupSocketConnection();

        waitingInterval = setInterval(() => {
          if (isMounted) {
            setWaitingTime((prev) => prev + 1);
          }
        }, 1000);

        timeoutId = setTimeout(() => {
          clearInterval(waitingInterval);
          if (isMounted) {
            setError(
              'Payment verification is taking longer than expected. Please check your email or contact support.',
            );
            setLoading(false);
          }
        }, MAX_WAIT_TIME * 1000);
      } else if (isResolved && isMounted) {
        // Still connect to socket for real-time updates
        setupSocketConnection();
      }
    };

    initialize();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      if (waitingInterval) clearInterval(waitingInterval);

      if (socketRef.current) {
        socketRef.current.emit('leave_order', orderID);
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [orderID, isAuthenticated, authLoading]);

  const formatCurrency = (amount: number) => {
    return `KSh ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getEstimatedDelivery = (orderDate: string) => {
    const date = new Date(orderDate);
    const now = new Date();
    const orderHour = date.getHours();

    // Same-day delivery for orders before 7 PM
    if (date.toDateString() === now.toDateString() && orderHour < 19) {
      return 'Today, within 30-60 minutes';
    }

    // Orders after 7 PM deliver next day morning
    const deliveryDate = new Date(date);
    if (orderHour >= 19) {
      deliveryDate.setDate(date.getDate() + 1);
      return `Tomorrow (${deliveryDate.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}) by 10 AM`;
    }

    // For past orders, show next available slot
    deliveryDate.setDate(date.getDate() + 1);
    return `${deliveryDate.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })} by 10 AM`;
  };

  if (authLoading) {
    return (
      <div
        className='flex min-h-screen items-center justify-center'
        style={{ backgroundColor: '#fefaef' }}
      >
        <div className='h-12 w-12 animate-spin rounded-full border-4 border-green-200 border-t-green-900'></div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (loading) {
    return (
      <div
        className='flex min-h-screen items-center justify-center px-4'
        style={{ backgroundColor: '#fefaef' }}
      >
        <div className='w-full max-w-md rounded-2xl bg-white p-12 text-center shadow-lg'>
          <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100'>
            <Loader2 className='h-8 w-8 animate-spin text-green-900' />
          </div>
          <h2 className='mb-2 text-2xl font-bold text-green-900'>
            Confirming Your Payment
          </h2>
          <p className='mb-4 text-gray-700'>
            Please wait while we verify your M-PESA payment...
          </p>
          <div
            className='rounded-lg p-4'
            style={{ backgroundColor: '#fefaef' }}
          >
            <div className='mb-2 flex items-center justify-center gap-2'>
              <div
                className={`h-2 w-2 rounded-full ${
                  connectionStatus === 'connected'
                    ? 'bg-green-500'
                    : connectionStatus === 'error'
                      ? 'bg-red-500'
                      : 'animate-pulse bg-yellow-500'
                }`}
              ></div>
              <p className='text-xs text-gray-600'>
                {connectionStatus === 'connected'
                  ? 'Connected'
                  : connectionStatus === 'error'
                    ? 'Connection error'
                    : 'Connecting...'}
              </p>
            </div>
            <p className='text-sm text-gray-700'>
              This usually takes a few seconds
            </p>
            <p className='mt-2 text-xs text-gray-600'>
              Waiting: {waitingTime}s / {MAX_WAIT_TIME}s
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className='flex min-h-screen items-center justify-center px-4'
        style={{ backgroundColor: '#fefaef' }}
      >
        <div className='w-full max-w-md rounded-2xl bg-white p-12 text-center shadow-lg'>
          <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100'>
            <AlertCircle className='h-8 w-8 text-red-600' />
          </div>
          <h2 className='mb-2 text-2xl font-bold text-green-900'>
            Payment Verification Delayed
          </h2>
          <p className='mb-6 text-gray-700'>{error}</p>
          <div className='space-y-3'>
            <button
              onClick={() => window.location.reload()}
              className='w-full rounded-xl bg-green-900 py-3 font-semibold text-white transition-colors hover:bg-green-800'
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/orders')}
              className='w-full rounded-xl border-2 border-green-900 bg-white py-3 font-semibold text-green-900 transition-colors hover:bg-green-50'
            >
              View My Orders
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className='min-h-screen px-4 py-12'
      style={{ backgroundColor: '#fefaef' }}
    >
      <div className='mx-auto max-w-3xl'>
        {/* Success Header */}
        <div className='mb-6 rounded-2xl bg-white p-8 text-center shadow-lg'>
          <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100'>
            <Check className='h-8 w-8 text-green-900' />
          </div>
          <h1 className='mb-2 text-3xl font-bold text-green-900'>
            Order Confirmed
          </h1>
          <p className='mb-4 text-gray-700'>Thank you for your purchase!</p>
          <p className='text-sm text-gray-600'>
            Order{' '}
            <span className='font-mono font-semibold text-green-900'>
              #{orderData?.id.slice(0, 8).toUpperCase()}
            </span>
          </p>
          <p className='mt-2 text-xs text-gray-500'>
            {formatDate(orderData?.created_at || '')}
          </p>
        </div>

        {/* Confirm Delivery Button */}
        {orderData?.status === 'confirmed' && (
          <div className='mb-6 rounded-2xl bg-gradient-to-br from-green-900 to-green-800 p-8 text-white shadow-lg'>
            <div className='mb-4 flex items-center gap-3'>
              <div className='flex h-12 w-12 items-center justify-center rounded-full bg-white/20'>
                <Package className='h-6 w-6 text-white' />
              </div>
              <div>
                <h2 className='text-xl font-bold'>
                  {orderData.delivery_type === 'pickup'
                    ? 'Ready for Pickup!'
                    : 'Delivery in Progress'}
                </h2>
                <p className='text-sm text-green-100'>
                  {orderData.delivery_type === 'pickup'
                    ? 'Your order is ready. Come pick it up and confirm receipt.'
                    : 'Your order is on the way. Confirm when you receive it.'}
                </p>
              </div>
            </div>

            <button
              onClick={async () => {
                if (
                  window.confirm(
                    'Have you received your order? This will mark it as delivered.',
                  )
                ) {
                  setConfirmingDelivery(true);
                  try {
                    const response = await api.post(
                      `/api/orders/${orderData.id}/confirm-delivery`,
                    );

                    if (response.data.success) {
                      // Socket.IO will update the order status automatically
                      // But we can also update locally for immediate feedback
                      setOrderData((prev) =>
                        prev
                          ? {
                              ...prev,
                              status: 'delivered',
                              delivered_at: response.data.delivered_at,
                            }
                          : null,
                      );
                    }
                  } catch (error: any) {
                    const errorMsg =
                      error.response?.data?.error ||
                      'Failed to confirm delivery. Please try again.';
                    alert(errorMsg);
                  } finally {
                    setConfirmingDelivery(false);
                  }
                }
              }}
              disabled={confirmingDelivery}
              className='w-full rounded-xl bg-white py-4 font-semibold text-green-900 transition-all hover:bg-green-50 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50'
            >
              <div className='flex items-center justify-center gap-2'>
                {confirmingDelivery ? (
                  <>
                    <Loader2 className='h-5 w-5 animate-spin' />
                    Confirming...
                  </>
                ) : (
                  <>
                    <CheckCircle className='h-5 w-5' />
                    Confirm{' '}
                    {orderData.delivery_type === 'pickup'
                      ? 'Pickup'
                      : 'Delivery'}{' '}
                    Received
                  </>
                )}
              </div>
            </button>

            <div className='mt-4 rounded-lg bg-white/10 p-4'>
              <p className='text-sm text-green-100'>
                <strong className='text-white'>Note:</strong> Our delivery
                person will take a photo as proof of delivery. Please confirm
                once you've received your order.
              </p>
            </div>
          </div>
        )}

        {/* Delivery Confirmed Badge */}
        {orderData?.status === 'confirmed' && (
          <div className='mb-6 rounded-2xl border-2 border-green-200 bg-green-50 p-6 shadow-lg'>
            <div className='flex items-center gap-3'>
              <div className='flex h-12 w-12 items-center justify-center rounded-full bg-green-600'>
                <CheckCircle className='h-6 w-6 text-white' />
              </div>
              <div>
                <h3 className='text-lg font-bold text-green-900'>
                  {orderData.delivery_type === 'pickup'
                    ? 'Order Picked Up'
                    : 'Delivery Confirmed'}
                </h3>
              </div>
            </div>
          </div>
        )}

        {/* Order Status */}
        {orderData?.status !== 'delivered' && (
          <div className='mb-6 rounded-2xl bg-white p-8 shadow-lg'>
            <h2 className='mb-4 text-xl font-bold text-green-900'>
              Order Status
            </h2>

            <div className='space-y-4'>
              <div className='flex items-start gap-4'>
                <div className='flex h-10 w-10 items-center justify-center rounded-full bg-green-900 text-white'>
                  <Check className='h-5 w-5' />
                </div>
                <div className='flex-1'>
                  <p className='font-semibold text-green-900'>
                    Order Confirmed
                  </p>
                  <p className='text-sm text-gray-600'>
                    Payment received and order is being prepared
                  </p>
                </div>
              </div>

              {orderData?.status === 'out_for_delivery' ? (
                <div className='flex items-start gap-4'>
                  <div className='flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white'>
                    <Clock className='h-5 w-5' />
                  </div>
                  <div className='flex-1'>
                    <p className='font-semibold text-blue-900'>
                      {orderData.delivery_type === 'pickup'
                        ? 'Ready for Pickup'
                        : 'Out for Delivery'}
                    </p>
                    <p className='text-sm text-gray-600'>
                      {orderData.delivery_type === 'pickup'
                        ? 'Your order is ready! Come pick it up anytime.'
                        : 'Your order is on its way to you'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className='flex items-start gap-4'>
                  <div className='flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-gray-400'>
                    <Package className='h-5 w-5' />
                  </div>
                  <div className='flex-1'>
                    <p className='font-semibold text-gray-500'>
                      Preparing Order
                    </p>
                    <p className='text-sm text-gray-600'>
                      {orderData?.delivery_type === 'pickup'
                        ? "We'll notify you when your order is ready for pickup"
                        : `Estimated delivery: ${getEstimatedDelivery(orderData?.created_at || '')}`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Contact Info */}
        <div className='mb-6 rounded-2xl bg-white p-8 shadow-lg'>
          <h2 className='mb-4 text-xl font-bold text-green-900'>
            Order Details
          </h2>

          {user?.email && (
            <div className='mb-4 flex items-center text-gray-700'>
              <Mail className='mr-3 h-5 w-5 text-green-900' />
              <div>
                <p className='text-sm font-semibold text-green-900'>
                  Confirmation sent to
                </p>
                <p className='text-sm text-gray-600'>{user.email}</p>
              </div>
            </div>
          )}

          {orderData?.mpesa_phone && (
            <div className='flex items-center text-gray-700'>
              <Phone className='mr-3 h-5 w-5 text-green-900' />
              <div>
                <p className='text-sm font-semibold text-green-900'>
                  Payment from
                </p>
                <p className='text-sm text-gray-600'>{orderData.mpesa_phone}</p>
                {orderData.payment_reference && (
                  <p className='mt-1 text-xs text-gray-500'>
                    Ref: {orderData.payment_reference}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Order Items */}
        {orderData?.items && orderData.items.length > 0 && (
          <div className='mb-6 rounded-2xl bg-white p-8 shadow-lg'>
            <h2 className='mb-6 text-xl font-bold text-green-900'>
              Order Items
            </h2>
            <div className='space-y-4'>
              {orderData.items.map((item) => (
                <div
                  key={item.id}
                  className='flex items-center justify-between border-b border-gray-200 py-4 last:border-b-0'
                >
                  <div className='flex items-center'>
                    <div
                      className='mr-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg'
                      style={{ backgroundColor: '#fefaef' }}
                    >
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.product_name}
                          className='h-full w-full object-cover'
                        />
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
                <p>{formatCurrency(orderData.subtotal)}</p>
              </div>
              <div className='flex justify-between text-gray-700'>
                <p>
                  {orderData.delivery_type === 'delivery'
                    ? 'Delivery Fee'
                    : 'Pickup'}
                </p>
                <p>{formatCurrency(orderData.delivery_fee)}</p>
              </div>
              <div className='flex items-center justify-between border-t border-green-900 pt-2'>
                <p className='text-lg font-bold text-green-900'>Total</p>
                <p className='text-2xl font-bold text-green-900'>
                  {formatCurrency(orderData.total_amount)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Delivery/Pickup Address */}
        <div className='mb-6 rounded-2xl bg-white p-8 shadow-lg'>
          <h2 className='mb-4 text-xl font-bold text-green-900'>
            {orderData?.delivery_type === 'delivery'
              ? 'Delivery Address'
              : 'Pickup Location'}
          </h2>

          {orderData?.delivery_type === 'delivery' ? (
            <div className='text-gray-700'>
              {orderData.delivery_address_main_text && (
                <p className='mb-1 font-semibold text-green-900'>
                  {orderData.delivery_address_main_text}
                </p>
              )}
              {orderData.delivery_address_secondary_text && (
                <p className='mb-3 text-sm text-gray-600'>
                  {orderData.delivery_address_secondary_text}
                </p>
              )}
              {orderData.delivery_instructions && (
                <div className='mt-4 rounded-lg border border-green-200 bg-green-50 p-4'>
                  <p className='mb-1 text-sm font-semibold text-green-900'>
                    Delivery Instructions
                  </p>
                  <p className='text-sm text-green-800'>
                    {orderData.delivery_instructions}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className='text-gray-700'>
              <p className='mb-2 font-semibold text-green-900'>Store Pickup</p>
              <p className='text-sm text-gray-600'>
                Your order will be ready for pickup within 24-48 hours. We'll
                notify you when it's ready.
              </p>
            </div>
          )}
        </div>

        {/* Order Notes */}
        {orderData?.order_notes && (
          <div className='mb-6 rounded-2xl bg-white p-8 shadow-lg'>
            <h2 className='mb-4 text-xl font-bold text-green-900'>
              Order Notes
            </h2>
            <p className='text-gray-700'>{orderData.order_notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className='flex gap-4'>
          <button
            onClick={() => navigate('/orders')}
            className='flex-1 rounded-xl bg-green-900 py-4 font-semibold text-white transition-colors hover:bg-green-800'
          >
            View All Orders
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
