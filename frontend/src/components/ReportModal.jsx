import React, { useState, useEffect } from 'react';
import { X, Calendar, User, MapPin, Activity, ShieldCheck, Clock, FileText, ArrowRight } from 'lucide-react';
import { reportApi } from '../services/api';
import { CategoryBadge, WorkflowBadge } from './StatusBadge';
import { SlaTimerBadge } from './SlaTimerBadge';

export const ReportModal = ({ reportId, onClose, onStatusUpdated }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [notes, setNotes] = useState('');

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await reportApi.getReportDetail(reportId);
      setData(res.data);
      if (res.data && res.data.report) {
        setSelectedStatus(res.data.report.workflow_status);
      }
    } catch (err) {
      console.error('Error fetching report detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (reportId) {
      fetchDetail();
    }
  }, [reportId]);

  const handleStatusChange = async () => {
    if (!selectedStatus || selectedStatus === data?.report?.workflow_status) return;
    try {
      setUpdating(true);
      await reportApi.updateReportStatus(reportId, selectedStatus, notes);
      await fetchDetail();
      if (onStatusUpdated) onStatusUpdated();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status.');
    } finally {
      setUpdating(false);
    }
  };

  if (!reportId) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-navy)' }}>
              Report Details: <span className="font-mono" style={{ color: 'var(--accent-blue)' }}>{reportId}</span>
            </h3>
            {data?.report && <CategoryBadge category={data.report.category} />}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              Loading report telemetry & assignment audit logs...
            </div>
          ) : !data ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#ef4444' }}>
              Could not load report details.
            </div>
          ) : (
            <div>
              {/* Summary Header Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '16px',
                  backgroundColor: '#f8fafc',
                  padding: '16px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  marginBottom: '24px'
                }}
              >
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                    Patient ID (Validated)
                  </span>
                  <div className="font-mono" style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                    {data.report.patient_id}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                    Ward Zone
                  </span>
                  <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>
                    {data.report.zone_id || 'Unassigned'}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                    Current Workflow
                  </span>
                  <div style={{ marginTop: '4px' }}>
                    <WorkflowBadge status={data.report.workflow_status} />
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                    15-Min Simulated SLA
                  </span>
                  <div style={{ marginTop: '4px' }}>
                    <SlaTimerBadge report={data.report} />
                  </div>
                </div>
              </div>

              {/* Clinical Description */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                  Laboratory Panel & Observations
                </h4>
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid var(--border-color)',
                    padding: '14px',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    lineHeight: 1.6,
                    color: '#1e293b'
                  }}
                >
                  <div style={{ fontWeight: 600, color: 'var(--accent-blue)', marginBottom: '4px' }}>
                    {data.report.report_type} Diagnostic Panel (Code: {data.report.report_code})
                  </div>
                  <div>{data.report.description}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '8px' }}>
                    Validation Trace: {data.report.validation_reason}
                  </div>
                </div>
              </div>

              {/* Assigned Handler Card */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                  Duty Doctor Assignment
                </h4>
                {data.handler ? (
                  <div
                    style={{
                      border: '1px solid #bae6fd',
                      backgroundColor: '#f0f9ff',
                      padding: '14px 18px',
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: '#0369a1', fontSize: '0.95rem' }}>
                        {data.handler.name} ({data.handler.handler_id})
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#0284c7' }}>
                        {data.handler.role} • Ward: {data.handler.zone_id} • Status: {data.handler.availability}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Doctor Load</span>
                      <span style={{ fontWeight: 700, color: '#0369a1', fontSize: '0.9rem' }}>
                        {data.handler.current_load} / {data.handler.capacity} active cases
                      </span>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      border: '1px dashed #cbd5e1',
                      padding: '14px',
                      borderRadius: '8px',
                      color: '#64748b',
                      fontSize: '0.88rem'
                    }}
                  >
                    No duty doctor currently assigned. Report is held in priority waiting queue.
                  </div>
                )}
              </div>

              {/* Status Update Controls */}
              {data.report.workflow_status !== 'Resolved' && (
                <div
                  style={{
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    padding: '16px',
                    borderRadius: '8px',
                    marginBottom: '24px'
                  }}
                >
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#92400e', marginBottom: '8px' }}>
                    Update Workflow Status
                  </h4>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <select
                      className="form-select"
                      style={{ width: 'auto', minWidth: '180px' }}
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Assigned">Assigned</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved (Release Load)</option>
                    </select>

                    <input
                      type="text"
                      className="form-input"
                      style={{ flex: 1, minWidth: '200px' }}
                      placeholder="Optional notes or clinical sign-off comment..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />

                    <button
                      className="btn btn-primary"
                      onClick={handleStatusChange}
                      disabled={updating || selectedStatus === data.report.workflow_status}
                    >
                      {updating ? 'Updating...' : 'Save Status'}
                    </button>
                  </div>
                </div>
              )}

              {/* Assignment History Timeline */}
              <div>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#334155', marginBottom: '14px' }}>
                  Routing & Assignment Audit Timeline
                </h4>
                <div className="timeline">
                  {data.history && data.history.length > 0 ? (
                    data.history.map((hist, idx) => (
                      <div className="timeline-item" key={idx}>
                        <div className="timeline-dot" />
                        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0f172a' }}>
                          {hist.assignment_type} - {hist.assignment_reason}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                          Status: {hist.status} • Handler: {hist.assigned_handler_id || 'Central Queue'} • {new Date(hist.timestamp).toLocaleString()}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No previous routing events logged.</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
