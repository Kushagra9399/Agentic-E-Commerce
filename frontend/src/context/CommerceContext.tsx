import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Product,
  Cart,
  ChatMessage,
  AuditEvent,
  Order,
} from '../types';
import * as api from '../services/api';
import { sessionService } from '../services/sessionService';

interface CommerceContextType {
  sessionId: string | null;
  setSessionId: (id: string | null) => void;
  cartId: string | null;
  setCartId: (id: string | null) => void;
  orderId: string | null;
  setOrderId: (id: string | null) => void;
  cart: Cart;
  orders: Order[];
  messages: ChatMessage[];
  auditEvents: AuditEvent[];
  isBackendConnected: boolean;
  isLoadingChat: boolean;
  addingProductId: string | null;
  sendMessage: (text: string) => Promise<void>;
  addToCart: (product: Product, quantity?: number) => Promise<void>;
  refreshCart: (targetCartId?: string) => Promise<void>;
  clearCart: () => void;
  approvePurchase: () => Promise<Order>;
  addOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: Order['status'], paymentId?: string) => void;
  addAuditLog: (
    step: string,
    action: string,
    actor: 'AI Agent' | 'Buyer' | 'Backend System' | 'Razorpay Gateway',
    details: string,
    status?: 'completed' | 'in_progress' | 'failed' | 'cancelled'
  ) => void;
  resetSession: () => void;
}

const CommerceContext = createContext<CommerceContextType | undefined>(undefined);

const DEFAULT_WELCOME_MESSAGES: ChatMessage[] = [
  {
    id: 'msg_welcome',
    sender: 'agent',
    text: "👋 Hello! I am your **AI Shopping Assistant**.\n\nAsk me about any products, specifications, or recommendations you're looking for, and I will query our catalog to find verified matches for you.",
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  },
];

const DEFAULT_AUDIT_LOG: AuditEvent = {
  id: 'audit_init',
  timestamp: new Date().toLocaleTimeString(),
  step: 'Session Initialized',
  action: 'Client connected',
  actor: 'AI Agent',
  details: 'AI Shopping Assistant standby for natural language queries.',
  status: 'completed',
};

