export interface OrderSummary {
  orderID: string;
  totalAmount: number;
  deliveryType: 'delivery' | 'pickup';
  createdAt: string;
}

export interface OrderItem {
  name: string;
  image_url: string | null;
  quantity: number;
  variant_size: string | null;
  unit_price: number;
}

export interface OrderDetails {
  id: string;
  delivery_type: 'pickup' | 'delivery';
  address: string | null;
  place_id: string | null;
  instructions: string | null;
  mpesa_phone: string;
  payment_reference: string;
  total_amount: number;
  created_at: string;
  items: OrderItem[];
}
export interface Order_Item {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
  image_url?: {
    id: string;
    lqip: string;
    variants: {
      jpg: Record<'400' | '800' | '1200', string>;
      avif: Record<'400' | '800' | '1200', string>;
    };
  };
  variant_size?: string; // Added for RPC response
}

export interface OrderData {
  id: string;
  delivery_type: 'pickup' | 'delivery';
  delivery_address_main_text?: string;
  delivery_address_secondary_text?: string;
  delivery_instructions?: string;
  status:
    | 'pending'
    | 'confirmed'
    | 'out_for_delivery'
    | 'delivered'
    | 'cancelled';
  payment_method: string;
  payment_status: string;
  payment_reference?: string;
  mpesa_phone?: string;
  subtotal: number;
  delivery_fee: number;
  total_amount: number;
  order_notes?: string;
  created_at: string;
  delivery_code?: string;
  delivered_at?: string;
  items?: Order_Item[]; // Changed from order_items to items (RPC format)
}
