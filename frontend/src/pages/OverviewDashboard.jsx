import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  AlertCircle,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Users,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Activity
} from 'lucide-react';
import { analyticsApi, reportApi, handlerApi, routingApi } from '../services/api';
import { MetricCard } from '../components/MetricCard';
import { CategoryBadge, WorkflowBadge } from '../components/StatusBadge';
import { SlaTimerBadge } from '../components/SlaTimerBadge';
import { ReportModal } from '../components/ReportModal';

export const OverviewDashboard = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [recentReports, setRecentReports] = useState([]);
  const [handlers, setHandlers] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReportId, setSelectedReportId] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [metricsRes, reportsRes, handlersRes, eventsRes] = await Promise.all([
        analyticsApi.getOverview(),
        reportApi.getReports(),
        handlerApi.getHandlers(),
        routingApi.getDispatchEvents(8)
      ]);
      setMetrics(metricsRes.data);
      setRecentReports((reportsRes.data.reports || []).slice(0, 6));
      setHandlers(handlersRes.data.handlers || []);
      setEvents(eventsRes.data.events || []);
    } catch (err) {
      console.error('Overview fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); // 15s polling
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Central Laboratory Operations</h1>
          <p className="page-subtitle">
            Pathology Laboratory Report Management & Intelligent Dispatch System
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={fetchData}>
            <RefreshCw size={15} /> Refresh Data
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/submit')}>
            + Submit New Report
          </button>
        </div>
      </div>

      {/* SLA Breach Alert Banner if any breaches exist */}
      {metrics?.sla?.breached > 0 && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '10px',
            padding: '14px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertCircle size={22} style={{ color: '#ef4444' }} />
            <div>
              <div style={{ fontWeight: 700, color: '#991b1b', fontSize: '0.92rem' }}>
                Simulated 15-Minute SLA Alert: {metrics.sla.breached} Critical/Stat Report(s) Exceeded Deadline!
              </div>
              <div style={{ fontSize: '0.8rem', color: '#b91c1c' }}>
                Review active assignments or check duty doctor availability in the relevant ward zones.
              </div>
            </div>
          </div>
          <button className="btn btn-danger btn-sm" onClick={() => navigate('/reports?status=Assigned')}>
            View Affected Reports
          </button>
        </div>
      )}

      {/* Summary Metrics Grid */}
      <div className="metrics-grid">
        <MetricCard
          title="Total Reports"
          value={metrics ? metrics.total_reports : '-'}
          subtext="Persisted in SQLite"
          icon={FileText}
          accent="blue"
          onClick={() => navigate('/reports')}
        />
        <MetricCard
          title="Critical Reports (P1)"
          value={metrics ? metrics.categories.critical : '-'}
          subtext="Urgent Doctor Dispatch"
          icon={AlertCircle}
          accent="red"
          onClick={() => navigate('/reports?category=Critical')}
        />
        <MetricCard
          title="Stat Reports (P2)"
          value={metrics ? metrics.categories.stat : '-'}
          subtext="Rapid Ward Action"
          icon={AlertTriangle}
          accent="amber"
          onClick={() => navigate('/reports?category=Stat')}
        />
        <MetricCard
          title="Routine Reports (P3)"
          value={metrics ? metrics.categories.routine : '-'}
          subtext="Standard Queue"
          icon={Activity}
          accent="blue"
          onClick={() => navigate('/reports?category=Routine')}
        />
        <MetricCard
          title="Awaiting Assignment"
          value={metrics ? metrics.workflow.awaiting_assignment : '-'}
          subtext="In Priority Queue"
          icon={Clock}
          accent="purple"
          onClick={() => navigate('/smart-queue')}
        />
        <MetricCard
          title="Active in Progress"
          value={metrics ? metrics.workflow.in_progress + metrics.workflow.assigned : '-'}
          subtext="Under Doctor Review"
          icon={Users}
          accent="blue"
        />
        <MetricCard
          title="Resolved Reports"
          value={metrics ? metrics.workflow.resolved : '-'}
          subtext="Capacity Released"
          icon={CheckCircle2}
          accent="green"
          onClick={() => navigate('/reports?status=Resolved')}
        />
        <MetricCard
          title="SLA Compliance Rate"
          value={metrics ? `${metrics.sla.success_rate_percent}%` : '-'}
          subtext={`${metrics?.sla?.breached || 0} breaches`}
          icon={ShieldAlert}
          accent={metrics?.sla?.success_rate_percent >= 90 ? 'green' : 'amber'}
        />
      </div>

      {/* Main Two-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '24px' }}>
        {/* Recently Submitted Reports Table */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary-navy)' }}>
              Recently Processed Reports
            </h3>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => navigate('/reports')}
              style={{ fontSize: '0.78rem' }}
            >
              View Full Directory <ArrowRight size={13} />
            </button>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Report ID</th>
                  <th>Patient ID</th>
                  <th>Category</th>
                  <th>Ward Zone</th>
                  <th>Status</th>
                  <th>SLA</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentReports.length > 0 ? (
                  recentReports.map((rep) => (
                    <tr key={rep.report_id}>
                      <td className="font-mono" style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>
                        {rep.report_id}
                      </td>
                      <td className="font-mono">{rep.patient_id}</td>
                      <td>
                        <CategoryBadge category={rep.category} />
                      </td>
                      <td>{rep.zone_id || 'Unassigned'}</td>
                      <td>
                        <WorkflowBadge status={rep.workflow_status} />
                      </td>
                      <td>
                        <SlaTimerBadge report={rep} />
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedReportId(rep.report_id)}
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                      No reports in database.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Handlers Workload & Zone Availability Card */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary-navy)' }}>
              Duty Doctor Availability & Load
            </h3>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => navigate('/routing')}
              style={{ fontSize: '0.78rem' }}
            >
              Routing Matrix <ExternalLink size={13} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {handlers.slice(0, 5).map((h) => {
              const utilPercent = h.capacity > 0 ? Math.round((h.current_load / h.capacity) * 100) : 0;
              const isFull = h.current_load >= h.capacity;
              const isAvail = h.availability === 'Available';

              return (
                <div
                  key={h.handler_id}
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: !isAvail ? '#f1f5f9' : '#ffffff'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>{h.name}</span>
                      <span
                        className="badge-pill"
                        style={{
                          backgroundColor: isAvail ? '#dcfce7' : '#f1f5f9',
                          color: isAvail ? '#15803d' : '#64748b',
                          fontSize: '0.68rem'
                        }}
                      >
                        {h.availability}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>
                      {h.role} • {h.zone_id}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', minWidth: '130px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: isFull ? '#ef4444' : '#0369a1' }}>
                      {h.current_load} / {h.capacity} Active Cases ({utilPercent}%)
                    </div>
                    {/* Progress Bar */}
                    <div
                      style={{
                        height: '6px',
                        width: '100%',
                        backgroundColor: '#e2e8f0',
                        borderRadius: '999px',
                        overflow: 'hidden',
                        marginTop: '4px'
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(100, utilPercent)}%`,
                          backgroundColor: isFull ? '#ef4444' : utilPercent > 60 ? '#f59e0b' : '#10b981',
                          borderRadius: '999px'
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dispatch Audit Events Stream */}
      <div className="card" style={{ marginTop: '24px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary-navy)', marginBottom: '14px' }}>
          Live Dispatch & Escalation Event Stream
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {events.map((evt) => (
            <div
              key={evt.event_id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '6px',
                backgroundColor: evt.event_type.includes('ESCALAT') ? '#fef2f2' : '#f8fafc',
                borderLeft: `3px solid ${evt.event_type.includes('ESCALAT') ? '#ef4444' : '#0284c7'}`
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="font-mono" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                  {evt.event_id}
                </span>
                <span style={{ fontSize: '0.85rem', color: '#1e293b' }}>{evt.event_description}</span>
              </div>
              <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                {new Date(evt.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedReportId && (
        <ReportModal
          reportId={selectedReportId}
          onClose={() => setSelectedReportId(null)}
          onStatusUpdated={fetchData}
        />
      )}
    </div>
  );
};
