import React from 'react';

export const MetricCard = ({ title, value, subtext, icon: Icon, accent = 'blue', onClick }) => {
  return (
    <div
      className={`metric-card accent-${accent}`}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      <div>
        <div className="metric-title">{title}</div>
        <div className="metric-value">{value}</div>
        {subtext && <div className="metric-sub">{subtext}</div>}
      </div>
      {Icon && (
        <div
          className="metric-icon-wrap"
          style={{
            backgroundColor:
              accent === 'red' ? 'var(--color-critical-bg)' :
              accent === 'amber' ? 'var(--color-stat-bg)' :
              accent === 'green' ? 'var(--color-resolved-bg)' :
              accent === 'purple' ? 'var(--color-pending-bg)' : 'var(--accent-blue-light)',
            color:
              accent === 'red' ? 'var(--color-critical)' :
              accent === 'amber' ? 'var(--color-stat)' :
              accent === 'green' ? 'var(--color-resolved)' :
              accent === 'purple' ? 'var(--color-pending)' : 'var(--accent-blue)'
          }}
        >
          <Icon size={22} />
        </div>
      )}
    </div>
  );
};
