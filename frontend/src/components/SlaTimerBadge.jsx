import React, { useState, useEffect } from 'react';
import { Clock, AlertOctagon } from 'lucide-react';

export const SlaTimerBadge = ({ report }) => {
  if (!report || !['Critical', 'Stat'].includes(report.category)) {
    return <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>N/A (Standard)</span>;
  }

  if (report.workflow_status === 'Resolved') {
    return (
      <span className="status-badge badge-resolved" style={{ fontSize: '0.72rem' }}>
        Completed in SLA
      </span>
    );
  }

  const [remaining, setRemaining] = useState(report.sla_seconds_remaining);

  useEffect(() => {
    if (report.sla_deadline) {
      const targetTime = new Date(report.sla_deadline).getTime();
      const updateTimer = () => {
        const now = new Date().getTime();
        const diffSeconds = Math.floor((targetTime - now) / 1000);
        setRemaining(diffSeconds);
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [report.sla_deadline]);

  if (remaining === null || remaining === undefined) {
    return <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>15m Target</span>;
  }

  if (remaining <= 0 || report.sla_breached) {
    return (
      <span className="status-badge badge-critical" style={{ fontSize: '0.72rem', animation: 'pulse 2s infinite' }}>
        <AlertOctagon size={12} /> SLA Breached
      </span>
    );
  }

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const isWarning = remaining < 300; // less than 5 minutes

  return (
    <span
      className={`status-badge ${isWarning ? 'badge-stat' : 'badge-routine'}`}
      style={{ fontSize: '0.75rem', fontFamily: 'JetBrains Mono, monospace' }}
    >
      <Clock size={12} />
      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')} left
    </span>
  );
};
