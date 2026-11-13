import React, { useState, useEffect } from 'react';
import {
  ListOrdered,
  Clock,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Play,
  Filter,
  CheckCircle2,
  FileQuestion,
  ShieldAlert
} from 'lucide-react';
import { queueApi } from '../services/api';
import { CategoryBadge, WorkflowBadge } from '../components/StatusBadge';
import { SlaTimerBadge } from '../components/SlaTimerBadge';
import { ReportModal } from '../components/ReportModal';

export const SmartQueueView = () => {
  const [queueData, setQueueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dispatch'); // 'dispatch', 'verification', 'correction'
  const [categoryFilter, setCategoryFilter] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [processing, setProcessing] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState(null);

  const fetchQueues = async () => {
    try {
      setLoading(true);
      const res = await queueApi.getQueues({
        category: categoryFilter || undefined,
        zone_id: zoneFilter || undefined
      });
      setQueueData(res.data);
    } catch (err) {
      console.error('Failed to load queue data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueues();
    const interval = setInterval(fetchQueues, 8000); // 8s polling
    return () => clearInterval(interval);
  }, [categoryFilter, zoneFilter]);

  const handleProcessWaitingQueue = async () => {
    try {
      setProcessing(true);
      const res = await queueApi.processQueues(zoneFilter || undefined);
      await fetchQueues();
      alert(res.data.message || 'Waiting queue processed.');
    } catch (err) {
      alert('Failed to process waiting queue.');
    } finally {
      setProcessing(false);
    }
  };

  const summary = queueData?.summary || {
    total_queued: 0,
    critical_count: 0,
    stat_count: 0,
    routine_count: 0,
    verification_count: 0,
    correction_count: 0,
    waiting_count: 0
  };

  const dispatchList = queueData?.dispatch_queue || [];
  const verificationList = queueData?.verification_queue || [];
  const correctionList = queueData?.correction_queue || [];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Smart Queue – Priority Dispatch Monitor</h1>
          <p className="page-subtitle">
            Deterministic Priority-Preemptive Dispatch: Critical (P1) → Stat (P2) → Routine (P3) → FIFO Timestamp Ordering
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={fetchQueues}>
            <RefreshCw size={15} /> Refresh Queue
          </button>
          <button
            className="btn btn-primary"
            onClick={handleProcessWaitingQueue}
            disabled={processing}
          >
            <Play size={15} /> {processing ? 'Evaluating...' : 'Process Waiting Reports'}
          </button>
        </div>
      </div>

      {/* Queue Metric Cards */}
      <div className="metrics-grid">
        <div className="metric-card accent-blue">
          <div>
            <div className="metric-title">Active Dispatch Queue</div>
            <div className="metric-value">{summary.total_queued}</div>
            <div className="metric-sub">{summary.waiting_count} waiting for handler</div>
          </div>
          <div className="metric-icon-wrap" style={{ backgroundColor: '#e0f2fe', color: '#0284c7' }}>
            <ListOrdered size={22} />
          </div>
        </div>

        <div className="metric-card accent-red">
          <div>
            <div className="metric-title">Critical Queue (P1)</div>
            <div className="metric-value">{summary.critical_count}</div>
            <div className="metric-sub">Preempts all lower work</div>
          </div>
          <div className="metric-icon-wrap" style={{ backgroundColor: '#fef2f2', color: '#ef4444' }}>
            <AlertCircle size={22} />
          </div>
        </div>

        <div className="metric-card accent-amber">
          <div>
            <div className="metric-title">Stat Queue (P2)</div>
            <div className="metric-value">{summary.stat_count}</div>
            <div className="metric-sub">Rapid ward turnaround</div>
          </div>
          <div className="metric-icon-wrap" style={{ backgroundColor: '#fffbeb', color: '#f59e0b' }}>
            <AlertTriangle size={22} />
          </div>
        </div>

        <div className="metric-card accent-purple">
          <div>
            <div className="metric-title">Pending Verification</div>
            <div className="metric-value">{summary.verification_count}</div>
            <div className="metric-sub">Specimen re-check queue</div>
          </div>
          <div className="metric-icon-wrap" style={{ backgroundColor: '#f5f3ff', color: '#8b5cf6' }}>
            <FileQuestion size={22} />
          </div>
        </div>
      </div>

      {/* Tab Navigation & Filters */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className={`btn ${activeTab === 'dispatch' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => setActiveTab('dispatch')}
            >
              Priority Dispatch Queue ({dispatchList.length})
            </button>
            <button
              className={`btn ${activeTab === 'verification' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => setActiveTab('verification')}
            >
              Verification Queue ({verificationList.length})
            </button>
            <button
              className={`btn ${activeTab === 'correction' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => setActiveTab('correction')}
            >
              Correction Queue ({correctionList.length})
            </button>
          </div>

          {/* Filtering Controls */}
          {activeTab === 'dispatch' && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <select
                className="form-select"
                style={{ width: 'auto', fontSize: '0.82rem', padding: '6px 12px' }}
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">All Categories</option>
                <option value="Critical">Critical (P1)</option>
                <option value="Stat">Stat (P2)</option>
                <option value="Routine">Routine (P3)</option>
              </select>

              <select
                className="form-select"
                style={{ width: 'auto', fontSize: '0.82rem', padding: '6px 12px' }}
                value={zoneFilter}
                onChange={(e) => setZoneFilter(e.target.value)}
              >
                <option value="">All Ward Zones</option>
                <option value="ZONE_1">ZONE_1 (ICU)</option>
                <option value="ZONE_2">ZONE_2 (ED)</option>
                <option value="ZONE_3">ZONE_3 (Cardio)</option>
                <option value="ZONE_4">ZONE_4 (Inpatient)</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Active Tab Content Table */}
      <div className="card">
        {activeTab === 'dispatch' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary-navy)' }}>
                Priority-Ordered Queue Matrix
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Sorted by: Priority ASC → Submission Timestamp ASC → Report ID ASC
              </span>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Queue Pos</th>
                    <th>Report ID</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Ward Zone</th>
                    <th>Status</th>
                    <th>Waiting Time</th>
                    <th>SLA Deadline</th>
                    <th>Assigned Doctor</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {dispatchList.length > 0 ? (
                    dispatchList.map((item) => {
                      const waitMins = Math.floor((item.waiting_time_seconds || 0) / 60);
                      const waitSecs = (item.waiting_time_seconds || 0) % 60;

                      return (
                        <tr
                          key={item.report_id}
                          style={{
                            backgroundColor:
                              item.priority === 1 ? 'rgba(239, 68, 68, 0.03)' :
                              item.priority === 2 ? 'rgba(245, 158, 11, 0.03)' : 'transparent'
                          }}
                        >
                          <td style={{ fontWeight: 800, color: item.priority === 1 ? '#ef4444' : '#0f172a' }}>
                            #{item.queue_position}
                          </td>
                          <td className="font-mono" style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>
                            {item.report_id}
                          </td>
                          <td>
                            <CategoryBadge category={item.category} />
                          </td>
                          <td>
                            <span
                              className="badge-pill"
                              style={{
                                backgroundColor: item.priority === 1 ? '#fee2e2' : item.priority === 2 ? '#fef3c7' : '#e0f2fe',
                                color: item.priority === 1 ? '#991b1b' : item.priority === 2 ? '#92400e' : '#0369a1',
                                fontWeight: 800
                              }}
                            >
                              Priority {item.priority}
                            </span>
                          </td>
                          <td>{item.zone_id}</td>
                          <td>
                            <WorkflowBadge status={item.workflow_status} />
                          </td>
                          <td className="font-mono" style={{ fontSize: '0.82rem' }}>
                            {waitMins}m {waitSecs}s
                          </td>
                          <td>
                            <SlaTimerBadge report={item} />
                          </td>
                          <td>
                            <span style={{ fontWeight: 600, color: item.assigned_handler_id ? '#0369a1' : '#f59e0b', fontSize: '0.82rem' }}>
                              {item.assigned_handler_id || 'Waiting for Doctor'}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => setSelectedReportId(item.report_id)}
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="10" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                        No reports matching filter criteria in the dispatch queue.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'verification' && (
          <div>
            <div style={{ marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary-navy)' }}>
                Pending Laboratory Specimen Verification Queue
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
                Specimens requiring second-pathologist reading, blood culture incubation, or frozen section confirmation.
              </p>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Report ID</th>
                    <th>Patient ID</th>
                    <th>Report Type</th>
                    <th>Zone</th>
                    <th>Description</th>
                    <th>Submitted At</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {verificationList.length > 0 ? (
                    verificationList.map((item) => (
                      <tr key={item.report_id}>
                        <td className="font-mono" style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>
                          {item.report_id}
                        </td>
                        <td className="font-mono">{item.patient_id}</td>
                        <td>{item.report_type}</td>
                        <td>{item.zone_id}</td>
                        <td style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.description}
                        </td>
                        <td>{new Date(item.submitted_at).toLocaleTimeString()}</td>
                        <td>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setSelectedReportId(item.report_id)}
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                        Verification queue is empty.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'correction' && (
          <div>
            <div style={{ marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary-navy)' }}>
                Administrative Error & Specimen Correction Queue
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
                Reports with unrecognized diagnostic codes or barcode discrepancies safely diverted here rather than being misrouted.
              </p>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Report ID</th>
                    <th>Patient ID</th>
                    <th>Submitted Code</th>
                    <th>Zone</th>
                    <th>Failure Reason</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {correctionList.length > 0 ? (
                    correctionList.map((item) => (
                      <tr key={item.report_id}>
                        <td className="font-mono" style={{ fontWeight: 700, color: '#ef4444' }}>
                          {item.report_id}
                        </td>
                        <td className="font-mono">{item.patient_id}</td>
                        <td>
                          <code className="font-mono" style={{ color: '#dc2626' }}>{item.report_code}</code>
                        </td>
                        <td>{item.zone_id}</td>
                        <td style={{ color: '#64748b' }}>{item.description}</td>
                        <td>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setSelectedReportId(item.report_id)}
                          >
                            Correct
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                        No reports in error correction queue.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedReportId && (
        <ReportModal
          reportId={selectedReportId}
          onClose={() => setSelectedReportId(null)}
          onStatusUpdated={fetchQueues}
        />
      )}
    </div>
  );
};
