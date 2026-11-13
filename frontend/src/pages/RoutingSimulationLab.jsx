import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Server,
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';
import { simulationApi } from '../services/api';

export const RoutingSimulationLab = () => {
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState('scenario_1');
  const [simulationData, setSimulationData] = useState(null);
  const [currentStageIdx, setCurrentStageIdx] = useState(-1);
  const [running, setRunning] = useState(false);
  const [animating, setAnimating] = useState(false);

  // Custom simulation inputs
  const [customPatientId, setCustomPatientId] = useState('PAT112233-LABNY');
  const [customReportCode, setCustomReportCode] = useState('CRIT');
  const [customZoneId, setCustomZoneId] = useState('ZONE_1');
  const [primaryAvail, setPrimaryAvail] = useState('Available');
  const [primaryLoad, setPrimaryLoad] = useState(1);
  const [primaryCap, setPrimaryCap] = useState(4);
  const [backupAvail, setBackupAvail] = useState('Available');
  const [backupLoad, setBackupLoad] = useState(0);
  const [backupCap, setBackupCap] = useState(4);

  // Fetch predefined scenarios
  useEffect(() => {
    const fetchScenarios = async () => {
      try {
        const res = await simulationApi.getScenarios();
        setScenarios(res.data.scenarios || []);
      } catch (err) {
        console.error('Failed to load scenarios:', err);
      }
    };
    fetchScenarios();
  }, []);

  const runSelectedScenario = async (scenarioObj) => {
    try {
      setRunning(true);
      setCurrentStageIdx(-1);
      const res = await simulationApi.runSimulation(scenarioObj.payload);
      setSimulationData(res.data);
      setRunning(false);

      // Trigger animated progression
      setAnimating(true);
      if (res.data.stages) {
        let step = 0;
        const interval = setInterval(() => {
          if (step < res.data.stages.length) {
            setCurrentStageIdx(step);
            step += 1;
          } else {
            clearInterval(interval);
            setAnimating(false);
          }
        }, 800);
      }
    } catch (err) {
      console.error('Simulation execution failed:', err);
      setRunning(false);
      setAnimating(false);
    }
  };

  const handleRunPreset = (scenarioId) => {
    setSelectedScenarioId(scenarioId);
    const scen = scenarios.find((s) => s.id === scenarioId);
    if (scen) {
      runSelectedScenario(scen);
    }
  };

  const handleRunCustom = async () => {
    const customPayload = {
      patient_id: customPatientId,
      report_type: 'CBC',
      report_code: customReportCode,
      zone_id: customZoneId,
      description: 'Custom simulated report',
      simulate_primary_avail: primaryAvail,
      simulate_primary_load: parseInt(primaryLoad),
      simulate_primary_cap: parseInt(primaryCap),
      simulate_backup_avail: backupAvail,
      simulate_backup_load: parseInt(backupLoad),
      simulate_backup_cap: parseInt(backupCap)
    };

    try {
      setRunning(true);
      setCurrentStageIdx(-1);
      const res = await simulationApi.runSimulation(customPayload);
      setSimulationData(res.data);
      setRunning(false);

      setAnimating(true);
      if (res.data.stages) {
        let step = 0;
        const interval = setInterval(() => {
          if (step < res.data.stages.length) {
            setCurrentStageIdx(step);
            step += 1;
          } else {
            clearInterval(interval);
            setAnimating(false);
          }
        }, 800);
      }
    } catch (err) {
      console.error('Custom simulation error:', err);
      setRunning(false);
      setAnimating(false);
    }
  };

  // Run initial scenario on load
  useEffect(() => {
    if (scenarios.length > 0) {
      handleRunPreset('scenario_1');
    }
  }, [scenarios]);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Routing Simulation Lab</h1>
          <p className="page-subtitle">
            Computer Networks (BCS502) – Priority Routing, Handler Availability, Capacity Overflow & Escalation
          </p>
        </div>
        <div>
          <span className="badge-pill" style={{ backgroundColor: '#0d9488', color: '#ffffff', fontSize: '0.8rem' }}>
            Live Dispatch Engine (Dry-Run Mode)
          </span>
        </div>
      </div>

      {/* Preset Scenario Tabs */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary-navy)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={16} style={{ color: 'var(--accent-teal)' }} /> Predefined Academic Test Scenarios:
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
          {scenarios.map((scen) => {
            const isSelected = selectedScenarioId === scen.id;
            return (
              <button
                key={scen.id}
                onClick={() => handleRunPreset(scen.id)}
                disabled={animating}
                style={{
                  textAlign: 'left',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: isSelected ? '2px solid var(--accent-teal)' : '1px solid var(--border-color)',
                  backgroundColor: isSelected ? '#f0fdfa' : '#ffffff',
                  cursor: animating ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: isSelected ? '#0f766e' : '#0f172a' }}>
                  {scen.name}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px', lineHeight: 1.4 }}>
                  {scen.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pipeline Progression Stage Visualizer */}
      <div className="card" style={{ marginBottom: '24px', backgroundColor: '#0f172a', color: '#ffffff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Dispatch Telemetry Pipeline Execution
          </span>
          <span style={{ fontSize: '0.8rem', color: '#2dd4bf', fontWeight: 600 }}>
            {animating ? 'Processing Node Step...' : 'Simulation Halted'}
          </span>
        </div>

        {/* Visual Pipeline Nodes */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            overflowX: 'auto',
            padding: '10px 0 20px 0'
          }}
        >
          {['1. Intake & Validation', '2. Classification', '3. Zone Lookup', '4. Primary Doctor', '5. Backup / Escalation', '6. Final Destination'].map((stageName, idx) => {
            const isReached = currentStageIdx >= idx;
            const isCurrent = currentStageIdx === idx;

            return (
              <React.Fragment key={idx}>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    minWidth: '110px',
                    textAlign: 'center'
                  }}
                >
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: isCurrent ? '#0d9488' : isReached ? '#1e293b' : '#334155',
                      border: isCurrent ? '2px solid #2dd4bf' : isReached ? '2px solid #0d9488' : '1px solid #475569',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isCurrent || isReached ? '#ffffff' : '#94a3b8',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      boxShadow: isCurrent ? '0 0 15px rgba(45, 212, 191, 0.5)' : 'none',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {idx + 1}
                  </div>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      color: isCurrent ? '#2dd4bf' : isReached ? '#cbd5e1' : '#64748b',
                      fontWeight: isCurrent ? 700 : 500,
                      marginTop: '8px'
                    }}
                  >
                    {stageName}
                  </span>
                </div>
                {idx < 5 && (
                  <div
                    style={{
                      flex: 1,
                      height: '2px',
                      backgroundColor: currentStageIdx > idx ? '#0d9488' : '#334155',
                      minWidth: '20px',
                      transition: 'background 0.3s ease'
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Live Step Log Stream */}
        <div style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
          <h4 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', marginBottom: '8px' }}>
            Kernel Telemetry Traces
          </h4>
          {simulationData?.stages && simulationData.stages.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {simulationData.stages.slice(0, currentStageIdx + 1).map((stg, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: '0.82rem',
                    color: '#e2e8f0',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px'
                  }}
                >
                  <ArrowRight size={14} style={{ color: '#2dd4bf', marginTop: '3px', flexShrink: 0 }} />
                  <div>
                    <strong style={{ color: '#38bdf8' }}>{stg.stage}:</strong> {stg.details}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: '#64748b', fontSize: '0.82rem' }}>Awaiting scenario trigger...</div>
          )}
        </div>
      </div>

      {/* Outcome Banner & Custom Parameters Form */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px' }}>
        {/* Final Decision Card */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary-navy)', marginBottom: '14px' }}>
            Routing Decision Telemetry
          </h3>

          {simulationData?.final_outcome ? (
            <div
              style={{
                backgroundColor:
                  simulationData.final_outcome.status.includes('REJECTED') ? '#fef2f2' :
                  simulationData.final_outcome.status.includes('ESCALATED') ? '#fff7ed' : '#f0fdf4',
                border: `1px solid ${
                  simulationData.final_outcome.status.includes('REJECTED') ? '#fecaca' :
                  simulationData.final_outcome.status.includes('ESCALATED') ? '#fed7aa' : '#bbf7d0'
                }`,
                borderRadius: '8px',
                padding: '18px'
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>
                Algorithmic Outcome
              </div>
              <div
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  color:
                    simulationData.final_outcome.status.includes('REJECTED') ? '#dc2626' :
                    simulationData.final_outcome.status.includes('ESCALATED') ? '#c2410c' : '#15803d',
                  marginTop: '2px'
                }}
              >
                {simulationData.final_outcome.status}
              </div>

              <div style={{ fontSize: '0.88rem', color: '#1e293b', marginTop: '8px', fontWeight: 600 }}>
                Target: {simulationData.final_outcome.destination}
              </div>

              <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '6px', lineHeight: 1.5 }}>
                {simulationData.final_outcome.explanation}
              </div>
            </div>
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
              Execute scenario to inspect final dispatch decision.
            </div>
          )}
        </div>

        {/* Custom Scenario Playground */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary-navy)', marginBottom: '14px' }}>
            Interactive Custom Dispatch Playground
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group" style={{ marginBottom: '10px' }}>
              <label className="form-label" style={{ fontSize: '0.78rem' }}>Patient ID</label>
              <input
                type="text"
                className="form-input font-mono"
                style={{ fontSize: '0.85rem', padding: '6px 10px' }}
                value={customPatientId}
                onChange={(e) => setCustomPatientId(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '10px' }}>
              <label className="form-label" style={{ fontSize: '0.78rem' }}>Report Code</label>
              <select
                className="form-select"
                style={{ fontSize: '0.85rem', padding: '6px 10px' }}
                value={customReportCode}
                onChange={(e) => setCustomReportCode(e.target.value)}
              >
                <option value="CRIT">CRIT (Critical)</option>
                <option value="STAT">STAT (Stat)</option>
                <option value="ROUT">ROUT (Routine)</option>
                <option value="PEND">PEND (Pending)</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '10px' }}>
              <label className="form-label" style={{ fontSize: '0.78rem' }}>Primary Doctor Avail</label>
              <select
                className="form-select"
                style={{ fontSize: '0.85rem', padding: '6px 10px' }}
                value={primaryAvail}
                onChange={(e) => setPrimaryAvail(e.target.value)}
              >
                <option value="Available">Available</option>
                <option value="Unavailable">Unavailable</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '10px' }}>
              <label className="form-label" style={{ fontSize: '0.78rem' }}>Primary Load / Cap</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="number"
                  className="form-input"
                  style={{ fontSize: '0.85rem', padding: '6px' }}
                  value={primaryLoad}
                  onChange={(e) => setPrimaryLoad(e.target.value)}
                  placeholder="Load"
                />
                <input
                  type="number"
                  className="form-input"
                  style={{ fontSize: '0.85rem', padding: '6px' }}
                  value={primaryCap}
                  onChange={(e) => setPrimaryCap(e.target.value)}
                  placeholder="Cap"
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '10px' }}>
              <label className="form-label" style={{ fontSize: '0.78rem' }}>Backup Doctor Avail</label>
              <select
                className="form-select"
                style={{ fontSize: '0.85rem', padding: '6px 10px' }}
                value={backupAvail}
                onChange={(e) => setBackupAvail(e.target.value)}
              >
                <option value="Available">Available</option>
                <option value="Unavailable">Unavailable</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '10px' }}>
              <label className="form-label" style={{ fontSize: '0.78rem' }}>Backup Load / Cap</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="number"
                  className="form-input"
                  style={{ fontSize: '0.85rem', padding: '6px' }}
                  value={backupLoad}
                  onChange={(e) => setBackupLoad(e.target.value)}
                  placeholder="Load"
                />
                <input
                  type="number"
                  className="form-input"
                  style={{ fontSize: '0.85rem', padding: '6px' }}
                  value={backupCap}
                  onChange={(e) => setBackupCap(e.target.value)}
                  placeholder="Cap"
                />
              </div>
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleRunCustom}
            disabled={animating}
            style={{ width: '100%', marginTop: '10px' }}
          >
            Run Custom Simulation
          </button>
        </div>
      </div>
    </div>
  );
};
