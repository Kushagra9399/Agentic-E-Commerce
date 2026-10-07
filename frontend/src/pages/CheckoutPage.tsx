import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCommerceContext } from '../context/CommerceContext';
import { PurchaseApproval } from '../components/checkout/PurchaseApproval';
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  ShoppingBag,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export const CheckoutPage: React.FC = () => {
  const { cart, approvePurchase } = useCommerceContext();
  const navigate = useNavigate();
  const [isApproving, setIsApproving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (cart.items.length === 0) {
    return (
      <div className="page-container" style={{ maxWidth: 700, margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
        <h2>No Items to Checkout</h2>
        <p style={{ color: 'var(--text-secondary)', margin: '16px 0' }}>
          Your shopping cart is currently empty. Please add items before proceeding to purchase approval.
        </p>
        <Link to="/chat" className="btn-card-primary" style={{ display: 'inline-flex', gap: 6 }}>
          <ShoppingBag size={16} /> Return to AI Assistant
        </Link>
      </div>
    );
  }

  const handleApprove = async () => {
    setIsApproving(true);
    setErrorMsg(null);

    try {
      const order = await approvePurchase();
      if (order && order.order_id) {
        navigate(`/payment/${order.order_id}`);
      } else {
        setErrorMsg('Order creation returned an invalid response. Please try again.');
      }
    } catch (err: any) {
      console.error('Approval failed:', err);
      setErrorMsg(err.message || 'Failed to approve cart and lock order.');
    } finally {
      setIsApproving(false);
    }
  };

  const handleCancel = () => {
    navigate('/cart');
  };

  return (
    <div className="page-container" style={{ maxWidth: 850, margin: '0 auto', padding: '28px 20px' }}>
      {/* Top Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button
          onClick={() => navigate('/cart')}
          className="btn-card-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <ArrowLeft size={15} /> Back to Cart
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-success)', fontWeight: 600 }}>
          <ShieldCheck size={16} /> Security Checkpoint 1 of 2: Buyer Authorization
        </div>
      </div>

      {errorMsg && (
        <div
          style={{
            backgroundColor: 'var(--color-danger-bg)',
            border: '1px solid var(--color-danger-border)',
            color: 'var(--color-danger)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <AlertTriangle size={16} />
          {errorMsg}
        </div>
      )}

      {/* Main Review & Approval Card */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-md)',
          padding: 28,
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Lock size={22} color="var(--color-primary)" />
            Review & Approve Purchase
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Please verify the item quantities, unit prices, and final calculated total. As an autonomous agent,
            the AI is prohibited from self-approving purchases on your behalf.
          </p>
        </div>

        <PurchaseApproval
          cart={cart}
          onApprove={handleApprove}
          onCancel={handleCancel}
          isLoading={isApproving}
        />
      </div>
    </div>
  );
};
