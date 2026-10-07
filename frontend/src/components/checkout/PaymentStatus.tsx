import React, { useState } from 'react';
import { CheckCircle, XCircle, RefreshCw, ShoppingBag, AlertOctagon, ShieldCheck } from 'lucide-react';

interface PaymentStatusProps {
  status: 'success' | 'failed';
  orderId: string | null;
  paymentId?: string | null;
  amount: number;
  errorMessage?: string | null;
  onRetry: () => void;
  onCancelOrder: () => void;
  onContinueShopping: () => void;
  isRetrying?: boolean;
  isCancelling?: boolean;
}

export const PaymentStatus: React.FC<PaymentStatusProps> = ({
  status,
  orderId,
  paymentId,
  amount,
  errorMessage,
  onRetry,
  onCancelOrder,
  onContinueShopping,
  isRetrying = false,
  isCancelling = false,
}) => {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (status === 'success') {
    return (
      <div className="payment-status-center">
        <div className="status-icon-circle status-icon-success">
          <CheckCircle size={38} />
        </div>

        <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
          Payment Successful
        </h3>
        <p style={{ fontSize: 13, color: 'var(--color-success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          <ShieldCheck size={16} /> Payment verified & Order confirmed by backend
        </p>

        <div className="order-details-card">
          <div className="order-detail-row">
            <span>Order ID:</span>
            <span style={{ fontWeight: 600 }}>{orderId || 'N/A'}</span>
          </div>
          {paymentId && (
            <div className="order-detail-row">
              <span>Payment ID:</span>
              <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{paymentId}</span>
            </div>
          )}
          <div className="order-detail-row bold">
            <span>Amount Paid:</span>
            <span style={{ color: 'var(--color-primary)' }}>{formatINR(amount)}</span>
          </div>
        </div>

        <button
          className="btn-card-primary"
          style={{ width: '100%', padding: '12px', fontSize: 14, justifyContent: 'center' }}
          onClick={onContinueShopping}
        >
          <ShoppingBag size={16} /> Continue Shopping
        </button>
      </div>
    );
  }

  // Payment Failed State
  return (
    <div className="payment-status-center">
      <div className="status-icon-circle status-icon-danger">
        <XCircle size={38} />
      </div>

      <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-danger)', marginBottom: 6 }}>
        Payment Failed
      </h3>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
        {errorMessage || 'Your payment could not be completed.'}
      </p>

      <div
        style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          padding: '10px 14px',
          borderRadius: 'var(--radius-sm)',
          fontSize: 13,
          color: '#991b1b',
          fontWeight: 600,
          marginBottom: 16,
          width: '100%',
        }}
      >
        Your order has NOT been charged.
      </div>

      <div className="order-details-card" style={{ margin: '0 0 16px 0' }}>
        <div className="order-detail-row">
          <span>Target Order ID:</span>
          <span style={{ fontWeight: 600 }}>{orderId || 'N/A'}</span>
        </div>
        <div className="order-detail-row bold">
          <span>Order Value:</span>
          <span>{formatINR(amount)}</span>
        </div>
      </div>

      {showCancelConfirm ? (
        <div
          style={{
            width: '100%',
            padding: 14,
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: '#92400e', display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertOctagon size={16} /> Are you sure you want to cancel this order?
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn-card-secondary"
              style={{
                flex: 1,
                color: 'var(--color-danger)',
                borderColor: 'var(--color-danger-border)',
                backgroundColor: '#ffffff',
                padding: '8px',
                fontSize: 12,
              }}
              onClick={onCancelOrder}
              disabled={isCancelling}
            >
              {isCancelling ? 'Cancelling...' : 'Yes, Cancel Order'}
            </button>
            <button
              className="btn-card-secondary"
              style={{ flex: 1, padding: '8px', fontSize: 12, backgroundColor: '#ffffff' }}
              onClick={() => setShowCancelConfirm(false)}
            >
              Keep Order
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
          <button
            className="btn-card-primary"
            style={{ width: '100%', padding: '12px', fontSize: 14, justifyContent: 'center' }}
            onClick={onRetry}
            disabled={isRetrying}
          >
            <RefreshCw size={16} className={isRetrying ? 'spin' : ''} />
            {isRetrying ? 'Preparing Retry...' : 'Retry Payment'}
          </button>

          <button
            className="btn-card-secondary"
            style={{ width: '100%', padding: '10px', fontSize: 13, justifyContent: 'center' }}
            onClick={() => setShowCancelConfirm(true)}
          >
            Cancel Order
          </button>
        </div>
      )}
    </div>
  );
};
