import { useState, useEffect } from 'react';
import { BarChart2, RefreshCw, AlertCircle, Clock } from 'lucide-react';
import axios, { AxiosError } from 'axios';
import OrderMonitor from './components/orderMonitor';
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

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData>({
    today: { orders: 0, revenue: 0 },
    recentOrders: [],
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get<DashboardData>(API_URL, {
        timeout: 10000, // 10 second timeout
      });

      setData(
        response.data ?? {
          today: { orders: 0, revenue: 0 },
          recentOrders: [],
        },
      );

      setLastUpdated(new Date());
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError;

        if (axiosError.response) {
          // Server responded with error status
          setError(
            `Server error: ${axiosError.response.status} - ${axiosError.response.statusText}`,
          );
        } else if (axiosError.request) {
          // Request was made but no response received
          setError(
            'Network error: Unable to reach the server. Please check your connection.',
          );
        } else {
          // Error in setting up the request
          setError(`Request error: ${axiosError.message}`);
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto-refresh every 5 minutes
    const interval = setInterval(loadData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-KE', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  return (
    <div className='mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8'>
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-4'>
        {/* Left column: Order Monitor & Analytics */}
        <aside className='order-2 lg:order-1 lg:col-span-1'>
          <div className='sticky top-20 space-y-6'>
            {/* Order Monitor */}
            <div className='rounded-2xl bg-white shadow'>
              <div className='border-b border-gray-100 p-4'>
                <OrderMonitor />
              </div>
              <div className='p-4'>
                <p className='text-sm text-gray-500'>
                  Real-time order monitoring
                </p>
              </div>
            </div>

            {/* Analytics Card */}
            <div className='rounded-2xl bg-white p-4 shadow'>
              <div className='flex items-center gap-3'>
                <div className='rounded-md bg-green-50 p-2'>
                  <BarChart2 className='h-5 w-5 text-green-700' />
                </div>
                <div className='min-w-0 flex-1'>
                  <div className='text-xs text-gray-500'>Today's Orders</div>
                  {loading && !data ? (
                    <div className='mt-1 h-6 w-16 animate-pulse rounded bg-gray-100'></div>
                  ) : (
                    <div className='mt-1 font-semibold text-green-900'>
                      {data?.today.orders || 0}
                    </div>
                  )}
                  <div className='mt-2 text-xs text-gray-500'>Revenue</div>
                  {loading && !data ? (
                    <div className='mt-1 h-6 w-24 animate-pulse rounded bg-gray-100'></div>
                  ) : (
                    <div className='mt-1 font-semibold text-green-900'>
                      KSh{' '}
                      {(data?.today.revenue || 0).toLocaleString('en-KE', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div className='mt-3 border-t border-gray-100 pt-3'>
                <button
                  onClick={loadData}
                  disabled={loading}
                  className='flex w-full items-center justify-center gap-2 text-xs text-gray-600 hover:text-green-900 disabled:opacity-50'
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

        {/* Main column: Recent Orders */}
        <section className='order-1 lg:order-2 lg:col-span-3'>
          <div className='rounded-2xl bg-white shadow'>
            <div className='border-b border-gray-100 p-6'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <div className='rounded-lg bg-blue-50 p-2'>
                    <Clock className='h-5 w-5 text-blue-700' />
                  </div>
                  <h2 className='text-lg font-semibold text-gray-900'>
                    Recent Orders
                  </h2>
                </div>
                <button
                  onClick={loadData}
                  disabled={loading}
                  className='flex items-center gap-2 rounded-lg bg-green-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50'
                >
                  <RefreshCw
                    className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                  />
                  Refresh
                </button>
              </div>
            </div>

            {/* Error State */}
            {error && (
              <div className='mx-6 my-4 flex items-start gap-3 rounded-lg bg-red-50 p-4 text-red-800'>
                <AlertCircle className='mt-0.5 h-5 w-5 flex-shrink-0' />
                <div>
                  <p className='font-semibold'>Error loading data</p>
                  <p className='mt-1 text-sm'>{error}</p>
                </div>
              </div>
            )}

            {/* Orders Table */}
            <div className='p-6'>
              {loading && !data ? (
                <div className='space-y-3'>
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className='h-16 animate-pulse rounded-lg bg-gray-100'
                    ></div>
                  ))}
                </div>
              ) : data?.recentOrders.length > 0 ? (
                <div className='overflow-x-auto'>
                  <table className='min-w-full divide-y divide-gray-200'>
                    <thead className='bg-gray-50'>
                      <tr>
                        <th className='px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase'>
                          Time
                        </th>
                        <th className='px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase'>
                          Reference
                        </th>
                        <th className='px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase'>
                          Phone
                        </th>
                        <th className='px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase'>
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-gray-200 bg-white'>
                      {data?.recentOrders.map((order, idx) => (
                        <tr
                          key={idx}
                          className='transition-colors hover:bg-gray-50'
                        >
                          <td className='px-4 py-3 text-sm whitespace-nowrap text-gray-900'>
                            {order.time}
                          </td>
                          <td className='px-4 py-3 font-mono text-sm text-gray-700'>
                            {order.payment_reference}
                          </td>
                          <td className='px-4 py-3 text-sm text-gray-600'>
                            {order.phone}
                          </td>
                          <td className='px-4 py-3 text-right text-sm font-semibold text-gray-900'>
                            KSh{' '}
                            {order.amount.toLocaleString('en-KE', {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className='py-12 text-center'>
                  <div className='rounded-lg border border-dashed border-gray-200 p-8'>
                    <div className='mb-2 text-base text-gray-400'>
                      No orders today yet
                    </div>
                    <div className='text-sm text-gray-500'>
                      Orders will appear here as they come in
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
