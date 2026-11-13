import React from 'react';
import { AlertTriangle, Clock, CheckCircle2, ShieldAlert, AlertCircle, Info } from 'lucide-react';

export const CategoryBadge = ({ category }) => {
  switch (category) {
    case 'Critical':
      return (
        <span className="status-badge badge-critical">
          <AlertCircle size={13} /> Critical (P1)
        </span>
      );
    case 'Stat':
      return (
        <span className="status-badge badge-stat">
          <AlertTriangle size={13} /> Stat (P2)
        </span>
      );
    case 'Routine':
      return (
        <span className="status-badge badge-routine">
          <Info size={13} /> Routine (P3)
        </span>
      );
    case 'Pending':
      return (
        <span className="status-badge badge-pending">
          <Clock size={13} /> Pending Verification
        </span>
      );
    case 'Error':
      return (
        <span className="status-badge badge-error">
          <ShieldAlert size={13} /> Error Correction
        </span>
      );
    default:
      return <span className="status-badge badge-error">{category || 'Unknown'}</span>;
  }
};

export const WorkflowBadge = ({ status }) => {
  switch (status) {
    case 'Pending':
      return (
        <span className="status-badge badge-stat">
          <Clock size={13} /> Pending
        </span>
      );
    case 'Assigned':
      return (
        <span className="status-badge badge-routine">
          <Info size={13} /> Assigned
        </span>
      );
    case 'In Progress':
      return (
        <span className="status-badge badge-pending">
          <Clock size={13} /> In Progress
        </span>
      );
    case 'Resolved':
      return (
        <span className="status-badge badge-resolved">
          <CheckCircle2 size={13} /> Resolved
        </span>
      );
    default:
      return <span className="status-badge badge-error">{status || 'Pending'}</span>;
  }
};
