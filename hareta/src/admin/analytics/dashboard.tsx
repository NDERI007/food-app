import {
  TrendingUp,
  DollarSign,
  Package,
  XCircle,
  CheckCircle,
  Calendar,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  type LucideIcon,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

import { api } from '@utils/hooks/apiUtils';

const API_URL = '/api/revenue/analytics';

interface AnalyticsSummary {
  accepted_count: number;
  accepted_revenue: number;
  declined_count: number;
  declined_loss: number;
  total_orders: number;
  net_revenue: number;
  acceptance_rate: number;
}

interface DailyBreakdown {
  date: string;
  accepted_count: number;
  accepted_revenue: number;
  declined_count: number;
  declined_loss: number;
}

interface HourlyBreakdown {
  hour: number;
  accepted_count: number;
  declined_count: number;
  total_revenue: number;
}

interface AnalyticsData {
  summary: AnalyticsSummary;
  daily_breakdown: DailyBreakdown[];
  hourly_breakdown: HourlyBreakdown[];
  date_range: {
    start_date: string;
    end_date: string;
  };
}

type TimeRange = 'today' | 'week' | 'month' | 'custom';

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);

      let startDate: string | undefined;
      let endDate: string | undefined;

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      switch (timeRange) {
        case 'today': {
          startDate = today.toISOString();
          endDate = new Date(
            today.getTime() + 24 * 60 * 60 * 1000,
          ).toISOString();
          break;
        }
        case 'week': {
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          startDate = weekStart.toISOString();
          endDate = new Date(
            today.getTime() + 24 * 60 * 60 * 1000,
          ).toISOString();
          break;
        }
        case 'month': {
          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
          startDate = monthStart.toISOString();
          endDate = new Date(
            today.getTime() + 24 * 60 * 60 * 1000,
          ).toISOString();
          break;
        }
        case 'custom': {
          if (customStartDate && customEndDate) {
            startDate = new Date(customStartDate).toISOString();
            endDate = new Date(
              new Date(customEndDate).getTime() + 24 * 60 * 60 * 1000,
            ).toISOString();
          }
          break;
        }
      }

      const response = await api.get<AnalyticsData>(API_URL, {
        params: {
          startDate,
          endDate,
        },
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      });

      setAnalytics(response.data);
    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [timeRange, customStartDate, customEndDate]);

  useEffect(() => {
    if (timeRange !== 'custom' || (customStartDate && customEndDate)) {
      loadAnalytics();
    }
  }, [loadAnalytics, timeRange, customStartDate, customEndDate]);

  const formatCurrency = (amount: number) => {
    return `KSh ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
  };

  const formatCurrencyShort = (amount: number) => {
    if (amount >= 1000000) return `KSh ${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `KSh ${(amount / 1000).toFixed(1)}K`;
    return `KSh ${amount.toFixed(0)}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-KE', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatHour = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}${period}`;
  };

  const StatCard = ({
    title,
    value,
    subtitle,
    icon: Icon,
    trend,
    color,
  }: {
    title: string;
    value: string;
    subtitle: string;
    icon: LucideIcon;
    trend?: 'up' | 'down';
    color: string;
  }) => (
    <div className='rounded-xl border border-gray-700 bg-gray-800 p-4 transition-all hover:border-purple-500/50 sm:p-6'>
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0 flex-1'>
          <p className='truncate text-xs font-medium text-gray-400 sm:text-sm'>
            {title}
          </p>
          <p className='mt-1 truncate text-xl font-bold text-white sm:mt-2 sm:text-3xl'>
            {value}
          </p>
          <div className='mt-1 flex items-center gap-2 sm:mt-2'>
            {trend && (
              <span
                className={`flex items-center gap-1 text-xs font-medium sm:text-sm ${
                  trend === 'up' ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {trend === 'up' ? (
                  <ArrowUpRight className='h-3 w-3 sm:h-4 sm:w-4' />
                ) : (
                  <ArrowDownRight className='h-3 w-3 sm:h-4 sm:w-4' />
                )}
              </span>
            )}
            <p className='truncate text-xs text-gray-500 sm:text-sm'>
              {subtitle}
            </p>
          </div>
        </div>
        <div className={`flex-shrink-0 rounded-lg p-2 sm:p-3 ${color}`}>
          <Icon className='h-5 w-5 sm:h-6 sm:w-6' />
        </div>
      </div>
    </div>
  );

  return (
    <div className='space-y-4 bg-gray-900 p-4 sm:space-y-6 sm:p-6'>
      {/* Header */}
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-xl font-bold text-white sm:text-2xl'>
            Order Analytics
          </h1>
          <p className='mt-1 text-xs text-gray-400 sm:text-sm'>
            Track revenue and order acceptance metrics
          </p>
        </div>
        <button
          onClick={loadAnalytics}
          disabled={loading}
          className='flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50'
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span className='sm:inline'>Refresh</span>
        </button>
      </div>

      {/* Time Range Selector */}
      <div className='rounded-xl border border-gray-700 bg-gray-800 p-3 sm:p-4'>
        <div className='space-y-3'>
          <div className='flex items-center gap-2 text-xs text-gray-400 sm:text-sm'>
            <Calendar className='h-4 w-4' />
            <span>Time Range:</span>
          </div>

          <div className='grid grid-cols-2 gap-2 sm:flex sm:flex-wrap'>
            {(['today', 'week', 'month', 'custom'] as TimeRange[]).map(
              (range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors sm:px-4 sm:text-sm ${
                    timeRange === range
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {range === 'today' && 'Today'}
                  {range === 'week' && 'This Week'}
                  {range === 'month' && 'This Month'}
                  {range === 'custom' && 'Custom'}
                </button>
              ),
            )}
          </div>

          {timeRange === 'custom' && (
            <div className='flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3'>
              <input
                type='date'
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className='rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none sm:text-sm'
              />
              <span className='hidden text-gray-500 sm:inline'>to</span>
              <input
                type='date'
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className='rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none sm:text-sm'
              />
            </div>
          )}
        </div>
      </div>

      {loading && !analytics ? (
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4'>
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className='h-28 animate-pulse rounded-xl bg-gray-800 sm:h-32'
            ></div>
          ))}
        </div>
      ) : analytics ? (
        <>
          {/* Summary Cards */}
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4'>
            <StatCard
              title='Total Revenue'
              value={formatCurrencyShort(analytics.summary.accepted_revenue)}
              subtitle={`${analytics.summary.accepted_count} accepted`}
              icon={DollarSign}
              trend='up'
              color='bg-green-500/20 text-green-400'
            />
            <StatCard
              title='Lost Revenue'
              value={formatCurrencyShort(analytics.summary.declined_loss)}
              subtitle={`${analytics.summary.declined_count} declined`}
              icon={XCircle}
              trend='down'
              color='bg-red-500/20 text-red-400'
            />
            <StatCard
              title='Acceptance Rate'
              value={`${analytics.summary.acceptance_rate}%`}
              subtitle={`${analytics.summary.total_orders} total`}
              icon={TrendingUp}
              color='bg-purple-500/20 text-purple-400'
            />
            <StatCard
              title='Net Revenue'
              value={formatCurrencyShort(analytics.summary.net_revenue)}
              subtitle='After declined'
              icon={Package}
              color='bg-blue-500/20 text-blue-400'
            />
          </div>

          {/* Charts */}
          <div className='grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2'>
            {/* Daily Breakdown */}
            {analytics.daily_breakdown.length > 0 && (
              <div className='rounded-xl border border-gray-700 bg-gray-800 p-4 sm:p-6'>
                <h3 className='mb-3 text-base font-semibold text-white sm:mb-4 sm:text-lg'>
                  Daily Performance
                </h3>
                <ResponsiveContainer width='100%' height={250}>
                  <LineChart data={analytics.daily_breakdown}>
                    <CartesianGrid strokeDasharray='3 3' stroke='#374151' />
                    <XAxis
                      dataKey='date'
                      stroke='#9CA3AF'
                      tickFormatter={formatDate}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis stroke='#9CA3AF' tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      labelStyle={{ color: '#F3F4F6' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line
                      type='monotone'
                      dataKey='accepted_revenue'
                      stroke='#10B981'
                      name='Revenue'
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type='monotone'
                      dataKey='declined_loss'
                      stroke='#EF4444'
                      name='Lost'
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Hourly Breakdown */}
            {analytics.hourly_breakdown.length > 0 && (
              <div className='rounded-xl border border-gray-700 bg-gray-800 p-4 sm:p-6'>
                <h3 className='mb-3 text-base font-semibold text-white sm:mb-4 sm:text-lg'>
                  Hourly Orders
                </h3>
                <ResponsiveContainer width='100%' height={250}>
                  <BarChart data={analytics.hourly_breakdown}>
                    <CartesianGrid strokeDasharray='3 3' stroke='#374151' />
                    <XAxis
                      dataKey='hour'
                      stroke='#9CA3AF'
                      tickFormatter={formatHour}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis stroke='#9CA3AF' tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      labelStyle={{ color: '#F3F4F6' }}
                      labelFormatter={formatHour}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar
                      dataKey='accepted_count'
                      fill='#10B981'
                      name='Accepted'
                      radius={[8, 8, 0, 0]}
                    />
                    <Bar
                      dataKey='declined_count'
                      fill='#EF4444'
                      name='Declined'
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Detailed Breakdown Table - Mobile Optimized */}
          {analytics.daily_breakdown.length > 0 && (
            <div className='overflow-hidden rounded-xl border border-gray-700 bg-gray-800'>
              <div className='border-b border-gray-700 p-4 sm:p-6'>
                <h3 className='text-base font-semibold text-white sm:text-lg'>
                  Daily Breakdown
                </h3>
              </div>

              {/* Mobile Card View */}
              <div className='block divide-y divide-gray-700 sm:hidden'>
                {analytics.daily_breakdown.map((day, idx) => (
                  <div key={idx} className='space-y-3 p-4'>
                    <div className='text-sm font-medium text-white'>
                      {new Date(day.date).toLocaleDateString('en-KE', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                    <div className='grid grid-cols-2 gap-3 text-xs'>
                      <div>
                        <div className='mb-1 text-gray-400'>Accepted</div>
                        <div className='flex items-center gap-1'>
                          <CheckCircle className='h-3 w-3 text-green-400' />
                          <span className='font-medium text-white'>
                            {day.accepted_count}
                          </span>
                        </div>
                        <div className='mt-1 font-semibold text-green-400'>
                          {formatCurrencyShort(day.accepted_revenue)}
                        </div>
                      </div>
                      <div>
                        <div className='mb-1 text-gray-400'>Declined</div>
                        <div className='flex items-center gap-1'>
                          <XCircle className='h-3 w-3 text-red-400' />
                          <span className='font-medium text-white'>
                            {day.declined_count}
                          </span>
                        </div>
                        <div className='mt-1 font-semibold text-red-400'>
                          {formatCurrencyShort(day.declined_loss)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className='hidden overflow-x-auto sm:block'>
                <table className='w-full'>
                  <thead className='border-b border-gray-700 bg-gray-900/50'>
                    <tr>
                      <th className='px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase'>
                        Date
                      </th>
                      <th className='px-6 py-3 text-right text-xs font-semibold text-gray-400 uppercase'>
                        Accepted
                      </th>
                      <th className='px-6 py-3 text-right text-xs font-semibold text-gray-400 uppercase'>
                        Revenue
                      </th>
                      <th className='px-6 py-3 text-right text-xs font-semibold text-gray-400 uppercase'>
                        Declined
                      </th>
                      <th className='px-6 py-3 text-right text-xs font-semibold text-gray-400 uppercase'>
                        Lost Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-gray-700'>
                    {analytics.daily_breakdown.map((day, idx) => (
                      <tr
                        key={idx}
                        className='transition-colors hover:bg-gray-700/50'
                      >
                        <td className='px-6 py-4 text-sm text-white'>
                          {new Date(day.date).toLocaleDateString('en-KE', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </td>
                        <td className='px-6 py-4 text-right'>
                          <span className='inline-flex items-center gap-1 rounded-full bg-green-500/20 px-3 py-1 text-sm font-medium text-green-400'>
                            <CheckCircle className='h-3 w-3' />
                            {day.accepted_count}
                          </span>
                        </td>
                        <td className='px-6 py-4 text-right text-sm font-semibold text-green-400'>
                          {formatCurrency(day.accepted_revenue)}
                        </td>
                        <td className='px-6 py-4 text-right'>
                          <span className='inline-flex items-center gap-1 rounded-full bg-red-500/20 px-3 py-1 text-sm font-medium text-red-400'>
                            <XCircle className='h-3 w-3' />
                            {day.declined_count}
                          </span>
                        </td>
                        <td className='px-6 py-4 text-right text-sm font-semibold text-red-400'>
                          {formatCurrency(day.declined_loss)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className='rounded-xl border border-gray-700 bg-gray-800 p-8 text-center sm:p-12'>
          <Package className='mx-auto h-10 w-10 text-gray-600 sm:h-12 sm:w-12' />
          <p className='mt-4 text-sm text-gray-400 sm:text-base'>
            No data available
          </p>
        </div>
      )}
    </div>
  );
}
