import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserCheck,
  FilePlus,
  Clock,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  Eye,
  ShieldCheck
} from 'lucide-react';
import { reportApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { CategoryBadge, WorkflowBadge } from '../components/StatusBadge';
import { SlaTimerBadge } from '../components/SlaTimerBadge';
import { MetricCard } from '../components/MetricCard';
import { ReportModal } from '../components/ReportModal';

export const UserDashboard = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedReportId, setSelectedReportId] = useState(null);

  const fetchUserReports = async () => {
    try {
      setLoading(true);
      // Fetch reports submitted by current reporter (default USR-001)
      const reporterId = currentUser?.user_id || 'USR-001';
      const res = await reportApi.getReports({
        reporter_id: reporterId,
        status: statusFilter || undefined,
        search: search || undefined
      });
      setReports(res.data.reports || []);
    } catch (err) {
      console.error('Error fetching user dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserReports();
  }, [currentUser, statusFilter]);

  const totalSubmitted = reports.length;
  const pendingCount = reports.filter((r) => r.workflow_status === 'Pending').length;
  const activeCount = reports.filter((r) => ['Assigned', 'In Progress'].includes(r.workflow_status)).length;
  const resolvedCount = reports.filter((r) => r.workflow_status === 'Resolved').length;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Laboratory Reporter Dashboard</h1>
          <p className="page-subtitle">
            Welcome, <strong>{currentUser?.name || 'Alex Rivera, MLS'}</strong> – Real-time tracking of your specimen submissions
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={fetchUserReports}>
            <RefreshCw size={15} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/submit')}>
            <FilePlus size={15} /> Submit New Report
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="metrics-grid">
        <MetricCard
          title="Total Submissions"
          value={totalSubmitted}
          subtext="By this laboratory account"
          icon={UserCheck}
          accent="blue"
        />
        <MetricCard
          title="Awaiting Doctor"
          value={pendingCount}
          subtext="In automated dispatch queue"
          icon={Clock}
          accent="amber"
          onClick={() => setStatusFilter('Pending')}
        />
        <MetricCard
          title="Under Clinical Action"
          value={activeCount}
          subtext="Assigned / In Progress"
          icon={Clock}
          accent="blue"
          onClick={() => setStatusFilter('Assigned')}
        />
        <MetricCard
          title="Resolved Results"
          value={resolvedCount}
          subtext="Doctor sign-off complete"
          icon={CheckCircle2}
          accent="green"
          onClick={() => setStatusFilter('Resolved')}
        />
      </div>

      {/* Search and Filters */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search your submitted reports by Report ID or Patient ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchUserReports()}
            />
          </div>

          <div style={{ minWidth: '160px' }}>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          <button className="btn btn-primary" onClick={fetchUserReports}>
            <Search size={15} /> Search
          </button>
        </div>
      </div>

      {/* Reports Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary-navy)' }}>
            My Submitted Pathology Records ({reports.length})
          </h3>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Read-only audit privileges enabled for laboratory reporter role
          </span>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Report ID</th>
                <th>Patient ID</th>
                <th>Diagnostic Panel</th>
                <th>Category</th>
                <th>Ward Zone</th>
                <th>Workflow Status</th>
                <th>Assigned Duty Doctor</th>
                <th>SLA Timer</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.length > 0 ? (
                reports.map((rep) => (
                  <tr key={rep.report_id}>
                    <td className="font-mono" style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>
                      {rep.report_id}
                    </td>
                    <td className="font-mono">{rep.patient_id}</td>
                    <td>{rep.report_type}</td>
                    <td>
                      <CategoryBadge category={rep.category} />
                    </td>
                    <td>{rep.zone_id || 'N/A'}</td>
                    <td>
                      <WorkflowBadge status={rep.workflow_status} />
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: rep.assigned_handler_id ? '#0369a1' : '#f59e0b', fontSize: '0.82rem' }}>
                        {rep.assigned_handler_id || 'Awaiting Queue'}
                      </span>
                    </td>
                    <td>
                      <SlaTimerBadge report={rep} />
                    </td>
                    <td style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      {new Date(rep.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setSelectedReportId(rep.report_id)}
                      >
                        <Eye size={13} /> View Audit
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                    No submitted reports found for this reporter account.
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
          onStatusUpdated={fetchUserReports}
        />
      )}
    </div>
  );
};
