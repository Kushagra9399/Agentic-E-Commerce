import React, { useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  XCircle,
  RefreshCw,
  ShoppingBag,
  AlertOctagon,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';
import * as api from '../services/api';
import { useCommerceContext } from '../context/CommerceContext';

export const PaymentFailedPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addAuditLog } = useCommerceContext();

  const errorMessage = searchParams.get('error') || 'The bank or payment gateway declined this transaction.';
  const amountStr = searchParams.get('amount');
  const amount = amountStr ? parseFloat(amountStr) : 54356;

  const [isRetrying, setIsRetrying] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [orderCancelled, setOrderCancelled] = useState(false);

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleRetry = async () => {
    if (!orderId) return;
    setIsRetrying(true);

    try {
      await api.retryPayment(orderId);
      addAuditLog(
        'Payment Retry',
        'Buyer initiated retry',
        'Buyer',
        `Retrying payment for order #${orderId} without duplicate order creation.`
      );
      navigate(`/payment/${orderId}`);
    } catch (err) {
      console.error('Retry failed:', err);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!orderId) return;
    setIsCancelling(true);

    try {
      await api.cancelOrder(orderId);
      setOrderCancelled(true);
      addAuditLog(
        'Order Cancelled',
        'Buyer cancelled order',
        'Buyer',
        `Cancelled pending order #${orderId}.`
      );
    } catch (err) {
      console.error('Cancel order failed:', err);
    } finally {
      setIsCancelling(false);
      setShowCancelConfirm(false);
    }
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
            backgroundColor: 'var(--color-danger-bg)',
            color: 'var(--color-danger)',
            border: '2px solid var(--color-danger-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}
        >
          <XCircle size={40} />
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-danger)', marginBottom: 8 }}>
          {orderCancelled ? 'Order Cancelled' : 'Payment Failed or Declined'}
        </h1>

        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16, maxWidth: 500, margin: '0 auto 16px' }}>
          {orderCancelled
            ? `Order #${orderId} was successfully cancelled.`
            : errorMessage}
        </p>

        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            fontWeight: 600,
            fontSize: 13,
            padding: '10px 16px',
            borderRadius: 'var(--radius-sm)',
            marginBottom: 24,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <ShieldCheck size={16} />
          Your account has NOT been charged.
        </div>

        {/* Order Details Card */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            padding: 18,
            textAlign: 'left',
            marginBottom: 24,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
            <span style={{ color: 'var(--text-muted)' }}>Target Order ID:</span>
            <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{orderId}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
            <span style={{ color: 'var(--text-muted)' }}>Order Status:</span>
            <span
              style={{
                fontWeight: 700,
                color: orderCancelled ? 'var(--text-muted)' : 'var(--color-danger)',
              }}
            >
              {orderCancelled ? 'CANCELLED' : 'PAYMENT FAILED'}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 16,
              fontWeight: 800,
              color: 'var(--text-primary)',
              borderTop: '1px dashed var(--border-color)',
              paddingTop: 8,
              marginTop: 4,
            }}
          >
            <span>Order Value:</span>
            <span>{formatINR(amount)}</span>
          </div>
        </div>

        {/* Action Controls */}
        {!orderCancelled && (
          <div style={{ marginBottom: 20 }}>
            {showCancelConfirm ? (
              <div
                style={{
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: 'var(--radius-md)',
                  padding: 16,
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertOctagon size={16} /> Are you sure you want to cancel this order?
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    className="btn-card-secondary"
                    style={{
                      flex: 1,
                      color: 'var(--color-danger)',
                      borderColor: 'var(--color-danger-border)',
                      backgroundColor: '#ffffff',
                      padding: '8px',
                      fontSize: 13,
                    }}
                    onClick={handleCancelOrder}
                    disabled={isCancelling}
                  >
                    {isCancelling ? 'Cancelling...' : 'Yes, Cancel Order'}
                  </button>
                  <button
                    className="btn-card-secondary"
                    style={{ flex: 1, padding: '8px', fontSize: 13, backgroundColor: '#ffffff' }}
                    onClick={() => setShowCancelConfirm(false)}
                  >
                    Keep Order
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  className="btn-card-primary"
                  style={{
                    padding: '12px 24px',
                    fontSize: 14,
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                  onClick={handleRetry}
                  disabled={isRetrying}
                >
                  <RefreshCw size={16} className={isRetrying ? 'spin' : ''} />
                  {isRetrying ? 'Preparing Retry...' : 'Retry Payment'}
                </button>

                <button
                  className="btn-card-secondary"
                  style={{
                    padding: '12px 20px',
                    fontSize: 14,
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                  onClick={() => setShowCancelConfirm(true)}
                >
                  Cancel Order
                </button>
              </div>
            )}
          </div>
        )}

        <div>
          <Link
            to="/chat"
            className="btn-card-secondary"
            style={{
              padding: '10px 18px',
              fontSize: 13,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <ShoppingBag size={15} /> Return to AI Shopping Assistant
          </Link>
        </div>
      </div>
    </div>
  );
};
