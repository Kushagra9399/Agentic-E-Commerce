import React, { useState } from 'react';
import { useCommerceContext } from '../context/CommerceContext';
import { AuditTrail } from '../components/audit/AuditTrail';
import {
  Activity,
  ShieldCheck,
  Filter,
  Download,
  Trash2,
  CheckCircle2,
  Clock,
  User,
  Bot,
  Server,
  CreditCard,
  Layers,
} from 'lucide-react';
import { AuditEvent } from '../types';

export const AuditPage: React.FC = () => {
  const { auditEvents, sessionId, orderId } = useCommerceContext();
  const [actorFilter, setActorFilter] = useState<string>('all');

  const filteredEvents = auditEvents.filter((evt) => {
    if (actorFilter === 'all') return true;
    return evt.actor === actorFilter;
  });

  const downloadJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(auditEvents, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `audit_trail_${sessionId || 'session'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getActorIcon = (actor: string) => {
    switch (actor) {
      case 'AI Agent':
        return <Bot size={13} color="var(--color-primary)" />;
      case 'Buyer':
        return <User size={13} color="#0f172a" />;
      case 'Backend System':
        return <Server size={13} color="#059669" />;
      case 'Razorpay Gateway':
        return <CreditCard size={13} color="#7c3aed" />;
      default:
        return <Activity size={13} />;
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: 950, margin: '0 auto', padding: '28px 20px' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 24,
        }}
      >
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
            <Activity size={24} color="var(--color-primary)" />
            AI Commerce Decision & Audit Trail
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Full traceability of agent reasoning, product searches, buyer approvals, and gateway transactions.
          </p>
        </div>

        <button
          className="btn-card-secondary"
          onClick={downloadJson}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
        >
          <Download size={14} /> Export Audit Log (JSON)
        </button>
      </div>

      {/* Meta Stats Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            padding: 16,
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Active Session
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4, fontFamily: 'monospace' }}>
            {sessionId ? `${sessionId.substring(0, 14)}...` : 'Standby / Local'}
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            padding: 16,
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Order Reference
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4, fontFamily: 'monospace' }}>
            {orderId || 'None (in cart / search)'}
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            padding: 16,
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Recorded Events
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-primary)', marginTop: 4 }}>
            {auditEvents.length} Total ({filteredEvents.length} shown)
          </div>
        </div>
      </div>

      {/* Actor Filter Chips */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
          marginBottom: 20,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Filter size={13} /> Filter Actor:
        </span>

        {['all', 'AI Agent', 'Buyer', 'Backend System', 'Razorpay Gateway'].map((act) => (
          <button
            key={act}
            className={`btn-header ${actorFilter === act ? 'active-nav' : ''}`}
            style={{
              padding: '4px 12px',
              fontSize: 12,
              borderRadius: 'var(--radius-full)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
            onClick={() => setActorFilter(act)}
          >
            {act !== 'all' && getActorIcon(act)}
            <span>{act === 'all' ? 'All Actors' : act}</span>
          </button>
        ))}
      </div>

      {/* Main Audit List */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)',
          padding: 24,
        }}
      >
        <AuditTrail events={filteredEvents} sessionId={sessionId} orderId={orderId} />
      </div>
    </div>
  );
};
