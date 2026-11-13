import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, UserCheck, Stethoscope, ChevronDown, Check, AlertOctagon } from 'lucide-react';

export const Navbar = () => {
  const { currentUser, demoUsers, loginAsDemoUser } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleSwitchUser = async (userObj) => {
    await loginAsDemoUser(userObj);
    setDropdownOpen(false);
  };

  return (
    <header className="top-navbar">
      {/* System Status Banner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div className="pulse-dot" />
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
          PATHFLOW Dispatch Kernel
        </span>
        <span
          style={{
            fontSize: '0.72rem',
            padding: '2px 8px',
            borderRadius: '4px',
            backgroundColor: '#e0f2fe',
            color: '#0369a1',
            fontWeight: 600
          }}
        >
          Automata & Routing Active
        </span>
      </div>

      {/* Right Controls: Role Switcher & User Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
        {/* Role Switcher Pill */}
        <div style={{ position: 'relative' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}
          >
            {currentUser?.role === 'admin' ? (
              <Shield size={14} style={{ color: '#ef4444' }} />
            ) : currentUser?.role === 'handler' ? (
              <Stethoscope size={14} style={{ color: '#0ea5e9' }} />
            ) : (
              <UserCheck size={14} style={{ color: '#10b981' }} />
            )}
            <span>
              <strong>Role:</strong> {currentUser?.name || 'Switch Role'}
            </span>
            <ChevronDown size={14} />
          </button>

          {/* Switcher Dropdown */}
          {dropdownOpen && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '100%',
                marginTop: '6px',
                width: '280px',
                backgroundColor: '#ffffff',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                padding: '8px',
                zIndex: 100
              }}
            >
              <div
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: '#64748b',
                  padding: '6px 10px'
                }}
              >
                Instant Role Switcher (Academic Demo)
              </div>

              {demoUsers.map((u) => {
                const isSelected = currentUser?.user_id === u.user_id;
                return (
                  <div
                    key={u.user_id}
                    onClick={() => handleSwitchUser(u)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: isSelected ? '#f0f9ff' : 'transparent',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>{u.name}</div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                        {u.role.toUpperCase()} • {u.email}
                      </div>
                    </div>
                    {isSelected && <Check size={16} style={{ color: '#0284c7' }} />}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
