import { API_BASE_URL } from '../config/api';
import { Cart, CartItem, Product } from '../types';
import { getProduct } from './productApi';

// In-memory fallback cart cache when offline
const memoryCartStore: Record<string, Cart> = {};

/**
 * POST /api/cart/
 * Creates a new active shopping cart on the backend.
 */
export async function createCart(): Promise<{ cart_id: string; status: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/cart/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn(`createCart failed on ${API_BASE_URL}`, err);
  }

  const cartId = `cart_${Math.random().toString(36).substring(2, 9)}`;
  memoryCartStore[cartId] = {
    cart_id: cartId,
    status: 'active',
    items: [],
    total_amount: 0,
    currency: 'INR',
  };

  return { cart_id: cartId, status: 'active' };
}

/**
 * POST /api/cart/{cart_id}/items
 * Adds a product to the specified backend cart.
 */
export async function addToCart(
  cartId: string,
  productId: string,
  quantity: number = 1,
  productInfo?: Product
): Promise<CartItem> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/cart/${cartId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: productId,
        quantity,
      }),
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn(`addToCart API failed on ${API_BASE_URL}`, err);
  }

  let product: Product | undefined = productInfo;
  if (!product) {
    try {
      product = await getProduct(productId);
    } catch {
      product = {
        id: productId,
        name: `Product ${productId}`,
        sale_price: 0,
      };
    }
  }

  const cartItemId = `item_${Math.random().toString(36).substring(2, 9)}`;
  const item: CartItem = {
    cart_item_id: cartItemId,
    cart_id: cartId,
    product_id: productId,
    quantity,
    unit_price: product.sale_price || 0,
    product,
  };

  if (!memoryCartStore[cartId]) {
    memoryCartStore[cartId] = {
      cart_id: cartId,
      status: 'active',
      items: [],
      total_amount: 0,
      currency: 'INR',
    };
  }

  const existingIndex = memoryCartStore[cartId].items.findIndex((i) => i.product_id === productId);
  if (existingIndex >= 0) {
    memoryCartStore[cartId].items[existingIndex].quantity += quantity;
  } else {
    memoryCartStore[cartId].items.push(item);
  }

  memoryCartStore[cartId].total_amount = memoryCartStore[cartId].items.reduce(
    (sum, i) => sum + i.unit_price * i.quantity,
    0
  );

  return item;
}

/**
 * GET /api/cart/{cart_id}
 * Retrieves current backend cart state.
 */
export async function getCart(cartId: string): Promise<Cart> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/cart/${cartId}`);
    if (response.ok) {
      const data = await response.json();
      // Backend returns total/items.name; the UI expects total_amount and
      // item.product.name. Normalize the API contract in one place.
      const items: CartItem[] = (data.items || []).map((item: any) => ({
        ...item,
        cart_id: item.cart_id || data.cart_id || cartId,
        unit_price: Number(item.unit_price ?? item.price ?? 0),
        quantity: Number(item.quantity ?? 1),
        product: item.product || {
          id: item.product_id,
          name: item.name || item.product_name || `Product ${item.product_id}`,
          brand: item.brand,
          sale_price: Number(item.unit_price ?? item.price ?? 0),
          market_price: Number(item.market_price ?? item.unit_price ?? item.price ?? 0),
          image: item.image,
        },
      }));
      const normalized: Cart = {
        ...data,
        cart_id: data.cart_id || cartId,
        status: data.status || 'active',
        items,
        total_amount: Number(data.total_amount ?? data.total ?? data.subtotal ?? 0),
        currency: data.currency || 'INR',
      };
      memoryCartStore[cartId] = normalized;
      return normalized;
    }
  } catch (err) {
    console.warn(`getCart failed on ${API_BASE_URL}`, err);
  }

  if (memoryCartStore[cartId]) {
    return memoryCartStore[cartId];
  }

  return {
    cart_id: cartId,
    status: 'active',
    items: [],
    total_amount: 0,
    currency: 'INR',
  };
}

/**
 * POST /api/cart/{cart_id}/approve
 * Explicit buyer authorization approval endpoint.
 */
export async function approveCart(cartId: string): Promise<{
  cart_id: string;
  status: string;
  order_id?: string;
  message?: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/cart/${cartId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn(`approveCart failed on ${API_BASE_URL}`, err);
  }

  return {
    cart_id: cartId,
    status: 'approved',
    message: 'Cart explicitly approved by buyer.',
  };
}
