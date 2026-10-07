import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { PaymentCreateResponse, PaymentVerifyResponse } from '../types';
import * as api from '../services/api';
import { useCommerceContext } from '../context/CommerceContext';
import { PaymentButton } from '../components/checkout/PaymentButton';
import {
  CreditCard,
  ArrowLeft,
  Lock,
  RefreshCw,
} from 'lucide-react';

export const PaymentPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { addAuditLog, setOrderId, updateOrderStatus } = useCommerceContext();

  const [paymentData, setPaymentData] = useState<PaymentCreateResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    setOrderId(orderId);
    setIsLoading(true);

    // Check if order is already paid before trying to create payment
    api
      .getOrder(orderId)
      .then((order) => {
        // If order already paid, redirect to success page
        if (order.status === 'paid' || order.payment_status === 'paid') {
          navigate(
            `/payment/${orderId}/success?payment_id=${order.payment_id || 'verified'}&amount=${order.total_amount || 0}`
          );
          return;
        }

        // Order not paid, create payment
        return api.createPayment(orderId);
      })
      .then((data) => {
        if (data) {
          setPaymentData(data);
          addAuditLog(
            'Payment Initiated',
            'Create Razorpay Order',
            'Razorpay Gateway',
            `Created Razorpay order #${data.razorpay_order_id} for amount ₹${Math.floor(data.amount) > 100000 ? (data.amount / 100).toFixed(2) : data.amount}`,
            'in_progress'
          );
        }
      })
      .catch((err) => {
        console.error('Error creating payment:', err);
        setErrorMsg('Failed to initiate payment gateway order.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [orderId, addAuditLog, setOrderId, navigate]);

  const handlePaymentSuccess = (verifiedData: PaymentVerifyResponse) => {
    if (!orderId) return;

    const confirmedPaymentId =
      verifiedData.payment_id || verifiedData.razorpay_payment_id || `pay_${Date.now()}`;

    updateOrderStatus(orderId, 'paid', confirmedPaymentId);

    addAuditLog(
      'Payment Verified',
      'Backend Signature Cryptographic Validation',
      'Backend System',
      `Verified payment #${confirmedPaymentId}. Order status updated to PAID.`,
      'completed'
    );

    navigate(
      `/payment/${orderId}/success?payment_id=${encodeURIComponent(
        confirmedPaymentId
      )}&amount=${paymentData?.amount || 0}`
    );
  };

  const handlePaymentFailure = (reason?: string) => {
    const errorText = reason || 'Payment transaction failed or was declined.';
    if (orderId) {
      addAuditLog(
        'Payment Failed',
        'Gateway transaction declined',
        'Razorpay Gateway',
        errorText,
        'failed'
      );
      navigate(
        `/payment/${orderId}/failed?error=${encodeURIComponent(errorText)}&amount=${paymentData?.amount || 0}`
      );
    }
  };

  const handleCancel = () => {
    navigate('/cart');
  };

  const handleRetry = () => {
    if (!orderId) return;
    setIsLoading(true);
    api
      .createPayment(orderId)
      .then((data) => {
        setPaymentData(data);
      })
      .catch((err) => {
        console.error('Error on retry payment:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  if (isLoading) {
    return (
      <div className="page-container" style={{ maxWidth: 700, margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
        <RefreshCw size={28} className="spin" style={{ color: 'var(--color-primary)', margin: '0 auto 12px' }} />
        <div style={{ fontSize: 16, color: 'var(--text-secondary)' }}>
          Generating secure Razorpay payment gateway credentials...
        </div>
      </div>
    );
  }

  if (!paymentData || errorMsg) {
    return (
      <div className="page-container" style={{ maxWidth: 700, margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
        <h2>Payment Initialization Failed</h2>
        <p style={{ color: 'var(--text-secondary)', margin: '16px 0' }}>
          {errorMsg || `Could not initialize payment for order #${orderId}.`}
        </p>
        <Link to="/cart" className="btn-card-primary" style={{ display: 'inline-flex', gap: 6 }}>
          <ArrowLeft size={16} /> Return to Cart
        </Link>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: 640, margin: '0 auto', padding: '28px 20px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button
          onClick={handleCancel}
          className="btn-card-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
        >
          <ArrowLeft size={15} /> Back to Cart
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-primary)', fontWeight: 600 }}>
          <Lock size={15} /> 256-Bit SSL Razorpay Gateway
        </div>
      </div>

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
            <CreditCard size={22} color="var(--color-primary)" />
            Secure Payment Gateway
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Order approved. Complete payment to finalize fulfillment.
          </p>
        </div>

        <PaymentButton
          paymentData={paymentData}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentFailure={handlePaymentFailure}
          onCancel={handleCancel}
          onRetry={handleRetry}
        />
      </div>
    </div>
  );
};
