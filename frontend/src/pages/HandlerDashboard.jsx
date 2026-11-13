import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  CheckCircle2,
  AlertCircle,
  Clock,
  Activity,
  RefreshCw,
  Power,
  Sliders,
  Check,
  Eye
} from 'lucide-react';
import { handlerApi, reportApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { CategoryBadge, WorkflowBadge } from '../components/StatusBadge';
import { SlaTimerBadge } from '../components/SlaTimerBadge';
import { ReportModal } from '../components/ReportModal';

export const HandlerDashboard = () => {
  const { currentUser } = useAuth();
  const [handlerInfo, setHandlerInfo] = useState(null);
  const [activeReports, setActiveReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newCapacity, setNewCapacity] = useState(5);
  const [selectedReportId, setSelectedReportId] = useState(null);

  // If logged in as handler, use their handler ID, otherwise default to Dr. Marcus Chen (HND-001) for demo evaluation
  const targetHandlerId = currentUser?.role === 'handler'
    ? (currentUser.user_id.replace('USR-', '') || 'HND-001')
    : 'HND-001';

  const fetchHandlerData = async () => {
    try {
      setLoading(true);
      const res = await handlerApi.getHandlerDetail(targetHandlerId);
      setHandlerInfo(res.data.handler);
      setActiveReports(res.data.active_reports || []);
      if (res.data.handler) {
        setNewCapacity(res.data.handler.capacity);
      }
    } catch (err) {
      console.error('Failed to load handler dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHandlerData();
    const interval = setInterval(fetchHandlerData, 10000); // 10s polling
    return () => clearInterval(interval);
  }, [targetHandlerId]);

  const handleToggleAvailability = async () => {
    if (!handlerInfo) return;
    const newStatus = handlerInfo.availability === 'Available' ? 'Unavailable' : 'Available';
    try {
      setUpdating(true);
      await handlerApi.updateHandler(handlerInfo.handler_id, { availability: newStatus });
      await fetchHandlerData();
    } catch (err) {
      alert('Failed to update availability.');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateCapacity = async () => {
    if (!handlerInfo || newCapacity === handlerInfo.capacity) return;
    try {
      setUpdating(true);
      await handlerApi.updateHandler(handlerInfo.handler_id, { capacity: parseInt(newCapacity) });
      await fetchHandlerData();
    } catch (err) {
      alert('Failed to update capacity.');
    } finally {
      setUpdating(false);
    }
  };

  const handleQuickStatusAdvance = async (reportId, currentStatus) => {
    const nextStatus = currentStatus === 'Assigned' ? 'In Progress' : 'Resolved';
    try {
      setUpdating(true);
      await reportApi.updateReportStatus(reportId, nextStatus, 'Quick clinical status update');
      await fetchHandlerData();
    } catch (err) {
      alert(err.response?.data?.error || 'Status update failed.');
    } finally {
      setUpdating(false);
    }
  };

  const isAvailable = handlerInfo?.availability === 'Available';
  const utilPercent = handlerInfo && handlerInfo.capacity > 0
    ? Math.round((handlerInfo.current_load / handlerInfo.capacity) * 100)
    : 0;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Duty Doctor Clinical Dashboard</h1>
          <p className="page-subtitle">
            Logged in as: <strong>{handlerInfo?.name || 'Dr. Marcus Chen'}</strong> ({handlerInfo?.role} • {handlerInfo?.zone_id})
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={fetchHandlerData}>
            <RefreshCw size={15} /> Refresh Cases
          </button>
        </div>
      </div>

      {/* Doctor Status & Workload Capacity Control Panel */}
      <div
        className="card"
        style={{
          marginBottom: '24px',
          borderLeft: `5px solid ${isAvailable ? '#10b981' : '#64748b'}`,
          backgroundColor: '#ffffff'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          {/* Availability Toggle */}
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
              Current Availability Status
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
              <span
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: isAvailable ? '#15803d' : '#64748b'
                }}
              >
                {handlerInfo?.availability || 'Available'}
              </span>
              <button
                className={`btn ${isAvailable ? 'btn-secondary' : 'btn-success'} btn-sm`}
                onClick={handleToggleAvailability}
                disabled={updating}
              >
                <Power size={14} />
                {isAvailable ? 'Set to Unavailable (Shift Off)' : 'Set to Available (On Duty)'}
              </button>
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>
              Setting to Available automatically evaluates waiting reports in your ward zone.
            </div>
          </div>

          {/* Workload Capacity Meter */}
          <div style={{ minWidth: '240px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
              <span>Active Workload Load</span>
              <span style={{ color: utilPercent >= 100 ? '#ef4444' : '#0369a1' }}>
                {handlerInfo?.current_load} / {handlerInfo?.capacity} ({utilPercent}%)
              </span>
            </div>
            <div
              style={{
                height: '8px',
                width: '100%',
                backgroundColor: '#e2e8f0',
                borderRadius: '999px',
                overflow: 'hidden',
                margin: '6px 0 10px 0'
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, utilPercent)}%`,
                  backgroundColor: utilPercent >= 100 ? '#ef4444' : utilPercent > 60 ? '#f59e0b' : '#10b981',
                  borderRadius: '999px'
                }}
              />
            </div>

            {/* Adjust Capacity Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Max Capacity:</span>
              <input
                type="number"
                min="1"
                max="20"
                className="form-input"
                style={{ width: '65px', padding: '4px 8px', fontSize: '0.8rem' }}
                value={newCapacity}
                onChange={(e) => setNewCapacity(e.target.value)}
              />
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleUpdateCapacity}
                disabled={updating || parseInt(newCapacity) === handlerInfo?.capacity}
              >
                Update
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Active Assigned Reports Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary-navy)' }}>
              Active Patient Cases Under Your Care ({activeReports.length})
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Reports assigned to you in {handlerInfo?.zone_id}. Priority Critical (P1) requires immediate attention.
            </p>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Report ID</th>
                <th>Patient ID</th>
                <th>Diagnostic Panel</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Workflow Status</th>
                <th>15-Min SLA</th>
                <th>Assigned At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeReports.length > 0 ? (
                activeReports.map((rep) => (
                  <tr
                    key={rep.report_id}
                    style={{
                      backgroundColor: rep.category === 'Critical' ? 'rgba(239, 68, 68, 0.04)' : 'transparent'
                    }}
                  >
                    <td className="font-mono" style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>
                      {rep.report_id}
                    </td>
                    <td className="font-mono">{rep.patient_id}</td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{rep.report_type}</span>
                    </td>
                    <td>
                      <CategoryBadge category={rep.category} />
                    </td>
                    <td>
                      <span className="badge-pill" style={{ backgroundColor: '#fee2e2', color: '#991b1b', fontWeight: 700 }}>
                        P{rep.priority}
                      </span>
                    </td>
                    <td>
                      <WorkflowBadge status={rep.workflow_status} />
                    </td>
                    <td>
                      <SlaTimerBadge report={rep} />
                    </td>
                    <td style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      {rep.assigned_at ? new Date(rep.assigned_at).toLocaleTimeString() : 'Recent'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {rep.workflow_status === 'Assigned' && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleQuickStatusAdvance(rep.report_id, rep.workflow_status)}
                            disabled={updating}
                          >
                            Start Review
                          </button>
                        )}
                        {rep.workflow_status === 'In Progress' && (
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleQuickStatusAdvance(rep.report_id, rep.workflow_status)}
                            disabled={updating}
                          >
                            <Check size={13} /> Sign Off / Resolve
                          </button>
                        )}
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedReportId(rep.report_id)}
                        >
                          <Eye size={13} /> Full Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                    No active reports currently assigned to your duty queue.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {selectedReportId && (
        <ReportModal
          reportId={selectedReportId}
          onClose={() => setSelectedReportId(null)}
          onStatusUpdated={fetchHandlerData}
        />
      )}
    </div>
  );
};
