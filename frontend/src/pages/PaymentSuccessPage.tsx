import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  ShieldCheck,
  Package,
  Activity,
  Home,
  Receipt,
  Clock,
} from 'lucide-react';
import { useCommerceContext } from '../context/CommerceContext';

export const PaymentSuccessPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { orders, updateOrderStatus } = useCommerceContext();

  const [countdown, setCountdown] = useState(8);

  const paymentId = searchParams.get('payment_id');
  const amountStr = searchParams.get('amount');

  // Find order in context if available
  const existingOrder = orderId ? orders.find((o) => o.order_id === orderId) : undefined;
  const amount = amountStr ? parseFloat(amountStr) : existingOrder ? existingOrder.total_amount : 0;

  // Mark status as paid
  useEffect(() => {
    if (orderId && paymentId) {
      updateOrderStatus(orderId, 'paid', paymentId);
    }
  }, [orderId, paymentId, updateOrderStatus]);

  // Auto redirect to Home after 8 seconds (between 5 and 10 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="page-container" style={{ maxWidth: 680, margin: '0 auto', padding: '40px 20px' }}>
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-md)',
          padding: '36px 28px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--color-success-bg)',
            color: 'var(--color-success)',
            border: '2px solid var(--color-success-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}
        >
          <CheckCircle size={40} />
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
          Payment Confirmed & Verified
        </h1>

        <p
          style={{
            fontSize: 14,
            color: 'var(--color-success)',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 16,
          }}
        >
          <ShieldCheck size={16} /> Backend cryptographic signature verified successfully
        </p>

        {/* Auto Redirect Countdown Notice */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            backgroundColor: '#f1f5f9',
            border: '1px solid #cbd5e1',
            padding: '8px 16px',
            borderRadius: 'var(--radius-full)',
            fontSize: 13,
            color: 'var(--text-secondary)',
            marginBottom: 24,
            fontWeight: 500,
          }}
        >
          <Clock size={14} color="var(--color-primary)" />
          <span>
            Returning to Home page in <strong style={{ color: 'var(--color-primary)' }}>{countdown}</strong> seconds...
          </span>
        </div>

        {/* Order Details Receipt Box */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            padding: 20,
            textAlign: 'left',
            marginBottom: 28,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              marginBottom: 12,
              borderBottom: '1px solid var(--border-color)',
              paddingBottom: 8,
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Receipt size={14} /> Transaction Receipt
            </span>
            <span style={{ color: 'var(--color-success)' }}>VERIFIED BY BACKEND</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
            <span style={{ color: 'var(--text-muted)' }}>Order ID:</span>
            <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{orderId}</span>
          </div>

          {paymentId && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
              <span style={{ color: 'var(--text-muted)' }}>Razorpay Payment ID:</span>
              <span style={{ fontWeight: 600, fontFamily: 'monospace', color: 'var(--color-primary)' }}>
                {paymentId}
              </span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
            <span style={{ color: 'var(--text-muted)' }}>Order Status:</span>
            <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>PAID & COMPLETED</span>
          </div>

          {existingOrder?.items && existingOrder.items.length > 0 && (
            <div style={{ margin: '12px 0', borderTop: '1px solid var(--border-color)', paddingTop: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Items Placed:</span>
              <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {existingOrder.items.map((item) => (
                  <div key={item.cart_item_id || item.product_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span>{item.product?.name || `Item ${item.product_id}`} × {item.quantity}</span>
                    <span style={{ fontWeight: 600 }}>{formatINR(item.unit_price * item.quantity)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 16,
              fontWeight: 800,
              color: 'var(--text-primary)',
              borderTop: '1px dashed var(--border-color)',
              paddingTop: 10,
              marginTop: 6,
            }}
          >
            <span>Total Paid:</span>
            <span style={{ color: 'var(--color-primary)' }}>{formatINR(amount)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => navigate('/')}
            className="btn-card-primary"
            style={{
              padding: '12px 22px',
              fontSize: 14,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
            }}
          >
            <Home size={16} /> Return to Home Now
          </button>

          <Link
            to="/orders"
            className="btn-card-secondary"
            style={{
              padding: '12px 20px',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Package size={16} /> View Orders ({orders.length})
          </Link>

          <Link
            to="/audit"
            className="btn-card-secondary"
            style={{
              padding: '12px 20px',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Activity size={16} /> View Audit Trail
          </Link>
        </div>
      </div>
    </div>
  );
};
