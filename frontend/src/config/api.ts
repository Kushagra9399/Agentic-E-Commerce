/**
 * Central API Configuration
 *
 * All API requests in the entire frontend MUST use API_BASE_URL.
 * Configurable via VITE_API_BASE_URL environment variable.
 */

export const API_BASE_URL: string =
  (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:8000";
