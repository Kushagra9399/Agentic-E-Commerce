import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  Trash2,
  Plus,
  Minus,
  MessageSquare,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { useCommerceContext } from '../context/CommerceContext';

export const CartPage: React.FC = () => {
  const { cart, refreshCart, sessionId } = useCommerceContext();
  const navigate = useNavigate();

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  if (cart.items.length === 0) {
    return (
      <div className="page-container" style={{ maxWidth: 750, margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--bg-surface-subtle)',
            color: '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}
        >
          <ShoppingBag size={36} />
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
          Your Cart is Empty
        </h2>

        <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 450, margin: '0 auto 24px', lineHeight: 1.6 }}>
          You don't have any items in your active shopping cart yet. Ask the AI assistant for recommendations to get started.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Link
            to="/chat"
            className="btn-card-primary"
            style={{
              padding: '12px 24px',
              fontSize: 14,
              fontWeight: 700,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <MessageSquare size={16} />
            Ask AI Shopping Assistant
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: 1050, margin: '0 auto', padding: '28px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShoppingBag size={24} color="var(--color-primary)" />
            Shopping Cart ({totalItems} {totalItems === 1 ? 'item' : 'items'})
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Active Backend Cart ID: <code>{cart.cart_id || 'active_cart'}</code>
          </p>
        </div>

        <button
          className="btn-card-secondary"
          onClick={() => refreshCart()}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}
        >
          <RefreshCw size={13} /> Refresh Backend Cart
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
        {/* Cart Items List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {cart.items.map((item) => {
            const product = item.product;
            const defaultImg =
              product?.image ||
              'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=400&q=80';

            return (
              <div
                key={item.cart_item_id || item.product_id}
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: 16,
                  display: 'flex',
                  gap: 16,
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div
                  style={{
                    width: 90,
                    height: 90,
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden',
                    backgroundColor: '#f1f5f9',
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={defaultImg}
                    alt={product?.name || item.product_id}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    {product?.brand && (
                      <span className="product-brand-tag" style={{ fontSize: 10 }}>
                        {product.brand}
                      </span>
                    )}
                    <h4
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        lineHeight: 1.3,
                        margin: '2px 0 6px',
                      }}
                    >
                      {product?.name || item.product_id}
                    </h4>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Qty:</span>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          backgroundColor: 'var(--bg-surface-subtle)',
                          padding: '2px 10px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-color)',
                        }}
                      >
                        {item.quantity}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        × {formatINR(item.unit_price)}
                      </span>
                    </div>

                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                      {formatINR(item.unit_price * item.quantity)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
            <Link
              to="/chat"
              className="btn-card-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 16px',
                fontSize: 13,
                textDecoration: 'none',
              }}
            >
              <MessageSquare size={15} />
              Continue Shopping with AI
            </Link>
          </div>
        </div>

        {/* Order Summary & Proceed to Checkout */}
        <div>
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: 24,
              boxShadow: 'var(--shadow-sm)',
              position: 'sticky',
              top: 80,
            }}
          >
            <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
              Order Summary
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--text-secondary)' }}>
                <span>Items Subtotal ({totalItems}):</span>
                <span>{formatINR(cart.total_amount)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--color-success)' }}>
                <span>Delivery / Shipping:</span>
                <span>FREE</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--color-success)' }}>
                <span>Verified Tax & Surcharges:</span>
                <span>Included</span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 18,
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  paddingTop: 12,
                  borderTop: '1px dashed var(--border-color)',
                }}
              >
                <span>Total Amount:</span>
                <span style={{ color: 'var(--color-primary)' }}>{formatINR(cart.total_amount)}</span>
              </div>
            </div>

            {/* Strict Buyer Authorization Notice */}
            <div
              style={{
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 14px',
                fontSize: 12,
                color: '#1e40af',
                lineHeight: 1.5,
                marginBottom: 20,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
              }}
            >
              <Lock size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>
                <strong>Buyer Authorization Barrier:</strong> AI is strictly bounded. You will be asked for
                explicit approval on the next step before creating an authoritative locked order.
              </span>
            </div>

            <button
              className="btn-approve-cta"
              onClick={() => navigate('/checkout')}
              style={{ width: '100%', fontSize: 15, padding: '14px 20px', justifyContent: 'center' }}
            >
              <ShieldCheck size={18} />
              Proceed to Review & Approve
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
