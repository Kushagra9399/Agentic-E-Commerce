import React from 'react';
import { Cart } from '../../types';
import { ShieldCheck, AlertCircle, CheckCircle2, Lock } from 'lucide-react';

interface PurchaseApprovalProps {
  cart: Cart;
  onApprove: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

export const PurchaseApproval: React.FC<PurchaseApprovalProps> = ({
  cart,
  onApprove,
  onCancel,
  isLoading,
}) => {
  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 14px',
          backgroundColor: '#eff6ff',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid #bfdbfe',
          fontSize: 13,
          color: '#1e40af',
        }}
      >
        <Lock size={16} />
        <span>
          <strong>Explicit Buyer Authorization:</strong> Bounded AI Policy requires your explicit consent
          to generate an authoritative backend order.
        </span>
      </div>

      <div className="approval-box-highlight">
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
          Purchase Summary
        </h4>

        <table className="approval-items-table">
          <thead>
            <tr>
              <th>Item Description</th>
              <th style={{ textAlign: 'center' }}>Qty</th>
              <th style={{ textAlign: 'right' }}>Unit Price</th>
              <th style={{ textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {cart.items.map((item) => (
              <tr key={item.cart_item_id || `item-${item.product_id}`}>
                <td style={{ fontWeight: 600 }}>{item.product?.name || 'Product'}</td>
                <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ textAlign: 'right' }}>{formatINR(item.unit_price)}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>
                  {formatINR(item.unit_price * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="approval-total-banner">
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#065f46' }}>Total Order Amount</div>
            <div style={{ fontSize: 11, color: '#047857' }}>Backend Authoritative Calculated Sum</div>
          </div>
          <div className="amount">{formatINR(cart.total_amount)}</div>
        </div>
      </div>

      <div className="approval-disclaimer">
        <AlertCircle size={16} color="var(--color-warning)" style={{ flexShrink: 0, marginTop: 2 }} />
        <span>
          By clicking <strong>Approve Purchase</strong>, you confirm this selection and authorize
          the creation of a locked order. You will proceed to secure Razorpay checkout.
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
        <button
          className="btn-card-secondary"
          style={{ padding: '10px 18px', fontSize: 13 }}
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </button>

        <button
          className="btn-approve-cta"
          style={{
            width: 'auto',
            padding: '10px 24px',
            fontSize: 14,
            boxShadow: '0 4px 12px rgba(22, 163, 74, 0.35)',
          }}
          onClick={onApprove}
          disabled={isLoading}
        >
          <CheckCircle2 size={18} />
          {isLoading ? 'Securing Approval...' : 'Approve Purchase & Pay'}
        </button>
      </div>
    </div>
  );
};
