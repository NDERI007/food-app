import {
  Clock,
  MapPin,
  Package,
  Phone,
  X,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useOrderDetails } from '@utils/hooks/useOrderDetails';

interface OrderDetailsProps {
  orderID: string;
  onClose: () => void;
}

export default function OrderDetailsDrawer({
  orderID,
  onClose,
}: OrderDetailsProps) {
  if (!orderID) return null;

  const {
    data: order,
    isLoading,
    isError,
    error,
    refetch,
  } = useOrderDetails(orderID);

  const formatTime = (dateString: string) =>
    new Date(dateString).toLocaleTimeString('en-KE', {
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <>
      <div
        className='fixed inset-0 z-40 bg-black opacity-50'
        onClick={onClose}
      />

      <div className='fixed top-0 right-0 z-50 h-full w-full max-w-md transform bg-white shadow-2xl'>
        <div className='sticky top-0 z-10 flex items-center justify-between border-b bg-gray-100 p-4'>
          <h2 className='text-lg font-bold'>Order Receipt</h2>
          <button
            onClick={onClose}
            className='rounded-full p-1 transition-colors hover:bg-gray-200'
            aria-label='Close'
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        <div className='h-[calc(100%-64px)] overflow-y-auto p-4 font-mono text-sm'>
          {/* Loading State */}
          {isLoading && (
            <div className='flex flex-col items-center justify-center py-12 text-gray-500'>
              <div className='mb-3 h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900'></div>
              <p>Loading order details...</p>
            </div>
          )}

          {/* Error State */}
          {isError && (
            <div className='flex flex-col items-center justify-center py-12'>
              <AlertCircle className='mb-3 h-12 w-12 text-red-500' />
              <h3 className='mb-2 text-lg font-semibold text-gray-900'>
                Failed to Load Order
              </h3>
              <p className='mb-4 text-center text-sm text-gray-600'>
                {error?.message || 'An unexpected error occurred'}
              </p>
              <button
                onClick={() => refetch()}
                className='flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600'
              >
                <RefreshCw className='h-4 w-4' />
                Try Again
              </button>
            </div>
          )}

          {/* Not Found State */}
          {!isLoading && !isError && !order && (
            <div className='flex flex-col items-center justify-center py-12 text-gray-500'>
              <Package className='mb-3 h-12 w-12' />
              <h3 className='mb-2 text-lg font-semibold text-gray-900'>
                Order Not Found
              </h3>
              <p className='text-center text-sm'>
                This order may have been deleted or doesn't exist.
              </p>
            </div>
          )}

          {/* Success State */}
          {order && (
            <div className='space-y-4'>
              {/* Header */}
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2 text-gray-700'>
                  <Clock className='h-4 w-4' />
                  <span>{formatTime(order.created_at)}</span>
                </div>
                <div className='text-xs text-gray-500'>
                  #{order.id.slice(0, 12)}
                </div>
              </div>

              {/* Delivery Info */}
              <div className='space-y-2 border-t border-b py-3'>
                <div className='flex items-center gap-2 font-semibold'>
                  <MapPin className='h-4 w-4' />
                  <span>{(order.delivery_type || '').toUpperCase()}</span>
                </div>
                {order.delivery_type === 'delivery' && order.address && (
                  <p className='pl-6 text-xs text-gray-700'>{order.address}</p>
                )}
                {order.instructions && (
                  <p className='pl-6 text-xs text-gray-600 italic'>
                    Note: {order.instructions}
                  </p>
                )}
              </div>

              {/* Order Items */}
              <div className='border-b py-3'>
                <h3 className='mb-2 flex items-center gap-2 font-semibold'>
                  <Package className='h-4 w-4' />
                  Items ({order.items?.length ?? 0})
                </h3>
                <div className='space-y-2 pl-6'>
                  {(order.items ?? []).length === 0 ? (
                    <p className='text-xs text-gray-500 italic'>
                      No items found
                    </p>
                  ) : (
                    (order.items ?? []).map((item, idx) => (
                      <div
                        key={idx}
                        className='flex justify-between text-gray-700'
                      >
                        <span>
                          {item.quantity}x {item.name}
                          {item.variant_size && (
                            <span className='ml-1 text-xs text-gray-500'>
                              ({item.variant_size})
                            </span>
                          )}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Payment Info */}
              <div className='space-y-1 border-b py-3'>
                <div className='flex items-center gap-2'>
                  <Phone className='h-4 w-4' />
                  <span className='font-medium'>
                    {order.mpesa_phone ?? 'N/A'}
                  </span>
                </div>
                <p className='pl-6 text-xs text-gray-600'>
                  Ref: {order.payment_reference ?? 'Pending'}
                </p>
              </div>

              {/* Summary */}
              <div className='flex justify-between pt-2 text-base font-bold'>
                <span>Total Items</span>
                <span>
                  {(order.items ?? []).reduce(
                    (sum, i) => sum + (i.quantity ?? 0),
                    0,
                  )}
                </span>
              </div>

              <div className='flex justify-between border-t pt-3 text-lg font-bold'>
                <span>Total Amount</span>
                <span>KSh {order.total_amount?.toLocaleString() ?? '0'}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
