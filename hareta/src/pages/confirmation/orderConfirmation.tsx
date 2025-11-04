import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@utils/hooks/useAuth';
import {
  Check,
  Package,
  Truck,
  MapPin,
  Calendar,
  Mail,
  Download,
  Loader2,
  AlertCircle,
  Phone,
} from 'lucide-react';
import axios from 'axios';
import { supabase } from '@utils/supabase/Client';
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
  status: string;
  payment_method: string;
  payment_status: string;
  payment_reference?: string;
  mpesa_phone?: string;
  subtotal: number;
  delivery_fee: number;
  total_amount: number;
  order_notes?: string;
  created_at: string;
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
  const MAX_WAIT_TIME = 60;

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

    const setupRealtimeSubscription = () => {
      const channel = supabase
        .channel(`order-${orderID}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `id=eq.${orderID}`,
          },
          async (payload) => {
            console.log('Order updated:', payload);

            const newPaymentStatus = payload.new.payment_status;

            if (newPaymentStatus === 'paid') {
              clearTimeout(timeoutId);
              clearInterval(waitingInterval);
              await fetchOrderDetails();
              supabase.removeChannel(channel);
            }

            if (
              newPaymentStatus === 'failed' ||
              newPaymentStatus === 'cancelled'
            ) {
              clearTimeout(timeoutId);
              clearInterval(waitingInterval);
              if (isMounted) {
                setError(
                  `Payment ${newPaymentStatus}. Please try again or contact support.`,
                );
                setLoading(false);
              }
              supabase.removeChannel(channel);
            }
          },
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Subscribed to order updates');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('Error subscribing to channel');
            if (isMounted) {
              setError('Connection error. Please refresh the page.');
              setLoading(false);
            }
          }
        });

      return channel;
    };

    const initialize = async () => {
      const isResolved = await fetchOrderDetails();

      if (!isResolved && isMounted) {
        const channel = setupRealtimeSubscription();

        waitingInterval = setInterval(() => {
          if (isMounted) {
            setWaitingTime((prev) => prev + 1);
          }
        }, 1000);

        timeoutId = setTimeout(() => {
          clearInterval(waitingInterval);
          supabase.removeChannel(channel);
          if (isMounted) {
            setError(
              'Payment verification is taking longer than expected. Please check your email or contact support.',
            );
            setLoading(false);
          }
        }, MAX_WAIT_TIME * 1000);
      }
    };

    initialize();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      if (waitingInterval) clearInterval(waitingInterval);
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
    const startDate = new Date(date);
    const endDate = new Date(date);
    startDate.setDate(date.getDate() + 3);
    endDate.setDate(date.getDate() + 5);

    return `${startDate.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' })}`;
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

  if (!isAuthenticated) {
    return null;
  }

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

        {/* Timeline */}
        <div className='mb-6 rounded-2xl bg-white p-8 shadow-lg'>
          <div className='mb-8 flex items-center justify-between'>
            <div className='flex-1'>
              <div className='mb-2 flex items-center'>
                <div className='flex h-10 w-10 items-center justify-center rounded-full bg-green-900'>
                  <Check className='h-5 w-5 text-white' />
                </div>
                <div className='mx-2 h-1 flex-1 bg-green-900'></div>
              </div>
              <p className='text-xs font-semibold text-green-900'>
                Order Placed
              </p>
            </div>
            <div className='flex-1'>
              <div className='mb-2 flex items-center'>
                <div className='flex h-10 w-10 items-center justify-center rounded-full bg-gray-200'>
                  <Package className='h-5 w-5 text-gray-400' />
                </div>
                <div className='mx-2 h-1 flex-1 bg-gray-200'></div>
              </div>
              <p className='text-xs text-gray-500'>Processing</p>
            </div>
            <div className='flex-1'>
              <div className='mb-2 flex items-center'>
                <div className='flex h-10 w-10 items-center justify-center rounded-full bg-gray-200'>
                  <Truck className='h-5 w-5 text-gray-400' />
                </div>
                <div className='mx-2 h-1 flex-1 bg-gray-200'></div>
              </div>
              <p className='text-xs text-gray-500'>
                {orderData?.delivery_type === 'pickup' ? 'Ready' : 'Shipped'}
              </p>
            </div>
            <div className='flex-1'>
              <div className='mb-2 flex items-center'>
                <div className='flex h-10 w-10 items-center justify-center rounded-full bg-gray-200'>
                  <MapPin className='h-5 w-5 text-gray-400' />
                </div>
              </div>
              <p className='text-xs text-gray-500'>
                {orderData?.delivery_type === 'pickup'
                  ? 'Picked Up'
                  : 'Delivered'}
              </p>
            </div>
          </div>

          <div className='border-t border-gray-200 pt-6'>
            {orderData?.delivery_type === 'delivery' && (
              <div className='mb-4 flex items-center text-gray-700'>
                <Calendar className='mr-3 h-5 w-5 text-green-900' />
                <div>
                  <p className='text-sm font-semibold text-green-900'>
                    Estimated Delivery
                  </p>
                  <p className='text-sm text-gray-600'>
                    {getEstimatedDelivery(orderData.created_at)}
                  </p>
                </div>
              </div>
            )}
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
                  <p className='text-sm text-gray-600'>
                    {orderData.mpesa_phone}
                  </p>
                  {orderData.payment_reference && (
                    <p className='mt-1 text-xs text-gray-500'>
                      Ref: {orderData.payment_reference}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
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
          <button
            onClick={() => window.print()}
            className='flex items-center justify-center rounded-xl border-2 border-green-900 bg-white px-6 py-4 font-semibold text-green-900 transition-colors hover:bg-green-50'
          >
            <Download className='h-5 w-5' />
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
