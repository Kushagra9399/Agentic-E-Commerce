import React from 'react';
import { Product } from '../../types';
import { ShoppingCart, Eye, CheckCircle2, AlertCircle } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onViewDetails: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  isAddingToCart?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onViewDetails,
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
    'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=400&q=80';

  return (
    <div className="product-card">
      <div className="product-thumb-container">
        <img
          src={defaultImage}
          alt={product.name}
          className="product-thumb"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </div>

      <div className="product-info-col">
        <div>
          <div className="product-meta-header">
            {product.brand && <span className="product-brand-tag">{product.brand}</span>}
            {product.stock !== undefined && (
              <span className="product-stock-tag">
                {product.stock > 0 ? (
                  <>
                    <CheckCircle2 size={12} /> {product.stock} in stock
                  </>
                ) : (
                  <>
                    <AlertCircle size={12} color="var(--color-danger)" /> Out of stock
                  </>
                )}
              </span>
            )}
          </div>

          <h4 className="product-title-text" title={product.name}>
            {product.name}
          </h4>

          <div className="product-pricing-row">
            <span className="price-current">{formatINR(product.sale_price)}</span>
            {product.market_price && product.market_price > product.sale_price && (
              <span className="price-original">{formatINR(product.market_price)}</span>
            )}
            {product.discount && (
              <span className="price-discount-pill">
                {typeof product.discount === 'number'
                  ? `${product.discount}% OFF`
                  : product.discount}
              </span>
            )}
          </div>
        </div>

        <div className="product-card-actions">
          <button
            className="btn-card-secondary"
            onClick={() => onViewDetails(product)}
            title="View full specifications and overview"
          >
            <Eye size={13} style={{ marginRight: 4 }} />
            View Details
          </button>

          <button
            className="btn-card-primary"
            onClick={() => onAddToCart(product)}
            disabled={isAddingToCart || (product.stock !== undefined && product.stock <= 0)}
            title="Add item to your active shopping cart"
          >
            <ShoppingCart size={13} />
            {isAddingToCart ? 'Adding...' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  );
};
