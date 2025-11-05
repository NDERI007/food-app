import { useState, useEffect, useRef } from 'react';
import { Bell, ChevronDown, TrendingUp, X } from 'lucide-react';
import io from 'socket.io-client';
import OrderDetailsDrawer from '@admin/orders/orderDrawer';
import { useNavigate } from 'react-router-dom';

interface BatchNotification {
  type: 'batch';
  count: number;
  totalRevenue: number;
  orders: Array<{
    orderID: string;
    totalAmount: number;
    deliveryType: string;
    createdAt: string;
    paymentReference?: string;
  }>;
  timestamp: string;
}

const DESKTOP_PANEL_WIDTH = 384; // equals Tailwind w-96 (96 * 4 = 384px)

const OrderMonitor = () => {
  const [notifications, setNotifications] = useState<BatchNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const [todayStats, setTodayStats] = useState({ orders: 0, revenue: 0 });
  const [isConnected, setIsConnected] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // For positioning
  const bellRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [panelCoords, setPanelCoords] = useState<{
    top: number;
    left: number;
  } | null>(null);

  // Track which orders we've already notified about
  const notifiedOrderIds = useRef<Set<string>>(new Set());

  const navigate = useNavigate();

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
      const newBatch: BatchNotification = {
        ...data,
        count: newOrders.length,
        totalRevenue: newBatchRevenue,
        orders: newOrders,
      };

      setNotifications((prev) => [newBatch, ...prev].slice(0, 20));
      setUnreadCount((prev) => prev + newOrders.length);
      setTodayStats((prev) => ({
        orders: prev.orders + newOrders.length,
        revenue: prev.revenue + newBatchRevenue,
      }));

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

  // Update desktop panel coordinates when opening & on resize/scroll
  useEffect(() => {
    if (!showPanel) {
      setPanelCoords(null);
      return;
    }

    const compute = () => {
      const btn = bellRef.current;
      if (!btn) return setPanelCoords(null);
      const rect = btn.getBoundingClientRect();

      const desiredRight = rect.right; // align panel's right edge with bell's right
      // compute left = desiredRight - panelWidth
      let left = Math.round(desiredRight - DESKTOP_PANEL_WIDTH);
      // keep some padding from the edge
      const minLeft = 8;
      const maxLeft = window.innerWidth - DESKTOP_PANEL_WIDTH - 8;
      left = Math.max(minLeft, Math.min(left, maxLeft));

      const top = Math.round(rect.bottom + 8); // 8px gap below button
      setPanelCoords({ top, left });
    };

    // compute immediately
    compute();

    // recompute on scroll / resize
    window.addEventListener('resize', compute);
    window.addEventListener('scroll', compute, true);

    return () => {
      window.removeEventListener('resize', compute);
      window.removeEventListener('scroll', compute, true);
    };
  }, [showPanel]);

  // close on outside clicks (desktop)
  useEffect(() => {
    if (!showPanel) return;

    const onDocClick = (e: MouseEvent) => {
      const p = panelRef.current;
      const b = bellRef.current;
      if (!p || !b) return;
      const target = e.target as Node;
      if (!p.contains(target) && !b.contains(target)) {
        setShowPanel(false);
      }
    };

    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showPanel]);

  const markAsRead = () => setUnreadCount(0);

  const formatCurrency = (amount: number) =>
    `KSh ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

  const formatTime = (timestamp: string) =>
    new Date(timestamp).toLocaleTimeString('en-KE', {
      hour: '2-digit',
      minute: '2-digit',
    });

  const handleOrderClick = (orderId: string) => {
    setSelectedOrderId(orderId);
    setShowPanel(false);
  };

  const handleViewAllOrders = (batchOrders: BatchNotification['orders']) => {
    if (batchOrders.length > 0) {
      setSelectedOrderId(batchOrders[0].orderID);
      setShowPanel(false);
    }
  };

  return (
    <>
      <div className='ml-auto flex items-center gap-2 sm:gap-4'>
        {/* Connection Status Indicator */}
        <div
          className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
          title={isConnected ? 'Connected' : 'Disconnected'}
        />

        {/* Orders Today - MOBILE */}
        <div className='flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-[10px] font-medium text-green-900 sm:hidden'>
          <TrendingUp className='h-3 w-3' />
          {todayStats.orders}
        </div>

        {/* Today's Stats - DESKTOP */}
        <div className='hidden items-center gap-2 rounded-lg bg-green-50 px-3 py-2 lg:flex'>
          <TrendingUp className='h-4 w-4 text-green-900' />
          <div className='text-xs'>
            <p className='font-semibold text-green-900'>
              {todayStats.orders} Orders Today
            </p>
            <p className='text-green-700'>
              {formatCurrency(todayStats.revenue)}
            </p>
          </div>
        </div>

        {/* Notification Bell */}
        <div className='relative' style={{ zIndex: 60 }}>
          <button
            ref={bellRef}
            onClick={() => {
              setShowPanel((s) => {
                const next = !s;
                if (next) markAsRead();
                return next;
              });
            }}
            className='relative rounded-full p-2 transition-colors hover:bg-gray-100 focus:ring-2 focus:ring-green-500 focus:outline-none'
            aria-label='Notifications'
          >
            <Bell className='h-5 w-5 text-green-900 sm:h-6 sm:w-6' />
            {unreadCount > 0 && (
              <span className='absolute -top-1 -right-1 flex h-5 w-5 animate-pulse items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white'>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* PANEL (same for mobile & desktop) */}
          {showPanel && (
            <div
              className='fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-sm'
              onClick={() => setShowPanel(false)}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className='animate-slideInRight flex h-full w-full max-w-[420px] flex-col border-l border-gray-200 bg-white pt-16 shadow-2xl sm:pt-0'
              >
                {/* Header */}
                <div className='flex items-center justify-between border-b border-gray-200 bg-green-50 px-4 py-3 sm:py-4'>
                  <h3 className='font-bold text-green-900'>
                    Order Notifications
                  </h3>
                  <button
                    onClick={() => setShowPanel(false)}
                    className='rounded-full p-1'
                  >
                    <X className='h-5 w-5 text-green-900' />
                  </button>
                </div>

                {/* Content */}
                <div className='flex-1 divide-y divide-gray-100 overflow-y-auto'>
                  {notifications.length === 0 && (
                    <div className='p-8 text-center text-gray-500'>
                      No new orders
                    </div>
                  )}

                  {notifications.map((batch, idx) => (
                    <details key={idx} open={idx === 0} className='group'>
                      {/* Accordion Header */}
                      <summary className='flex cursor-pointer list-none items-center justify-between bg-gray-50 p-4 select-none hover:bg-green-50'>
                        <div className='flex flex-col'>
                          <p className='font-semibold text-green-900'>
                            {batch.count} New Order{batch.count > 1 ? 's' : ''}
                          </p>
                          <p className='text-xs text-gray-500'>
                            {formatTime(batch.timestamp)}
                          </p>
                        </div>

                        <div className='flex items-center gap-3'>
                          <p className='font-bold whitespace-nowrap text-green-900'>
                            {formatCurrency(batch.totalRevenue)}
                          </p>

                          {/* Custom Chevron */}
                          <ChevronDown className='h-5 w-5 text-green-900 transition-transform group-open:rotate-180' />
                        </div>
                      </summary>

                      {/* Accordion Body */}
                      <div className='space-y-1 border-t border-gray-100 p-4'>
                        {batch.orders.map((order) => (
                          <button
                            key={order.orderID}
                            onClick={() => handleOrderClick(order.orderID)}
                            className='flex w-full items-center justify-between rounded-md bg-gray-50 px-3 py-2 text-xs hover:bg-green-50'
                          >
                            <span className='truncate font-mono text-green-900'>
                              #{order.orderID.slice(0, 8)}
                            </span>
                            <span className='ml-2 whitespace-nowrap text-gray-600'>
                              {formatCurrency(order.totalAmount)}
                            </span>
                          </button>
                        ))}

                        {/* Actions */}
                        <div className='flex gap-2 pt-3'>
                          <button
                            onClick={() => handleViewAllOrders(batch.orders)}
                            className='flex-1 rounded-lg bg-green-900 py-2 text-sm font-semibold text-white hover:bg-green-800'
                          >
                            View Details
                          </button>

                          <button
                            onClick={() => navigate('/admin/orders')}
                            className='flex-1 rounded-lg border border-green-900 bg-white py-2 text-sm font-semibold text-green-900 hover:bg-green-50'
                          >
                            All Orders
                          </button>
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedOrderId && (
        <OrderDetailsDrawer
          orderID={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          onOrderUpdated={(orderID) => {
            // Remove the order from notifications list
            setNotifications(
              (prev) =>
                prev
                  .map((batch) => ({
                    ...batch,
                    orders: batch.orders.filter((o) => o.orderID !== orderID),
                    count: batch.orders.filter((o) => o.orderID !== orderID)
                      .length,
                  }))
                  .filter((batch) => batch.count > 0), // Remove empty batches
            );

            // Close drawer (the drawer already calls onClose, but safe to double ensure)
            setSelectedOrderId(null);
          }}
        />
      )}
    </>
  );
};

export default OrderMonitor;
