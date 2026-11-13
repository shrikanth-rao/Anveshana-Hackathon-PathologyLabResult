import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  Plus,
  Eye,
  AlertCircle
} from 'lucide-react';
import { reportApi, routingApi } from '../services/api';
import { CategoryBadge, WorkflowBadge } from '../components/StatusBadge';
import { SlaTimerBadge } from '../components/SlaTimerBadge';
import { ReportModal } from '../components/ReportModal';

export const ReportManagement = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [status, setStatus] = useState('');

  const [selectedReportId, setSelectedReportId] = useState(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const [reportsRes, zonesRes] = await Promise.all([
        reportApi.getReports({
          search: search || undefined,
          category: category || undefined,
          zone_id: zoneId || undefined,
          status: status || undefined
        }),
        routingApi.getZones()
      ]);
      setReports(reportsRes.data.reports || []);
      setZones(zonesRes.data.zones || []);
    } catch (err) {
      console.error('Error fetching reports directory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [category, zoneId, status]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchReports();
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Pathology Report Directory</h1>
          <p className="page-subtitle">
            Comprehensive audit registry of all laboratory specimen dispatches, validations, and resolutions
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={fetchReports}>
            <RefreshCw size={15} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/submit')}>
            <Plus size={15} /> New Report
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search Box */}
          <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search by Report ID, Patient ID (PATxxxxxx), or findings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Category Filter */}
          <div style={{ minWidth: '150px' }}>
            <select
              className="form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              <option value="Critical">Critical (P1)</option>
              <option value="Stat">Stat (P2)</option>
              <option value="Routine">Routine (P3)</option>
              <option value="Pending">Pending</option>
              <option value="Error">Error</option>
            </select>
          </div>

          {/* Zone Filter */}
          <div style={{ minWidth: '150px' }}>
            <select
              className="form-select"
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
            >
              <option value="">All Ward Zones</option>
              {zones.map((z) => (
                <option key={z.zone_id} value={z.zone_id}>
                  {z.zone_id}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ minWidth: '150px' }}>
            <select
              className="form-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary">
            <Search size={15} /> Search
          </button>
        </form>
      </div>

      {/* Report Directory Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary-navy)' }}>
            Registered Reports ({reports.length})
          </h3>
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
                <th>Zone</th>
                <th>Workflow</th>
                <th>Doctor Assigned</th>
                <th>SLA Target</th>
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
                    <td className="font-mono" style={{ fontWeight: 600 }}>{rep.patient_id}</td>
                    <td>
                      <span style={{ fontWeight: 600, color: '#334155' }}>{rep.report_type}</span>
                    </td>
                    <td>
                      <CategoryBadge category={rep.category} />
                    </td>
                    <td>
                      <span className="badge-pill" style={{ backgroundColor: '#f1f5f9', color: '#334155', fontWeight: 700 }}>
                        P{rep.priority}
                      </span>
                    </td>
                    <td>{rep.zone_id || 'N/A'}</td>
                    <td>
                      <WorkflowBadge status={rep.workflow_status} />
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: rep.assigned_handler_id ? '#0369a1' : '#f59e0b', fontSize: '0.82rem' }}>
                        {rep.assigned_handler_id || 'Unassigned Queue'}
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
                        <Eye size={13} /> View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                    No reports match the current filters.
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
          onStatusUpdated={fetchReports}
        />
      )}
    </div>
  );
};
