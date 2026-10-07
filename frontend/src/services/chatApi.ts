import { API_BASE_URL } from '../config/api';
import { Product, UpsellData } from '../types';

export interface ChatResponse {
  session_id: string;
  message?: string;
  products?: Product[];
  crossSell?: Product[];
  upsell?: UpsellData;
  payment?: any;
  error?: string;
  details?: string;
  error_type?: string;
}

/**
 * POST /api/chat/
 * Sends natural language shopping inquiry to the authoritative AI Commerce Agent backend.
 * Returns structured error response on API failures.
 */
export async function sendChat(
  message: string,
  sessionId: string | null
): Promise<ChatResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId || undefined,
        message,
      }),
    });

    // Parse response regardless of HTTP status
    let data: ChatResponse;
    try {
      data = await response.json();
    } catch {
      throw new Error(
        `Failed to parse server response (HTTP ${response.status}): ${response.statusText}`
      );
    }

    // Check for API error in response
    if (data.error) {
      throw new Error(
        `${data.error}: ${data.details || 'Please try again.'}`
      );
    }

    // Check for HTTP error status
    if (!response.ok) {
      throw new Error(
        `Server error (HTTP ${response.status}): ${data.message || response.statusText}`
      );
    }

    return data;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Chat service error: ${errorMessage}`);
  }
}
