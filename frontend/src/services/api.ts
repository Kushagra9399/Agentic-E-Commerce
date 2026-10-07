import { API_BASE_URL } from '../config/api';

export * from './chatApi';
export * from './productApi';
export * from './recommendationApi';
export * from './cartApi';
export * from './orderApi';
export * from './paymentApi';
export * from './auditApi';
export * from './sessionService';

/**
 * Health check helper to verify backend connectivity
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${API_BASE_URL}/api/health`, {
      signal: controller.signal,
    }).catch(() => null);
    clearTimeout(timeoutId);
    return res ? res.ok : false;
  } catch {
    return false;
  }
}
