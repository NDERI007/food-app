import { Package, Loader2, CheckCircle } from 'lucide-react';

interface ConfirmDeliveryCardProps {
  deliveryType: 'pickup' | 'delivery';
  orderId: string;
  confirmingDelivery: boolean;
  onConfirm: () => void;
}

export const ConfirmDeliveryCard = ({
  deliveryType,
  confirmingDelivery,
  onConfirm,
}: ConfirmDeliveryCardProps) => {
  return (
    <div className='mb-6 rounded-2xl bg-gradient-to-br from-green-900 to-green-800 p-8 text-white shadow-lg'>
      <div className='mb-4 flex items-center gap-3'>
        <div className='flex h-12 w-12 items-center justify-center rounded-full bg-white/20'>
          <Package className='h-6 w-6 text-white' />
        </div>
        <div>
          <h2 className='text-xl font-bold'>
            {deliveryType === 'pickup'
              ? 'Ready for Pickup!'
              : 'Delivery in Progress'}
          </h2>
          <p className='text-sm text-green-100'>
            {deliveryType === 'pickup'
              ? 'Your order is ready. Come pick it up and confirm receipt.'
              : 'Your order is on the way. Confirm when you receive it.'}
          </p>
        </div>
      </div>

      <button
        onClick={onConfirm}
        disabled={confirmingDelivery}
        className='w-full rounded-xl bg-white py-4 font-semibold text-green-900 transition-all hover:bg-green-50 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50'
      >
        <div className='flex items-center justify-center gap-2'>
          {confirmingDelivery ? (
            <>
              <Loader2 className='h-5 w-5 animate-spin' />
              Confirming...
            </>
          ) : (
            <>
              <CheckCircle className='h-5 w-5' />
              Confirm {deliveryType === 'pickup' ? 'Pickup' : 'Delivery'}{' '}
              Received
            </>
          )}
        </div>
      </button>

      <div className='mt-4 rounded-lg bg-white/10 p-4'>
        <p className='text-sm text-green-100'>
          <strong className='text-white'>Note:</strong> Our delivery person will
          take a photo as proof of delivery. Please confirm once you've received
          your order.
        </p>
      </div>
    </div>
  );
};
