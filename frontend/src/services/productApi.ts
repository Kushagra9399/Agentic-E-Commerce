import { API_BASE_URL } from '../config/api';
import { Product } from '../types';

/**
 * GET /api/products/{product_id}
 * Fetches product specifications from the authoritative backend catalog.
 */
export async function getProduct(productId: string): Promise<Product> {
  const response = await fetch(`${API_BASE_URL}/api/products/${productId}`);
  if (!response.ok) {
    throw new Error(`Product with ID "${productId}" not found (HTTP ${response.status})`);
  }
  return await response.json();
}