export const CommerceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sessionId, setSessionIdState] = useState<string | null>(() => sessionService.getSessionId());
  const [cartId, setCartIdState] = useState<string | null>(() => sessionService.getCartId());
  const [orderId, setOrderIdState] = useState<string | null>(() => sessionService.getOrderId());

  const [cart, setCart] = useState<Cart>(() => ({
    cart_id: '',
    status: 'active',
    items: [],
    total_amount: 0,
    currency: 'INR',
  }));

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = sessionService.getOrders<Order>();
    return saved || [];
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = sessionService.getMessages<ChatMessage>();
    return saved && saved.length > 0 ? saved : DEFAULT_WELCOME_MESSAGES;
  });

  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(() => {
    const saved = sessionService.getAuditEvents<AuditEvent>();
    return saved && saved.length > 0 ? saved : [DEFAULT_AUDIT_LOG];
  });

  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [addingProductId, setAddingProductId] = useState<string | null>(null);
  const [isBackendConnected, setIsBackendConnected] = useState(false);

  // Sync state helpers to persistent session storage
  const setSessionId = useCallback((id: string | null) => {
    setSessionIdState(id);
    sessionService.setSessionId(id);
  }, []);

  const setCartId = useCallback((id: string | null) => {
    setCartIdState(id);
    sessionService.setCartId(id);
  }, []);

  const setOrderId = useCallback((id: string | null) => {
    setOrderIdState(id);
    sessionService.setOrderId(id);
  }, []);

  // Save messages, audit events, and orders on changes
  useEffect(() => {
    sessionService.saveMessages(messages);
  }, [messages]);

  useEffect(() => {
    sessionService.saveAuditEvents(auditEvents);
  }, [auditEvents]);

  useEffect(() => {
    sessionService.saveOrders(orders);
  }, [orders]);

  // Periodic health check for backend connectivity indicator
  useEffect(() => {
    let isMounted = true;
    api.checkBackendHealth().then((healthy) => {
      if (isMounted) setIsBackendConnected(healthy);
    });
    const interval = setInterval(() => {
      api.checkBackendHealth().then((healthy) => {
        if (isMounted) setIsBackendConnected(healthy);
      });
    }, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Initial cart load if cartId was restored from session
  useEffect(() => {
    if (cartId && cartId.trim()) {
      api.getCart(cartId).then((existingCart) => {
        if (existingCart && existingCart.cart_id && existingCart.items) {
          setCart(existingCart);
          sessionService.saveCart(existingCart);
        }
      }).catch((err) => {
        console.warn('Failed to load cart:', err);
        // If cart fetch fails, clear the cartId
        setCartId(null);
      });
    } else {
      // If cartId is null or empty, ensure cart is cleared
      setCart({
        cart_id: '',
        status: 'active',
        items: [],
        total_amount: 0,
        currency: 'INR',
      });
    }
  }, [cartId, setCartId]);

  const addAuditLog = useCallback(
    (
      step: string,
      action: string,
      actor: 'AI Agent' | 'Buyer' | 'Backend System' | 'Razorpay Gateway',
      details: string,
      status: 'completed' | 'in_progress' | 'failed' | 'cancelled' = 'completed'
    ) => {
      const newEvent: AuditEvent = {
        id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toLocaleTimeString(),
        step,
        action,
        actor,
        details,
        status,
      };
      setAuditEvents((prev) => [...prev, newEvent]);
    },
    []
  );

  const getOrCreateCartId = useCallback(async (): Promise<string> => {
    if (cartId) return cartId;
    const newCart = await api.createCart();
    setCartId(newCart.cart_id);
    setCart((prev) => ({ ...prev, cart_id: newCart.cart_id }));
    addAuditLog('Cart Created', 'Initialize shopping cart', 'Backend System', `Created active cart #${newCart.cart_id}`);
    return newCart.cart_id;
  }, [cartId, setCartId, addAuditLog]);

  const refreshCart = useCallback(
    async (targetCartId?: string) => {
      const cid = targetCartId || cartId;
      if (!cid || !cid.trim()) return;
      try {
        const freshCart = await api.getCart(cid);
        if (freshCart && freshCart.cart_id && freshCart.items) {
          setCart(freshCart);
          sessionService.saveCart(freshCart);
        } else if (freshCart && !freshCart.items.length) {
          // Cart exists but is empty - keep the data but don't error
          setCart(freshCart);
          sessionService.saveCart(freshCart);
        }
      } catch (err) {
        console.warn('refreshCart failed', err);
        // On error, don't clear the local cart - let user retry
      }
    },
    [cartId]
  );

  const clearCart = useCallback(() => {
    setCart({
      cart_id: '',
      status: 'active',
      items: [],
      total_amount: 0,
      currency: 'INR',
    });
    setCartId(null);
  }, [setCartId]);

  const addOrder = useCallback((order: Order) => {
    setOrders((prev) => {
      const exists = prev.some((o) => o.order_id === order.order_id);
      if (exists) {
        return prev.map((o) => (o.order_id === order.order_id ? order : o));
      }
      return [order, ...prev];
    });
  }, []);

  const updateOrderStatus = useCallback((orderIdToUpdate: string, status: Order['status'], paymentId?: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.order_id === orderIdToUpdate
          ? {
              ...o,
              status,
              payment_status: status === 'paid' ? 'paid' : o.payment_status,
              ...(paymentId ? { payment_id: paymentId } : {}),
            }
          : o
      )
    );
    // Clear cart and order after successful payment
    if (status === 'paid') {
      setCart({
        cart_id: '',
        status: 'active',
        items: [],
        total_amount: 0,
        currency: 'INR',
      });
      setCartId(null);
      sessionService.setCartId(null);
      // Also clear saved cart data to prevent reloading
      sessionService.saveCart(null);
      // Clear orderId to prevent payment button from reappearing
      setOrderId(null);
      sessionService.setOrderId(null);
    }
  }, [setCartId, setOrderId]);

  const sendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoadingChat(true);

    addAuditLog('Product Searched', 'Natural language inquiry', 'Buyer', `Query: "${text}"`);

    try {
      const activeCartId = await getOrCreateCartId();
      const response = await api.sendChat(text, sessionId, activeCartId);
      await refreshCart(activeCartId);

      if (response.session_id && response.session_id !== sessionId) {
        setSessionId(response.session_id);
      }

      // Normalize possible nesting: agent may return structured payloads under
      // `response.message` when tools produce a dict. Support both shapes.
      const payload = typeof response.message === 'object' && response.message !== null ? response.message : response;

      const dedupeByName = (arr: any[] | undefined) => {
        if (!arr || arr.length === 0) return [];
        const seen = new Set<string>();
        return arr.filter((p) => {
          const n = (p.name || '').trim().toLowerCase();
          if (!n) return true;
          if (seen.has(n)) return false;
          seen.add(n);
          return true;
        });
      };

      const agentMsg: ChatMessage = {
        id: `msg_agent_${Date.now()}`,
        sender: 'agent',
        text: typeof response.message === 'string' ? response.message : (payload.message || JSON.stringify(payload)),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        products: dedupeByName(payload.products),
        crossSell: dedupeByName(payload.crossSell),
        upsell: payload.upsell,
        payment: payload.payment,
      };

      // If agent returned a payment payload directly (e.g. create_order tool),
      // set the current order id and record an audit log so UI shows Pay button.
      const payloadPayment = payload.payment || (response as any).payment;
      if (payloadPayment) {
        const payment = payloadPayment;
        const orderIdFromPayment = payment.order_id || (payload.order && (payload.order.id || payload.order.order_id)) || (response as any).order?.id || payment.orderId || payment.orderId;
        if (orderIdFromPayment) {
          setOrderId(orderIdFromPayment);
        }

        addAuditLog(
          'Order Created (Tool)',
          'Order creation with payment ready',
          'AI Agent',
          `Order ${orderIdFromPayment || payment.razorpay_order_id} is ready for payment`,
          'in_progress'
        );
      }

      // If full order object came back from the agent, add it to orders state
      const payloadOrder = payload.order || (response as any).order;
      if (payloadOrder) {
        const ord = payloadOrder;
        const orderSnapshot: Order = {
          order_id: ord.id || ord.order_id || ord.orderId,
          cart_id: ord.cart_id || '',
          total_amount: ord.total || ord.total_amount || 0,
          currency: ord.currency || 'INR',
          status: ord.status || 'pending_payment',
          items: ord.items || [],
          created_at: new Date().toISOString(),
        };
        addOrder(orderSnapshot);
      }

      setMessages((prev) => [...prev, agentMsg]);

      if (agentMsg.products && agentMsg.products.length > 0) {
        addAuditLog(
          'Product Results',
          'AI Search & Ranking',
          'AI Agent',
          `Returned ${agentMsg.products.length} matching product(s)`
        );
      }
      if (response.upsell?.available) {
        addAuditLog(
          'Upsell Shown',
          'Smart Upgrade Evaluation',
          'AI Agent',
          `Proposed upgrade to ${response.upsell.upgrade?.name} (+₹${response.upsell.additional_cost})`
        );
      }
      if (agentMsg.crossSell && agentMsg.crossSell.length > 0) {
        addAuditLog(
          'Cross-sell Shown',
          'Accessory Compatibility Check',
          'AI Agent',
          `Suggested ${agentMsg.crossSell.length} compatible accessory add-on(s)`
        );
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      
      // Extract error message and type for better error display
      const errorMessage = err?.message || 'Unable to connect to backend service.';
      const errorDisplay = errorMessage.includes('Groq') 
        ? `⚠️ AI service error: ${errorMessage}. Please try your request again.`
        : errorMessage.includes('Server error')
        ? `⚠️ Server error. Please try again in a moment.`
        : `⚠️ ${errorMessage}`;
      
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_err_${Date.now()}`,
          sender: 'system',
          text: errorDisplay,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      
      // Log error to audit trail for debugging
      addAuditLog(
        'Chat Error',
        'Error during conversation',
        'System',
        errorMessage,
        'failed'
      );
    } finally {
      setIsLoadingChat(false);
    }
  };

  const addToCart = async (product: Product, quantity = 1) => {
    setAddingProductId(product.id);
    try {
      const targetCartId = await getOrCreateCartId();
      await api.addToCart(targetCartId, product.id, quantity, product);
      await refreshCart(targetCartId);

      addAuditLog(
        'Added to Cart',
        'Add item to cart',
        'Buyer',
        `Added "${product.name}" (Qty: ${quantity}, Unit: ₹${product.sale_price}) to cart #${targetCartId}`
      );

      // System notification in chat
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_added_${Date.now()}`,
          sender: 'system',
          text: `🛒 Added **${product.name}** to your cart.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      console.error('Failed to add to cart:', err);
    } finally {
      setAddingProductId(null);
    }
  };

  const approvePurchase = async (): Promise<Order> => {
    const targetCartId = await getOrCreateCartId();

    // Explicit approval endpoint
    await api.approveCart(targetCartId);

    // Create locked backend order
    const order = await api.createOrder(targetCartId);
    setOrderId(order.order_id);

    // Add order to orders state & store snapshot of items
    const orderSnapshot: Order = {
      ...order,
      items: order.items && order.items.length > 0 ? order.items : [...cart.items],
      total_amount: order.total_amount || cart.total_amount,
      currency: order.currency || cart.currency || 'INR',
      created_at: order.created_at || new Date().toISOString(),
    };
    addOrder(orderSnapshot);

    // When cart is set to orders, remove items from cart
    clearCart();

    addAuditLog(
      'Buyer Approved',
      'Explicit Purchase Authorization',
      'Buyer',
      `Approved purchase for cart #${targetCartId}. Total: ₹${orderSnapshot.total_amount}`
    );

    addAuditLog(
      'Order Created',
      'Backend Order Locked',
      'Backend System',
      `Created locked order #${order.order_id} with status "${order.status}". Items moved to Orders.`
    );

    return orderSnapshot;
  };

  const resetSession = () => {
    sessionService.clearAll();
    setSessionIdState(null);
    setCartIdState(null);
    setOrderIdState(null);
    setCart({
      cart_id: '',
      status: 'active',
      items: [],
      total_amount: 0,
      currency: 'INR',
    });
    setMessages(DEFAULT_WELCOME_MESSAGES);
    setAuditEvents([
      {
        id: `audit_reset_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        step: 'Session Reset',
        action: 'Clear session and active cart',
        actor: 'Buyer',
        details: 'Restarted commerce state for new inquiry.',
        status: 'completed',
      },
    ]);
  };

  return (
    <CommerceContext.Provider
      value={{
        sessionId,
        setSessionId,
        cartId,
        setCartId,
        orderId,
        setOrderId,
        cart,
        orders,
        messages,
        auditEvents,
        isBackendConnected,
        isLoadingChat,
        addingProductId,
        sendMessage,
        addToCart,
        refreshCart,
        clearCart,
        approvePurchase,
        addOrder,
        updateOrderStatus,
        addAuditLog,
        resetSession,
      }}
    >
      {children}
    </CommerceContext.Provider>
  );
};

export function useCommerceContext() {
  const context = useContext(CommerceContext);
  if (!context) {
    throw new Error('useCommerceContext must be used within a CommerceProvider');
  }
  return context;
}

export const useCommerce = useCommerceContext;
