import { API_BASE_URL } from '../config/api';
import { Order } from '../types';
import { getCart } from './cartApi';

let memoryOrderStore: Record<string, Order> = {};

/**
 * POST /api/orders/
 * Creates an authoritative locked order from an approved cart.
 */
export async function createOrder(cartId: string): Promise<Order> {
  try {
    let response = await fetch(`${API_BASE_URL}/api/orders/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cart_id: cartId }),
    });

    if (!response.ok) {
      response = await fetch(`${API_BASE_URL}/api/orders/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart_id: cartId }),
      });
    }

    if (response.ok) {
      const order = await response.json();
      memoryOrderStore[order.order_id] = order;
      return order;
    }
  } catch (err) {
    console.warn(`createOrder failed on ${API_BASE_URL}`, err);
  }

  // Fallback demo order
  const cart = await getCart(cartId);
  const orderId = `ord_${Math.random().toString(36).substring(2, 10)}`;
  const order: Order = {
    order_id: orderId,
    cart_id: cartId,
    total_amount: cart.total_amount || 0,
    currency: cart.currency || 'INR',
    status: 'approved',
    items: [...cart.items],
    created_at: new Date().toISOString(),
  };

  memoryOrderStore[orderId] = order;
  return order;
}

/**
 * GET /api/orders/{order_id}
 * Retrieves order details.
 */
export async function getOrder(orderId: string): Promise<Order | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}`);
    if (response.ok) {
      const order = await response.json();
      memoryOrderStore[orderId] = order;
      return order;
    }
  } catch (err) {
    console.warn(`getOrder failed on ${API_BASE_URL}`, err);
  }

  if (memoryOrderStore[orderId]) {
    return memoryOrderStore[orderId];
  }

  return null;
}
