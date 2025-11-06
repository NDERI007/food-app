import { useState, useCallback } from 'react';
import { BarChart2, RefreshCw, CheckCircle, X, XCircle } from 'lucide-react';
import OrderMonitor from './components/orderMonitor';
import ReviewedDashboard from './components/reviewedOrders';
import axios, { AxiosError } from 'axios';
import { api } from '@utils/hooks/apiUtils';

// Replace with your actual API URL
const API_URL = '/api/orders/dashboard/today';

interface RecentOrder {
  payment_reference: string;
  phone: string;
  amount: number;
  time: string;
}

interface DashboardData {
  today: {
    orders: number;
    revenue: number;
  };
  recentOrders: RecentOrder[];
}

interface Toast {
  id: number;
  message: string;
  type: 'error' | 'success';
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData>({
    today: { orders: 0, revenue: 0 },
    recentOrders: [],
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

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

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const response = await api.get(API_URL, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      });

      setData(
        response.data ?? {
          today: { orders: 0, revenue: 0 },
          recentOrders: [],
        },
      );
      setLastUpdated(new Date());
    } catch (err) {
      let errorMsg = 'An unexpected error occurred';

      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError;

        if (axiosError.response) {
          errorMsg = `Server error: ${axiosError.response.status}`;
        } else if (axiosError.request) {
          errorMsg = 'No response from server. Please check your connection.';
        } else if (axiosError.code === 'ECONNABORTED') {
          errorMsg = 'Request timeout. Please try again.';
        } else {
          errorMsg = axiosError.message || 'Network error occurred';
        }
      } else if (err instanceof Error) {
        errorMsg = err.message;
      }

      showToast(errorMsg, 'error'); // Use showToast directly - no dependency needed
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array - showToast used but not listed

  // ✅ No ESLint warning - truly empty deps
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-KE', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'>
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

      <div className='relative z-0 mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8'>
        <div className='relative z-0 grid grid-cols-1 gap-6 lg:grid-cols-4'>
          {/* Left column: Order Monitor & Analytics */}
          <aside className='relative z-[102] order-2 lg:order-1 lg:col-span-1'>
            <div className='sticky top-20 space-y-6'>
              {/* Order Monitor */}
              <div className='rounded-2xl border border-gray-700 bg-gray-800 shadow-xl'>
                <div className='border-b border-gray-700 p-4'>
                  <OrderMonitor />
                </div>
                <div className='p-4'>
                  <p className='text-sm text-gray-400'>
                    Real-time order monitoring
                  </p>
                </div>
              </div>

              {/* Analytics Card */}
              <div className='rounded-2xl border border-gray-700 bg-gray-800 p-4 shadow-xl'>
                <div className='flex items-center gap-3'>
                  <div className='rounded-md bg-purple-500/20 p-2'>
                    <BarChart2 className='h-5 w-5 text-purple-400' />
                  </div>
                  <div className='min-w-0 flex-1'>
                    <div className='text-xs font-semibold text-gray-500 uppercase'>
                      Today's Orders
                    </div>
                    {loading && !data ? (
                      <div className='mt-1 h-6 w-16 animate-pulse rounded bg-gray-700'></div>
                    ) : (
                      <div className='mt-1 text-2xl font-bold text-white'>
                        {data?.today.orders || 0}
                      </div>
                    )}
                    <div className='mt-3 text-xs font-semibold text-gray-500 uppercase'>
                      Revenue
                    </div>
                    {loading && !data ? (
                      <div className='mt-1 h-6 w-24 animate-pulse rounded bg-gray-700'></div>
                    ) : (
                      <div className='mt-1 text-xl font-bold text-purple-400'>
                        KSh{' '}
                        {(data?.today.revenue || 0).toLocaleString('en-KE', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <div className='mt-4 border-t border-gray-700 pt-3'>
                  <button
                    onClick={loadData}
                    disabled={loading}
                    className='flex w-full items-center justify-center gap-2 text-xs text-gray-400 transition-colors hover:text-purple-400 disabled:opacity-50'
                  >
                    <RefreshCw
                      className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`}
                    />
                    {loading
                      ? 'Updating...'
                      : `Updated ${formatTime(lastUpdated)}`}
                  </button>
                </div>
              </div>
            </div>
          </aside>

          {/* Main column: Reviewed Orders */}
          <section className='order-1 lg:order-2 lg:col-span-3'>
            <ReviewedDashboard />
          </section>
        </div>
      </div>
    </div>
  );
}
