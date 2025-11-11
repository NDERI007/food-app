import {
  RefreshCw,
  Truck,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Package,
  CheckCircle,
  X,
  Share2,
} from 'lucide-react';
import axios, { AxiosError } from 'axios';
import { api } from '@utils/hooks/apiUtils';
import { useState, useCallback, useEffect, useRef } from 'react';
import io, { Socket } from 'socket.io-client';
import { supabase } from '@utils/supabase/Client';

// API Configuration
const API_URL = '/api/orders/reviewed';
const SHARE_ENDPOINT = '/api/rider/share-to-rider';
const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

interface OrderItem {
  quantity: number;
  name: string;
  variant_size: string;
}

interface Order {
  id: string;
  payment_reference: string;
  mpesa_phone: string;
  total_amount: number;
  delivery_address_main_text: string;
  delivery_place_id?: string;
  created_at: string;
  status: string;
  shared_to_rider: string;
  order_items: OrderItem[];
}

interface PaginationData {
  orders: Order[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

interface Toast {
  id: number;
  message: string;
  type: 'error' | 'success';
}

interface OrderSharedNotification {
  type: 'ORDER_SHARED';
  data: {
    id: string;
    payment_reference: string;
    shared_by: string;
  };
  timestamp: string;
}

export default function ReviewedDashboard() {
  const [outForDelivery, setOutForDelivery] = useState<PaginationData>({
    orders: [],
    total_count: 0,
    page: 1,
    page_size: 10,
    total_pages: 0,
  });

  const [declined, setDeclined] = useState<PaginationData>({
    orders: [],
    total_count: 0,
    page: 1,
    page_size: 10,
    total_pages: 0,
  });

  const [loadingDelivery, setLoadingDelivery] = useState(false);
  const [loadingDeclined, setLoadingDeclined] = useState(false);
  const [sharingOrderId, setSharingOrderId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  const showToast = (message: string, type: 'error' | 'success' = 'error') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 5000);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const loadOrders = useCallback(
    async (status: 'out_for_delivery' | 'declined', page: number) => {
      const isDelivery = status === 'out_for_delivery';
      const setLoading = isDelivery ? setLoadingDelivery : setLoadingDeclined;

      try {
        setLoading(true);

        const response = await api.get<PaginationData>(API_URL, {
          params: {
            status,
            page,
            pageSize: 10,
          },
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        });

        if (isDelivery) {
          setOutForDelivery(response.data);
        } else {
          setDeclined(response.data);
        }
      } catch (err) {
        let errorMsg = 'An unexpected error occurred';

        if (axios.isAxiosError(err)) {
          const axiosError = err as AxiosError;

          if (axiosError.response) {
            errorMsg = `Failed to load ${isDelivery ? 'delivery' : 'declined'} orders: ${axiosError.response.status}`;
          } else if (axiosError.request) {
            errorMsg = 'Unable to reach server. Please check your connection.';
          } else if (axiosError.code === 'ECONNABORTED') {
            errorMsg = `Request timeout while loading ${isDelivery ? 'delivery' : 'declined'} orders. Please try again.`;
          } else {
            errorMsg =
              axiosError.message ||
              `Failed to load ${isDelivery ? 'delivery' : 'declined'} orders`;
          }
        } else if (err instanceof Error) {
          errorMsg = err.message;
        }

        showToast(errorMsg, 'error');
        console.error('Error loading orders:', err);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Socket.IO event handlers
  const handleOrderShared = useCallback(
    (notification: OrderSharedNotification) => {
      console.log('📢 Order shared notification received:', notification);

      if (notification.type === 'ORDER_SHARED') {
        const { data } = notification;

        // Update the local state to mark order as shared
        setOutForDelivery((prev) => {
          const updatedOrders = prev.orders.map((order) =>
            order.id === data.id
              ? { ...order, shared_to_rider: 'true' }
              : order,
          );

          return {
            ...prev,
            orders: updatedOrders,
          };
        });

        // Show toast notification
        showToast(
          `Order ${data.payment_reference} assigned by ${data.shared_by}`,
          'success',
        );
      }
    },
    [],
  );
  useEffect(() => {
    console.log('🔄 Setting up Supabase Realtime for status changes');

    const channel = supabase
      .channel('orders-status-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: 'status=in.(out_for_delivery,declined)',
        },
        (payload) => {
          console.log('📦 Order status changed:', payload);

          const updatedOrder = payload.new as Order;

          // Refetch the appropriate list for instant UI update
          if (updatedOrder.status === 'out_for_delivery') {
            loadOrders('out_for_delivery', outForDelivery.page);
          } else if (updatedOrder.status === 'declined') {
            loadOrders('declined', declined.page);
          }
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Subscribed to order status updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Status subscription error');
        }
      });

    return () => {
      supabase.removeChannel(channel);
      console.log('👋 Unsubscribed from status updates');
    };
  }, [loadOrders, outForDelivery.page, declined.page]);
  // Initialize Socket.IO connection
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Connected to Socket.IO server for order updates');
      setIsConnected(true);
      // Join the admins room (handled server-side automatically)
    });

    socket.on('disconnect', () => {
      console.log('❌ Disconnected from server');
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('⚠️ Socket connection error:', err.message);
      setIsConnected(false);
    });

    // Listen for order shared events
    socket.on('admin:notifications:shared', handleOrderShared);

    return () => {
      socket.disconnect();
    };
  }, [handleOrderShared]);

  useEffect(() => {
    // Initial data load for both tables
    loadOrders('out_for_delivery', 1);
    loadOrders('declined', 1);
  }, [loadOrders]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const shareToRider = async (order: Order) => {
    try {
      setSharingOrderId(order.id);

      // Call the backend API to update database and notify other admins
      const response = await api.post(
        SHARE_ENDPOINT,
        { orderID: order.id },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        },
      );

      if (response.data.success) {
        // Optimistically update local state
        setOutForDelivery((prev) => ({
          ...prev,
          orders: prev.orders.map((o) =>
            o.id === order.id ? { ...o, shared_to_rider: 'true' } : o,
          ),
        }));

        // Open WhatsApp
        shareToWhatsApp(order);

        showToast('Order shared successfully!', 'success');
      }
    } catch (err) {
      let errorMsg = 'Failed to share order';

      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError<{ error: string }>;
        errorMsg = axiosError.response?.data?.error || errorMsg;
      }

      showToast(errorMsg, 'error');
      console.error('Error sharing order:', err);
    } finally {
      setSharingOrderId(null);
    }
  };

  const shareToWhatsApp = (order: Order) => {
    // Format order items
    const itemsList = order.order_items
      .map(
        (item) =>
          `• ${item.quantity}x ${item.name}${item.variant_size ? ` (${item.variant_size})` : ''}`,
      )
      .join('\n');

    // Create Google Maps link
    const mapsLink = order.delivery_place_id
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.delivery_address_main_text)}&query_place_id=${order.delivery_place_id}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.delivery_address_main_text)}`;

    // Compose message
    const message = `🚚 *NEW DELIVERY ORDER*

