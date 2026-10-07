import React from 'react';
import { Product } from '../../types';
import { ShoppingCart, ExternalLink, Tag, Layers, CheckCircle2, ShieldCheck } from 'lucide-react';

interface ProductDetailsProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  isAddingToCart?: boolean;
}

export const ProductDetails: React.FC<ProductDetailsProps> = ({
  product,
  onAddToCart,
  isAddingToCart = false,
}) => {
  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const defaultImage =
    product.image ||
    'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=800&q=80';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <div
          style={{
            flex: '1 1 240px',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            backgroundColor: '#f1f5f9',
            maxHeight: 260,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={defaultImage}
            alt={product.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            referrerPolicy="no-referrer"
          />
        </div>

        <div style={{ flex: '2 1 280px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {product.brand && (
              <span className="product-brand-tag" style={{ fontSize: 12 }}>
                {product.brand}
              </span>
            )}
            {product.category && (
              <span
                style={{
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Layers size={13} /> {product.category}
              </span>
            )}
          </div>

          <h3 style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.3 }}>{product.name}</h3>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
              {formatINR(product.sale_price)}
            </span>
            {product.market_price && product.market_price > product.sale_price && (
              <span style={{ fontSize: 14, color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                {formatINR(product.market_price)}
              </span>
            )}
            {product.discount && (
              <span className="price-discount-pill">
                <Tag size={11} style={{ display: 'inline', marginRight: 2 }} />
                {typeof product.discount === 'number' ? `${product.discount}% OFF` : product.discount}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 13 }}>
            <span style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
              <CheckCircle2 size={14} />
              {product.stock ? `${product.stock} units available` : 'In stock & verified'}
            </span>
            <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <ShieldCheck size={14} /> Official Brand Warranty
            </span>
          </div>

          {product.product_link && (
            <a
              href={product.product_link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 12,
                color: 'var(--color-primary)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontWeight: 600,
                marginTop: 4,
              }}
            >
              Manufacturer Product Page <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>

      {product.overview && (
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>
            Overview
          </h4>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {product.overview}
          </p>
        </div>
      )}

      {product.specifications && (
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
            Technical Specifications
          </h4>

          {typeof product.specifications === 'object' ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 8,
                backgroundColor: 'var(--bg-surface-subtle)',
                padding: 12,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
              }}
            >
              {Object.entries(product.specifications).map(([key, value]) => (
                <div key={key} style={{ fontSize: 12 }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{key}: </span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{value}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{product.specifications}</p>
          )}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
        <button
          className="btn-card-primary"
          style={{ padding: '10px 20px', fontSize: 14 }}
          onClick={() => onAddToCart(product)}
          disabled={isAddingToCart}
        >
          <ShoppingCart size={16} />
          {isAddingToCart ? 'Adding to Cart...' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
};
