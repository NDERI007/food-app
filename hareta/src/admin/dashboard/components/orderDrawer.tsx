import { useEffect, useRef, useState } from 'react';
import { X, AlertCircle, RefreshCw } from 'lucide-react';
import { useOrderDetails } from '@utils/hooks/useOrderDetails';
import { useUpdateOrderStatus } from '@utils/hooks/updateStatus';

interface OrderDetailsProps {
  orderID: string;
  onClose: () => void;
  onOrderUpdated?: (orderID: string) => void;
}

export default function OrderDetailsDrawer({
  orderID,
  onClose,
  onOrderUpdated,
}: OrderDetailsProps) {
  // Call all hooks first (unconditionally)
  const {
    data: order,
    isLoading,
    isError,
    error,
    refetch,
  } = useOrderDetails(orderID);

  const { updateOrderStatus, isUpdating } = useUpdateOrderStatus();

  // Drag-to-close state
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const startYRef = useRef<number | null>(null);
  const translateYRef = useRef(0);
  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const CLOSE_THRESHOLD = 120;

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;

    return date.toLocaleDateString('en-KE', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleComplete = async () => {
    await updateOrderStatus(orderID, 'complete');
    onOrderUpdated?.(orderID);
    onClose();
  };

  const handleCancel = async () => {
    await updateOrderStatus(orderID, 'cancel');
    onOrderUpdated?.(orderID);
    onClose();
  };

  // Pointer event handlers (works for touch and mouse)
  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;

    const element = el as HTMLElement & {
      setPointerCapture?: (pointerId: number) => void;
      releasePointerCapture?: (pointerId: number) => void;
    };

    const onPointerDown = (e: PointerEvent) => {
      // only start drag if on mobile viewport (bottom sheet)
      if (window.innerWidth >= 768) return;
      startYRef.current = e.clientY;
      translateYRef.current = 0;
      setIsDragging(true);
      element.setPointerCapture?.(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging || startYRef.current === null) return;
      const delta = Math.max(0, e.clientY - startYRef.current);
      translateYRef.current = delta;
      setTranslateY(delta);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDragging) return;
      setIsDragging(false);

      element.releasePointerCapture?.(e.pointerId);

      const final = translateYRef.current ?? 0;
      // close if dragged beyond threshold
      if (final >= CLOSE_THRESHOLD) {
        setTranslateY(0);
        translateYRef.current = 0;
        startYRef.current = null;
        onClose();
      } else {
        // snap back
        setTranslateY(0);
        translateYRef.current = 0;
        startYRef.current = null;
      }
    };

    el.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [isDragging, onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Early return after all hooks are called
  if (!orderID) return null;

  // Inline style for transform when dragging (only applied on mobile)
  const sheetStyle =
    typeof translateY === 'number' && window?.innerWidth < 768
      ? { transform: `translateY(${translateY}px)` }
      : undefined;

  return (
    <div
      className='fixed inset-0 top-14 z-[9999] flex bg-black/60 backdrop-blur-sm md:justify-end'
      onClick={onClose}
      aria-modal='true'
      role='dialog'
    >
      {/* Drawer / Bottom sheet */}
      <div
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        style={sheetStyle}
        className='flex h-full w-full max-w-full flex-col rounded-t-2xl border-t border-gray-700 bg-gradient-to-b from-gray-900 to-gray-800 text-gray-100 shadow-2xl md:max-w-[420px] md:rounded-none md:border-l'
      >
        {/* Mobile drag handle */}
        <div className='flex justify-center pt-2 md:hidden'>
          <div className='mb-3 h-1 w-12 rounded-full bg-gray-600' />
        </div>

        {/* Header */}
        <div className='flex items-center justify-between border-b border-gray-700 bg-gradient-to-r from-gray-800 to-gray-900 px-4 py-4'>
          <div className='flex items-center gap-3'>
            <div className='rounded-lg border border-purple-500/30 bg-purple-500/20 p-2 shadow-sm'></div>
            <div>
              <h2 className='text-lg font-bold text-white'>Order Details</h2>
              <p className='text-xs text-gray-400'>#{orderID.slice(0, 10)}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label='Close'
            className='rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white'
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        {/* Content */}
        <div className='flex-1 space-y-4 overflow-y-auto p-4'>
          {isLoading && (
            <div className='flex flex-col items-center justify-center py-16 text-gray-400'>
              <div className='mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-700 border-t-purple-500' />
              <p className='text-sm font-medium'>Loading order details...</p>
            </div>
          )}

          {isError && (
            <div className='space-y-4 rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center'>
              <AlertCircle className='mx-auto h-12 w-12 text-red-400' />
              <div>
                <div className='font-semibold text-red-300'>Failed to Load</div>
                <p className='mt-1 text-xs text-red-400'>{error?.message}</p>
              </div>
              <button
                onClick={() => refetch()}
                className='inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500'
              >
                <RefreshCw className='h-4 w-4' /> Retry
              </button>
            </div>
          )}

          {order && (
            <>
              {/* Time Badge */}
              <div className='flex items-center justify-between rounded-xl border border-gray-700 bg-gray-800 p-3'>
                <div className='flex items-center gap-2'>
                  <span className='text-sm font-medium text-gray-300'>
                    {formatTime(order.created_at)}
                  </span>
                </div>
                <span className='rounded-md border border-green-500/30 bg-green-500/20 px-2 py-1 text-xs font-medium text-green-400'>
                  Paid
                </span>
              </div>

              {/* Delivery Info */}
              <div className='space-y-3 rounded-xl border border-gray-700 bg-gray-800 p-4'>
                <div className='flex items-center gap-2'>
                  <span className='text-sm font-semibold tracking-wide text-gray-200 uppercase'>
                    {order.delivery_type || ''}
                  </span>
                </div>

                {order.address && (
                  <div className='space-y-1'>
                    <p className='text-sm text-gray-300'>{order.address}</p>
                  </div>
                )}

                {order.instructions && (
                  <div className='ml-6 rounded-lg border border-gray-700 bg-gray-900 p-3'>
                    <p className='text-xs text-gray-400 italic'>
                      <span className='font-medium text-gray-300'>Note:</span>{' '}
                      {order.instructions}
                    </p>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className='space-y-3 rounded-xl border border-gray-700 bg-gray-800 p-4'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <h3 className='text-sm font-semibold text-gray-200'>
                      Order Items
                    </h3>
                  </div>
                  <span className='rounded-md bg-gray-700 px-2 py-1 text-xs font-medium text-gray-300'>
                    {order.items?.length ?? 0} items
                  </span>
                </div>

                <div className='space-y-2 border-t border-gray-700 pt-3'>
                  {(order.items ?? []).map((item, i) => (
                    <div
                      key={i}
                      className='flex items-center justify-between rounded-lg bg-gray-900 p-3'
                    >
                      <div className='flex items-center gap-3'>
                        <div className='flex h-8 w-8 items-center justify-center rounded-lg border border-purple-500/30 bg-purple-500/10 text-sm font-bold text-purple-400'>
                          {item.quantity}×
                        </div>
                        <div>
                          <p className='text-sm font-medium text-gray-200'>
                            {item.name}
                          </p>
                          {item.variant_size && (
                            <p className='text-xs text-gray-500'>
                              {item.variant_size}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Info */}
              <div className='space-y-3 rounded-xl border border-gray-700 bg-gray-800 p-4'>
                <div className='flex items-center gap-2'>
                  <h3 className='text-sm font-semibold text-gray-200'>
                    Payment Details
                  </h3>
                </div>

                <div className='space-y-2 border-t border-gray-700 pt-3'>
                  <div className='flex items-center justify-between'>
                    <span className='text-xs text-gray-500'>Phone Number</span>
                    <span className='font-mono text-sm font-medium text-gray-300'>
                      {order.mpesa_phone ?? 'N/A'}
                    </span>
                  </div>
                  <div className='flex items-center justify-between'>
                    <span className='text-xs text-gray-500'>Reference</span>
                    <span className='font-mono text-sm font-medium text-purple-400'>
                      {order.payment_reference ?? 'Pending'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Total */}
              <div className='rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-purple-600/5 p-4'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-xs text-gray-400'>Total Amount</p>
                    <p className='mt-1 text-xs text-gray-500'>
                      {(order.items ?? []).reduce(
                        (sum, i) => sum + (i.quantity ?? 0),
                        0,
                      )}{' '}
                      items total
                    </p>
                  </div>
                  <div className='text-right'>
                    <p className='text-2xl font-bold text-white'>
                      KSh {order.total_amount?.toLocaleString() ?? '0'}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Action Footer */}
        {order && (
          <div className='sticky bottom-0 flex gap-3 border-t border-gray-700 bg-gradient-to-t from-gray-900 to-gray-800 p-4'>
            <button
              onClick={handleComplete}
              disabled={isUpdating}
              className='flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 py-3 text-sm font-semibold text-white transition-all hover:bg-green-500 hover:shadow-lg hover:shadow-green-500/50 disabled:cursor-not-allowed disabled:opacity-50'
            >
              {isUpdating ? 'Processing...' : 'Complete'}
            </button>

            <button
              onClick={handleCancel}
              disabled={isUpdating}
              className='flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 py-3 text-sm font-semibold text-white transition-all hover:bg-red-500 hover:shadow-lg hover:shadow-red-500/50 disabled:cursor-not-allowed disabled:opacity-50'
            >
              {isUpdating ? 'Processing...' : 'Cancel'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
