import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '@utils/hooks/apiUtils';
import { toast } from 'sonner';
import { useDeliveryStore } from '@utils/hooks/deliveryStore';
import { useCartStore, type ReorderItem } from '@utils/hooks/useCrt';
import type { OrderHistoryItem } from '@utils/schemas/order';
export default function OrderHistory() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Cart and delivery store actions
  const reorderItems = useCartStore((state) => state.reorderItems);
  const { setDeliveryOption, setDeliveryAddress } = useDeliveryStore();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await api.get<{ orders: OrderHistoryItem[] }>(
          '/api/orders/history',
          {
            withCredentials: true,
          },
        );

        setOrders(res.data.orders ?? []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const toggle = (id: string) =>
    setExpanded((prev) => (prev === id ? null : id));

  const formatCurrency = (v: number) => `KES ${v}`;

  const firstItemTitle = (order: OrderHistoryItem) => {
    const first = order.items?.[0];
    if (!first) return `Order #${order.id.slice(0, 6)}`;
    const size = first.variant_size ? ` (${first.variant_size})` : '';
    return `${first.product_name}${size}`.toUpperCase();
  };

  const reorder = (order: OrderHistoryItem) => {
    try {
      // Store previous cart state for undo functionality
      const previousItems = useCartStore.getState().items;
      const previousDeliveryOption = useDeliveryStore.getState().deliveryOption;
      const previousPlace = useDeliveryStore.getState().place;

      // Convert order items to reorder format
      const itemsToReorder: ReorderItem[] = order.items.map((item) => ({
        product_id: item.product_id,
        variant_id: item.variant_id,
        product_name: item.product_name,
        quantity: item.quantity,
        price: item.price, // This is already the total price from order_items
        image_url: item.image_url,
        variant_size: item.variant_size,
      }));

      // Populate cart with order items (replaces existing cart)
      reorderItems(itemsToReorder);

      // Set delivery option
      setDeliveryOption(order.delivery_type);

      // If it was a delivery order, prefill the address
      if (
        order.delivery_type === 'delivery' &&
        order.delivery_address_main_text
      ) {
        setDeliveryAddress({
          main_text: order.delivery_address_main_text,
          secondary_text: order.delivery_address_secondary_text || '',
        });
      }

      // Show success toast with undo option
      toast.success(
        `${order.items.length} item${order.items.length > 1 ? 's' : ''} added to cart!`,
        {
          action: {
            label: 'Undo',
            onClick: () => {
              // Restore previous cart state
              useCartStore.setState({ items: previousItems });
              setDeliveryOption(previousDeliveryOption);
              if (previousPlace) {
                setDeliveryAddress(previousPlace);
              }
              toast.info('Cart restored');
            },
          },
          duration: 5000,
        },
      );

      // Navigate to checkout
      navigate('/checkout');
    } catch (error) {
      console.error('Reorder error:', error);
      toast.error('Failed to reorder items. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-[#FEFAEF]'>
        <p className='text-lg text-green-900'>Loading order history...</p>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-[#FEFAEF] p-4 md:p-8'>
      <h1 className='mb-6 text-center text-2xl font-bold text-green-900'>
        Order History
      </h1>

      {orders.length === 0 && (
        <p className='text-center text-green-900/70'>
          You have no past orders yet.
        </p>
      )}

      <div className='mx-auto max-w-xl space-y-4'>
        {orders.map((order) => {
          const isOpen = expanded === order.id;
          return (
            <article
              key={order.id}
              className={`overflow-hidden rounded-lg border bg-white shadow-sm transition-all ${
                isOpen ? 'ring-1 ring-green-900/10' : 'border-green-900/10'
              }`}
            >
              {/* Collapsed header */}
              <header className='flex items-center justify-between p-4'>
                <div className='flex items-center gap-3'>
                  {/* thumbnail or initial circle */}
                  <div className='flex h-10 w-10 items-center justify-center rounded-full bg-green-900/5 font-semibold text-green-900'>
                    {order.items?.[0]?.product_name
                      ? order.items[0].product_name.charAt(0).toUpperCase()
                      : '#'}
                  </div>

                  <div>
                    <p className='text-sm font-semibold text-green-900'>
                      {firstItemTitle(order)}
                    </p>
                    <p className='text-xs text-green-900/60'>
                      Ordered on: {new Date(order.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className='flex flex-col items-end gap-2'>
                  <button
                    onClick={() => toggle(order.id)}
                    aria-expanded={isOpen}
                    className='flex items-center gap-1 text-xs text-green-900/80'
                  >
                    {isOpen ? 'Hide details' : 'View details'}
                    {isOpen ? (
                      <ChevronUp className='text-green-900' />
                    ) : (
                      <ChevronDown className='text-green-900' />
                    )}
                  </button>
                </div>
              </header>

              {/* Expanded receipt content */}
              <div
                className={`overflow-hidden transition-[max-height,padding] duration-300 ${isOpen ? 'max-h-[640px] p-4' : 'max-h-0 p-0'} `}
              >
                <div className='space-y-2 font-mono text-[14px] text-green-900'>
                  {order.items.map((item) => (
                    <div key={item.id} className='flex justify-between'>
                      <span>
                        {item.product_name.toUpperCase()}
                        {item.variant_size ? ` (${item.variant_size})` : ''}
                      </span>
                      <span>
                        {item.quantity} × {formatCurrency(item.price)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className='my-3 border-t border-green-900/30' />

                <div className='space-y-1 font-mono text-[15px] text-green-900'>
                  <div className='flex justify-between'>
                    <span>Subtotal</span>
                    <span>{formatCurrency(order.subtotal)}</span>
                  </div>
                  <div className='flex justify-between'>
                    <span>Delivery</span>
                    <span>{formatCurrency(order.delivery_fee)}</span>
                  </div>
                  <div className='flex justify-between font-bold'>
                    <span>Total</span>
                    <span>{formatCurrency(order.total_amount)}</span>
                  </div>
                </div>

                <div className='mt-4 flex gap-3'>
                  <button
                    onClick={() => reorder(order)}
                    className='ml-auto w-full rounded-md bg-green-900 py-2 text-sm font-semibold text-[#FEFAEF] transition hover:bg-green-800 active:scale-95'
                  >
                    Reorder
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
