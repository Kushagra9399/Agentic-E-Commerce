import { useState, useEffect, useCallback } from 'react';
import {
  Product,
  Cart,
  ChatMessage,
  AuditEvent,
  PaymentCreateResponse,
} from '../types';
import * as api from '../services/api';

const SESSION_STORAGE_KEY = 'ai_commerce_session_v1';

export function useCommerce() {
  // Session storage restoration
  const savedState = (() => {
    try {
      const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return null;
  })();

  const [sessionId, setSessionId] = useState<string | null>(savedState?.sessionId || null);
  const [cartId, setCartId] = useState<string | null>(savedState?.cartId || null);
  const [orderId, setOrderId] = useState<string | null>(savedState?.orderId || null);

  const [cart, setCart] = useState<Cart>({
    cart_id: savedState?.cartId || '',
    status: 'active',
    items: [],
    total_amount: 0,
    currency: 'INR',
  });

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_welcome',
      sender: 'agent',
      text: "👋 Hello! I am your **AI Shopping Assistant**.\n\nTell me what you are looking for, such as:\n• *\"I want a Sony 55 inch 4K TV under ₹60,000\"*\n• *\"Recommend compatible soundbars and accessories\"*\n\nI will find the best verified matches, compare smart upgrades, and assist your checkout with explicit buyer approval.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([
    {
      id: 'audit_init',
      timestamp: new Date().toLocaleTimeString(),
      step: 'Session Initialized',
      action: 'Client connected',
      actor: 'AI Agent',
      details: 'AI Shopping Assistant standby for natural language search queries.',
      status: 'completed',
    },
  ]);

  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [addingProductId, setAddingProductId] = useState<string | null>(null);
  const [isApprovalLoading, setIsApprovalLoading] = useState(false);
  const [isBackendConnected, setIsBackendConnected] = useState(false);

  // Active modals
  const [activeModal, setActiveModal] = useState<
    'none' | 'product_details' | 'approval' | 'payment_gateway' | 'payment_success' | 'payment_failed' | 'audit_trail'
  >('none');

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentCreateResponse | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Save session state to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({
          sessionId,
          cartId,
          orderId,
        })
      );
    } catch {
      // ignore
    }
  }, [sessionId, cartId, orderId]);

  // Check backend health periodically
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

  // Ensure active cart exists or create one
  const getOrCreateCartId = useCallback(async (): Promise<string> => {
    if (cartId) return cartId;
    const newCart = await api.createCart();
    setCartId(newCart.cart_id);
    setCart((prev) => ({ ...prev, cart_id: newCart.cart_id }));
    addAuditLog('Cart Created', 'Initialize shopping cart', 'Backend System', `Created active cart #${newCart.cart_id}`);
    return newCart.cart_id;
  }, [cartId, addAuditLog]);

  // Refresh cart from backend
  const refreshCart = useCallback(
    async (targetCartId: string) => {
      try {
        const freshCart = await api.getCart(targetCartId);
        if (freshCart) {
          setCart(freshCart);
        }
      } catch (err) {
        console.warn('refreshCart failed', err);
      }
    },
    []
  );

  // Handle Send Chat Message
  const handleSendMessage = async (text: string) => {
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
      const response = await api.sendChat(text, sessionId);

      if (response.session_id && response.session_id !== sessionId) {
        setSessionId(response.session_id);
      }

      const agentMsg: ChatMessage = {
        id: `msg_agent_${Date.now()}`,
        sender: 'agent',
        text: response.message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        products: (response.products || []).filter((p: any, idx: number, arr: any[]) => {
          const seen = new Set<string>();
          return arr.findIndex((x) => (x.name || '').trim().toLowerCase() === (p.name || '').trim().toLowerCase()) === idx;
        }),
        crossSell: (response.crossSell || []).filter((p: any, idx: number, arr: any[]) => {
          return arr.findIndex((x) => (x.name || '').trim().toLowerCase() === (p.name || '').trim().toLowerCase()) === idx;
        }),
        upsell: response.upsell,
      };

      setMessages((prev) => [...prev, agentMsg]);

      if (response.products && response.products.length > 0) {
        addAuditLog(
          'Product Results',
          'AI Search & Ranking',
          'AI Agent',
          `Returned ${response.products.length} matching product(s)`
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
      if (response.crossSell && response.crossSell.length > 0) {
        addAuditLog(
          'Cross-sell Shown',
          'Accessory Compatibility Check',
          'AI Agent',
          `Suggested ${response.crossSell.length} compatible accessory add-on(s)`
        );
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_err_${Date.now()}`,
          sender: 'system',
          text: '⚠️ Unable to connect to the backend agent. Please verify your connection or try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoadingChat(false);
    }
  };

  // Handle Add To Cart
  const handleAddToCart = async (product: Product, quantity = 1) => {
    setAddingProductId(product.id);
    try {
      const targetCartId = await getOrCreateCartId();
      const item = await api.addToCart(targetCartId, product.id, quantity);

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
          text: `🛒 Added **${product.name}** to your cart. Cart updated with backend total.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      console.error('Failed to add to cart:', err);
    } finally {
      setAddingProductId(null);
    }
  };

  // View Product Details Modal
  const handleViewProductDetails = (product: Product) => {
    setSelectedProduct(product);
    setActiveModal('product_details');
    addAuditLog('Product Selected', 'Inspect item specs', 'Buyer', `Viewed details for "${product.name}"`);
  };

  // Step 1: Open Buyer Approval Modal
  const handleInitiateApproval = () => {
    if (cart.items.length === 0) return;
    setActiveModal('approval');
    setIsMobileCartOpen(false);
    addAuditLog(
      'Buyer Reviewing Approval',
      'Open Purchase Approval Dialog',
      'Buyer',
      `Reviewing ${cart.items.length} item(s) totaling ₹${cart.total_amount}`
    );
  };

  // Step 2: Buyer Clicks "Approve Purchase & Pay"
  const handleApprovePurchase = async () => {
    setIsApprovalLoading(true);
    try {
      const targetCartId = await getOrCreateCartId();

      // 1. Create backend order
      const order = await api.createOrder(targetCartId);
      setOrderId(order.order_id);

      addAuditLog(
        'Buyer Approved',
        'Explicit Purchase Authorization',
        'Buyer',
        `Approved order of ₹${order.total_amount} with ${cart.items.length} items.`
      );

      addAuditLog(
        'Order Created',
        'Backend Order Locked',
        'Backend System',
        `Created locked order #${order.order_id} with status "${order.status}"`
      );

      // 2. Request backend payment creation
      const payResponse = await api.createPayment(order.order_id);
      setPaymentData(payResponse);

      addAuditLog(
        'Payment Initiated',
        'Razorpay Order Created',
        'Backend System',
        `Generated Razorpay order ${payResponse.razorpay_order_id} for amount ₹${payResponse.amount}`
      );

      // 3. Transition to Payment Gateway modal
      setActiveModal('payment_gateway');
    } catch (err) {
      console.error('Approval/Order creation failed:', err);
    } finally {
      setIsApprovalLoading(false);
    }
  };

  // Step 3: Payment Success / Verification
  const handlePaymentSuccess = async (razorpayPaymentId: string, signature: string) => {
    if (!orderId) return;

    addAuditLog(
      'Payment Captured',
      'Razorpay Signature Received',
      'Razorpay Gateway',
      `Payment ID: ${razorpayPaymentId}. Sending signature to backend for verification.`
    );

    try {
      const verifyRes = await api.verifyPayment(orderId, {
        razorpay_order_id: paymentData?.razorpay_order_id || orderId,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: signature,
      });

      setPaymentId(verifyRes.payment_id || razorpayPaymentId);
      setActiveModal('payment_success');

      addAuditLog(
        'Payment Successful',
        'Backend Signature Verification',
        'Backend System',
        `Order #${orderId} verified and confirmed paid.`
      );

      // Clear cart items upon successful order completion
      setCart((prev) => ({
        ...prev,
        items: [],
        total_amount: 0,
      }));
    } catch (err) {
      console.error('Verification error:', err);
      handlePaymentFailure('Verification signature mismatch.');
    }
  };

  // Step 4: Payment Failure
  const handlePaymentFailure = (errorMessage?: string) => {
    setPaymentError(errorMessage || 'Payment transaction could not be completed.');
    setActiveModal('payment_failed');

    addAuditLog(
      'Payment Failed',
      'Transaction Declined',
      'Razorpay Gateway',
      errorMessage || 'Payment failed. Order remains unpaid with zero charges.',
      'failed'
    );
  };

  // Step 5: Payment Retry (Section 19: does not create duplicate order!)
  const handleRetryPayment = async () => {
    if (!orderId) return;
    setIsApprovalLoading(true);

    addAuditLog(
      'Payment Retried',
      'Calling Backend Retry Endpoint',
      'Buyer',
      `Retrying payment for existing order #${orderId} without creating duplicate order.`
    );

    try {
      await api.retryPayment(orderId);
      const payResponse = await api.createPayment(orderId);
      setPaymentData(payResponse);
      setActiveModal('payment_gateway');
    } catch (err) {
      console.error('Retry failed:', err);
    } finally {
      setIsApprovalLoading(false);
    }
  };

  // Step 6: Order Cancellation (Section 20)
  const handleCancelOrder = async () => {
    if (!orderId) return;
    try {
      await api.cancelOrder(orderId);
      addAuditLog(
        'Order Cancelled',
        'Cancelled by Buyer',
        'Buyer',
        `Order #${orderId} was cancelled. Cart retained.`,
        'cancelled'
      );
      setActiveModal('none');
    } catch (err) {
      console.error('Cancel order failed:', err);
    }
  };

  // Reset shopping session
  const handleResetSession = () => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setSessionId(null);
    setCartId(null);
    setOrderId(null);
    setCart({
      cart_id: '',
      status: 'active',
      items: [],
      total_amount: 0,
      currency: 'INR',
    });
    setMessages([
      {
        id: `msg_welcome_${Date.now()}`,
        sender: 'agent',
        text: "👋 Session reset. Tell me what you'd like to explore next!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    addAuditLog(
      'Session Reset',
      'Clear session and active cart',
      'Buyer',
      'Restarted commerce state for new inquiry.'
    );
  };

  return {
    sessionId,
    cartId,
    orderId,
    cart,
    messages,
    auditEvents,
    isLoadingChat,
    addingProductId,
    isApprovalLoading,
    isBackendConnected,
    activeModal,
    selectedProduct,
    paymentData,
    paymentId,
    paymentError,
    isMobileCartOpen,
    setActiveModal,
    setIsMobileCartOpen,
    handleSendMessage,
    handleAddToCart,
    handleViewProductDetails,
    handleInitiateApproval,
    handleApprovePurchase,
    handlePaymentSuccess,
    handlePaymentFailure,
    handleRetryPayment,
    handleCancelOrder,
    handleResetSession,
  };
}
