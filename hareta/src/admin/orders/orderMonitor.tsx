import { useState, useEffect } from 'react';
import { Bell, Package, TrendingUp, X } from 'lucide-react';
import io from 'socket.io-client';

interface BatchNotification {
  type: 'batch';
  count: number;
  totalRevenue: number;
  orders: Array<{
    orderId: string;
    totalAmount: number;
    deliveryType: string;
    createdAt: string;
    paymentReference?: string;
  }>;
  timestamp: string;
}

const AdminOrderMonitor = () => {
  const [notifications, setNotifications] = useState<BatchNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const [todayStats, setTodayStats] = useState({ orders: 0, revenue: 0 });
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:8787', {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('✅ Connected to admin notifications');
      setIsConnected(true);
      socket.emit('subscribe', 'admin:notifications');
    });

    socket.on('disconnect', () => {
      console.log('❌ Disconnected from notifications');
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setIsConnected(false);
    });

    socket.on('admin:notifications', (data: BatchNotification) => {
      console.log('🔔 New batch notification:', data);

      setNotifications((prev) => [data, ...prev].slice(0, 20));
      setUnreadCount((prev) => prev + data.count);

      setTodayStats((prev) => ({
        orders: prev.orders + data.count,
        revenue: prev.revenue + data.totalRevenue,
      }));

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(
          `${data.count} New Order${data.count > 1 ? 's' : ''}`,
          {
            body: `Revenue: KSh ${data.totalRevenue.toLocaleString()}`,
            tag: data.timestamp,
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

  const markAsRead = () => {
    setUnreadCount(0);
  };

  const formatCurrency = (amount: number) => {
    return `KSh ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-KE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className='flex items-center gap-2 sm:gap-4'>
      {/* Connection Status Indicator */}
      <div
        className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
        title={isConnected ? 'Connected' : 'Disconnected'}
      />

      {/* Today's Stats - Hidden on mobile */}
      <div className='hidden items-center gap-2 rounded-lg bg-green-50 px-3 py-2 lg:flex'>
        <TrendingUp className='h-4 w-4 text-green-900' />
        <div className='text-xs'>
          <p className='font-semibold text-green-900'>
            {todayStats.orders} Orders Today
          </p>
          <p className='text-green-700'>{formatCurrency(todayStats.revenue)}</p>
        </div>
      </div>

      {/* Notification Bell */}
      <div className='relative'>
        <button
          onClick={() => {
            setShowPanel(!showPanel);
            if (!showPanel) markAsRead();
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

        {/* Notification Panel */}
        {showPanel && (
          <>
            {/* Backdrop for mobile */}
            <div
              className='bg-opacity-50 fixed inset-0 z-40 bg-black lg:hidden'
              onClick={() => setShowPanel(false)}
            />

            {/* Panel */}
            <div className='fixed inset-x-0 bottom-0 z-50 mt-2 flex max-h-[80vh] w-full flex-col rounded-t-2xl border border-gray-200 bg-white shadow-2xl lg:absolute lg:inset-auto lg:top-full lg:right-0 lg:max-h-[600px] lg:w-96 lg:rounded-xl'>
              {/* Header */}
              <div className='flex items-center justify-between rounded-t-2xl border-b border-gray-200 bg-green-50 p-4 lg:rounded-t-xl'>
                <div>
                  <h3 className='font-bold text-green-900'>
                    Order Notifications
                  </h3>
                  <p className='mt-1 text-xs text-green-700'>
                    Batched every minute
                  </p>
                </div>
                <button
                  onClick={() => setShowPanel(false)}
                  className='rounded-full p-1 hover:bg-green-100 lg:hidden'
                >
                  <X className='h-5 w-5 text-green-900' />
                </button>
              </div>

              {/* Today's Stats - Mobile Only */}
              <div className='border-b border-gray-200 bg-white p-4 lg:hidden'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <TrendingUp className='h-5 w-5 text-green-900' />
                    <div>
                      <p className='text-sm font-semibold text-green-900'>
                        {todayStats.orders} Orders Today
                      </p>
                      <p className='text-xs text-green-700'>
                        {formatCurrency(todayStats.revenue)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notifications List */}
              <div className='flex-1 overflow-y-auto'>
                {notifications.length === 0 ? (
                  <div className='p-8 text-center'>
                    <Package className='mx-auto mb-2 h-12 w-12 text-gray-300' />
                    <p className='text-sm text-gray-500'>No new orders</p>
                  </div>
                ) : (
                  notifications.map((batch, idx) => (
                    <div
                      key={idx}
                      className='border-b border-gray-100 p-4 transition-colors hover:bg-gray-50'
                    >
                      <div className='mb-2 flex items-start justify-between'>
                        <div className='flex flex-1 items-center gap-2'>
                          <div className='flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-100'>
                            <Package className='h-5 w-5 text-green-900' />
                          </div>
                          <div className='min-w-0 flex-1'>
                            <p className='text-sm font-semibold text-green-900'>
                              {batch.count} New Order
                              {batch.count > 1 ? 's' : ''}
                            </p>
                            <p className='text-xs text-gray-500'>
                              {formatTime(batch.timestamp)}
                            </p>
                          </div>
                        </div>
                        <p className='ml-2 text-sm font-bold whitespace-nowrap text-green-900'>
                          {formatCurrency(batch.totalRevenue)}
                        </p>
                      </div>

                      {/* Show first 3 orders */}
                      <div className='mt-2 space-y-1'>
                        {batch.orders.slice(0, 3).map((order) => (
                          <div
                            key={order.orderId}
                            className='flex items-center justify-between rounded bg-gray-50 p-2 text-xs'
                          >
                            <span className='truncate font-mono text-green-900'>
                              #{order.orderId.slice(0, 8)}
                            </span>
                            <span className='ml-2 whitespace-nowrap text-gray-600'>
                              {formatCurrency(order.totalAmount)}
                            </span>
                          </div>
                        ))}
                        {batch.count > 3 && (
                          <p className='pt-1 text-center text-xs text-gray-500'>
                            +{batch.count - 3} more orders
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => (window.location.href = '/admin/orders')}
                        className='mt-3 w-full rounded-lg bg-green-900 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-800'
                      >
                        View All Orders
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminOrderMonitor;
