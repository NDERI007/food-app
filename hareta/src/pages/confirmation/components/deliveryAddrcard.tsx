interface DeliveryAddressCardProps {
  deliveryType: 'pickup' | 'delivery';
  mainText?: string;
  secondaryText?: string;
  instructions?: string;
}

export const DeliveryAddressCard = ({
  deliveryType,
  mainText,
  secondaryText,
  instructions,
}: DeliveryAddressCardProps) => {
  return (
    <div className='mb-6 rounded-2xl bg-white p-8 shadow-lg'>
      <h2 className='mb-4 text-xl font-bold text-green-900'>
        {deliveryType === 'delivery' ? 'Delivery Address' : 'Pickup Location'}
      </h2>

      {deliveryType === 'delivery' ? (
        <div className='text-gray-700'>
          {mainText && (
            <p className='mb-1 font-semibold text-green-900'>{mainText}</p>
          )}
          {secondaryText && (
            <p className='mb-3 text-sm text-gray-600'>{secondaryText}</p>
          )}
          {instructions && (
            <div className='mt-4 rounded-lg border border-green-200 bg-green-50 p-4'>
              <p className='mb-1 text-sm font-semibold text-green-900'>
                Delivery Instructions
              </p>
              <p className='text-sm text-green-800'>{instructions}</p>
            </div>
          )}
        </div>
      ) : (
        <div className='text-gray-700'>
          <p className='mb-2 font-semibold text-green-900'>Store Pickup</p>
          <p className='text-sm text-gray-600'>
            Your order will be ready for pickup within 24-48 hours. We'll notify
            you when it's ready.
          </p>
        </div>
      )}
    </div>
  );
};
