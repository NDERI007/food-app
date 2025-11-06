import { useEffect, useRef, useState } from 'react';
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

  const formatTime = (dateString: string) =>
    new Date(dateString).toLocaleTimeString('en-KE', {
      hour: '2-digit',
      minute: '2-digit',
    });

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
      className='fixed inset-0 z-[9999] flex bg-black/50 backdrop-blur-sm md:justify-end'
      onClick={onClose}
      aria-modal='true'
      role='dialog'
    >
      {/* Drawer / Bottom sheet */}
      <div
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        style={sheetStyle}
        className={
          'flex h-full w-full max-w-full flex-col rounded-t-2xl border-t border-gray-800 bg-gray-900 text-gray-100 shadow-2xl ' +
          'pt-16 md:max-w-[420px] md:rounded-none md:border-l md:pt-0'
        }
      >
        {/* Mobile drag handle */}
        <div className='flex justify-center md:hidden'>
          <div className='mt-2 mb-1 h-1 w-12 rounded-full bg-gray-700' />
        </div>

        {/* Header */}
        <div className='bg-gray-850 flex items-center justify-between border-b border-gray-800 px-4 py-3 md:py-4'>
          <h2 className='text-lg font-bold text-gray-200'>Order Receipt</h2>

          <button
            onClick={onClose}
            aria-label='Close'
            className='rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        {/* Content */}
        <div className='flex-1 space-y-5 overflow-y-auto p-4 text-sm'>
          {isLoading && (
            <div className='flex flex-col items-center justify-center py-16 text-gray-400'>
              <div className='mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-purple-400' />
              Loading order details...
            </div>
          )}

          {isError && (
            <div className='space-y-4 py-14 text-center text-gray-300'>
              <AlertCircle className='mx-auto h-12 w-12 text-red-400' />
              <div className='font-semibold text-gray-200'>Failed to Load</div>
              <p className='text-xs text-gray-400'>{error?.message}</p>
              <button
                onClick={() => refetch()}
                className='inline-flex items-center gap-2 rounded-lg bg-purple-700 px-4 py-2 text-white hover:bg-purple-600'
              >
                <RefreshCw className='h-4 w-4' /> Retry
              </button>
            </div>
          )}

          {order && (
            <>
              {/* Timestamp + ID */}
              <div className='flex items-center justify-between text-xs text-gray-400'>
                <div className='flex items-center gap-2'>
                  <Clock className='h-4 w-4 text-purple-400' />
                  {formatTime(order.created_at)}
                </div>
                <span className='text-gray-500'>#{order.id.slice(0, 10)}</span>
              </div>

              {/* Delivery */}
              <div className='space-y-2 border-y border-gray-800 py-3'>
                <div className='flex items-center gap-2 font-semibold text-gray-200'>
                  <MapPin className='h-4 w-4 text-purple-400' />
                  {(order.delivery_type || '').toUpperCase()}
                </div>
                {order.address && (
                  <p className='pl-6 text-xs text-gray-400'>{order.address}</p>
                )}
                {order.instructions && (
                  <p className='pl-6 text-xs text-gray-500 italic'>
                    Note: {order.instructions}
                  </p>
                )}
              </div>

              {/* Items */}
              <div>
                <h3 className='flex items-center gap-2 font-semibold text-gray-200'>
                  <Package className='h-4 w-4 text-purple-400' />
                  Items ({order.items?.length ?? 0})
                </h3>
                <div className='mt-2 space-y-1 pl-6 text-sm text-gray-300'>
                  {(order.items ?? []).map((item, i) => (
                    <div key={i} className='flex justify-between'>
                      <span>
                        {item.quantity}× {item.name}
                        {item.variant_size && (
                          <span className='ml-1 text-xs text-gray-500'>
                            ({item.variant_size})
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment */}
              <div className='space-y-1 border-y border-gray-800 py-3'>
                <div className='flex items-center gap-2 text-gray-200'>
                  <Phone className='h-4 w-4 text-purple-400' />
                  {order.mpesa_phone ?? 'N/A'}
                </div>
                <p className='pl-6 text-xs text-gray-500'>
                  Ref: {order.payment_reference ?? 'Pending'}
                </p>
              </div>

              {/* Totals */}
              <div className='pt-2'>
                <div className='flex justify-between text-sm text-gray-400'>
                  <span>Total Items</span>
                  <span>
                    {(order.items ?? []).reduce(
                      (sum, i) => sum + (i.quantity ?? 0),
                      0,
                    )}
                  </span>
                </div>

                <div className='flex justify-between border-t border-gray-800 pt-3 text-lg font-bold text-gray-100'>
                  <span>Total</span>
                  <span>KSh {order.total_amount?.toLocaleString() ?? '0'}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Action Footer */}
        {order && (
          <div className='sticky bottom-0 flex gap-3 border-t border-gray-800 bg-gray-900 p-4'>
            <button
              onClick={handleComplete}
              disabled={isUpdating}
              className='flex-1 rounded-lg bg-green-600 py-2 text-sm font-medium transition hover:bg-green-500 disabled:opacity-50'
            >
              {isUpdating ? 'Processing...' : 'Mark as Completed'}
            </button>

            <button
              onClick={handleCancel}
              disabled={isUpdating}
              className='flex-1 rounded-lg bg-red-600 py-2 text-sm font-medium transition hover:bg-red-500 disabled:opacity-50'
            >
              {isUpdating ? 'Processing...' : 'Cancel Order'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
