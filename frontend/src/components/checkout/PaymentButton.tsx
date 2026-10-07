import React, { useState } from 'react';
import { PaymentCreateResponse, PaymentVerifyResponse } from '../../types';
import { loadRazorpayScript, verifyPayment } from '../../services/paymentApi';
import {
  CreditCard,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  XCircle,
  Lock,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';

export type PaymentUIState =
  | 'idle'
  | 'creating_payment'
  | 'payment_open'
  | 'verifying'
  | 'success'
  | 'failed'
  | 'cancelled';

interface PaymentButtonProps {
  paymentData: PaymentCreateResponse;
  onPaymentSuccess?: (verifiedData: PaymentVerifyResponse) => void;
  onPaymentFailure?: (errorMessage?: string) => void;
  onCancel?: () => void;
  onRetry?: () => void;
}

export const PaymentButton: React.FC<PaymentButtonProps> = ({
  paymentData,
  onPaymentSuccess,
  onPaymentFailure,
  onCancel,
  onRetry,
}) => {
  const [state, setState] = useState<PaymentUIState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verifiedInfo, setVerifiedInfo] = useState<PaymentVerifyResponse | null>(null);

  const formatINR = (val: number) => {
    // Ensure proper conversion: if value looks like paise (> 100000), divide by 100
    // Paise is always an integer, so if it's > 100000 and integer, it's likely paise
    let displayAmount = val;
    if (typeof val === 'number' && val > 100000) {
      displayAmount = val / 100;
    }
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: paymentData.currency || 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(displayAmount);
  };

  /**
   * Primary Action: Click "Pay Now"
   * Loads Razorpay script, configures checkout options, opens gateway, and verifies with backend.
   */
  const handlePayNow = async () => {
    // Rule 7: Prevent double-clicking / duplicate payment attempts
    if (state === 'creating_payment' || state === 'payment_open' || state === 'verifying') {
      return;
    }

    setState('creating_payment');
    setErrorMessage(null);

    try {
      // Step 1: Ensure Razorpay Checkout script is loaded
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded || typeof (window as any).Razorpay === 'undefined') {
        throw new Error('Could not load Razorpay Checkout SDK. Please check your network connection.');
      }

      const keyId = paymentData.key_id || paymentData.razorpay_key_id || 'rzp_test_demokey123456';
      const orderId = paymentData.razorpay_order_id;

      // Ensure amount in paise for Razorpay
      const rzpAmount =
        paymentData.amount < 10000 ? Math.round(paymentData.amount * 100) : paymentData.amount;

      // Step 2: Build Razorpay Checkout Options
      const options = {
        key: keyId,
        amount: rzpAmount,
        currency: paymentData.currency || 'INR',
        name: 'AI Commerce',
        description: `Order #${paymentData.order_id}`,
        order_id: orderId,
        handler: async function (response: any) {
          // Step 4 & 5: Payment captured by Razorpay -> Must verify with backend
          setState('verifying');

          try {
            const verifyPayload = {
              razorpay_order_id: response.razorpay_order_id || orderId,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              order_id: paymentData.order_id,
            };

            const verificationResult = await verifyPayment(paymentData.order_id, verifyPayload);

            // Step 6 & 7: Check backend signature verification
            if (
              verificationResult.status === 'paid' ||
              verificationResult.status === 'success' ||
              verificationResult.verified === true
            ) {
              setState('success');
              setVerifiedInfo(verificationResult);
              if (onPaymentSuccess) {
                onPaymentSuccess(verificationResult);
              }
            } else {
              setState('failed');
              const failureMsg =
                verificationResult.message || 'Payment signature verification failed on backend.';
              setErrorMessage(failureMsg);
              if (onPaymentFailure) {
                onPaymentFailure(failureMsg);
              }
            }
          } catch (err: any) {
            setState('failed');
            const failureMsg = err.message || 'Backend verification endpoint returned an error.';
            setErrorMessage(failureMsg);
            if (onPaymentFailure) {
              onPaymentFailure(failureMsg);
            }
          }
        },
        modal: {
          ondismiss: function () {
            // Step 8: User cancelled checkout modal
            setState('cancelled');
            setErrorMessage('Payment was cancelled before completion. No funds were debited.');
          },
        },
        prefill: {
          name: 'Demo Buyer',
          email: 'buyer@example.com',
          contact: '9999999999',
        },
        theme: {
          color: '#2563eb',
        },
      };

      // Step 3: Open Razorpay Checkout Modal
      setState('payment_open');
      const rzpInstance = new (window as any).Razorpay(options);

      // Step 9: Handle Razorpay Error Events
      rzpInstance.on('payment.failed', function (resp: any) {
        setState('failed');
        const reason =
          resp.error?.description || resp.error?.reason || 'Transaction declined by issuing bank.';
        setErrorMessage(reason);
        if (onPaymentFailure) {
          onPaymentFailure(reason);
        }
      });

      rzpInstance.open();
    } catch (err: any) {
      console.error('Razorpay initialization error:', err);
      setState('failed');
      const msg = err.message || 'Unable to open Razorpay payment gateway.';
      setErrorMessage(msg);
      if (onPaymentFailure) {
        onPaymentFailure(msg);
      }
    }
  };

  /**
   * Helper to perform verification for simulated hackathon test runs
   */
  const handleSimulatePayment = async (simulateSuccess: boolean) => {
    if (state === 'verifying') return;

    if (!simulateSuccess) {
      setState('failed');
      const msg = 'Simulated Card Decline: Transaction failed due to test bank decline.';
      setErrorMessage(msg);
      if (onPaymentFailure) {
        onPaymentFailure(msg);
      }
      return;
    }

    setState('verifying');
    try {
      const mockPayload = {
        razorpay_order_id: paymentData.razorpay_order_id,
        razorpay_payment_id: `pay_sim_${Math.random().toString(36).substring(2, 9)}`,
        razorpay_signature: `sig_sim_${Math.random().toString(36).substring(2, 9)}`,
        order_id: paymentData.order_id,
      };

      const verificationResult = await verifyPayment(paymentData.order_id, mockPayload);
      if (
        verificationResult.status === 'paid' ||
        verificationResult.status === 'success' ||
        verificationResult.verified !== false
      ) {
        setState('success');
        setVerifiedInfo(verificationResult);
        if (onPaymentSuccess) {
          onPaymentSuccess(verificationResult);
        }
      } else {
        setState('failed');
        setErrorMessage(verificationResult.message || 'Verification failed on backend.');
      }
    } catch (err: any) {
      setState('failed');
      setErrorMessage(err.message || 'Backend verification error.');
    }
  };

  // ----------------------------------------------------
  // UI State: Creating Payment
  // ----------------------------------------------------
  if (state === 'creating_payment') {
    return (
      <div
        style={{
          padding: '32px 20px',
          textAlign: 'center',
          backgroundColor: 'var(--bg-surface-subtle)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
        }}
      >
        <RefreshCw size={28} className="spin" style={{ color: 'var(--color-primary)', margin: '0 auto 12px' }} />
        <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
          Preparing Secure Payment...
        </h4>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Loading Razorpay Checkout gateway credentials for Order #{paymentData.order_id}.
        </p>
      </div>
    );
  }

  // ----------------------------------------------------
  // UI State: Payment Open (Razorpay Window Active)
  // ----------------------------------------------------
  if (state === 'payment_open') {
    return (
      <div
        style={{
          padding: '28px 20px',
          textAlign: 'center',
          backgroundColor: '#eff6ff',
          borderRadius: 'var(--radius-md)',
          border: '1px solid #bfdbfe',
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            backgroundColor: '#dbeafe',
            color: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
          }}
        >
          <CreditCard size={22} />
        </div>
        <h4 style={{ fontSize: 16, fontWeight: 700, color: '#1e40af', marginBottom: 4 }}>
          Razorpay Checkout Open
        </h4>
        <p style={{ fontSize: 13, color: '#3b82f6', marginBottom: 16 }}>
          Please complete your transaction in the Razorpay popup window.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            className="btn-card-secondary"
            style={{ fontSize: 12, padding: '6px 14px' }}
            onClick={() => {
              setState('cancelled');
              setErrorMessage('Payment cancelled by user.');
            }}
          >
            Cancel Payment
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // UI State: Verifying Signature on Backend
  // ----------------------------------------------------
  if (state === 'verifying') {
    return (
      <div
        style={{
          padding: '32px 20px',
          textAlign: 'center',
          backgroundColor: '#eff6ff',
          borderRadius: 'var(--radius-md)',
          border: '1px solid #bfdbfe',
        }}
      >
        <RefreshCw size={32} className="spin" style={{ color: 'var(--color-primary)', margin: '0 auto 14px' }} />
        <h4 style={{ fontSize: 17, fontWeight: 800, color: '#1e40af', marginBottom: 6 }}>
          Verifying your payment...
        </h4>
        <p style={{ fontSize: 13, color: '#3b82f6', maxWidth: 460, margin: '0 auto' }}>
          The backend server is securely validating the cryptographic Razorpay signature before confirming your
          order fulfillment.
        </p>
      </div>
    );
  }

  // ----------------------------------------------------
  // UI State: Success (Verified by Backend)
  // ----------------------------------------------------
  if (state === 'success') {
    return (
      <div
        style={{
          padding: '28px 24px',
          textAlign: 'center',
          backgroundColor: 'var(--color-success-bg)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-success-border)',
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            backgroundColor: '#d1fae5',
            color: 'var(--color-success)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
          }}
        >
          <CheckCircle size={28} />
        </div>

        <h3 style={{ fontSize: 19, fontWeight: 800, color: 'var(--color-success)', marginBottom: 6 }}>
          Payment Successful
        </h3>

        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
          Your payment has been successfully verified and confirmed by the backend.
        </p>

        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
            padding: 14,
            textAlign: 'left',
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: 'var(--text-muted)' }}>Order ID:</span>
            <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{paymentData.order_id}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: 'var(--text-muted)' }}>Payment ID:</span>
            <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>
              {verifiedInfo?.payment_id || verifiedInfo?.razorpay_payment_id || 'Captured'}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingTop: 6,
              borderTop: '1px dashed var(--border-color)',
              fontWeight: 700,
            }}
          >
            <span>Amount Paid:</span>
            <span style={{ color: 'var(--color-primary)' }}>{formatINR(paymentData.amount)}</span>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // UI State: Payment Failed
  // ----------------------------------------------------
  if (state === 'failed') {
    return (
      <div
        style={{
          padding: '24px',
          textAlign: 'center',
          backgroundColor: 'var(--color-danger-bg)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-danger-border)',
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            backgroundColor: '#fee2e2',
            color: 'var(--color-danger)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 10px',
          }}
        >
          <XCircle size={26} />
        </div>

        <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-danger)', marginBottom: 4 }}>
          Payment Failed
        </h3>

        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
          {errorMessage || 'Your payment could not be completed.'}
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            className="btn-card-primary"
            style={{ fontSize: 13, padding: '8px 18px' }}
            onClick={() => {
              setState('idle');
              if (onRetry) onRetry();
            }}
          >
            <RefreshCw size={14} /> Retry Payment
          </button>

          <button
            className="btn-card-secondary"
            style={{ fontSize: 13, padding: '8px 16px' }}
            onClick={onCancel}
          >
            Cancel Order
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // UI State: Cancelled
  // ----------------------------------------------------
  if (state === 'cancelled') {
    return (
      <div
        style={{
          padding: '24px',
          textAlign: 'center',
          backgroundColor: '#fefce8',
          borderRadius: 'var(--radius-md)',
          border: '1px solid #fef08a',
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            backgroundColor: '#fef9c3',
            color: '#ca8a04',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 10px',
          }}
        >
          <AlertTriangle size={24} />
        </div>

        <h3 style={{ fontSize: 18, fontWeight: 800, color: '#854d0e', marginBottom: 4 }}>
          Payment Cancelled
        </h3>

        <p style={{ fontSize: 13, color: '#713f12', marginBottom: 16 }}>
          No payment was confirmed. Your order remains approved and unpaid.
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            className="btn-card-primary"
            style={{ fontSize: 13, padding: '8px 18px' }}
            onClick={() => setState('idle')}
          >
            <RefreshCw size={14} /> Try Again
          </button>

          <button
            className="btn-card-secondary"
            style={{ fontSize: 13, padding: '8px 16px' }}
            onClick={onCancel}
          >
            Back to Cart
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // UI State: Idle (Default Before Payment)
  // ----------------------------------------------------
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Payment Summary Box */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface-subtle)',
          padding: 18,
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
          <span style={{ color: 'var(--text-muted)' }}>Order Reference:</span>
          <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{paymentData.order_id}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
          <span style={{ color: 'var(--text-muted)' }}>Razorpay Order:</span>
          <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{paymentData.razorpay_order_id}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 13 }}>
          <span style={{ color: 'var(--text-muted)' }}>Payment Methods:</span>
          <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>
            UPI, Credit/Debit Cards, NetBanking, Wallets
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            paddingTop: 10,
            borderTop: '1px dashed var(--border-color)',
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Amount to Pay
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-primary)' }}>
              {formatINR(paymentData.amount)}
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
            <ShieldCheck size={15} /> 256-Bit Encrypted
          </div>
        </div>
      </div>

      {/* Pay Now Button */}
      <button
        id="pay-now-button"
        className="btn-card-primary"
        style={{
          width: '100%',
          padding: '14px 20px',
          fontSize: 16,
          fontWeight: 700,
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
          boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
        }}
        onClick={handlePayNow}
      >
        <CreditCard size={18} />
        Pay Now
      </button>

      {/* Demo Gateway Testing Simulation Controls */}
      <div
        style={{
          marginTop: 4,
          padding: 12,
          backgroundColor: '#f8fafc',
          borderRadius: 'var(--radius-sm)',
          border: '1px dashed #cbd5e1',
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--text-muted)',
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <ShieldCheck size={13} color="var(--color-primary)" />
          TEST CONTROLS (DIRECT BACKEND VERIFICATION TRIGGER)
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="btn-card-secondary"
            style={{
              flex: 1,
              fontSize: 11,
              color: 'var(--color-success)',
              borderColor: 'var(--color-success-border)',
              backgroundColor: 'var(--color-success-bg)',
              justifyContent: 'center',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 10px',
            }}
            onClick={() => handleSimulatePayment(true)}
          >
            <CheckCircle size={12} /> Test Verification Success
          </button>

          <button
            type="button"
            className="btn-card-secondary"
            style={{
              flex: 1,
              fontSize: 11,
              color: 'var(--color-danger)',
              borderColor: 'var(--color-danger-border)',
              backgroundColor: 'var(--color-danger-bg)',
              justifyContent: 'center',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 10px',
            }}
            onClick={() => handleSimulatePayment(false)}
          >
            <AlertTriangle size={12} /> Test Failure
          </button>
        </div>
      </div>

      <button
        type="button"
        className="btn-card-secondary"
        style={{ width: '100%', padding: '9px', fontSize: 13, justifyContent: 'center' }}
        onClick={onCancel}
      >
        Back to Order Review
      </button>
    </div>
  );
};