📦 *Order Reference:* ${order.payment_reference}

👤 *Customer Phone:* ${order.mpesa_phone}

📍 *Delivery Address:*
${order.delivery_address_main_text}

🗺️ *Google Maps:*
${mapsLink}

📋 *Items to Deliver:*
${itemsList}

Please confirm pickup and delivery.`;

    // Create WhatsApp URL
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

    // Open WhatsApp
    window.open(whatsappUrl, '_blank');
  };

  const OrderTable = ({
    data,
    loading,
    type,
    onPageChange,
  }: {
    data: PaginationData;
    loading: boolean;
    type: 'delivery' | 'declined';
    onPageChange: (page: number) => void;
  }) => {
    const isDelivery = type === 'delivery';

    return (
      <div className='rounded-2xl border border-gray-700 bg-gray-800 shadow-xl'>
        <div className='border-b border-gray-700 p-6'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div
                className={`rounded-lg p-2 ${isDelivery ? 'bg-purple-500/20' : 'bg-red-500/20'}`}
              >
                {isDelivery ? (
                  <Truck className='h-5 w-5 text-purple-400' />
                ) : (
                  <XCircle className='h-5 w-5 text-red-400' />
                )}
              </div>
              <div>
                <h2 className='text-lg font-semibold text-white'>
                  {isDelivery ? 'Out for Delivery' : 'Declined Orders'}
                </h2>
                <p className='text-sm text-gray-400'>
                  {data.total_count} total orders
                  {isDelivery && (
                    <span
                      className={`ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        isConnected
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isConnected ? 'bg-green-400' : 'bg-red-400'
                        }`}
                      />
                      {isConnected ? 'Live' : 'Offline'}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={() => onPageChange(data.page)}
              disabled={loading}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold text-white transition-colors ${
                isDelivery
                  ? 'bg-purple-600 hover:bg-purple-500'
                  : 'bg-red-600 hover:bg-red-500'
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              />
              Refresh
            </button>
          </div>
        </div>

        <div className='p-6'>
          {loading && data.orders.length === 0 ? (
            <div className='space-y-3'>
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className='h-32 animate-pulse rounded-lg bg-gray-700/50'
                ></div>
              ))}
            </div>
          ) : data.orders.length > 0 ? (
            <>
              <div className='space-y-4'>
                {data.orders.map((order) => (
                  <div
                    key={order.id}
                    className={`relative rounded-lg border p-4 transition-all ${
                      order.shared_to_rider
                        ? 'border-gray-700/50 bg-gray-900/30 opacity-60'
                        : 'border-gray-700 bg-gray-900/50 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10'
                    }`}
                  >
                    <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
                      <div>
                        <div className='text-xs font-semibold text-gray-500 uppercase'>
                          Reference
                        </div>
                        <div className='mt-1 font-mono text-sm font-semibold text-purple-400'>
                          {order.payment_reference}
                        </div>
                        <div className='mt-2 text-xs text-gray-400'>
                          {formatDate(order.created_at)}
                        </div>
                      </div>

                      <div>
                        <div className='text-xs font-semibold text-gray-500 uppercase'>
                          Customer
                        </div>
                        <div className='mt-1 text-sm text-gray-200'>
                          {order.mpesa_phone}
                        </div>
                        <div className='mt-1 line-clamp-2 text-xs text-gray-400'>
                          {order.delivery_address_main_text}
                        </div>
                      </div>

                      <div>
                        <div className='text-xs font-semibold text-gray-500 uppercase'>
                          Amount
                        </div>
                        <div className='mt-1 text-lg font-bold text-white'>
                          KSh{' '}
                          {order.total_amount.toLocaleString('en-KE', {
                            minimumFractionDigits: 2,
                          })}
                        </div>
                      </div>
                    </div>

                    <div className='mt-4 border-t border-gray-700 pt-4'>
                      <div className='flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase'>
                        <Package className='h-4 w-4' />
                        Order Items ({order.order_items.length})
                      </div>
                      <div className='mt-2 space-y-1.5'>
                        {order.order_items.map((item, idx) => (
                          <div
                            key={idx}
                            className='flex items-center justify-between rounded-md bg-gray-800/50 px-3 py-2 text-sm'
                          >
                            <span className='text-gray-300'>
                              <span className='font-semibold text-purple-400'>
                                {item.quantity}x
                              </span>{' '}
                              {item.name}
                              {item.variant_size && (
                                <span className='ml-2 text-xs text-gray-500'>
                                  ({item.variant_size})
                                </span>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* WhatsApp Share Section - Only for delivery orders */}
                    {isDelivery && !order.shared_to_rider && (
                      <div className='mt-4 flex justify-end border-t border-gray-700 pt-4'>
                        <button
                          onClick={() => shareToRider(order)}
                          disabled={sharingOrderId === order.id}
                          className='flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-500 active:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50'
                        >
                          {sharingOrderId === order.id ? (
                            <>
                              <RefreshCw className='h-4 w-4 animate-spin' />
                              Sharing...
                            </>
                          ) : (
                            <>
                              <Share2 className='h-4 w-4' />
                              Share to Rider
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Shared Badge */}
                    {isDelivery && order.shared_to_rider && (
                      <div className='mt-4 flex items-center justify-center gap-2 border-t border-gray-700 pt-4'>
                        <CheckCircle className='h-4 w-4 text-green-400' />
                        <span className='text-sm font-semibold text-green-400'>
                          Assigned to Rider
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {data.total_pages > 1 && (
                <div className='mt-6 flex items-center justify-between border-t border-gray-700 pt-4'>
                  <div className='text-sm text-gray-400'>
                    Page {data.page} of {data.total_pages}
                  </div>
                  <div className='flex gap-2'>
                    <button
                      onClick={() => onPageChange(data.page - 1)}
                      disabled={data.page === 1 || loading}
                      className='flex items-center gap-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm font-medium text-gray-300 transition-colors hover:border-purple-500 hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50'
                    >
                      <ChevronLeft className='h-4 w-4' />
                      Previous
                    </button>
                    <button
                      onClick={() => onPageChange(data.page + 1)}
                      disabled={data.page === data.total_pages || loading}
                      className='flex items-center gap-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm font-medium text-gray-300 transition-colors hover:border-purple-500 hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50'
                    >
                      Next
                      <ChevronRight className='h-4 w-4' />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className='py-12 text-center'>
              <div className='rounded-lg border border-dashed border-gray-700 bg-gray-900/30 p-8'>
                <div className='mb-2 text-base text-gray-500'>
                  No {isDelivery ? 'deliveries' : 'declined orders'} yet
                </div>
                <div className='text-sm text-gray-600'>
                  Orders will appear here as they are{' '}
                  {isDelivery ? 'dispatched' : 'declined'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className='relative z-0'>
      {/* Toast Container */}
      <div className='fixed top-4 right-4 z-[90] max-w-md space-y-2'>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-start gap-3 rounded-lg border p-4 shadow-lg backdrop-blur-sm transition-all ${
              toast.type === 'error'
                ? 'border-red-700 bg-red-900/90 text-red-100'
                : 'border-green-700 bg-green-900/90 text-green-100'
            }`}
          >
            {toast.type === 'error' ? (
              <XCircle className='h-5 w-5 flex-shrink-0 text-red-400' />
            ) : (
              <CheckCircle className='h-5 w-5 flex-shrink-0 text-green-400' />
            )}
            <div className='flex-1'>
              <p className='text-sm font-medium'>{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className='flex-shrink-0 text-gray-400 transition-colors hover:text-white'
            >
              <X className='h-4 w-4' />
            </button>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
        <OrderTable
          data={outForDelivery}
          loading={loadingDelivery}
          type='delivery'
          onPageChange={(page) => loadOrders('out_for_delivery', page)}
        />

        <OrderTable
          data={declined}
          loading={loadingDeclined}
          type='declined'
          onPageChange={(page) => loadOrders('declined', page)}
        />
      </div>
    </div>
  );
}
