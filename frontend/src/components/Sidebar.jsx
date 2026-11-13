import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FilePlus,
  FileText,
  UserCheck,
  Stethoscope,
  Network,
  BarChart3,
  Cpu,
  GitBranch,
  ListOrdered,
  FlaskConical,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar = () => {
  const { currentUser } = useAuth();

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="logo-icon-box">
            <FlaskConical size={22} />
          </div>
          <div className="logo-text">
            <h1>PATHFLOW</h1>
            <p>Pathology Lab Notifier</p>
          </div>
        </div>
      </div>

      {/* Navigation Sections */}
      <nav className="sidebar-nav">
        <div className="nav-section-title">Main Operations</div>
        
        <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <div className="nav-link-left">
            <LayoutDashboard size={18} />
            <span>Overview</span>
          </div>
        </NavLink>

        <NavLink to="/submit" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <div className="nav-link-left">
            <FilePlus size={18} />
            <span>Submit Report</span>
          </div>
        </NavLink>

        <NavLink to="/reports" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <div className="nav-link-left">
            <FileText size={18} />
            <span>Report Directory</span>
          </div>
        </NavLink>

        <NavLink to="/user-dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <div className="nav-link-left">
            <UserCheck size={18} />
            <span>Reporter Dashboard</span>
          </div>
        </NavLink>

        <NavLink to="/handler-dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <div className="nav-link-left">
            <Stethoscope size={18} />
            <span>Handler Dashboard</span>
          </div>
        </NavLink>

        <NavLink to="/routing" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <div className="nav-link-left">
            <Network size={18} />
            <span>Routing Table</span>
          </div>
        </NavLink>

        <NavLink to="/analytics" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <div className="nav-link-left">
            <BarChart3 size={18} />
            <span>Analytics</span>
          </div>
        </NavLink>

        <div className="nav-section-title" style={{ marginTop: '12px' }}>
          Interactive Academic Lab
        </div>

        <NavLink to="/dfa-visualizer" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <div className="nav-link-left">
            <Cpu size={18} style={{ color: '#38bdf8' }} />
            <span>DFA Visualizer</span>
          </div>
          <span className="badge-pill" style={{ backgroundColor: '#0369a1', color: '#e0f2fe' }}>BCS503</span>
        </NavLink>

        <NavLink to="/simulation-lab" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <div className="nav-link-left">
            <GitBranch size={18} style={{ color: '#2dd4bf' }} />
            <span>Routing Simulation</span>
          </div>
          <span className="badge-pill" style={{ backgroundColor: '#0f766e', color: '#ccfbf1' }}>BCS502</span>
        </NavLink>

        <NavLink to="/smart-queue" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <div className="nav-link-left">
            <ListOrdered size={18} style={{ color: '#fbbf24' }} />
            <span>Smart Queue Monitor</span>
          </div>
        </NavLink>
      </nav>

      {/* Footer Role Card */}
      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 600, color: '#e2e8f0' }}>Role Profile:</span>
          <span
            className="badge-pill"
            style={{
              backgroundColor:
                currentUser?.role === 'admin' ? '#ef4444' :
                currentUser?.role === 'handler' ? '#0ea5e9' : '#10b981',
              color: '#ffffff',
              textTransform: 'uppercase',
              fontSize: '0.65rem'
            }}
          >
            {currentUser?.role || 'Reporter'}
          </span>
        </div>
        <div style={{ color: '#94a3b8', fontSize: '0.76rem', marginTop: '2px' }}>
          {currentUser?.name || 'Academic Demo User'}
        </div>
        <div style={{ color: '#64748b', fontSize: '0.68rem', marginTop: '4px' }}>
          BCS503 Automata & BCS502 Networks
        </div>
      </div>
    </aside>
  );
};
