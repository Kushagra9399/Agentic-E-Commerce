import React from 'react';
import { Product } from '../../types';
import { Plus, CheckCircle, Info, ShoppingBag } from 'lucide-react';

interface CrossSellCardProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  onViewProduct?: (product: Product) => void;
  addingProductId?: string | null;
}

export const CrossSellCard: React.FC<CrossSellCardProps> = ({
  products,
  onAddToCart,
  onViewProduct,
  addingProductId,
}) => {
  if (!products || products.length === 0) {
    return null;
  }

  // Deduplicate by product name to avoid showing duplicates
  const uniqueProducts = (() => {
    const seen = new Set<string>();
    return products.filter((p) => {
      const n = (p.name || '').trim().toLowerCase();
      if (!n) return true;
      if (seen.has(n)) return false;
      seen.add(n);
      return true;
    });
  })();

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="recommendation-box cross-sell-box">
      <div className="explainability-badge explainability-badge-blue">
        <ShoppingBag size={13} />
        <span>Recommended Add-ons • Compatible Accessories</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          <strong>You may also like: </strong>
          These accessories are recommended because they are compatible with your current setup.
          <em> Optional — not added to your purchase until you choose.</em>
        </p>
      </div>

      <div className="cross-sell-grid">
        {uniqueProducts.map((item) => (
          <div key={item.id} className="cross-sell-mini-card">
            <div>
              {item.image && (
                <img
                  src={item.image}
                  alt={item.name}
                  className="mini-thumb"
                  referrerPolicy="no-referrer"
                />
              )}
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  lineHeight: 1.3,
                  marginBottom: 4,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
                title={item.name}
              >
                {item.name}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)' }}>
                {formatINR(item.sale_price)}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              {onViewProduct && (
                <button
                  className="btn-card-secondary"
                  style={{ padding: '4px 8px', fontSize: 11 }}
                  onClick={() => onViewProduct(item)}
                  title="View item specs"
                >
                  <Info size={11} />
                </button>
              )}

              <button
                className="btn-card-primary"
                style={{ flex: 1, padding: '5px 8px', fontSize: 11, justifyContent: 'center' }}
                onClick={() => onAddToCart(item)}
                disabled={addingProductId === item.id}
                title="Add accessory to cart"
              >
                {addingProductId === item.id ? (
                  'Adding...'
                ) : (
                  <>
                    <Plus size={12} /> Add
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
