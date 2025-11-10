import { MessageCircle, AlertCircle } from 'lucide-react';
import type { OrderData } from '@utils/schemas/order';

interface WhatsAppSupportProps {
  orderData: OrderData;
}

const SUPPORT_WHATSAPP = '254727922764'; // Replace with your support number

export const WhatsAppSupport = ({ orderData }: WhatsAppSupportProps) => {
  const handleContactSupport = () => {
    // Format order items
    const itemsList = orderData.items
      ? orderData.items
          .map((item) => `• ${item.quantity}x ${item.product_name}`)
          .join('\n')
      : 'No items listed';

    // Create support message
    const message = `🆘 *DELIVERY ISSUE*

📦 *Order Reference:* ${orderData.payment_reference}

👤 *Customer Phone:* ${orderData.mpesa_phone}

📍 *Delivery Address:*
${orderData.delivery_address_main_text}
${orderData.delivery_address_secondary_text || ''}

💰 *Total Amount:* KES ${orderData.total_amount.toFixed(2)}

📋 *Order Items:*
${itemsList}

⏰ *Order Time:* ${new Date(orderData.created_at).toLocaleString('en-KE')}

📌 *Issue:* I have not received my delivery yet. Please help.`;

    // Create WhatsApp URL
    const whatsappUrl = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(message)}`;

    // Open WhatsApp
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className='mb-6 overflow-hidden rounded-xl border-2 border-orange-200 bg-orange-50 shadow-sm'>
      <div className='border-b border-orange-200 bg-orange-100 p-4'>
        <div className='flex items-center gap-2'>
          <AlertCircle className='h-5 w-5 text-orange-600' />
          <h3 className='font-semibold text-orange-900'>
            Haven't received your delivery?
          </h3>
        </div>
      </div>

      <div className='p-4'>
        <p className='mb-4 text-sm text-orange-800'>
          If you haven't received your order or experiencing any issues, contact
          our support team on WhatsApp. We'll assist you immediately.
        </p>

        <button
          onClick={handleContactSupport}
          className='flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-green-700 active:bg-green-800'
        >
          <MessageCircle className='h-5 w-5' />
          Contact Support on WhatsApp
        </button>

        <p className='mt-3 text-center text-xs text-orange-700'>
          Your order details will be automatically included
        </p>
      </div>
    </div>
  );
};
