import React from 'react';
import { Link } from 'react-router-dom';
import {
  Bot,
  MessageSquare,
  ShoppingBag,
  Activity,
  ShieldCheck,
  Package,
  Sparkles,
  ArrowRight,
  Lock,
  CreditCard,
  Layers,
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import { useCommerceContext } from '../context/CommerceContext';

export const HomePage: React.FC = () => {
  const { cart, orders, isBackendConnected, sessionId } = useCommerceContext();
  const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="page-container" style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px' }}>
      {/* Hero Section */}
      <section
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)',
          padding: '40px 32px',
          marginBottom: 32,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: 'linear-gradient(90deg, var(--color-primary), #6366f1, #10b981)',
          }}
        />

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            color: 'var(--color-primary)',
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 20,
          }}
        >
          <Sparkles size={15} />
          Autonomous Shopping Assistant with Strict Security Guardrails
        </div>

        <h1
          style={{
            fontSize: 'clamp(28px, 4vw, 38px)',
            fontWeight: 800,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
            marginBottom: 16,
            lineHeight: 1.25,
            maxWidth: 750,
          }}
        >
          AI-Powered Commerce Agent with Explicit Buyer Authorization
        </h1>

        <p
          style={{
            fontSize: 16,
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            maxWidth: 680,
            marginBottom: 28,
          }}
        >
          Discover electronics and products through natural conversational search, explore dynamic
          upsell comparisons, and checkout securely with authoritative Razorpay payment verification.
        </p>

        {/* Primary Action Buttons */}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 24 }}>
          <Link
            to="/chat"
            className="btn-card-primary"
            style={{
              padding: '12px 26px',
              fontSize: 15,
              fontWeight: 700,
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
            }}
          >
            <MessageSquare size={18} />
            Start Shopping with AI
            <ArrowRight size={16} />
          </Link>

          <Link
            to="/cart"
            className="btn-card-secondary"
            style={{
              padding: '12px 22px',
              fontSize: 15,
              fontWeight: 600,
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
            }}
          >
            <ShoppingBag size={18} />
            View Active Cart {totalItems > 0 && `(${totalItems})`}
          </Link>

          <Link
            to="/orders"
            className="btn-card-secondary"
            style={{
              padding: '12px 22px',
              fontSize: 15,
              fontWeight: 600,
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
            }}
          >
            <Package size={18} />
            Orders {orders.length > 0 && `(${orders.length})`}
          </Link>

          <Link
            to="/audit"
            className="btn-card-secondary"
            style={{
              padding: '12px 22px',
              fontSize: 15,
              fontWeight: 600,
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
            }}
          >
            <Activity size={18} />
            Audit Trail
          </Link>
        </div>

        {/* Live Backend Connection Status */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-surface-subtle)',
            border: '1px solid var(--border-color)',
            fontSize: 12,
            color: 'var(--text-secondary)',
          }}
        >
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: '50%',
              backgroundColor: isBackendConnected ? 'var(--color-success)' : 'var(--color-warning)',
              display: 'inline-block',
            }}
          />
          <span>
            Target Backend: <strong style={{ color: 'var(--text-primary)' }}>{API_BASE_URL}</strong>
          </span>
          <span style={{ color: 'var(--text-muted)' }}>•</span>
          <span>Status: {isBackendConnected ? 'Connected (FastAPI + PostgreSQL)' : 'Backend Standby'}</span>
        </div>
      </section>

      {/* Core Principles Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 20,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            padding: 24,
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#eff6ff',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14,
            }}
          >
            <Bot size={22} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
            1. Natural Language Discovery
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Ask in plain conversational English. The backend AI agent searches catalogs, compares specifications,
            refresh rates, budgets, and brands.
          </p>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            padding: 24,
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#fef3c7',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14,
            }}
          >
            <Sparkles size={22} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
            2. Explainable Upsell & Cross-Sell
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Compare specifications with higher-tier models for a minimal price difference, or discover compatible
            accessories and add-ons directly from the recommendation API.
          </p>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            padding: 24,
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#ecfdf5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14,
            }}
          >
            <Lock size={22} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
            3. Strict Buyer Approval Gate
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            The AI is strictly bounded and <strong>cannot</strong> auto-approve or charge purchases. The buyer
            must explicitly review and authorize the locked cart.
          </p>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            padding: 24,
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#faf5ff',
              color: '#7c3aed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14,
            }}
          >
            <CreditCard size={22} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
            4. Razorpay Signature Verification
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Direct integration with Razorpay order creation and cryptographic payment signature verification on the
            backend before order fulfillment.
          </p>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            padding: 24,
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14,
            }}
          >
            <Activity size={22} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
            5. Transparent Audit Logging
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Every search, AI reasoning step, cart modification, buyer approval, and gateway transaction is recorded
            with actor attribution and timestamps.
          </p>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            padding: 24,
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#eff6ff',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14,
            }}
          >
            <Layers size={22} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
            6. Multi-Page Architecture
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Clean route-based navigation with full state persistence across product details, upgrade flows, cart,
            orders history, checkout review, and payments.
          </p>
        </div>
      </div>

      {/* Quick Start Prompt Box */}
      <div
        style={{
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: 'var(--radius-lg)',
          padding: '24px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h4 style={{ fontSize: 16, fontWeight: 700, color: '#1e40af', marginBottom: 4 }}>
            Ready to search with the AI Commerce Assistant?
          </h4>
          <p style={{ fontSize: 13, color: '#3b82f6' }}>
            Ask anything you're looking for to discover catalog products, upgrades, and accessories in real time.
          </p>
        </div>

        <Link
          to="/chat"
          className="btn-card-primary"
          style={{
            padding: '10px 20px',
            fontSize: 14,
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          Open Chat Assistant
        </Link>
      </div>
    </div>
  );
};
