import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FilePlus,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Cpu,
  Clock,
  ArrowRight,
  Sparkles,
  Info
} from 'lucide-react';
import { reportApi, validationApi, routingApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { CategoryBadge, WorkflowBadge } from '../components/StatusBadge';
import { SlaTimerBadge } from '../components/SlaTimerBadge';
import { ReportModal } from '../components/ReportModal';

export const ReportSubmission = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // Form State
  const [patientId, setPatientId] = useState('PAT102938-LABNY');
  const [reportType, setReportType] = useState('TROP');
  const [reportCode, setReportCode] = useState('CRIT');
  const [zoneId, setZoneId] = useState('ZONE_1');
  const [description, setDescription] = useState('Troponin I level 4.25 ng/mL. Patient presenting with acute substernal chest discomfort in CCU.');
  const [isEmergency, setIsEmergency] = useState(false);

  // Reference options from backend
  const [supportedTypes, setSupportedTypes] = useState([]);
  const [zones, setZones] = useState([]);

  // Live Validation state
  const [liveValidation, setLiveValidation] = useState(null);
  const [validating, setValidating] = useState(false);

  // Submission outcome state
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [selectedReportId, setSelectedReportId] = useState(null);

  // Fetch supported types and zones
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const [typesRes, zonesRes] = await Promise.all([
          validationApi.getSupportedReportTypes(),
          routingApi.getZones()
        ]);
        setSupportedTypes(typesRes.data.supported_types || []);
        setZones(zonesRes.data.zones || []);
      } catch (err) {
        console.error('Error fetching submission configs:', err);
      }
    };
    fetchConfig();
  }, []);

  // Live validate Patient ID as user types
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (patientId.trim()) {
        try {
          setValidating(true);
          const res = await validationApi.compareValidation(patientId.trim());
          setLiveValidation(res.data);
        } catch (err) {
          console.error('Validation error:', err);
        } finally {
          setValidating(false);
        }
      } else {
        setLiveValidation(null);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [patientId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setSubmissionResult(null);

      const payload = {
        patient_id: patientId.trim(),
        report_type: reportType,
        report_code: reportCode.trim().toUpperCase(),
        zone_id: zoneId,
        description: description.trim(),
        reporter_id: currentUser?.user_id || 'USR-001',
        is_emergency_override: isEmergency
      };

      const res = await reportApi.submitReport(payload);
      setSubmissionResult({
        success: true,
        data: res.data
      });
    } catch (err) {
      console.error('Report submission failed:', err);
      setSubmissionResult({
        success: false,
        data: err.response?.data || { error: 'Network or server error during submission.' }
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFillSample = (samplePatient, sampleType, sampleCode, sampleZone, sampleDesc, emergency = false) => {
    setPatientId(samplePatient);
    setReportType(sampleType);
    setReportCode(sampleCode);
    setZoneId(sampleZone);
    setDescription(sampleDesc);
    setIsEmergency(emergency);
    setSubmissionResult(null);
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Pathology Report Submission</h1>
          <p className="page-subtitle">
            Enter structured pathology observations for DFA patient verification and intelligent dispatch
          </p>
        </div>
        <div>
          <button className="btn btn-secondary" onClick={() => navigate('/dfa-visualizer')}>
            <Cpu size={15} /> Open DFA Visualizer Lab
          </button>
        </div>
      </div>

      {/* Preset Fictional Demo Samples */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '12px 18px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap'
        }}
      >
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={14} style={{ color: 'var(--accent-blue)' }} /> Demonstration Presets:
        </span>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => handleFillSample('PAT102938-LABNY', 'TROP', 'CRIT', 'ZONE_1', 'Serum Troponin I elevated at 4.82 ng/mL in ICU bed 2. Critical acute coronary syndrome.')}
        >
          Critical Cardiac (ICU)
        </button>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => handleFillSample('PAT884920-LABCA', 'COAG', 'STAT', 'ZONE_2', 'Stat Coagulation INR 4.2 in ED trauma resuscitation room. Bleeding hazard.')}
        >
          Stat Coagulation (ED)
        </button>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => handleFillSample('PAT445129-LABTX', 'CBC', 'ROUT', 'ZONE_3', 'Routine preoperative CBC. Hemoglobin 13.8 g/dL, normal platelet count.')}
        >
          Routine CBC (Cardio)
        </button>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => handleFillSample('PAT999999-LABFL', 'HIST', 'PEND', 'ZONE_4', 'Tissue biopsy frozen section pending second pathologist immuno-stain verification.')}
        >
          Pending Biopsy (Inpatient)
        </button>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => handleFillSample('INVALID-BARCODE', 'CBC', 'CRIT', 'ZONE_1', 'Malformed patient label test to observe DFA rejection.')}
          style={{ borderColor: '#fecaca', color: '#dc2626' }}
        >
          Malformed ID (Reject Test)
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px' }}>
        {/* Submission Form */}
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-navy)', marginBottom: '18px' }}>
            Structured Specimen Intake Form
          </h3>

          <form onSubmit={handleSubmit}>
            {/* Patient ID with Live Automata Indicator */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Patient Identifier (Formal Automata Input) *</span>
                {liveValidation && (
                  <span style={{ fontSize: '0.74rem', fontWeight: 600, color: liveValidation.final_valid ? '#10b981' : '#ef4444' }}>
                    {liveValidation.final_valid ? 'DFA Accepted (q15)' : `DFA Halted (${liveValidation.dfa.final_state})`}
                  </span>
                )}
              </label>
              <input
                type="text"
                className="form-input font-mono"
                style={{
                  fontSize: '1rem',
                  fontWeight: 600,
                  borderColor: liveValidation ? (liveValidation.final_valid ? '#10b981' : '#ef4444') : 'var(--border-color)'
                }}
                value={patientId}
                onChange={(e) => setPatientId(e.target.value.toUpperCase())}
                placeholder="PAT123456-LABAB"
                required
              />
              <div className="form-help">
                Required format: <code className="font-mono">PAT[6-digits]-LAB[2-letters]</code> (e.g. PAT123456-LABAB). Verified by DFA states q0 → q15.
              </div>
            </div>

            {/* Diagnostic Report Panel and Classification Code */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Report Diagnostic Type *</label>
                <select
                  className="form-select"
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  required
                >
                  {supportedTypes.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.code} - {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Report Code *</label>
                <select
                  className="form-select"
                  value={reportCode}
                  onChange={(e) => setReportCode(e.target.value)}
                  required
                >
                  <option value="CRIT">CRIT (Critical Urgency - P1)</option>
                  <option value="STAT">STAT (Stat Immediate - P2)</option>
                  <option value="ROUT">ROUT (Routine Queue - P3)</option>
                  <option value="PEND">PEND (Pending Verification)</option>
                  <option value="UNKNOWN_TEST">UNKNOWN_TEST (Error Correction)</option>
                </select>
              </div>
            </div>

            {/* Ward Zone Selection */}
            <div className="form-group">
              <label className="form-label">Ward Destination Zone *</label>
              <select
                className="form-select"
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value)}
                required
              >
                {zones.map((z) => (
                  <option key={z.zone_id} value={z.zone_id}>
                    {z.zone_id}: {z.zone_name}
                  </option>
                ))}
                <option value="ZONE_UNKNOWN_99">ZONE_UNKNOWN_99 (Test Central Fallback)</option>
              </select>
            </div>

            {/* Description / Findings */}
            <div className="form-group">
              <label className="form-label">Clinical Findings & Pathology Values *</label>
              <textarea
                className="form-textarea"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Include quantitative results, reference range deviations, and specimen comments..."
                required
              />
            </div>

            {/* Clinical Emergency Override */}
            <div
              style={{
                backgroundColor: isEmergency ? '#fef2f2' : '#f8fafc',
                border: `1px solid ${isEmergency ? '#fecaca' : 'var(--border-color)'}`,
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <input
                type="checkbox"
                id="emergencyOverride"
                checked={isEmergency}
                onChange={(e) => setIsEmergency(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label htmlFor="emergencyOverride" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>
                <strong style={{ color: isEmergency ? '#ef4444' : '#0f172a' }}>
                  Emergency Clinical Priority Override
                </strong>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Elevates any report code to Critical (Priority 1) dispatch protocol.
                </div>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: '0.95rem' }}
              disabled={submitting}
            >
              {submitting ? 'Executing DFA Validation & Dispatch...' : 'Validate & Dispatch Report'}
            </button>
          </form>
        </div>

        {/* Real-time Telemetry & Result Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Dual Validation Telemetry Card */}
          <div className="card">
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary-navy)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} style={{ color: 'var(--accent-blue)' }} /> Automata & Formal Language Verification
            </h3>

            {liveValidation ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div
                    style={{
                      border: `1px solid ${liveValidation.dfa.valid ? '#a7f3d0' : '#fecaca'}`,
                      backgroundColor: liveValidation.dfa.valid ? '#ecfdf5' : '#fef2f2',
                      padding: '12px',
                      borderRadius: '8px'
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#475569' }}>
                      Python DFA Result
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: liveValidation.dfa.valid ? '#059669' : '#dc2626', marginTop: '2px' }}>
                      {liveValidation.dfa.valid ? 'ACCEPTED' : 'REJECTED'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
                      Halted at: <code className="font-mono">{liveValidation.dfa.final_state}</code>
                    </div>
                  </div>

                  <div
                    style={{
                      border: `1px solid ${liveValidation.regex.valid ? '#a7f3d0' : '#fecaca'}`,
                      backgroundColor: liveValidation.regex.valid ? '#ecfdf5' : '#fef2f2',
                      padding: '12px',
                      borderRadius: '8px'
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#475569' }}>
                      Independent Regex Result
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: liveValidation.regex.valid ? '#059669' : '#dc2626', marginTop: '2px' }}>
                      {liveValidation.regex.valid ? 'MATCHED' : 'NO MATCH'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
                      fullmatch pattern check
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: liveValidation.agreement ? '#f0fdf4' : '#fff1f2',
                    border: `1px solid ${liveValidation.agreement ? '#bbf7d0' : '#fecdd3'}`,
                    fontSize: '0.78rem',
                    color: liveValidation.agreement ? '#166534' : '#9f1239',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <CheckCircle2 size={14} />
                  <span>
                    DFA and Regular Expression implementations <strong>{liveValidation.agreement ? 'are in complete agreement' : 'disagree (Anomaly detected)'}</strong>.
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ color: '#64748b', fontSize: '0.85rem' }}>
                Type in the patient ID field to inspect live character-by-character automata transitions.
              </div>
            )}
          </div>

          {/* Submission Outcome Display */}
          {submissionResult && (
            <div
              className="card"
              style={{
                borderLeft: `5px solid ${submissionResult.success ? '#10b981' : '#ef4444'}`,
                backgroundColor: submissionResult.success ? '#ffffff' : '#fff5f5'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                {submissionResult.success ? (
                  <CheckCircle2 size={24} style={{ color: '#10b981' }} />
                ) : (
                  <AlertCircle size={24} style={{ color: '#ef4444' }} />
                )}
                <div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--primary-navy)' }}>
                    {submissionResult.success ? 'Report Dispatched & Persisted' : 'Submission Rejected'}
                  </h4>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    {submissionResult.data.message || submissionResult.data.error}
                  </div>
                </div>
              </div>

              {submissionResult.success && submissionResult.data.report && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div
                    style={{
                      backgroundColor: '#f8fafc',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '10px',
                      fontSize: '0.85rem'
                    }}
                  >
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem' }}>Report ID</span>
                      <strong className="font-mono" style={{ color: 'var(--accent-blue)', fontSize: '0.95rem' }}>
                        {submissionResult.data.report.report_id}
                      </strong>
                    </div>

                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem' }}>Classification</span>
                      <CategoryBadge category={submissionResult.data.report.category} />
                    </div>

                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem' }}>Routing Outcome</span>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>
                        {submissionResult.data.dispatch?.status || 'Queued'}
                      </span>
                    </div>

                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem' }}>Assigned Handler</span>
                      <span style={{ fontWeight: 600, color: '#0369a1' }}>
                        {submissionResult.data.dispatch?.assigned_handler_name || submissionResult.data.dispatch?.destination_queue || 'None'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setSelectedReportId(submissionResult.data.report.report_id)}
                      style={{ flex: 1 }}
                    >
                      Inspect Full Timeline Modal
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => navigate('/smart-queue')}
                    >
                      View in Priority Queue <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {selectedReportId && (
        <ReportModal
          reportId={selectedReportId}
          onClose={() => setSelectedReportId(null)}
        />
      )}
    </div>
  );
};
