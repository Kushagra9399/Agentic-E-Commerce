import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package,
  CheckCircle,
  Clock,
  CreditCard,
  Receipt,
  ArrowRight,
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { useCommerceContext } from '../context/CommerceContext';

export const OrdersPage: React.FC = () => {
  const { orders } = useCommerceContext();
  const navigate = useNavigate();

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              backgroundColor: 'var(--color-success-bg)',
              color: 'var(--color-success)',
              border: '1px solid var(--color-success-border)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            <CheckCircle size={13} /> PAID & VERIFIED
          </span>
        );
      case 'approved':
      case 'pending_payment':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              backgroundColor: '#eff6ff',
              color: 'var(--color-primary)',
              border: '1px solid #bfdbfe',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            <Clock size={13} /> PENDING PAYMENT
          </span>
        );
      case 'cancelled':
      case 'payment_failed':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              backgroundColor: '#fef2f2',
              color: 'var(--color-danger)',
              border: '1px solid #fecaca',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            <AlertCircle size={13} /> {status.toUpperCase()}
          </span>
        );
      default:
        return (
          <span
            style={{
              backgroundColor: '#f1f5f9',
              color: 'var(--text-secondary)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {status.toUpperCase()}
          </span>
        );
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Package size={26} color="var(--color-primary)" />
            Order History
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
            Authoritative records of locked orders, line items, and verified payment receipts
          </p>
        </div>

        <Link
          to="/chat"
          className="btn-card-primary"
          style={{
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 18px',
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          <ShoppingBag size={15} /> Shop More
        </Link>
      </div>

      {orders.length === 0 ? (
        /* Empty State */
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)',
            padding: '60px 24px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              backgroundColor: '#f1f5f9',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <Package size={32} />
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            No Orders Placed Yet
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 420, margin: '0 auto 24px' }}>
            When you approve a cart and proceed through checkout, your locked orders and transaction receipts will
            appear here.
          </p>
          <button
            onClick={() => navigate('/chat')}
            className="btn-card-primary"
            style={{
              padding: '12px 24px',
              fontSize: 14,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
            }}
          >
            <ShoppingBag size={16} /> Start Shopping with AI Assistant
          </button>
        </div>
      ) : (
        /* Orders List */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {orders.map((order) => {
            const isPaid = order.status === 'paid';
            const isPendingPayment = order.status === 'approved' || order.status === 'pending_payment';

            return (
              <div
                key={order.order_id}
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-color)',
                  boxShadow: 'var(--shadow-sm)',
                  overflow: 'hidden',
                }}
              >
                {/* Order Top Bar */}
                <div
                  style={{
                    backgroundColor: 'var(--bg-surface-subtle)',
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Order Placed
                      </span>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {order.created_at ? new Date(order.created_at).toLocaleString() : 'Recent'}
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Total Amount
                      </span>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)' }}>
                        {formatINR(order.total_amount)}
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Order ID
                      </span>
                      <div style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        #{order.order_id}
                      </div>
                    </div>
                  </div>

                  <div>{getStatusBadge(order.status)}</div>
                </div>

                {/* Order Items Body */}
                <div style={{ padding: '20px' }}>
                  {order.payment_id && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 12,
                        backgroundColor: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        color: '#15803d',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        marginBottom: 16,
                      }}
                    >
                      <ShieldCheck size={15} />
                      <span>
                        Razorpay Payment ID: <strong style={{ fontFamily: 'monospace' }}>{order.payment_id}</strong>
                      </span>
                    </div>
                  )}

                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>
                    Items in Order ({order.items?.length || 0})
                  </div>

                  {order.items && order.items.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {order.items.map((item) => (
                        <div
                          key={item.cart_item_id || item.product_id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 0',
                            borderBottom: '1px solid var(--border-color)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            {item.product?.image && (
                              <img
                                src={item.product.image}
                                alt={item.product.name}
                                style={{
                                  width: 44,
                                  height: 44,
                                  objectFit: 'cover',
                                  borderRadius: 'var(--radius-sm)',
                                  border: '1px solid var(--border-color)',
                                }}
                              />
                            )}
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                                {item.product?.name || `Product #${item.product_id}`}
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                Qty: {item.quantity} × {formatINR(item.unit_price)}
                              </div>
                            </div>
                          </div>

                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                            {formatINR(item.unit_price * item.quantity)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      Standard Cart Order (#{order.cart_id})
                    </div>
                  )}

                  {/* Actions Footer */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: 10,
                      marginTop: 16,
                      paddingTop: 12,
                    }}
                  >
                    {isPendingPayment && (
                      <button
                        onClick={() => navigate(`/payment/${order.order_id}`)}
                        className="btn-card-primary"
                        style={{
                          fontSize: 13,
                          padding: '8px 16px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          cursor: 'pointer',
                        }}
                      >
                        <CreditCard size={14} /> Complete Payment
                      </button>
                    )}

                    {isPaid && (
                      <Link
                        to={`/payment/${order.order_id}/success?payment_id=${encodeURIComponent(
                          order.payment_id || ''
                        )}&amount=${order.total_amount}`}
                        className="btn-card-secondary"
                        style={{
                          textDecoration: 'none',
                          fontSize: 13,
                          padding: '8px 16px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <Receipt size={14} /> View Receipt
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
