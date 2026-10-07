import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Product, CrossSellResponse, UpsellData } from '../types';
import * as api from '../services/api';
import { useCommerceContext } from '../context/CommerceContext';
import { ProductDetails } from '../components/product/ProductDetails';
import { CrossSellCard } from '../components/recommendation/CrossSellCard';
import {
  ArrowLeft,
  Sparkles,
  ShoppingBag,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';

export const ProductDetailsPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { addToCart, addingProductId, cart } = useCommerceContext();

  const [product, setProduct] = useState<Product | null>(null);
  const [crossSell, setCrossSell] = useState<Product[]>([]);
  const [upsell, setUpsell] = useState<UpsellData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [addedNotification, setAddedNotification] = useState(false);

  useEffect(() => {
    if (!productId) return;
    setIsLoading(true);
    setCrossSell([]);
    setUpsell(null);

    Promise.all([
      api.getProduct(productId),
      api.getRecommendations(productId),
      api.getUpsell(productId),
    ])
      .then(([prodData, recData, upsellData]) => {
        setProduct(prodData);
        if (recData && recData.products) {
          setCrossSell(recData.products);
        }
        if (upsellData && upsellData.available) {
          setUpsell(upsellData);
        }
      })
      .catch((err) => {
        console.error('Error fetching product details:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [productId]);

  const handleAddToCart = async (p: Product) => {
    await addToCart(p);
    setAddedNotification(true);
    setTimeout(() => setAddedNotification(false), 3000);
  };

  const handleViewOtherProduct = (otherProd: Product) => {
    navigate(`/products/${otherProd.id}`);
  };

  if (isLoading) {
    return (
      <div className="page-container" style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 16, color: 'var(--text-secondary)' }}>Loading product specifications and verified details...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="page-container" style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
        <h2>Product Not Found</h2>
        <p style={{ color: 'var(--text-secondary)', margin: '16px 0' }}>
          Could not find the requested product with ID: <code>{productId}</code>
        </p>
        <Link to="/chat" className="btn-card-primary" style={{ display: 'inline-flex' }}>
          <ArrowLeft size={16} /> Return to AI Assistant
        </Link>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px' }}>
      {/* Breadcrumb Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button
          onClick={() => navigate(-1)}
          className="btn-card-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <ArrowLeft size={15} /> Back
        </button>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {upsell?.available && (
            <Link
              to={`/products/${product.id}/upgrade`}
              className="btn-card-secondary"
              style={{
                backgroundColor: '#fffbeb',
                borderColor: '#fde68a',
                color: '#92400e',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 600,
                fontSize: 13,
                textDecoration: 'none',
              }}
            >
              <Sparkles size={14} color="#d97706" />
              Smart Upgrade Available (+₹{upsell.additional_cost || 5000})
            </Link>
          )}

          <Link
            to="/cart"
            className="btn-card-primary"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <ShoppingBag size={15} />
            Go to Cart ({cart.items.length})
          </Link>
        </div>
      </div>

      {addedNotification && (
        <div
          style={{
            backgroundColor: 'var(--color-success-bg)',
            border: '1px solid var(--color-success-border)',
            color: 'var(--color-success)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          <CheckCircle size={18} />
          Successfully added "{product.name}" to your active cart!
        </div>
      )}

      {/* Main Product Card */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)',
          padding: 24,
          marginBottom: 32,
        }}
      >
        <ProductDetails
          product={product}
          onAddToCart={handleAddToCart}
          isAddingToCart={addingProductId === product.id}
        />
      </div>

      {/* Upsell Callout Banner if available */}
      {upsell?.available && (
        <div
          style={{
            backgroundColor: '#fffdf5',
            border: '1px solid var(--color-warning-border)',
            borderRadius: 'var(--radius-lg)',
            padding: 20,
            marginBottom: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 700,
                color: '#92400e',
                backgroundColor: '#fef3c7',
                padding: '2px 8px',
                borderRadius: 4,
                marginBottom: 6,
              }}
            >
              <Sparkles size={13} />
              Recommended Upsell Match
            </div>
            <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              Compare with {upsell.upgrade?.name}
            </h4>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {upsell.upgrade?.reason ||
                `A higher-tier option for +₹${upsell.additional_cost || 0} more.`}
            </p>
          </div>

          <Link
            to={`/products/${product.id}/upgrade`}
            className="btn-card-primary"
            style={{
              backgroundColor: 'var(--color-warning)',
              borderColor: 'var(--color-warning)',
              color: '#ffffff',
              padding: '10px 18px',
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <ArrowUpRight size={16} />
            Compare Upgrade Options
          </Link>
        </div>
      )}

      {/* Compatible Cross-sell Accessories */}
      {crossSell.length > 0 && (
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)',
            padding: 24,
          }}
        >
          <h3
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <ShoppingBag size={18} color="var(--color-primary)" />
            Frequently Bought Together & Compatible Accessories
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            The AI Agent identified these compatible accessories to complete your audio-visual setup.
          </p>

          <CrossSellCard
            products={crossSell}
            onAddToCart={handleAddToCart}
            onViewProduct={handleViewOtherProduct}
            addingProductId={addingProductId}
          />
        </div>
      )}
    </div>
  );
};
