import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bell,
  Package,
  X,
  Clock,
  Wifi,
  WifiOff,
  ChevronRight,
} from 'lucide-react';
import io, { Socket } from 'socket.io-client';
import OrderDetailsDrawer from './orderDrawer';

interface ConfirmedOrder {
  id: string;
  payment_reference: string;
  amount: number;
  phone_number: string;
}

interface OrderNotification {
  type: 'ORDER_CONFIRMED';
  data: ConfirmedOrder;
  timestamp: string;
}

interface DisplayOrder {
  orderID: string;
  totalAmount: number;
  paymentReference: string;
  phoneNumber: string;
  confirmedAt: string;
}

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';
const CHANNEL = 'admin:notifications';

export default function OrderMonitor() {
  const [notifications, setNotifications] = useState<DisplayOrder[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const notifiedOrderIds = useRef<Set<string>>(new Set());

  const handleReplayedOrders = useCallback((replayed: OrderNotification[]) => {
    notifiedOrderIds.current.clear();

    const displayOrders = replayed.map((notification) => {
      const order = notification.data;
      notifiedOrderIds.current.add(order.id);

      return {
        orderID: order.id,
        totalAmount: order.amount,
        paymentReference: order.payment_reference,
        phoneNumber: order.phone_number,
        confirmedAt: notification.timestamp,
      };
    });

    displayOrders.sort(
      (a, b) =>
        new Date(b.confirmedAt).getTime() - new Date(a.confirmedAt).getTime(),
    );

    setNotifications(displayOrders);
  }, []);

  const handleNewNotification = useCallback(
    (notification: OrderNotification) => {
      if (notification.type !== 'ORDER_CONFIRMED') return;

      const order = notification.data;
      if (notifiedOrderIds.current.has(order.id)) return;
      notifiedOrderIds.current.add(order.id);

      const displayOrder: DisplayOrder = {
        orderID: order.id,
        totalAmount: order.amount,
        paymentReference: order.payment_reference,
        phoneNumber: order.phone_number,
        confirmedAt: notification.timestamp,
      };

      setNotifications((prev) => [displayOrder, ...prev]);
      setUnreadCount((prev) => prev + 1);

      triggerBrowserNotification(order);
      playSound();
    },
    [],
  );

  const handleRemovedNotification = useCallback(
    (orderId: string) => {
      console.log(`🗑️ Removing order from UI: ${orderId}`);
      setNotifications((prev) =>
        prev.filter((order) => order.orderID !== orderId),
      );
      notifiedOrderIds.current.delete(orderId);

      if (selectedOrderId === orderId) {
        setSelectedOrderId(null);
      }
    },
    [selectedOrderId],
  );

  // ✅ Now you can safely include them in useEffect
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Connected to Socket.IO server');
      setIsConnected(true);
      socket.emit('subscribe', CHANNEL);
      socket.emit('notifications:replay');
    });

    socket.on('disconnect', () => {
      console.log('❌ Disconnected from server');
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('⚠️ Socket connection error:', err.message);
      setIsConnected(false);
    });

    socket.on('admin:notifications:new', handleNewNotification);
    socket.on('admin:notifications:removed', handleRemovedNotification);
    socket.on('admin:notifications:replay', handleReplayedOrders);

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      socket.disconnect();
    };
  }, [handleNewNotification, handleRemovedNotification, handleReplayedOrders]);

  const triggerBrowserNotification = (order: ConfirmedOrder) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('New Order Confirmed! 🎉', {
        body: `${order.phone_number} - KSh ${order.amount.toLocaleString()}`,
        tag: order.id,
        icon: '/favicon.ico',
      });
    }
  };

  const playSound = () => {
    try {
      const audio = new Audio('/notification.mp3');
      audio.play().catch(() => null);
    } catch {
      /* ignore */
    }
  };

  const formatCurrency = (amount: number) =>
    `KSh ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
  };

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  };

  const markAsRead = () => setUnreadCount(0);

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

      {/* Backdrop */}
      {showPanel && (
        <div
          className='fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm'
          onClick={() => setShowPanel(false)}
        />
      )}

      {/* Slide-out Drawer */}
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
                <h2 className='text-lg font-bold text-white'>
                  Confirmed Orders
                </h2>
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
            {notifications.length > 0 && (
              <span className='text-xs text-gray-500'>
                {notifications.length} order{notifications.length !== 1 && 's'}
              </span>
            )}
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
                  No confirmed orders yet
                </p>
                <p className='mt-1 text-xs text-gray-500'>
                  You'll be notified when orders are paid
                </p>
              </div>
            ) : (
              <div className='space-y-3'>
                {notifications.map((order, idx) => {
                  const isNew = idx < 3;

                  return (
                    <div
                      key={order.orderID}
                      className='rounded-xl border border-gray-700 bg-gray-800 p-4 transition-all hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10'
                    >
                      {/* Order Header */}
                      <div className='mb-3 flex items-start justify-between'>
                        <div className='flex items-center gap-3'>
                          <div className='rounded-lg border border-green-500/30 bg-green-500/20 p-2'>
                            <Package className='h-4 w-4 text-green-400' />
                          </div>
                          <div>
                            <p className='mt-0.5 font-mono text-xs text-gray-400'>
                              #{order.orderID.slice(0, 8)}
                            </p>
                            <div className='mt-1 flex items-center gap-1'>
                              <Clock className='h-3 w-3 text-gray-500' />
                              <p className='text-xs text-gray-400'>
                                {formatTime(order.confirmedAt)}
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
                          {isNew ? 'New' : 'Paid'}
                        </span>
                      </div>

                      {/* Order Details */}
                      <div className='mb-3 space-y-2 border-t border-gray-700 pt-3'>
                        <div className='flex items-center justify-between'>
                          <p className='text-xs text-gray-500'>Phone</p>
                          <p className='font-mono text-xs font-medium text-gray-300'>
                            {order.phoneNumber}
                          </p>
                        </div>
                        <div className='flex items-center justify-between'>
                          <p className='text-xs text-gray-500'>Payment Ref</p>
                          <p className='font-mono text-xs font-medium text-purple-400'>
                            {order.paymentReference}
                          </p>
                        </div>
                        <div className='flex items-center justify-between border-t border-gray-700 pt-2'>
                          <p className='text-xs font-medium text-gray-400'>
                            Total Amount
                          </p>
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

      {/* Order Details Drawer */}
      {selectedOrderId && (
        <div className='fixed inset-0 top-14 z-[102]'>
          <OrderDetailsDrawer
            orderID={selectedOrderId}
            onClose={() => setSelectedOrderId(null)}
          />
        </div>
      )}
    </>
  );
}
