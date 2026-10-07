import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Bot, ShoppingBag, Activity, RefreshCw, MessageSquare, Home, Package } from 'lucide-react';
import { API_BASE_URL } from '../../config/api';
import { useCommerceContext } from '../../context/CommerceContext';

export const Header: React.FC = () => {
  const { cart, orders, sessionId, isBackendConnected, resetSession } = useCommerceContext();
  const navigate = useNavigate();

  const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  const handleReset = () => {
    if (window.confirm('Reset current shopping session and cart?')) {
      resetSession();
      navigate('/');
    }
  };

  return (
    <header className="app-header">
      <div className="brand-section">
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="brand-logo-badge">
            <Bot size={22} />
          </div>
          <div className="brand-title-group">
            <h1>AI Commerce Agent</h1>
            <p>Bounded Autonomous Shopping Assistant</p>
          </div>
        </Link>
      </div>

      <nav className="header-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <NavLink
          to="/"
          className={({ isActive }) => `btn-header ${isActive ? 'active-nav' : ''}`}
          title="Home Overview"
        >
          <Home size={15} />
          <span>Home</span>
        </NavLink>

        <NavLink
          to="/chat"
          className={({ isActive }) => `btn-header ${isActive ? 'active-nav' : ''}`}
          title="AI Shopping Assistant"
        >
          <MessageSquare size={15} />
          <span>AI Assistant</span>
        </NavLink>

        <NavLink
          to="/orders"
          className={({ isActive }) => `btn-header ${isActive ? 'active-nav' : ''}`}
          title="View Placed Orders & Receipts"
        >
          <Package size={15} />
          <span>Orders</span>
          {orders.length > 0 && <span className="cart-count-pill" style={{ backgroundColor: '#475569' }}>{orders.length}</span>}
        </NavLink>

        <NavLink
          to="/audit"
          className={({ isActive }) => `btn-header ${isActive ? 'active-nav' : ''}`}
          title="View Agent Decision & Commerce Audit Trail"
        >
          <Activity size={15} />
          <span>Audit Trail</span>
        </NavLink>
      </nav>

      <div className="header-controls">
        <div className="badge badge-backend" title={`Target API: ${API_BASE_URL}`}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: isBackendConnected ? 'var(--color-success)' : 'var(--color-warning)',
              display: 'inline-block',
            }}
          />
          <span>{API_BASE_URL}</span>
        </div>

        {sessionId && (
          <div className="badge badge-purple" title="Active Backend Session">
            Session: {sessionId.substring(0, 8)}...
          </div>
        )}

        <button
          className="btn-header"
          onClick={handleReset}
          title="Reset Shopping Session & Cart"
        >
          <RefreshCw size={15} />
          <span>Reset</span>
        </button>

        <Link
          to="/cart"
          className="btn-header btn-cart-toggle"
          title="View Shopping Cart"
          style={{ textDecoration: 'none' }}
        >
          <ShoppingBag size={16} />
          <span>Cart</span>
          {totalItems > 0 && <span className="cart-count-pill">{totalItems}</span>}
        </Link>
      </div>
    </header>
  );
};
