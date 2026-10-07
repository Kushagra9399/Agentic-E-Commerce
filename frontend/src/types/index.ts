export interface Product {
  id: string;
  name: string;
  brand?: string;
  category?: string;
  sale_price: number;
  market_price?: number;
  discount?: number | string;
  stock?: number;
  specifications?: Record<string, string> | string;
  overview?: string;
  image?: string;
  product_link?: string;
}

export interface UpsellData {
  available: boolean;
  current_product?: {
    id: string;
    name: string;
    price: number;
    image?: string;
  };
  upgrade?: {
    id: string;
    name: string;
    price: number;
    image?: string;
    reason?: string;
    specifications?: Record<string, string> | string;
  };
  additional_cost?: number;
  message?: string;
}

export interface CrossSellResponse {
  product_id: string;
  recommendation_type: string;
  count: number;
  products: Product[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent' | 'system';
  text: string;
  timestamp: string;
  products?: Product[];
  crossSell?: Product[];
  upsell?: UpsellData;
  actionPrompt?: string;
  payment?: PaymentCreateResponse;
}

export interface CartItem {
  cart_item_id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  product?: Product;
}

export interface Cart {
  cart_id: string;
  status: string;
  items: CartItem[];
  total_amount: number;
  currency?: string;
}

export interface Order {
  order_id: string;
  cart_id: string;
  total_amount: number;
  currency: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'pending_payment' | 'paid' | 'payment_failed' | 'cancelled';
  items?: CartItem[];
  created_at?: string;
  payment_id?: string;
}

export interface PaymentCreateResponse {
  order_id: string;
  razorpay_order_id: string;
  amount: number;
  currency: string;
  key_id?: string;
  razorpay_key_id?: string;
  status?: string;
}

export interface PaymentVerifyRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  order_id?: string;
}

export interface PaymentVerifyResponse {
  order_id?: string;
  status: string;
  payment_id?: string;
  razorpay_payment_id?: string;
  message?: string;
  verified?: boolean;
}

export interface CommerceState {
  sessionId: string | null;
  cartId: string | null;
  selectedProductId: string | null;
  orderId: string | null;
  approvalStatus: 'idle' | 'pending_approval' | 'approved' | 'rejected';
  paymentStatus: 'idle' | 'payment_pending' | 'verifying' | 'success' | 'failed' | 'cancelled';
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  step: string;
  action: string;
  actor: 'AI Agent' | 'Buyer' | 'Backend System' | 'Razorpay Gateway';
  details: string;
  status: 'completed' | 'in_progress' | 'failed' | 'cancelled';
  meta?: Record<string, any>;
}
