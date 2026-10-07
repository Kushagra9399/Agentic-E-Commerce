import React from 'react';
import { CartItem as CartItemType } from '../../types';
import { Package } from 'lucide-react';

interface CartItemProps {
  item: CartItemType;
  onViewDetails?: () => void;
}

export const CartItem: React.FC<CartItemProps> = ({ item, onViewDetails }) => {
  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const name = item.product?.name || `Product ID: ${item.product_id}`;
  const unitPrice = item.unit_price || item.product?.sale_price || 0;
  const totalPrice = unitPrice * item.quantity;
  const image = item.product?.image;

  return (
    <div className="cart-item-card">
      <div className="cart-item-header">
        <div style={{ display: 'flex', gap: 10, flex: 1, minWidth: 0 }}>
          {image ? (
            <img
              src={image}
              alt={name}
              style={{
                width: 44,
                height: 44,
                objectFit: 'cover',
                borderRadius: 4,
                backgroundColor: '#f1f5f9',
                flexShrink: 0,
              }}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 4,
                backgroundColor: 'var(--bg-surface-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                flexShrink: 0,
              }}
            >
              <Package size={20} />
            </div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <h5
              className="cart-item-name"
              title={name}
              style={{ cursor: onViewDetails ? 'pointer' : 'default' }}
              onClick={onViewDetails}
            >
              {name}
            </h5>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {formatINR(unitPrice)} each
            </div>
          </div>
        </div>
      </div>

      <div className="cart-item-footer">
        <span className="cart-item-qty">Qty: {item.quantity}</span>
        <span className="cart-item-price">{formatINR(totalPrice)}</span>
      </div>
    </div>
  );
};
