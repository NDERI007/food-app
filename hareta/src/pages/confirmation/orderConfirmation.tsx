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
import axios from 'axios';
import { ConfirmModal } from '@components/confirmModal';
import { io, type Socket } from 'socket.io-client';

const MAX_WAIT_TIME = 60;
const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

type ConnectionStatus = 'connecting' | 'connected' | 'error';

const OrderConfirmation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // Connection & Order State
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('connecting');
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Delivery Confirmation State
  const [confirmingDelivery, setConfirmingDelivery] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Refs
  const socketRef = useRef<Socket | null>(null);
  const timeoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const orderID = searchParams.get('orderID');

  // Auth redirect - separate effect
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/order-confirmation' } });
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Memoized cleanup functions
  const stopTimers = useCallback(() => {
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }
  }, []);

  const cleanupSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.emit('untrack:order', orderID);
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, [orderID]);

  // Fetch order details
  const fetchOrderDetails = useCallback(async () => {
    if (!orderID || !isMountedRef.current) return true;

    try {
      const statusResponse = await api.get(
        `/api/orders/${orderID}/payment-status`,
      );

      if (!isMountedRef.current) return true;

      if (statusResponse.data.has_failed) {
        setError(
          `Payment ${statusResponse.data.payment_status}. Please try again or contact support.`,
        );
        setLoading(false);
        stopTimers();
        return true;
      }

      if (statusResponse.data.is_complete) {
        const orderResponse = await api.get(`/api/orders/${orderID}`);
        if (!isMountedRef.current) return true;

        setOrderData(orderResponse.data.order);
        setLoading(false);
        stopTimers();
        return true;
      }

      return false;
    } catch (err) {
      if (!isMountedRef.current) return true;

      console.error('Error fetching order details:', err);
      setError('Failed to load order details');
      setLoading(false);
      stopTimers();
      return true;
    }
  }, [orderID, stopTimers]);

  // Setup socket connection
  const setupSocketConnection = useCallback(() => {
    if (!orderID || socketRef.current?.connected) return;

    const socket = io(`${SOCKET_URL}/customer`, {
      withCredentials: true,
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      if (!isMountedRef.current) return;
      setConnectionStatus('connected');
      socket.emit('track:order', orderID);
    });

    socket.on('disconnect', () => {
      if (!isMountedRef.current) return;
      setConnectionStatus('connecting');
    });

    socket.on('connect_error', (err) => {
      if (!isMountedRef.current) return;
      console.error('⚠️ Socket connection error:', err.message);
      setConnectionStatus('error');
    });

    socket.on('payment:confirmed', async (notification) => {
      if (!isMountedRef.current) return;

      if (notification.data.orderId === orderID) {
        stopTimers();

        try {
          const orderResponse = await api.get(`/api/orders/${orderID}`);
          if (!isMountedRef.current) return;

          setOrderData(orderResponse.data.order);
          setLoading(false);
        } catch (err) {
          if (!isMountedRef.current) return;

          console.error('Error fetching order after payment:', err);
          setError('Failed to load order details');
          setLoading(false);
        }

        cleanupSocket();
      }
    });

    return socket;
  }, [orderID, stopTimers, cleanupSocket]);

  // Main initialization effect
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
        // Order not yet complete, setup socket and timeout
        setupSocketConnection();

        timeoutTimerRef.current = setTimeout(() => {
          if (!isMountedRef.current) return;

          setError(
            'Payment verification is taking longer than expected. Please check your email or contact support.',
          );
          setLoading(false);
          cleanupSocket();
        }, MAX_WAIT_TIME * 1000);
      }
    };

    initialize();

    return () => {
      isMountedRef.current = false;
      stopTimers();
      cleanupSocket();
    };
  }, [
    orderID,
    isAuthenticated,
    authLoading,
    fetchOrderDetails,
    setupSocketConnection,
    stopTimers,
    cleanupSocket,
  ]);

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

  if (authLoading) {
    return <LoadingScreen message='Loading...' />;
  }

  if (!isAuthenticated) return null;

  if (loading) {
    return (
      <LoadingScreen
        message='Confirming Your Payment'
        description='Please wait while we verify your M-PESA payment...'
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
