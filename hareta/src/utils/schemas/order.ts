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
