import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@utils/hooks/useAuth';
import { api } from '@utils/hooks/apiUtils';

import type { OrderData } from '@utils/schemas/order';
import { ConfirmDeliveryCard } from './components/confirmationCard';
import { DeliveryAddressCard } from './components/deliveryAddrcard';
import { DeliveryConfirmedBadge } from './components/deliveryBadge';
import { ErrorScreen } from './components/errorScreen';
import { LoadingScreen } from './components/loadingScreen';
import { OrderDetailsCard } from './components/orderDetails';
import { OrderItemsCard } from './components/orderItemscard';
import { OrderStatusCard } from './components/orderStatus';
import { SuccessHeader } from './components/successHeader';
import axios from 'axios';
import { ConfirmModal } from '@components/confirmModal';
import { supabase } from '@utils/supabase/Client';

const MAX_WAIT_TIME = 60;

const OrderConfirmation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'error'
  >('connecting');
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [waitingTime, setWaitingTime] = useState(0);
  const [confirmingDelivery, setConfirmingDelivery] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const orderID = searchParams.get('orderID');

  // Auth redirect
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/order-confirmation' } });
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Main order fetching and Supabase Realtime logic
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
      console.log('✅ Setting up Supabase Realtime subscription');
      setConnectionStatus('connected');

      // Subscribe to changes on the orders table for this specific order
      const channel = supabase
        .channel(`order:${orderID}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `id=eq.${orderID}`,
          },
          async (payload) => {
            console.log('📦 Received order update from Supabase:', payload);

            const updatedOrder = payload.new as any;

            // Check if payment status changed to paid
            if (updatedOrder.payment_status === 'paid') {
              clearTimeout(timeoutId);
              clearInterval(waitingInterval);

              // Fetch complete order details
              const orderResponse = await api.get(`/api/orders/${orderID}`);
              setOrderData(orderResponse.data.order);
              setLoading(false);
              return;
            }

            // Handle failed/cancelled payments
            if (
              updatedOrder.payment_status === 'failed' ||
              updatedOrder.payment_status === 'cancelled'
            ) {
              clearTimeout(timeoutId);
              clearInterval(waitingInterval);
              setError(
                `Payment ${updatedOrder.payment_status}. Please try again or contact support.`,
              );
              setLoading(false);
              return;
            }

            // Update with partial data for other changes
            setOrderData((prev) =>
              prev ? { ...prev, ...updatedOrder } : null,
            );
          },
        )
        .subscribe((status) => {
          console.log('Supabase subscription status:', status);
          if (status === 'SUBSCRIBED') {
            setConnectionStatus('connected');
          } else if (status === 'CHANNEL_ERROR') {
            setConnectionStatus('error');
            console.error('❌ Supabase subscription error');
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
          if (isMounted) {
            setError(
              'Payment verification is taking longer than expected. Please check your email or contact support.',
            );
            setLoading(false);
          }
        }, MAX_WAIT_TIME * 1000);

        // Store channel for cleanup
        return channel;
      } else if (isResolved && isMounted) {
        // Still subscribe even after order is loaded for real-time updates
        return setupRealtimeSubscription();
      }
    };

    let channelCleanup: any;
    initialize().then((channel) => {
      channelCleanup = channel;
    });

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      if (waitingInterval) clearInterval(waitingInterval);

      // Cleanup Supabase subscription
      if (channelCleanup) {
        supabase.removeChannel(channelCleanup);
        console.log('👋 Unsubscribed from Supabase Realtime');
      }
    };
  }, [orderID, isAuthenticated, authLoading]);

  const handleConfirmDelivery = async () => {
    if (!orderData) return;
    setConfirmingDelivery(true);
    setErrorMessage(null);

    try {
      const res = await api.post(
        `/api/orders/${orderData.id}/confirm-delivery`,
      );

      if (res.data.success) {
        // Supabase Realtime will handle the update automatically
        // But we can optimistically update the UI
        setOrderData((prev) =>
          prev
            ? {
                ...prev,
                status: 'delivered',
                delivered_at: res.data.delivered_at,
              }
            : null,
        );
        setShowConfirmModal(false);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(
          error.response?.data?.error ?? 'Unable to confirm delivery.',
        );
      } else {
        setErrorMessage('Something went wrong.');
      }
    } finally {
      setConfirmingDelivery(false);
    }
  };

  if (authLoading) {
    return <LoadingScreen message='Loading...' />;
  }

  if (!isAuthenticated) return null;

  if (loading) {
    return (
      <LoadingScreen
        message='Confirming Your Payment'
        description='Please wait while we verify your M-PESA payment...'
        waitingTime={waitingTime}
        maxWaitTime={MAX_WAIT_TIME}
        connectionStatus={connectionStatus}
      />
    );
  }

  if (error) {
    return (
      <ErrorScreen
        error={error}
        onRetry={() => window.location.reload()}
        onViewOrders={() => navigate('/orders')}
      />
    );
  }

  if (!orderData) return null;

  return (
    <div
      className='min-h-screen px-4 py-12'
      style={{ backgroundColor: '#fefaef' }}
    >
      <div className='mx-auto max-w-3xl'>
        <SuccessHeader
          orderId={orderData.id}
          createdAt={orderData.created_at}
        />

        {orderData.status === 'confirmed' && (
          <div className='space-y-2'>
            <ConfirmDeliveryCard
              deliveryType={orderData.delivery_type}
              orderId={orderData.id}
              confirmingDelivery={confirmingDelivery}
              onConfirm={() => setShowConfirmModal(true)}
            />

            {errorMessage && (
              <p className='text-sm text-red-600'>{errorMessage}</p>
            )}

            <ConfirmModal
              show={showConfirmModal}
              message={
                orderData.delivery_type === 'pickup'
                  ? 'Have you picked up your order? This will mark it as completed.'
                  : 'Have you received your order? This will mark it as delivered.'
              }
              onConfirm={handleConfirmDelivery}
              onCancel={() => setShowConfirmModal(false)}
              confirmText='Yes, Confirm'
              cancelText='No'
              loading={confirmingDelivery}
            />
          </div>
        )}

        {orderData.status === 'delivered' && (
          <DeliveryConfirmedBadge deliveryType={orderData.delivery_type} />
        )}

        {orderData.status !== 'delivered' && (
          <OrderStatusCard
            status={orderData.status}
            deliveryType={orderData.delivery_type}
            createdAt={orderData.created_at}
          />
        )}

        <OrderDetailsCard
          email={user?.email}
          mpesaPhone={orderData.mpesa_phone}
          paymentReference={orderData.payment_reference}
        />

        {orderData.items && orderData.items.length > 0 && (
          <OrderItemsCard
            items={orderData.items}
            subtotal={orderData.subtotal}
            deliveryFee={orderData.delivery_fee}
            totalAmount={orderData.total_amount}
            deliveryType={orderData.delivery_type}
          />
        )}

        <DeliveryAddressCard
          deliveryType={orderData.delivery_type}
          mainText={orderData.delivery_address_main_text}
          secondaryText={orderData.delivery_address_secondary_text}
          instructions={orderData.delivery_instructions}
        />

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
