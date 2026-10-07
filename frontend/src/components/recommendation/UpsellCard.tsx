import React from 'react';
import { UpsellData, Product } from '../../types';
import { ArrowUpRight, Sparkles, Check, Info } from 'lucide-react';

interface UpsellCardProps {
  upsell: UpsellData;
  onSelectUpgrade: (product: Product) => void;
  onKeepCurrent?: () => void;
  onViewProduct?: (product: Product) => void;
}

export const UpsellCard: React.FC<UpsellCardProps> = ({
  upsell,
  onSelectUpgrade,
  onKeepCurrent,
  onViewProduct,
}) => {
  if (!upsell.available || !upsell.upgrade || !upsell.current_product) {
    return null;
  }

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const upgradeProduct: Product = {
    id: upsell.upgrade.id,
    name: upsell.upgrade.name,
    sale_price: upsell.upgrade.price,
    image: upsell.upgrade.image,
    overview: upsell.upgrade.reason,
    specifications: upsell.upgrade.specifications,
  };

  return (
    <div className="recommendation-box upsell-box">
      <div className="explainability-badge explainability-badge-warning">
        <Sparkles size={13} />
        <span>Smart Upgrade Available • Optional AI Suggestion</span>
      </div>

      <p style={{ fontSize: 13, color: '#78350f', marginBottom: 10, lineHeight: 1.4 }}>
        <strong>Why this upgrade? </strong>
        {upsell.upgrade.reason ||
          `This upgraded model provides superior performance and features for ${formatINR(
            upsell.additional_cost || upsell.upgrade.price - upsell.current_product.price
          )} more. It remains purely optional.`}
      </p>

      <div className="upsell-comparison-grid">
        {/* Current Product */}
        <div className="upsell-comparison-card">
          <div className="upsell-tag-label">Current Selection</div>
          <div className="upsell-item-title">{upsell.current_product.name}</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-secondary)' }}>
            {formatINR(upsell.current_product.price)}
          </div>
        </div>

        {/* Upgraded Product */}
        <div className="upsell-comparison-card highlight">
          <div
            className="upsell-tag-label"
            style={{ color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <Sparkles size={11} /> Recommended Upgrade
          </div>
          <div className="upsell-item-title">{upsell.upgrade.name}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-primary)' }}>
              {formatINR(upsell.upgrade.price)}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--color-warning)',
                backgroundColor: '#fef3c7',
                padding: '1px 6px',
                borderRadius: 4,
              }}
            >
              +
              {formatINR(
                upsell.additional_cost || upsell.upgrade.price - upsell.current_product.price
              )}{' '}
              more
            </span>
          </div>
        </div>
      </div>

      <div className="upsell-actions-row">
        <button
          className="btn-card-primary"
          style={{
            backgroundColor: 'var(--color-warning)',
            borderColor: 'var(--color-warning)',
            color: '#ffffff',
          }}
          onClick={() => onSelectUpgrade(upgradeProduct)}
          title="Add the upgraded item to your cart instead"
        >
          <ArrowUpRight size={14} />
          Choose Upgrade ({formatINR(upsell.upgrade.price)})
        </button>

        {onViewProduct && (
          <button
            className="btn-card-secondary"
            onClick={() => onViewProduct(upgradeProduct)}
            title="Inspect full upgrade specifications"
          >
            <Info size={13} style={{ marginRight: 4 }} />
            View Upgrade Specs
          </button>
        )}

        {onKeepCurrent && (
          <button
            className="btn-card-secondary"
            onClick={onKeepCurrent}
            title="Keep your current product unchanged"
          >
            <Check size={13} style={{ marginRight: 4 }} />
            Keep Current
          </button>
        )}
      </div>
    </div>
  );
};
