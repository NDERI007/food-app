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
import { WhatsAppSupport } from './components/supportWhatsapp';

const POLLING_INTERVAL = 3000; // every 3s
const MAX_WAIT_TIME = 60; // seconds

type ConnectionStatus = 'polling' | 'stopped' | 'error';
const mapConnectionStatus = (
  status: ConnectionStatus,
): 'connecting' | 'connected' | 'error' => {
  switch (status) {
    case 'polling':
    case 'stopped':
      return 'connecting'; // treat polling/stopped as "connecting"
    case 'error':
      return 'error';
    default:
      return 'connecting';
  }
};

const OrderConfirmation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // --- State
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('polling');
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelivery, setConfirmingDelivery] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // --- Refs
  const orderID = searchParams.get('orderID');
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const isPollingRef = useRef(false);

  // --- Auth redirect
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/order-confirmation' } });
    }
  }, [isAuthenticated, authLoading, navigate]);

  // --- Cleanup function
  const stopPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      clearTimeout(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }
    isPollingRef.current = false;
    setConnectionStatus('stopped');
  }, []);

  // --- Polling logic
  const fetchOrderStatus = useCallback(async () => {
    if (!orderID || !isMountedRef.current) return true;

    try {
      const res = await api.get(`/api/orders/${orderID}/payment-status`);
      if (!isMountedRef.current) return true;

      const status = res.data;

      // ✅ Handle failure
      if (status.has_failed || status.payment_status === 'FAILED') {
        setError(
          `Payment ${status.payment_status}. Please try again or contact support.`,
        );
        setLoading(false);
        stopPolling();
        return true;
      }

      // ✅ Handle success
      if (status.is_complete || status.payment_status === 'COMPLETED') {
        const orderRes = await api.get(`/api/orders/${orderID}`);
        if (!isMountedRef.current) return true;
        setOrderData(orderRes.data.order);
        setLoading(false);
        stopPolling();
        return true;
      }

      return false;
    } catch (err) {
      console.error('Polling error:', err);
      if (!isMountedRef.current) return true;
      setError('Failed to fetch payment status.');
      setLoading(false);
      stopPolling();
      return true;
    }
  }, [orderID, stopPolling]);

  const startPolling = useCallback(() => {
    if (isPollingRef.current) return; // already polling
    isPollingRef.current = true;
    setConnectionStatus('polling');

    const poll = async () => {
      if (!isMountedRef.current || !isPollingRef.current) return;

      const resolved = await fetchOrderStatus();
      if (!resolved && isMountedRef.current && isPollingRef.current) {
        pollingTimerRef.current = setTimeout(poll, POLLING_INTERVAL);
      }
    };

    poll();
  }, [fetchOrderStatus]);

  // --- Initialize polling on mount
  useEffect(() => {
    if (!orderID) {
      setError('Missing order ID');
      setLoading(false);
      return;
    }
    if (authLoading || !isAuthenticated) return;

    isMountedRef.current = true;
    startPolling();

    timeoutTimerRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      setError(
        'Payment verification is taking longer than expected. Please check your email or contact support.',
      );
      setLoading(false);
      stopPolling();
    }, MAX_WAIT_TIME * 1000);

    return () => {
      isMountedRef.current = false;
      stopPolling();
    };
  }, [orderID, isAuthenticated, authLoading, startPolling, stopPolling]);

  // --- Confirm delivery
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

  // --- UI
  if (authLoading) return <LoadingScreen message='Loading...' />;
  if (!isAuthenticated) return null;

  if (loading)
    return (
      <LoadingScreen
        message='Confirming Your Payment'
        description='Please wait while we verify your M-PESA payment...'
        connectionStatus={mapConnectionStatus(connectionStatus)}
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
        {orderData.status === 'confirmed' && (
          <WhatsAppSupport orderData={orderData} />
        )}
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
