import { useState, useEffect, useRef, useCallback } from 'react';
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
import { ConfirmModal } from '@components/confirmModal';
import axios from 'axios';
import type {
  RealtimeChannel,
  RealtimePostgresUpdatePayload,
} from '@supabase/supabase-js';
import { supabase } from '@utils/supabase/Client';

const MAX_WAIT_TIME = 60;

type ConnectionStatus = 'connecting' | 'connected' | 'error';

const OrderConfirmation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // State
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('connecting');
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelivery, setConfirmingDelivery] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Refs
  const realtimeRef = useRef<RealtimeChannel | null>(null);
  const timeoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const orderID = searchParams.get('orderID');

  // Auth redirect
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/order-confirmation' } });
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Stop timers
  const stopTimers = useCallback(() => {
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }
  }, []);

  // Clean up Supabase channel
  const cleanupRealtime = useCallback(async () => {
    console.log('[cleanupRealtime] start');
    try {
      if (!realtimeRef.current) return;
      const channel = realtimeRef.current;
      await channel.unsubscribe();
      console.log('[cleanupRealtime] end');
    } catch (err) {
      console.warn('Failed to cleanup realtime subscription', err);
    } finally {
      realtimeRef.current = null;
      setConnectionStatus('connecting');
    }
  }, []);

  // Fetch order details manually
  const fetchOrderDetails = useCallback(
    async (suppressLoading = false) => {
      if (!orderID || !isMountedRef.current) return true;
      console.log('[fetchOrderDetails] running', { orderID });

      try {
        if (!suppressLoading) setLoading(true);
        const statusResponse = await api.get(
          `/api/orders/${orderID}/payment-status`,
        );

        if (!isMountedRef.current) return true;

        if (statusResponse.data.has_failed) {
          console.log('[fetchOrderDetails] terminal state detected', {
            has_failed: statusResponse.data.has_failed,
            is_complete: statusResponse.data.is_complete,
          });

          setError(
            `Payment ${statusResponse.data.payment_status}. Please try again or contact support.`,
          );
          setLoading(false);
          stopTimers();
          await cleanupRealtime();
          return true;
        }

        if (statusResponse.data.is_complete) {
          console.log('[fetchOrderDetails] terminal state detected', {
            has_failed: statusResponse.data.has_failed,
            is_complete: statusResponse.data.is_complete,
          });

          const orderResponse = await api.get(`/api/orders/${orderID}`);
          if (!isMountedRef.current) return true;
          setOrderData(orderResponse.data.order);
          setLoading(false);
          stopTimers();
          await cleanupRealtime();
          return true;
        }
        console.log('[fetchOrderDetails] done');

        return false;
      } catch (err) {
        if (!isMountedRef.current) return true;
        console.error('Error fetching order details:', err);
        setError('Failed to load order details');
        setLoading(false);
        stopTimers();
        await cleanupRealtime();
        return true;
      }
    },
    [orderID, stopTimers, cleanupRealtime],
  );

  // Handle realtime updates
  const handleRealtimeUpdate = useCallback(
    async (
      payload: RealtimePostgresUpdatePayload<{
        id: string;
        status: string;
        payment_status: string;
        is_complete: boolean;
        has_failed: boolean;
      }>,
    ) => {
      console.log('[Realtime] payload', payload);

      if (!payload?.new) return;
      const newRow = payload.new;
      if (String(newRow.id) !== String(orderID)) return;

      const isSuccess =
        newRow.status === 'confirmed' ||
        newRow.payment_status === 'COMPLETED' ||
        newRow.is_complete === true;

      const isFailed =
        newRow.status === 'failed' ||
        newRow.payment_status === 'FAILED' ||
        newRow.has_failed === true;

      if (isSuccess || isFailed) {
        console.log('[Realtime] terminal state received', {
          isSuccess,
          isFailed,
        });

        stopTimers();
        try {
          const orderResponse = await api.get(`/api/orders/${orderID}`);
          if (orderResponse?.data?.order) {
            setOrderData(orderResponse.data.order);
            setLoading(false);
          }
        } catch (err) {
          console.error('Failed to fetch order after realtime update', err);
          setError('Failed to load order details');
          setLoading(false);
        }
        await cleanupRealtime(); // ✅ Unsubscribe once resolved
        console.log('[Realtime] cleanup done after terminal');
      }
    },
    [orderID, stopTimers, cleanupRealtime],
  );

  // Setup Supabase Realtime subscription
  const setupRealtimeSubscription = useCallback(async () => {
    if (!orderID || realtimeRef.current) return;

    try {
      const channel = supabase.channel(`order-${orderID}`).on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderID}`,
        },
        handleRealtimeUpdate,
      );

      channel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') setConnectionStatus('connected');
        if (status === 'CHANNEL_ERROR') setConnectionStatus('error');
      });

      realtimeRef.current = channel;
    } catch (err) {
      console.error('Realtime subscribe failed', err);
      setConnectionStatus('error');
    }
  }, [orderID, handleRealtimeUpdate]);

  // Initialization effect
  useEffect(() => {
    if (!orderID) {
      setError('Missing order ID');
      setLoading(false);
      return;
    }
    if (authLoading || !isAuthenticated) return;

    isMountedRef.current = true;

    const initialize = async () => {
      const isResolved = await fetchOrderDetails();

      if (!isResolved && isMountedRef.current) {
        setupRealtimeSubscription();

        timeoutTimerRef.current = setTimeout(() => {
          console.log('[Timeout] fired');
          if (!isMountedRef.current) return;
          setError(
            'Payment verification is taking longer than expected. Please check your email or contact support.',
          );
          setLoading(false);
          cleanupRealtime();
        }, MAX_WAIT_TIME * 1000);
        console.log('[Timeout] created');
      }
    };

    initialize();

    return () => {
      isMountedRef.current = false;
      stopTimers();
      cleanupRealtime();
    };
  }, [
    orderID,
    isAuthenticated,
    authLoading,
    fetchOrderDetails,
    setupRealtimeSubscription,
    stopTimers,
    cleanupRealtime,
  ]);

  // Confirm delivery
  const handleConfirmDelivery = useCallback(async () => {
    if (!orderData) return;
    setConfirmingDelivery(true);
    setErrorMessage(null);

    try {
      const res = await api.post(
        `/api/orders/${orderData.id}/confirm-delivery`,
      );

      if (res.data.success) {
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
  }, [orderData]);

  // UI
  if (authLoading) return <LoadingScreen message='Loading...' />;
  if (!isAuthenticated) return null;

  if (loading)
    return (
      <LoadingScreen
        message='Confirming Your Payment'
        description='Please wait while we verify your M-PESA payment...'
        connectionStatus={connectionStatus}
      />
    );

  if (error)
    return (
      <ErrorScreen
        error={error}
        onRetry={() => window.location.reload()}
        onViewOrders={() => navigate('/orders')}
      />
    );

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
