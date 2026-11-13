import React, { useState, useEffect } from 'react';
import {
  Play,
  SkipForward,
  RotateCcw,
  Pause,
  ShieldCheck,
  Cpu,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { validationApi } from '../services/api';

export const DfaVisualizer = () => {
  const [inputString, setInputString] = useState('PAT123456-LABAB');
  const [traceData, setTraceData] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [regexResult, setRegexResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // States layout in an SVG coordinate grid
  // 16 regular states + DEAD state
  const stateCoordinates = {
    'q0': { x: 50, y: 80, label: 'q0' },
    'q1': { x: 130, y: 80, label: 'q1' },
    'q2': { x: 210, y: 80, label: 'q2' },
    'q3': { x: 290, y: 80, label: 'q3' },
    'q4': { x: 370, y: 80, label: 'q4' },
    'q5': { x: 450, y: 80, label: 'q5' },
    'q6': { x: 530, y: 80, label: 'q6' },
    'q7': { x: 610, y: 80, label: 'q7' },
    'q8': { x: 690, y: 80, label: 'q8' },
    'q9': { x: 770, y: 80, label: 'q9' },
    'q10': { x: 770, y: 190, label: 'q10' },
    'q11': { x: 690, y: 190, label: 'q11' },
    'q12': { x: 610, y: 190, label: 'q12' },
    'q13': { x: 530, y: 190, label: 'q13' },
    'q14': { x: 450, y: 190, label: 'q14' },
    'q15': { x: 370, y: 190, label: 'q15', accepting: true },
    'DEAD': { x: 200, y: 190, label: 'DEAD', dead: true }
  };

  // Run backend DFA trace
  const loadTrace = async (textToValidate) => {
    try {
      setLoading(true);
      const text = textToValidate !== undefined ? textToValidate : inputString;
      const [dfaRes, regexRes] = await Promise.all([
        validationApi.validateDfa(text),
        validationApi.validateRegex(text)
      ]);
      setTraceData(dfaRes.data);
      setRegexResult(regexRes.data);
      setCurrentStepIndex(-1);
      setIsPlaying(false);
    } catch (err) {
      console.error('Failed to load DFA trace:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrace(inputString);
  }, []);

  // Automatic playback timer
  useEffect(() => {
    let timer;
    if (isPlaying && traceData && traceData.steps) {
      if (currentStepIndex < traceData.steps.length - 1) {
        timer = setTimeout(() => {
          setCurrentStepIndex((prev) => prev + 1);
        }, 700);
      } else {
        setIsPlaying(false);
      }
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStepIndex, traceData]);

  const handleStepForward = () => {
    if (traceData && traceData.steps && currentStepIndex < traceData.steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStepIndex(-1);
  };

  const handleRunFull = () => {
    handleReset();
    setIsPlaying(true);
  };

  const handlePreset = (preset) => {
    setInputString(preset);
    loadTrace(preset);
  };

  // Current active state determination
  let activeState = 'q0';
  let lastChar = null;
  let currentStep = null;

  if (traceData && traceData.steps && currentStepIndex >= 0 && currentStepIndex < traceData.steps.length) {
    currentStep = traceData.steps[currentStepIndex];
    activeState = currentStep.to_state;
    lastChar = currentStep.char;
  }

  const isCompleted = traceData && traceData.steps && currentStepIndex === traceData.steps.length - 1;
  const isAccepted = isCompleted && activeState === 'q15';
  const isRejected = isCompleted && activeState !== 'q15';

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">DFA Visualizer – Interactive Automata Lab</h1>
          <p className="page-subtitle">
            Formal Language Validation: Deterministic Finite Automaton M = (Q, Σ, δ, q0, F) for PAT[6-digits]-LAB[2-letters]
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge-pill" style={{ backgroundColor: '#0284c7', color: '#ffffff', fontSize: '0.8rem' }}>
            BCS503 Theory
          </span>
        </div>
      </div>

      {/* Input & Presets Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '300px' }}>
            <label className="form-label">
              Patient Identifier Input String (Alphabet Σ = {'{'}A-Z, 0-9, -{'}'})
            </label>
            <input
              type="text"
              className="form-input font-mono"
              style={{ fontSize: '1.1rem', fontWeight: 700 }}
              value={inputString}
              onChange={(e) => {
                const val = e.target.value.toUpperCase();
                setInputString(val);
                loadTrace(val);
              }}
              placeholder="e.g. PAT123456-LABAB"
            />
          </div>

          {/* Playback Controls */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="btn btn-primary"
              onClick={isPlaying ? () => setIsPlaying(false) : handleRunFull}
              disabled={loading || !traceData?.steps?.length}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              {isPlaying ? 'Pause' : 'Run Animation'}
            </button>

            <button
              className="btn btn-secondary"
              onClick={handleStepForward}
              disabled={loading || isPlaying || isCompleted}
            >
              <SkipForward size={16} /> Step-by-Step
            </button>

            <button className="btn btn-secondary" onClick={handleReset}>
              <RotateCcw size={16} /> Reset
            </button>
          </div>
        </div>

        {/* Preset Test Cases */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={13} /> Quick Test Presets:
          </span>
          <button className="btn btn-secondary btn-sm" onClick={() => handlePreset('PAT123456-LABAB')}>
            Valid Standard (PAT123456-LABAB)
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => handlePreset('PAT992817-LABNY')}>
            Valid Variant (PAT992817-LABNY)
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => handlePreset('PAT12345-LABAB')} style={{ color: '#dc2626' }}>
            5 Digits (Short)
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => handlePreset('PAT1234567-LABAB')} style={{ color: '#dc2626' }}>
            7 Digits (Long)
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => handlePreset('MED123456-LABAB')} style={{ color: '#dc2626' }}>
            Bad Prefix (MED)
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => handlePreset('PAT123456LABAB')} style={{ color: '#dc2626' }}>
            Missing Hyphen
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => handlePreset('PAT123456-LAB12')} style={{ color: '#dc2626' }}>
            Numeric Suffix
          </button>
        </div>
      </div>

      {/* Character Sequence Progress Bar */}
      <div
        className="card"
        style={{
          marginBottom: '24px',
          backgroundColor: '#0f172a',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Input Tape Scan (Character Processing Stream)
          </span>
          <span style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 600 }}>
            Step: {currentStepIndex + 1} of {traceData?.steps?.length || 0}
          </span>
        </div>

        {/* Character Tape Boxes */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          {inputString.split('').map((char, idx) => {
            const isProcessed = idx <= currentStepIndex;
            const isCurrent = idx === currentStepIndex;

            return (
              <div
                key={idx}
                style={{
                  width: '38px',
                  height: '46px',
                  borderRadius: '6px',
                  border: isCurrent
                    ? '2px solid #38bdf8'
                    : isProcessed
                    ? '1px solid #334155'
                    : '1px dashed #334155',
                  backgroundColor: isCurrent ? '#0369a1' : isProcessed ? '#1e293b' : 'transparent',
                  color: isCurrent ? '#ffffff' : isProcessed ? '#e2e8f0' : '#64748b',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '1.15rem',
                  fontFamily: 'JetBrains Mono, monospace',
                  boxShadow: isCurrent ? '0 0 12px rgba(56, 189, 248, 0.5)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <span>{char}</span>
                <span style={{ fontSize: '0.55rem', color: isCurrent ? '#bae6fd' : '#64748b', fontWeight: 500 }}>
                  {idx}
                </span>
              </div>
            );
          })}
        </div>

        {/* Step details text */}
        <div style={{ fontSize: '0.85rem', color: '#cbd5e1', borderTop: '1px solid #334155', paddingTop: '10px' }}>
          {currentStep ? (
            <div>
              Read character <strong className="font-mono" style={{ color: '#38bdf8' }}>'{currentStep.char}'</strong>: Transitioned from{' '}
              <strong className="font-mono">{currentStep.from_state}</strong> to{' '}
              <strong className="font-mono" style={{ color: currentStep.is_dead ? '#ef4444' : '#38bdf8' }}>
                {currentStep.to_state}
              </strong>{' '}
              ({currentStep.to_desc})
            </div>
          ) : (
            <div>Machine at start state <strong>q0</strong>. Click "Run Animation" or "Step-by-Step" to begin execution.</div>
          )}
        </div>
      </div>

      {/* SVG Automata State Graph */}
      <div className="card" style={{ marginBottom: '24px', overflowX: 'auto', backgroundColor: '#ffffff' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary-navy)', marginBottom: '14px' }}>
          DFA Transition Graph (q0 → q15 & DEAD State)
        </h3>

        <svg viewBox="0 0 850 260" style={{ width: '100%', minWidth: '800px', height: '260px' }}>
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="18" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
            </marker>
            <marker id="arrow-active" viewBox="0 0 10 10" refX="18" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#0284c7" />
            </marker>
            <marker id="arrow-dead" viewBox="0 0 10 10" refX="18" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
            </marker>
          </defs>

          {/* Row 1 Transitions q0 to q9 */}
          {['q0', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8'].map((st, i) => {
            const nextSt = `q${i + 1}`;
            const c1 = stateCoordinates[st];
            const c2 = stateCoordinates[nextSt];
            const isActive = currentStep?.from_state === st && currentStep?.to_state === nextSt;

            return (
              <g key={st}>
                <line
                  x1={c1.x}
                  y1={c1.y}
                  x2={c2.x}
                  y2={c2.y}
                  stroke={isActive ? '#0284c7' : '#cbd5e1'}
                  strokeWidth={isActive ? '3' : '1.5'}
                  markerEnd={isActive ? 'url(#arrow-active)' : 'url(#arrow)'}
                />
              </g>
            );
          })}

          {/* Turn transition q9 -> q10 */}
          <line
            x1={stateCoordinates['q9'].x}
            y1={stateCoordinates['q9'].y}
            x2={stateCoordinates['q10'].x}
            y2={stateCoordinates['q10'].y}
            stroke={currentStep?.from_state === 'q9' && currentStep?.to_state === 'q10' ? '#0284c7' : '#cbd5e1'}
            strokeWidth={currentStep?.from_state === 'q9' && currentStep?.to_state === 'q10' ? '3' : '1.5'}
            markerEnd="url(#arrow)"
          />

          {/* Row 2 Transitions q10 down to q15 */}
          {['q10', 'q11', 'q12', 'q13', 'q14'].map((st, i) => {
            const nextSt = `q${11 + i}`;
            const c1 = stateCoordinates[st];
            const c2 = stateCoordinates[nextSt];
            const isActive = currentStep?.from_state === st && currentStep?.to_state === nextSt;

            return (
              <g key={st}>
                <line
                  x1={c1.x}
                  y1={c1.y}
                  x2={c2.x}
                  y2={c2.y}
                  stroke={isActive ? '#0284c7' : '#cbd5e1'}
                  strokeWidth={isActive ? '3' : '1.5'}
                  markerEnd={isActive ? 'url(#arrow-active)' : 'url(#arrow)'}
                />
              </g>
            );
          })}

          {/* Render State Circles */}
          {Object.entries(stateCoordinates).map(([stName, coord]) => {
            const isActive = activeState === stName;
            const isAccepting = coord.accepting;
            const isDead = coord.dead;

            let fillColor = '#ffffff';
            let strokeColor = '#94a3b8';
            let textColor = '#1e293b';

            if (isDead) {
              strokeColor = '#f87171';
              fillColor = isActive ? '#ef4444' : '#fef2f2';
              textColor = isActive ? '#ffffff' : '#b91c1c';
            } else if (isAccepting) {
              strokeColor = '#10b981';
              fillColor = isActive ? '#10b981' : '#ecfdf5';
              textColor = isActive ? '#ffffff' : '#047857';
            } else if (isActive) {
              fillColor = '#0284c7';
              strokeColor = '#0369a1';
              textColor = '#ffffff';
            }

            return (
              <g key={stName}>
                {/* Double ring for accepting state q15 */}
                {isAccepting && (
                  <circle
                    cx={coord.x}
                    cy={coord.y}
                    r="24"
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="1.5"
                  />
                )}

                {/* State Node Circle */}
                <circle
                  cx={coord.x}
                  cy={coord.y}
                  r="20"
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={isActive ? '3' : '2'}
                  filter={isActive ? 'drop-shadow(0px 3px 6px rgba(2, 132, 199, 0.4))' : 'none'}
                />

                {/* State Label */}
                <text
                  x={coord.x}
                  y={coord.y + 5}
                  textAnchor="middle"
                  fill={textColor}
                  fontSize={isDead ? '10' : '12'}
                  fontWeight="700"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {coord.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '12px', fontSize: '0.78rem', color: '#64748b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#0284c7' }} />
            <span>Active Current State</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid #10b981', backgroundColor: '#ecfdf5' }} />
            <span>Accepting Final State (q15)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid #ef4444', backgroundColor: '#fef2f2' }} />
            <span>Dead Rejection State</span>
          </div>
        </div>
      </div>

      {/* Outcome & Comparison Panels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
        {/* DFA Acceptance Card */}
        <div className="card">
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary-navy)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={18} style={{ color: 'var(--accent-blue)' }} /> DFA Execution Evaluation
          </h4>
          <div
            style={{
              padding: '16px',
              borderRadius: '8px',
              backgroundColor: isCompleted ? (isAccepted ? '#ecfdf5' : '#fef2f2') : '#f8fafc',
              border: `1px solid ${isCompleted ? (isAccepted ? '#a7f3d0' : '#fecaca') : 'var(--border-color)'}`
            }}
          >
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: isCompleted ? (isAccepted ? '#059669' : '#dc2626') : '#64748b' }}>
              {!isCompleted ? 'IN TRANSITION' : isAccepted ? 'ACCEPTED IN q15' : 'REJECTED (DEAD STATE)'}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '6px', lineHeight: 1.5 }}>
              {traceData?.reason}
            </div>
          </div>
        </div>

        {/* Regular Expression Comparison Card */}
        <div className="card">
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary-navy)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={18} style={{ color: '#8b5cf6' }} /> Equivalent Regular Expression Check
          </h4>
          <div
            style={{
              padding: '16px',
              borderRadius: '8px',
              backgroundColor: regexResult?.valid ? '#ecfdf5' : '#fef2f2',
              border: `1px solid ${regexResult?.valid ? '#a7f3d0' : '#fecaca'}`
            }}
          >
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Python re.fullmatch Evaluation:</div>
            <div className="font-mono" style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155', marginTop: '2px' }}>
              ^PAT[0-9]{'{6}'}-LAB[A-Z]{'{2}'}$
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: regexResult?.valid ? '#059669' : '#dc2626', marginTop: '6px' }}>
              {regexResult?.valid ? 'REGEX MATCHED' : 'REGEX FAILED'}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '4px' }}>
              DFA and Regex agreement: <strong>{traceData?.valid === regexResult?.valid ? 'YES (100% Concordance)' : 'NO'}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
