import React, { useState, useEffect } from 'react';
import {
  Network,
  Shield,
  RefreshCw,
  Edit2,
  Check,
  X,
  User,
  Users,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { routingApi, handlerApi } from '../services/api';

export const RoutingManagement = () => {
  const [routes, setRoutes] = useState([]);
  const [handlers, setHandlers] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [editPrimary, setEditPrimary] = useState('');
  const [editBackup, setEditBackup] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [routingRes, handlersRes, eventsRes] = await Promise.all([
        routingApi.getRoutingRules(),
        handlerApi.getHandlers(),
        routingApi.getDispatchEvents(15)
      ]);
      setRoutes(routingRes.data.routing_table || []);
      setHandlers(handlersRes.data.handlers || []);
      setEvents(eventsRes.data.events || []);
    } catch (err) {
      console.error('Failed to load routing data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStartEdit = (rule) => {
    setEditingRuleId(rule.routing_rule_id);
    setEditPrimary(rule.primary_handler?.handler_id || '');
    setEditBackup(rule.backup_handler?.handler_id || '');
  };

  const handleSaveEdit = async (ruleId) => {
    try {
      setSaving(true);
      await routingApi.updateRoutingRule(ruleId, {
        primary_handler_id: editPrimary || null,
        backup_handler_id: editBackup || null
      });
      setEditingRuleId(null);
      await fetchData();
    } catch (err) {
      alert('Failed to update routing rule.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Routing Table & Dispatch Matrix</h1>
          <p className="page-subtitle">
            Computer Networks (BCS502) Explicit Routing Table – Primary & Backup Duty Doctor Pairings per Ward Zone
          </p>
        </div>
        <div>
          <button className="btn btn-secondary" onClick={fetchData}>
            <RefreshCw size={15} /> Refresh Matrix
          </button>
        </div>
      </div>

      {/* Ward Zone Handlers Registry Overview */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary-navy)', marginBottom: '14px' }}>
          Registered Duty Doctors & Active Capacity Status
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
          {handlers.map((h) => {
            const isAvail = h.availability === 'Available';
            const util = h.capacity > 0 ? Math.round((h.current_load / h.capacity) * 100) : 0;

            return (
              <div
                key={h.handler_id}
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '14px',
                  backgroundColor: isAvail ? '#ffffff' : '#f8fafc'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>{h.name}</strong>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      ID: {h.handler_id} • {h.role}
                    </div>
                  </div>
                  <span
                    className="badge-pill"
                    style={{
                      backgroundColor: isAvail ? '#dcfce7' : '#fee2e2',
                      color: isAvail ? '#15803d' : '#991b1b',
                      fontSize: '0.7rem'
                    }}
                  >
                    {h.availability}
                  </span>
                </div>

                <div style={{ marginTop: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' }}>
                    <span>Ward: <strong>{h.zone_id}</strong></span>
                    <span>Load: <strong>{h.current_load}/{h.capacity}</strong></span>
                  </div>
                  <div
                    style={{
                      height: '5px',
                      backgroundColor: '#e2e8f0',
                      borderRadius: '999px',
                      overflow: 'hidden',
                      marginTop: '4px'
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, util)}%`,
                        backgroundColor: util >= 100 ? '#ef4444' : util > 60 ? '#f59e0b' : '#10b981'
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Explicit Routing Rules Table */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary-navy)' }}>
              Explicit Routing Table ({routes.length} Rules)
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Determines deterministic dispatch targets, primary doctor lookups, and designated fallback handlers
            </p>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Rule ID</th>
                <th>Ward Zone</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Primary Duty Doctor</th>
                <th>Designated Backup Doctor</th>
                <th>Destination Queue</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {routes.map((rule) => {
                const isEditing = editingRuleId === rule.routing_rule_id;

                return (
                  <tr key={rule.routing_rule_id}>
                    <td className="font-mono" style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>
                      {rule.routing_rule_id}
                    </td>
                    <td>
                      <strong>{rule.zone_id}</strong>
                      <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{rule.zone_name}</div>
                    </td>
                    <td>
                      <span className="badge-pill" style={{ backgroundColor: '#f1f5f9', color: '#334155', fontWeight: 700 }}>
                        {rule.category}
                      </span>
                    </td>
                    <td>Priority {rule.priority}</td>
                    <td>
                      {isEditing ? (
                        <select
                          className="form-select"
                          style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                          value={editPrimary}
                          onChange={(e) => setEditPrimary(e.target.value)}
                        >
                          <option value="">None / Queue Only</option>
                          {handlers.map((h) => (
                            <option key={h.handler_id} value={h.handler_id}>
                              {h.name} ({h.handler_id})
                            </option>
                          ))}
                        </select>
                      ) : (
                        rule.primary_handler ? (
                          <div>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{rule.primary_handler.name}</div>
                            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                              Status: {rule.primary_handler.availability} • Load: {rule.primary_handler.current_load}/{rule.primary_handler.capacity}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>None</span>
                        )
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <select
                          className="form-select"
                          style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                          value={editBackup}
                          onChange={(e) => setEditBackup(e.target.value)}
                        >
                          <option value="">None / Escalation Only</option>
                          {handlers.map((h) => (
                            <option key={h.handler_id} value={h.handler_id}>
                              {h.name} ({h.handler_id})
                            </option>
                          ))}
                        </select>
                      ) : (
                        rule.backup_handler ? (
                          <div>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{rule.backup_handler.name}</div>
                            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                              Status: {rule.backup_handler.availability} • Load: {rule.backup_handler.current_load}/{rule.backup_handler.capacity}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>None</span>
                        )
                      )}
                    </td>
                    <td className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--accent-blue)' }}>
                      {rule.destination_queue || 'HANDLER_LOAD'}
                    </td>
                    <td>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleSaveEdit(rule.routing_rule_id)}
                            disabled={saving}
                          >
                            <Check size={12} /> Save
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setEditingRuleId(null)}
                          >
                            <X size={12} /> Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleStartEdit(rule)}
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dispatch & Fallback Audit Stream */}
      <div className="card">
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary-navy)', marginBottom: '14px' }}>
          Dispatch & Fallback Event Registry
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
                <span className="font-mono" style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b' }}>
                  {evt.event_id}
                </span>
                <span style={{ fontSize: '0.85rem', color: '#1e293b' }}>{evt.event_description}</span>
              </div>
              <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                {new Date(evt.timestamp).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
