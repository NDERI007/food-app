import { useState, useEffect } from 'react';
import {
  Star,
  MessageSquare,
  ThumbsUp,
  AlertCircle,
  TrendingUp,
  Calendar,
  RefreshCw,
  Filter,
} from 'lucide-react';
import { api } from '@utils/hooks/apiUtils';

interface Feedback {
  id: string;
  overall_rating: number;
  what_you_liked: string | null;
  improvements: string | null;
  additional_comments: string | null;
  created_at: string;
}

interface FeedbackResponse {
  success: boolean;
  count: number;
  feedback: Feedback[];
}

type FilterRating = 'all' | 1 | 2 | 3 | 4 | 5;

export default function FeedbackDashboard() {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterRating, setFilterRating] = useState<FilterRating>('all');

  const loadFeedback = async () => {
    try {
      setLoading(true);
      const response = await api.get<FeedbackResponse>('/api/feedback/look-up');

      if (response.data.success) {
        setFeedbackList(response.data.feedback);
      }
    } catch (error) {
      console.error('Error loading feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedback();
  }, []);

  // Calculate statistics
  const stats = {
    total: feedbackList.length,
    averageRating:
      feedbackList.length > 0
        ? (
            feedbackList.reduce((sum, f) => sum + f.overall_rating, 0) /
            feedbackList.length
          ).toFixed(1)
        : '0.0',
    distribution: [5, 4, 3, 2, 1].map((rating) => ({
      rating,
      count: feedbackList.filter((f) => f.overall_rating === rating).length,
      percentage:
        feedbackList.length > 0
          ? (
              (feedbackList.filter((f) => f.overall_rating === rating).length /
                feedbackList.length) *
              100
            ).toFixed(0)
          : '0',
    })),
  };

  // Filter feedback
  const filteredFeedback =
    filterRating === 'all'
      ? feedbackList
      : feedbackList.filter((f) => f.overall_rating === filterRating);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const StarRating = ({ rating }: { rating: number }) => (
    <div className='flex gap-1'>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-5 w-5 ${
            star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'
          }`}
        />
      ))}
    </div>
  );

  const RatingBadge = ({ rating }: { rating: number }) => {
    const colors = {
      5: 'bg-green-500/20 text-green-400',
      4: 'bg-blue-500/20 text-blue-400',
      3: 'bg-yellow-500/20 text-yellow-400',
      2: 'bg-orange-500/20 text-orange-400',
      1: 'bg-red-500/20 text-red-400',
    };

    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${colors[rating as keyof typeof colors]}`}
      >
        <Star className='h-3 w-3 fill-current' />
        {rating}/5
      </span>
    );
  };

  return (
    <div className='min-h-screen space-y-6 bg-gray-900 p-4 sm:p-6'>
      {/* Header */}
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-white sm:text-3xl'>
            Customer Feedback
          </h1>
        </div>
        <button
          onClick={loadFeedback}
          disabled={loading}
          className='flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50'
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Statistics Cards */}
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        {/* Total Feedback */}
        <div className='rounded-xl border border-gray-700 bg-gray-800 p-6'>
          <div className='flex items-start justify-between'>
            <div>
              <p className='text-sm font-medium text-gray-400'>
                Total Feedback
              </p>
              <p className='mt-2 text-3xl font-bold text-white'>
                {stats.total}
              </p>
            </div>
            <div className='rounded-lg bg-purple-500/20 p-3'>
              <MessageSquare className='h-6 w-6 text-purple-400' />
            </div>
          </div>
        </div>

        {/* Average Rating */}
        <div className='rounded-xl border border-gray-700 bg-gray-800 p-6'>
          <div className='flex items-start justify-between'>
            <div>
              <p className='text-sm font-medium text-gray-400'>
                Average Rating
              </p>
              <p className='mt-2 text-3xl font-bold text-white'>
                {stats.averageRating}
              </p>
              <StarRating
                rating={Math.round(parseFloat(stats.averageRating))}
              />
            </div>
            <div className='rounded-lg bg-yellow-500/20 p-3'>
              <Star className='h-6 w-6 text-yellow-400' />
            </div>
          </div>
        </div>

        {/* Positive Feedback */}
        <div className='rounded-xl border border-gray-700 bg-gray-800 p-6 sm:col-span-2 lg:col-span-1'>
          <div className='flex items-start justify-between'>
            <div>
              <p className='text-sm font-medium text-gray-400'>
                Positive Feedback
              </p>
              <p className='mt-2 text-3xl font-bold text-white'>
                {stats.distribution[0].count + stats.distribution[1].count}
              </p>
              <p className='mt-1 text-sm text-gray-500'>
                {stats.total > 0
                  ? `${(((stats.distribution[0].count + stats.distribution[1].count) / stats.total) * 100).toFixed(0)}% of total`
                  : '0% of total'}
              </p>
            </div>
            <div className='rounded-lg bg-green-500/20 p-3'>
              <ThumbsUp className='h-6 w-6 text-green-400' />
            </div>
          </div>
        </div>
      </div>

      {/* Rating Distribution */}
      <div className='rounded-xl border border-gray-700 bg-gray-800 p-6'>
        <h3 className='mb-4 text-lg font-semibold text-white'>
          Rating Distribution
        </h3>
        <div className='space-y-3'>
          {stats.distribution.map(({ rating, count, percentage }) => (
            <div key={rating} className='flex items-center gap-3'>
              <div className='flex w-16 items-center gap-1 text-sm font-medium text-white'>
                <Star className='h-4 w-4 fill-yellow-400 text-yellow-400' />
                {rating}
              </div>
              <div className='flex-1'>
                <div className='h-2 overflow-hidden rounded-full bg-gray-700'>
                  <div
                    className='h-full rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500'
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
              <div className='w-16 text-right text-sm text-gray-400'>
                {count} ({percentage}%)
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter */}
      <div className='rounded-xl border border-gray-700 bg-gray-800 p-4'>
        <div className='flex items-center gap-3'>
          <Filter className='h-4 w-4 text-gray-400' />
          <span className='text-sm text-gray-400'>Filter by rating:</span>
          <div className='flex flex-wrap gap-2'>
            {(['all', 5, 4, 3, 2, 1] as FilterRating[]).map((rating) => (
              <button
                key={rating}
                onClick={() => setFilterRating(rating)}
                className={`rounded-lg px-3 py-1 text-sm font-medium transition-colors ${
                  filterRating === rating
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {rating === 'all' ? 'All' : `${rating} ⭐`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Feedback List */}
      {loading && feedbackList.length === 0 ? (
        <div className='space-y-4'>
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className='h-48 animate-pulse rounded-xl bg-gray-800'
            />
          ))}
        </div>
      ) : filteredFeedback.length > 0 ? (
        <div className='space-y-4'>
          {filteredFeedback.map((feedback) => (
            <div
              key={feedback.id}
              className='rounded-xl border border-gray-700 bg-gray-800 p-6 transition-all hover:border-purple-500/50'
            >
              {/* Header */}
              <div className='mb-4 flex flex-wrap items-start justify-between gap-3'>
                <div className='flex items-center gap-3'>
                  <RatingBadge rating={feedback.overall_rating} />
                  <div className='flex items-center gap-2 text-sm text-gray-400'>
                    <Calendar className='h-4 w-4' />
                    {formatDate(feedback.created_at)}
                  </div>
                </div>
                <StarRating rating={feedback.overall_rating} />
              </div>

              {/* Content */}
              <div className='space-y-4'>
                {feedback.what_you_liked && (
                  <div>
                    <div className='mb-2 flex items-center gap-2 text-sm font-semibold text-green-400'>
                      <ThumbsUp className='h-4 w-4' />
                      What they liked
                    </div>
                    <p className='text-sm leading-relaxed text-gray-300'>
                      {feedback.what_you_liked}
                    </p>
                  </div>
                )}

                {feedback.improvements && (
                  <div>
                    <div className='mb-2 flex items-center gap-2 text-sm font-semibold text-yellow-400'>
                      <TrendingUp className='h-4 w-4' />
                      Suggested improvements
                    </div>
                    <p className='text-sm leading-relaxed text-gray-300'>
                      {feedback.improvements}
                    </p>
                  </div>
                )}

                {feedback.additional_comments && (
                  <div>
                    <div className='mb-2 flex items-center gap-2 text-sm font-semibold text-blue-400'>
                      <MessageSquare className='h-4 w-4' />
                      Additional comments
                    </div>
                    <p className='text-sm leading-relaxed text-gray-300'>
                      {feedback.additional_comments}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className='flex min-h-[40vh] items-center justify-center rounded-xl border border-gray-700 bg-gray-800 p-12 text-center'>
          <div>
            <AlertCircle className='mx-auto h-12 w-12 text-gray-600' />
            <p className='mt-4 text-base text-gray-400'>
              {filterRating === 'all'
                ? 'No feedback available yet'
                : `No ${filterRating}-star feedback found`}
            </p>
            {filterRating !== 'all' && (
              <button
                onClick={() => setFilterRating('all')}
                className='mt-4 text-sm text-purple-400 hover:text-purple-300'
              >
                Clear filter
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
