import { Mail, Phone } from 'lucide-react';

interface OrderDetailsCardProps {
  email?: string;
  mpesaPhone?: string;
  paymentReference?: string;
}

export const OrderDetailsCard = ({
  email,
  mpesaPhone,
  paymentReference,
}: OrderDetailsCardProps) => {
  return (
    <div className='mb-6 rounded-2xl bg-white p-8 shadow-lg'>
      <h2 className='mb-4 text-xl font-bold text-green-900'>Order Details</h2>

      {email && (
        <div className='mb-4 flex items-center text-gray-700'>
          <Mail className='mr-3 h-5 w-5 text-green-900' />
          <div>
            <p className='text-sm font-semibold text-green-900'>
              Confirmation sent to
            </p>
            <p className='text-sm text-gray-600'>{email}</p>
          </div>
        </div>
      )}

      {mpesaPhone && (
        <div className='flex items-center text-gray-700'>
          <Phone className='mr-3 h-5 w-5 text-green-900' />
          <div>
            <p className='text-sm font-semibold text-green-900'>Payment from</p>
            <p className='text-sm text-gray-600'>{mpesaPhone}</p>
            {paymentReference && (
              <p className='mt-1 text-xs text-gray-500'>
                Ref: {paymentReference}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
