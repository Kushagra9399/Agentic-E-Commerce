import { API_BASE_URL } from '../config/api';
import { CrossSellResponse, UpsellData } from '../types';

/**
 * GET /api/recommendations/{product_id}
 * Retrieves compatible cross-sell product suggestions from the backend.
 */
export async function getRecommendations(productId: string): Promise<CrossSellResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/recommendations/${productId}`);
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn(`getRecommendations failed on ${API_BASE_URL}`, err);
  }

  return {
    product_id: productId,
    recommendation_type: 'cross_sell',
    count: 0,
    products: [],
  };
}

/**
 * GET /api/upsell/{product_id}
 * Retrieves structured smart upgrade / upsell recommendation from the backend.
 */
export async function getUpsell(productId: string): Promise<UpsellData> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/upsell/${productId}`);
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn(`getUpsell failed on ${API_BASE_URL}`, err);
  }

  return {
    available: false,
    message: 'No upgrade recommendation available.',
  };
}
