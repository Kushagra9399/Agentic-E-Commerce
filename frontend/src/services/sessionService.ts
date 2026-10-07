/**
 * Central Session & Commerce Persistence Service
 *
 * Preserves sessionId, cartId, orderId, chat history, and audit events
 * across route navigations and browser refreshes.
 */

const STORAGE_KEYS = {
  SESSION_ID: 'ai_commerce_session_id',
  CART_ID: 'ai_commerce_cart_id',
  CART_DATA: 'ai_commerce_cart_data',
  ORDER_ID: 'ai_commerce_order_id',
  ORDERS: 'ai_commerce_orders_list',
  MESSAGES: 'ai_commerce_messages',
  AUDIT_EVENTS: 'ai_commerce_audit_events',
};

export const sessionService = {
  getSessionId(): string | null {
    try {
      return sessionStorage.getItem(STORAGE_KEYS.SESSION_ID) || localStorage.getItem(STORAGE_KEYS.SESSION_ID);
    } catch {
      return null;
    }
  },

  setSessionId(id: string | null): void {
    try {
      if (id) {
        sessionStorage.setItem(STORAGE_KEYS.SESSION_ID, id);
        localStorage.setItem(STORAGE_KEYS.SESSION_ID, id);
      } else {
        sessionStorage.removeItem(STORAGE_KEYS.SESSION_ID);
        localStorage.removeItem(STORAGE_KEYS.SESSION_ID);
      }
    } catch {
      // ignore storage errors
    }
  },

  getCartId(): string | null {
    try {
      return sessionStorage.getItem(STORAGE_KEYS.CART_ID) || localStorage.getItem(STORAGE_KEYS.CART_ID);
    } catch {
      return null;
    }
  },

  setCartId(id: string | null): void {
    try {
      if (id) {
        sessionStorage.setItem(STORAGE_KEYS.CART_ID, id);
        localStorage.setItem(STORAGE_KEYS.CART_ID, id);
      } else {
        sessionStorage.removeItem(STORAGE_KEYS.CART_ID);
        localStorage.removeItem(STORAGE_KEYS.CART_ID);
      }
    } catch {
      // ignore
    }
  },

  getCart<T>(): T | null {
    try {
      const data = sessionStorage.getItem(STORAGE_KEYS.CART_DATA) || localStorage.getItem(STORAGE_KEYS.CART_DATA);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  saveCart<T>(cart: T): void {
    try {
      const cartData = JSON.stringify(cart);
      sessionStorage.setItem(STORAGE_KEYS.CART_DATA, cartData);
      localStorage.setItem(STORAGE_KEYS.CART_DATA, cartData);
    } catch {
      // ignore
    }
  },

  getOrderId(): string | null {
    try {
      return sessionStorage.getItem(STORAGE_KEYS.ORDER_ID) || localStorage.getItem(STORAGE_KEYS.ORDER_ID);
    } catch {
      return null;
    }
  },

  setOrderId(id: string | null): void {
    try {
      if (id) {
        sessionStorage.setItem(STORAGE_KEYS.ORDER_ID, id);
        localStorage.setItem(STORAGE_KEYS.ORDER_ID, id);
      } else {
        sessionStorage.removeItem(STORAGE_KEYS.ORDER_ID);
        localStorage.removeItem(STORAGE_KEYS.ORDER_ID);
      }
    } catch {
      // ignore
    }
  },

  getMessages<T>(): T[] | null {
    try {
      const data = sessionStorage.getItem(STORAGE_KEYS.MESSAGES);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  saveMessages<T>(messages: T[]): void {
    try {
      sessionStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
    } catch {
      // ignore
    }
  },

  getOrders<T>(): T[] | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ORDERS) || sessionStorage.getItem(STORAGE_KEYS.ORDERS);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  saveOrders<T>(orders: T[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
      sessionStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    } catch {
      // ignore
    }
  },

  getAuditEvents<T>(): T[] | null {
    try {
      const data = sessionStorage.getItem(STORAGE_KEYS.AUDIT_EVENTS);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  saveAuditEvents<T>(events: T[]): void {
    try {
      sessionStorage.setItem(STORAGE_KEYS.AUDIT_EVENTS, JSON.stringify(events));
    } catch {
      // ignore
    }
  },

  clearAll(): void {
    try {
      sessionStorage.removeItem(STORAGE_KEYS.SESSION_ID);
      sessionStorage.removeItem(STORAGE_KEYS.CART_ID);
      sessionStorage.removeItem(STORAGE_KEYS.CART_DATA);
      sessionStorage.removeItem(STORAGE_KEYS.ORDER_ID);
      sessionStorage.removeItem(STORAGE_KEYS.MESSAGES);
      sessionStorage.removeItem(STORAGE_KEYS.AUDIT_EVENTS);

      localStorage.removeItem(STORAGE_KEYS.SESSION_ID);
      localStorage.removeItem(STORAGE_KEYS.CART_ID);
      localStorage.removeItem(STORAGE_KEYS.CART_DATA);
      localStorage.removeItem(STORAGE_KEYS.ORDER_ID);
    } catch {
      // ignore
    }
  },
};
