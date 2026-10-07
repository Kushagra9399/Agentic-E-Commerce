import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Product, UpsellData } from '../types';
import * as api from '../services/api';
import { useCommerceContext } from '../context/CommerceContext';
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Tag,
  Layers,
  ArrowUpRight,
  AlertTriangle,
} from 'lucide-react';

export const UpgradePage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { addToCart, addingProductId } = useCommerceContext();

  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [upsell, setUpsell] = useState<UpsellData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!productId) return;
    setIsLoading(true);

    Promise.all([api.getProduct(productId), api.getUpsell(productId)])
      .then(([prod, upsellData]) => {
        setCurrentProduct(prod);
        setUpsell(upsellData);
      })
      .catch((err) => {
        console.error('Error fetching upsell data:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [productId]);

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleChooseUpgrade = async () => {
    if (!upsell?.upgrade) return;
    const upgradeProduct: Product = {
      id: upsell.upgrade.id,
      name: upsell.upgrade.name,
      sale_price: upsell.upgrade.price,
      image: upsell.upgrade.image,
      overview: upsell.upgrade.reason,
      specifications: upsell.upgrade.specifications,
    };
    await addToCart(upgradeProduct);
    navigate('/cart');
  };

  const handleKeepCurrent = async () => {
    if (currentProduct) {
      await addToCart(currentProduct);
    }
    navigate('/cart');
  };

  if (isLoading) {
    return (
      <div className="page-container" style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 16, color: 'var(--text-secondary)' }}>
          Evaluating smart upgrades and technical comparisons...
        </div>
      </div>
    );
  }

  if (!upsell?.available || !upsell.upgrade || !currentProduct) {
    return (
      <div className="page-container" style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
        <h2>No Upgrade Available</h2>
        <p style={{ color: 'var(--text-secondary)', margin: '16px 0' }}>
          There is no direct higher-tier recommendation available for this item.
        </p>
        <button onClick={() => navigate(-1)} className="btn-card-primary" style={{ display: 'inline-flex', gap: 6 }}>
          <ArrowLeft size={16} /> Return to Product Details
        </button>
      </div>
    );
  }

  const additionalCost = upsell.additional_cost || upsell.upgrade.price - currentProduct.sale_price;

  return (
    <div className="page-container" style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 20px' }}>
      {/* Top Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button
          onClick={() => navigate(-1)}
          className="btn-card-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <ArrowLeft size={15} /> Back to Product
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
          <ShieldCheck size={14} color="var(--color-success)" />
          <span>Explainable AI Recommendation</span>
        </div>
      </div>

      {/* Header Banner */}
      <div
        style={{
          backgroundColor: '#fffdf5',
          border: '1px solid var(--color-warning-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px 28px',
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            fontWeight: 700,
            color: '#92400e',
            backgroundColor: '#fef3c7',
            padding: '3px 10px',
            borderRadius: 4,
            marginBottom: 10,
          }}
        >
          <Sparkles size={14} /> Smart Upgrade Comparison Engine
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
          Should you upgrade to the {upsell.upgrade.name}?
        </h1>

        <p style={{ fontSize: 14, color: '#78350f', lineHeight: 1.5 }}>
          <strong>Why this recommendation: </strong>
          {upsell.upgrade.reason ||
            `For an additional ${formatINR(additionalCost)}, you gain higher refresh rates, enhanced color processing, and Dolby audio.`}
        </p>
      </div>

      {/* Side by Side Comparison Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 24,
          marginBottom: 28,
        }}
      >
        {/* Current Selection */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              Current Selection
            </div>

            {currentProduct.image && (
              <img
                src={currentProduct.image}
                alt={currentProduct.name}
                style={{
                  width: '100%',
                  height: 180,
                  objectFit: 'cover',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: 14,
                  backgroundColor: '#f1f5f9',
                }}
                referrerPolicy="no-referrer"
              />
            )}

            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              {currentProduct.name}
            </h3>

            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 14 }}>
              {formatINR(currentProduct.sale_price)}
            </div>

            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
              {currentProduct.overview || 'Standard high quality model.'}
            </div>

            {currentProduct.specifications && typeof currentProduct.specifications === 'object' && (
              <div
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  padding: 12,
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                {Object.entries(currentProduct.specifications)
                  .slice(0, 4)
                  .map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{k}:</span>
                      <span style={{ fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: 20 }}>
            <button
              className="btn-card-secondary"
              style={{ width: '100%', padding: '12px', fontSize: 14, justifyContent: 'center' }}
              onClick={handleKeepCurrent}
              disabled={addingProductId === currentProduct.id}
            >
              Keep Current Selection ({formatINR(currentProduct.sale_price)})
            </button>
          </div>
        </div>

        {/* Recommended Upgrade */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '2px solid var(--color-warning)',
            borderRadius: 'var(--radius-lg)',
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            boxShadow: '0 4px 16px rgba(245, 158, 11, 0.15)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -12,
              right: 20,
              backgroundColor: 'var(--color-warning)',
              color: '#ffffff',
              fontSize: 11,
              fontWeight: 800,
              padding: '3px 12px',
              borderRadius: 'var(--radius-full)',
              letterSpacing: '0.04em',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Sparkles size={12} /> RECOMMENDED UPGRADE
          </div>

          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--color-warning)',
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              Smart Step-Up
            </div>

            {upsell.upgrade.image && (
              <img
                src={upsell.upgrade.image}
                alt={upsell.upgrade.name}
                style={{
                  width: '100%',
                  height: 180,
                  objectFit: 'cover',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: 14,
                  backgroundColor: '#f1f5f9',
                }}
                referrerPolicy="no-referrer"
              />
            )}

            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              {upsell.upgrade.name}
            </h3>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-primary)' }}>
                {formatINR(upsell.upgrade.price)}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--color-warning)',
                  backgroundColor: '#fef3c7',
                  padding: '2px 8px',
                  borderRadius: 4,
                }}
              >
                +{formatINR(additionalCost)} more
              </span>
            </div>

            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
              {upsell.upgrade.reason}
            </div>

            {upsell.upgrade.specifications && typeof upsell.upgrade.specifications === 'object' && (
              <div
                style={{
                  backgroundColor: '#fffdf5',
                  border: '1px solid #fde68a',
                  padding: 12,
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                {Object.entries(upsell.upgrade.specifications)
                  .slice(0, 4)
                  .map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#92400e' }}>{k}:</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{v}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: 20 }}>
            <button
              className="btn-card-primary"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: 14,
                fontWeight: 700,
                justifyContent: 'center',
                backgroundColor: 'var(--color-warning)',
                borderColor: 'var(--color-warning)',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
              }}
              onClick={handleChooseUpgrade}
              disabled={addingProductId === upsell.upgrade.id}
            >
              <ArrowUpRight size={16} />
              Choose Upgrade ({formatINR(upsell.upgrade.price)})
            </button>
          </div>
        </div>
      </div>

      {/* Security & Explicit Approval Banner */}
      <div
        style={{
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: 'var(--radius-md)',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontSize: 13,
          color: '#1e40af',
        }}
      >
        <ShieldCheck size={20} style={{ flexShrink: 0 }} />
        <span>
          <strong>Bounded Commerce Policy:</strong> AI recommendations are strictly non-binding proposals.
          Selecting an upgrade updates your cart but <em>never</em> self-authorizes charges. You will explicitly
          approve all items on the checkout page.
        </span>
      </div>
    </div>
  );
};
