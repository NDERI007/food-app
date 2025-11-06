import { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Package,
  X,
  Clock,
  Wifi,
  WifiOff,
  ChevronRight,
} from 'lucide-react';
import io from 'socket.io-client';
import OrderDetailsDrawer from './orderDrawer';

interface Order {
  orderID: string;
  totalAmount: number;
  deliveryType: string;
  createdAt: string;
  paymentReference?: string;
}

interface BatchNotification {
  type: 'batch';
  count: number;
  totalRevenue: number;
  orders: Order[];
  timestamp: string;
}

const OrderMonitor = () => {
  const [notifications, setNotifications] = useState<BatchNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Track which orders we've already notified about
  const notifiedOrderIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const socket = io('http://localhost:8787', {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('subscribe', 'admin:notifications');
    });

    socket.on('disconnect', () => setIsConnected(false));
    socket.on('connect_error', () => setIsConnected(false));

    socket.on('admin:notifications', (data: BatchNotification) => {
      // filter duplicates
      const newOrders = data.orders.filter(
        (o) => !notifiedOrderIds.current.has(o.orderID),
      );
      if (newOrders.length === 0) return;
      newOrders.forEach((o) => notifiedOrderIds.current.add(o.orderID));

      const newBatchRevenue = newOrders.reduce((s, o) => s + o.totalAmount, 0);

      // Flatten orders into individual notifications
      const individualNotifications: BatchNotification[] = newOrders.map(
        (order) => ({
          type: 'batch',
          count: 1,
          totalRevenue: order.totalAmount,
          orders: [order],
          timestamp: order.createdAt,
        }),
      );

      setNotifications((prev) =>
        [...individualNotifications, ...prev].slice(0, 20),
      );
      setUnreadCount((prev) => prev + newOrders.length);

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(
          `${newOrders.length} New Order${newOrders.length > 1 ? 's' : ''}`,
          {
            body: `Revenue: KSh ${newBatchRevenue.toLocaleString()}`,
            tag: `batch-${Date.now()}`,
            icon: '/favicon.ico',
          },
        );
      }
    });

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      socket.disconnect();
    };
  }, []);

  const markAsRead = () => setUnreadCount(0);

  const formatCurrency = (amount: number) =>
    `KSh ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    return date.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
  };

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  };

  const handleOrderClick = (orderId: string) => {
    setSelectedOrderId(orderId);
    setShowPanel(false);
  };

  return (
    <>
      {/* Bell Button */}
      <div className='relative'>
        <button
          onClick={() => {
            setShowPanel(!showPanel);
            if (!showPanel) markAsRead();
          }}
          className='relative rounded-full bg-gray-700 p-2.5 transition-all hover:bg-gray-600 hover:shadow-lg hover:shadow-purple-500/20'
          aria-label='Notifications'
        >
          <Bell className='h-5 w-5 text-gray-200' />
          {unreadCount > 0 && (
            <span className='absolute -top-1 -right-1 flex h-5 w-5 animate-pulse items-center justify-center rounded-full bg-purple-600 text-[10px] font-bold text-white'>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Backdrop - Higher z-index */}
      {showPanel && (
        <div
          className='fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm'
          onClick={() => setShowPanel(false)}
        />
      )}

      {/* Slide-out Drawer - Even higher z-index */}
      <div
        className={`fixed top-14 right-0 z-[101] h-[calc(100vh-56px)] w-full transform border-l border-gray-700 bg-gradient-to-b from-gray-900 to-gray-800 shadow-2xl transition-transform duration-300 ease-out sm:w-[420px] ${
          showPanel ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className='border-b border-gray-700 bg-gradient-to-r from-gray-800 to-gray-900 p-4'>
          <div className='mb-4 flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='rounded-lg border border-purple-500/30 bg-purple-500/20 p-2 shadow-sm'>
                <Bell className='h-5 w-5 text-purple-400' />
              </div>
              <div>
                <h2 className='text-lg font-bold text-white'>Orders</h2>
                <p className='text-xs text-gray-400'>Good {getTimeOfDay()}</p>
              </div>
            </div>
            <button
              onClick={() => setShowPanel(false)}
              className='rounded-lg p-2 transition-colors hover:bg-gray-700'
              aria-label='Close'
            >
              <X className='h-5 w-5 text-gray-400 hover:text-white' />
            </button>
          </div>

          {/* Connection Status */}
          <div className='flex items-center justify-between'>
            <div
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${
                isConnected
                  ? 'border border-green-500/30 bg-green-500/20 text-green-400'
                  : 'border border-red-500/30 bg-red-500/20 text-red-400'
              }`}
            >
              {isConnected ? (
                <>
                  <Wifi className='h-3.5 w-3.5' />
                  <span>Live</span>
                </>
              ) : (
                <>
                  <WifiOff className='h-3.5 w-3.5' />
                  <span>Offline</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Orders Timeline */}
        <div className='h-[calc(100vh-180px)] overflow-y-auto bg-gray-900'>
          <div className='p-4'>
            <h3 className='mb-3 text-xs font-semibold tracking-wide text-gray-500 uppercase'>
              Recent Activity
            </h3>

            {notifications.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-12 text-center'>
                <div className='mb-3 rounded-full border border-gray-700 bg-gray-800 p-4'>
                  <Package className='h-8 w-8 text-gray-600' />
                </div>
                <p className='text-sm font-medium text-gray-300'>
                  No orders yet
                </p>
                <p className='mt-1 text-xs text-gray-500'>
                  New orders will appear here
                </p>
              </div>
            ) : (
              <div className='space-y-3'>
                {notifications.map((batch, idx) => {
                  const order = batch.orders[0];
                  const isNew = idx < 3;

                  return (
                    <div
                      key={order.orderID}
                      className='rounded-xl border border-gray-700 bg-gray-800 p-4 transition-all hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10'
                    >
                      {/* Order Header */}
                      <div className='mb-3 flex items-start justify-between'>
                        <div className='flex items-center gap-3'>
                          <div
                            className={`rounded-lg p-2 ${
                              order.deliveryType === 'Delivery'
                                ? 'border border-blue-500/30 bg-blue-500/20'
                                : 'border border-purple-500/30 bg-purple-500/20'
                            }`}
                          >
                            <Package
                              className={`h-4 w-4 ${
                                order.deliveryType === 'Delivery'
                                  ? 'text-blue-400'
                                  : 'text-purple-400'
                              }`}
                            />
                          </div>
                          <div>
                            <p className='text-sm font-semibold text-white'>
                              {order.orderID}
                            </p>
                            <div className='mt-0.5 flex items-center gap-1'>
                              <Clock className='h-3 w-3 text-gray-500' />
                              <p className='text-xs text-gray-400'>
                                {formatTime(order.createdAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                        <span
                          className={`rounded-md border px-2 py-1 text-xs font-medium ${
                            isNew
                              ? 'border-green-500/30 bg-green-500/20 text-green-400'
                              : 'border-gray-600 bg-gray-700 text-gray-400'
                          }`}
                        >
                          {isNew ? 'New' : order.deliveryType}
                        </span>
                      </div>

                      {/* Order Details */}
                      <div className='mb-3 flex items-center justify-between border-t border-gray-700 pt-3'>
                        <div>
                          <p className='mb-0.5 text-xs text-gray-500'>
                            Payment Ref
                          </p>
                          <p className='font-mono text-xs font-medium text-purple-400'>
                            {order.paymentReference || 'N/A'}
                          </p>
                        </div>
                        <div className='text-right'>
                          <p className='mb-0.5 text-xs text-gray-500'>Amount</p>
                          <p className='text-lg font-bold text-white'>
                            {formatCurrency(order.totalAmount)}
                          </p>
                        </div>
                      </div>

                      {/* View Details Button */}
                      <button
                        onClick={() => handleOrderClick(order.orderID)}
                        className='flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 py-2.5 text-sm font-semibold text-white transition-all hover:bg-purple-500 hover:shadow-lg hover:shadow-purple-500/50'
                      >
                        View Details
                        <ChevronRight className='h-4 w-4' />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Order Details Drawer - Highest z-index */}
      {selectedOrderId && (
        <OrderDetailsDrawer
          orderID={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          onOrderUpdated={(orderID) => {
            setNotifications((prev) =>
              prev.filter((batch) => batch.orders[0].orderID !== orderID),
            );
            setSelectedOrderId(null);
          }}
        />
      )}
    </>
  );
};

export default OrderMonitor;
