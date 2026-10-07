import React from 'react';
import { Cart, Product } from '../../types';
import { CartItem } from './CartItem';
import { ShoppingBag, ShieldCheck, CheckCircle, ArrowRight } from 'lucide-react';

interface CartPanelProps {
  cart: Cart;
  onInitiateApproval: () => void;
  onViewProductDetails?: (product: Product) => void;
  isApprovalLoading?: boolean;
}

export const CartPanel: React.FC<CartPanelProps> = ({
  cart,
  onInitiateApproval,
  onViewProductDetails,
  isApprovalLoading = false,
}) => {
  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <aside className="cart-sidebar">
      <div className="cart-header">
        <h2>
          <ShoppingBag size={18} color="var(--color-primary)" />
          Active Cart
        </h2>
        {cart.cart_id && (
          <span
            style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              backgroundColor: 'var(--bg-surface-subtle)',
              padding: '2px 8px',
              borderRadius: 4,
            }}
          >
            ID: {cart.cart_id.substring(0, 10)}
          </span>
        )}
      </div>

      <div className="cart-items-list">
        {cart.items.length === 0 ? (
          <div className="cart-empty-state">
            <div className="cart-empty-icon">
              <ShoppingBag size={28} />
            </div>
            <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
              Your cart is empty
            </h4>
            <p style={{ fontSize: 12, lineHeight: 1.5 }}>
              Ask the AI shopping assistant for recommendations, then click <strong>Add to Cart</strong>.
            </p>
          </div>
        ) : (
          cart.items.map((item) => (
            <CartItem
              key={item.cart_item_id || item.product_id}
              item={item}
              onViewDetails={
                item.product && onViewProductDetails
                  ? () => onViewProductDetails(item.product!)
                  : undefined
              }
            />
          ))
        )}
      </div>

      {cart.items.length > 0 && (
        <div className="cart-footer">
          <div className="cart-summary-row">
            <span>Total Items</span>
            <span>{totalItems} units</span>
          </div>

          <div className="cart-summary-row total-row">
            <span>Backend Total</span>
            <span style={{ color: 'var(--color-primary)' }}>
              {formatINR(cart.total_amount)}
            </span>
          </div>

          <div className="approval-notice">
            <ShieldCheck size={14} color="var(--color-success)" style={{ flexShrink: 0 }} />
            <span>AI cannot buy automatically. Buyer approval required.</span>
          </div>

          <button
            className="btn-approve-cta"
            onClick={onInitiateApproval}
            disabled={isApprovalLoading || cart.items.length === 0}
            title="Explicitly approve purchase summary before payment"
          >
            <CheckCircle size={17} />
            {isApprovalLoading ? 'Verifying Cart...' : 'Review & Approve Purchase'}
            <ArrowRight size={15} />
          </button>
        </div>
      )}
    </aside>
  );
};
