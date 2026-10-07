import { API_BASE_URL } from '../config/api';
import { AuditEvent } from '../types';

/**
 * GET /api/audit or GET /api/audit-trail/{session_id}
 * Retrieves server-side audit events if exposed by the backend.
 */
export async function fetchAuditLogs(
  sessionId?: string | null,
  orderId?: string | null
): Promise<AuditEvent[]> {
  try {
    const query = new URLSearchParams();
    if (sessionId) query.append('session_id', sessionId);
    if (orderId) query.append('order_id', orderId);

    const response = await fetch(`${API_BASE_URL}/api/audit?${query.toString()}`);
    if (response.ok) {
      return await response.json();
    }
  } catch {
    // If backend doesn't have an audit log endpoint, fallback to client-tracked events
  }
  return [];
}
