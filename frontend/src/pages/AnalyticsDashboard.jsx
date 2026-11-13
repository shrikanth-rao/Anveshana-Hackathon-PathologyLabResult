import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  BarChart3,
  TrendingUp,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Users
} from 'lucide-react';
import { analyticsApi } from '../services/api';
import { MetricCard } from '../components/MetricCard';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

export const AnalyticsDashboard = () => {
  const [overview, setOverview] = useState(null);
  const [categoryData, setCategoryData] = useState(null);
  const [zoneData, setZoneData] = useState(null);
  const [perfData, setPerfData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [ovRes, catRes, zoneRes, perfRes] = await Promise.all([
        analyticsApi.getOverview(),
        analyticsApi.getCategories(),
        analyticsApi.getZones(),
        analyticsApi.getPerformance()
      ]);
      setOverview(ovRes.data);
      setCategoryData(catRes.data);
      setZoneData(zoneRes.data);
      setPerfData(perfRes.data);
    } catch (err) {
      console.error('Analytics load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Category Doughnut Chart Data
  const categoryChartConfig = {
    labels: categoryData ? categoryData.labels : [],
    datasets: [
      {
        data: categoryData ? categoryData.counts : [],
        backgroundColor: [
          '#ef4444', // Critical
          '#f59e0b', // Stat
          '#0284c7', // Routine
          '#8b5cf6', // Pending
          '#64748b'  // Error
        ],
        borderWidth: 2,
        borderColor: '#ffffff'
      }
    ]
  };

  // Ward Zone Bar Chart Data
  const zoneChartConfig = {
    labels: zoneData ? zoneData.labels : [],
    datasets: [
      {
        label: 'Specimens Processed',
        data: zoneData ? zoneData.counts : [],
        backgroundColor: '#0284c7',
        borderRadius: 6
      }
    ]
  };

  // Workflow Pipeline Funnel Data
  const workflowChartConfig = {
    labels: ['Pending', 'Assigned', 'In Progress', 'Resolved'],
    datasets: [
      {
        label: 'Volume of Reports',
        data: overview ? [
          overview.workflow.pending,
          overview.workflow.assigned,
          overview.workflow.in_progress,
          overview.workflow.resolved
        ] : [],
        backgroundColor: [
          '#f59e0b',
          '#0284c7',
          '#8b5cf6',
          '#10b981'
        ],
        borderRadius: 6
      }
    ]
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Operational Analytics & Performance</h1>
          <p className="page-subtitle">
            Database-backed clinical dispatch metrics, SLA compliance audits, and ward load balancing
          </p>
        </div>
        <div>
          <button className="btn btn-secondary" onClick={fetchAnalytics}>
            <RefreshCw size={15} /> Refresh Analytics
          </button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="metrics-grid">
        <MetricCard
          title="Total Reports Audited"
          value={overview ? overview.total_reports : '-'}
          subtext="Persisted in SQLite"
          icon={BarChart3}
          accent="blue"
        />
        <MetricCard
          title="SLA Success Rate"
          value={overview ? `${overview.sla.success_rate_percent}%` : '-'}
          subtext="15-min Critical/Stat target"
          icon={ShieldCheck}
          accent={overview?.sla?.success_rate_percent >= 90 ? 'green' : 'amber'}
        />
        <MetricCard
          title="Avg Turnaround Time"
          value={perfData ? `${perfData.average_turnaround_minutes}m` : '-'}
          subtext="Target SLA: 15 minutes"
          icon={Clock}
          accent="green"
        />
        <MetricCard
          title="Escalations / Fallbacks"
          value={overview ? overview.incidents.escalations + overview.incidents.fallbacks : '-'}
          subtext={`${overview?.incidents?.escalations || 0} Critical escalations`}
          icon={AlertTriangle}
          accent="amber"
        />
      </div>

      {/* Visual Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        {/* Category Classification Distribution */}
        <div className="card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary-navy)', marginBottom: '16px' }}>
            Report Classification Breakdown (5 Categories)
          </h3>
          <div style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {categoryData && categoryData.counts.some((c) => c > 0) ? (
              <Doughnut
                data={categoryChartConfig}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'bottom' }
                  }
                }}
              />
            ) : (
              <div style={{ color: '#64748b' }}>No data for category chart.</div>
            )}
          </div>
        </div>

        {/* Ward Zone Distribution */}
        <div className="card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary-navy)', marginBottom: '16px' }}>
            Ward Zone Workload Distribution
          </h3>
          <div style={{ height: '280px' }}>
            {zoneData ? (
              <Bar
                data={zoneChartConfig}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } }
                  },
                  plugins: { legend: { display: false } }
                }}
              />
            ) : (
              <div style={{ color: '#64748b', textAlign: 'center', paddingTop: '100px' }}>Loading...</div>
            )}
          </div>
        </div>

        {/* Workflow Lifecycle Funnel */}
        <div className="card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary-navy)', marginBottom: '16px' }}>
            Report Status Workflow Pipeline
          </h3>
          <div style={{ height: '280px' }}>
            {overview ? (
              <Bar
                data={workflowChartConfig}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } }
                  },
                  plugins: { legend: { display: false } }
                }}
              />
            ) : (
              <div style={{ color: '#64748b', textAlign: 'center', paddingTop: '100px' }}>Loading...</div>
            )}
          </div>
        </div>

        {/* Duty Doctor Utilization Table */}
        <div className="card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary-navy)', marginBottom: '16px' }}>
            Duty Doctor Workload & Capacity Utilization
          </h3>
          <div className="table-container" style={{ maxHeight: '280px' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Doctor</th>
                  <th>Zone</th>
                  <th>Status</th>
                  <th>Active Load</th>
                  <th>Utilization</th>
                </tr>
              </thead>
              <tbody>
                {perfData?.handler_workloads?.map((h) => (
                  <tr key={h.handler_id}>
                    <td>
                      <strong style={{ color: '#0f172a' }}>{h.name}</strong>
                    </td>
                    <td>{h.zone_id}</td>
                    <td>
                      <span
                        className="badge-pill"
                        style={{
                          backgroundColor: h.availability === 'Available' ? '#dcfce7' : '#fee2e2',
                          color: h.availability === 'Available' ? '#15803d' : '#991b1b',
                          fontSize: '0.7rem'
                        }}
                      >
                        {h.availability}
                      </span>
                    </td>
                    <td>{h.current_load} / {h.capacity}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            height: '6px',
                            width: '60px',
                            backgroundColor: '#e2e8f0',
                            borderRadius: '999px',
                            overflow: 'hidden'
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              width: `${Math.min(100, h.utilization_percent)}%`,
                              backgroundColor: h.utilization_percent >= 100 ? '#ef4444' : h.utilization_percent > 60 ? '#f59e0b' : '#10b981'
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>{h.utilization_percent}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
