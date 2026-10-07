import React from 'react';
import { AuditEvent } from '../../types';
import { Check, Clock, AlertTriangle, Activity, ShieldCheck } from 'lucide-react';

interface AuditTrailProps {
  events: AuditEvent[];
  sessionId: string | null;
  orderId: string | null;
}

export const AuditTrail: React.FC<AuditTrailProps> = ({ events, sessionId, orderId }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 14px',
          backgroundColor: 'var(--bg-surface-subtle)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-color)',
          fontSize: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
          <Activity size={14} color="var(--color-primary)" />
          <span>Decision & Transaction Audit Log</span>
        </div>
        <div style={{ display: 'flex', gap: 10, color: 'var(--text-muted)' }}>
          {sessionId && <span>Session: {sessionId.substring(0, 8)}</span>}
          {orderId && <span>Order: {orderId.substring(0, 8)}</span>}
        </div>
      </div>

      <div className="audit-timeline">
        {events.map((evt) => {
          let statusIcon = <Clock size={10} />;
          if (evt.status === 'completed') statusIcon = <Check size={11} />;
          else if (evt.status === 'failed') statusIcon = <AlertTriangle size={11} />;

          return (
            <div key={evt.id} className={`audit-node ${evt.status}`}>
              <div className="audit-bullet">{statusIcon}</div>

              <div className="audit-meta-row">
                <div className="audit-step-title">{evt.step}</div>
                <div className="audit-actor-tag">{evt.actor}</div>
              </div>

              <div className="audit-details-text">{evt.details}</div>
              <div className="audit-time">{evt.timestamp}</div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          borderTop: '1px solid var(--border-color)',
          paddingTop: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <ShieldCheck size={13} color="var(--color-success)" />
        Bounded Agent Protocol: All financial thresholds and authorization steps are auditable.
      </div>
    </div>
  );
};
