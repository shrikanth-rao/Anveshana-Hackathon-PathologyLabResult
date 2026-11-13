import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';

// Pages
import { OverviewDashboard } from './pages/OverviewDashboard';
import { ReportSubmission } from './pages/ReportSubmission';
import { ReportManagement } from './pages/ReportManagement';
import { UserDashboard } from './pages/UserDashboard';
import { HandlerDashboard } from './pages/HandlerDashboard';
import { RoutingManagement } from './pages/RoutingManagement';
import { AnalyticsDashboard } from './pages/AnalyticsDashboard';
import { DfaVisualizer } from './pages/DfaVisualizer';
import { RoutingSimulationLab } from './pages/RoutingSimulationLab';
import { SmartQueueView } from './pages/SmartQueueView';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-container">
          <Sidebar />
          <div className="main-wrapper">
            <Navbar />
            <main>
              <Routes>
                <Route path="/" element={<OverviewDashboard />} />
                <Route path="/submit" element={<ReportSubmission />} />
                <Route path="/reports" element={<ReportManagement />} />
                <Route path="/user-dashboard" element={<UserDashboard />} />
                <Route path="/handler-dashboard" element={<HandlerDashboard />} />
                <Route path="/routing" element={<RoutingManagement />} />
                <Route path="/analytics" element={<AnalyticsDashboard />} />
                <Route path="/dfa-visualizer" element={<DfaVisualizer />} />
                <Route path="/simulation-lab" element={<RoutingSimulationLab />} />
                <Route path="/smart-queue" element={<SmartQueueView />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
