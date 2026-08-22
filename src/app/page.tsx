'use client';

import React, { useState, useEffect } from 'react';

// Define TS interfaces for our data models
interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkInTime: string;
  checkOutTime: string | null;
  checkInLat: number;
  checkInLng: number;
  status: string;
  isManualOverride: boolean;
  tag: string | null;
}

interface OfficeLocation {
  id: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'employee' | 'admin-location' | 'admin-override'>('employee');
  const [alert, setAlert] = useState<{ type: 'success' | 'danger' | 'info'; message: string } | null>(null);

  // --- EMPLOYEE HUB STATES ---
  const [employeeId, setEmployeeId] = useState('');
  const [activeTag, setActiveTag] = useState('Regular');
  const [statusChecked, setStatusChecked] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<AttendanceRecord | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // --- ADMIN OFFICE LOCATION STATES ---
  const [officeLat, setOfficeLat] = useState('12.9716');
  const [officeLng, setOfficeLng] = useState('77.5946');
  const [officeRadius, setOfficeRadius] = useState('100');
  const [officeLoading, setOfficeLoading] = useState(false);

  // --- ADMIN OVERRIDE STATES ---
  const [overrideEmployeeId, setOverrideEmployeeId] = useState('');
  const [overrideDate, setOverrideDate] = useState('');
  const [overrideStatus, setOverrideStatus] = useState('Present');
  const [overrideTag, setOverrideTag] = useState('Regular');
  const [overrideCheckIn, setOverrideCheckIn] = useState('');
  const [overrideCheckOut, setOverrideCheckOut] = useState('');
  const [overrideLoading, setOverrideLoading] = useState(false);
  const [logsDate, setLogsDate] = useState('');
  const [logs, setLogs] = useState<AttendanceRecord[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Auto-clear alert after 8 seconds
  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  // Load office settings and logs on mount
  useEffect(() => {
    setMounted(true);
    const todayStr = new Date().toISOString().split('T')[0];
    setOverrideDate(todayStr);
    setLogsDate(todayStr);
    fetchOfficeLocation();
    fetchLogs(todayStr);
  }, []);

  // --- API FETCHERS ---

  const fetchOfficeLocation = async () => {
    try {
      const res = await fetch('/api/admin/office-location');
      const data = await res.json();
      if (data.success && data.location) {
        setOfficeLat(data.location.latitude.toString());
        setOfficeLng(data.location.longitude.toString());
        setOfficeRadius(data.location.radiusMeters.toString());
      }
    } catch (err: any) {
      showNotice('danger', 'Failed to load office location settings.');
    }
  };

  const fetchLogs = async (dateStr: string) => {
    setLogsLoading(true);
    try {
      const res = await fetch(`/api/admin/override?date=${dateStr}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.records);
      }
    } catch (err: any) {
      showNotice('danger', 'Failed to retrieve attendance logs.');
    } finally {
      setLogsLoading(false);
    }
  };

  const checkEmployeeStatus = async (idToQuery?: string) => {
    const targetId = idToQuery || employeeId;
    if (!targetId.trim()) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/attendance/check-in?employeeId=${encodeURIComponent(targetId)}`);
      const data = await res.json();
      if (data.success) {
        setCurrentRecord(data.record);
        setStatusChecked(true);
      } else {
        showNotice('danger', data.error || 'Failed to verify status.');
      }
    } catch (err: any) {
      showNotice('danger', 'Error connecting to servers.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckIn = () => {
    if (!employeeId.trim()) {
      showNotice('danger', 'Please enter your Employee ID first.');
      return;
    }

    if (!navigator.geolocation) {
      showNotice('danger', 'Geolocation is not supported by your browser.');
      return;
    }

    setActionLoading(true);
    showNotice('info', 'Acquiring browser geolocation coordinates...');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          const res = await fetch('/api/attendance/check-in', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              employeeId: employeeId.trim(),
              latitude: lat,
              longitude: lng,
              tag: activeTag,
            }),
          });

          const data = await res.json();

          if (res.ok && data.success) {
            setCurrentRecord(data.record);
            showNotice('success', `Check-in recorded successfully! Distance to office: ${Math.round(data.distance)}m.`);
            fetchLogs(logsDate); // refresh logs
          } else {
            showNotice('danger', data.error || 'Check-in was rejected by server.');
          }
        } catch (err: any) {
          showNotice('danger', 'Failed to process check-in request.');
        } finally {
          setActionLoading(false);
        }
      },
      (error) => {
        setActionLoading(false);
        let errorMsg = 'Please allow location access to check in.';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Location access denied. Please enable location permissions in your browser.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = 'Location information is unavailable. Try again in a moment.';
        } else if (error.code === error.TIMEOUT) {
          errorMsg = 'Location request timed out. Please try checking in again.';
        }
        showNotice('danger', errorMsg);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleCheckOut = async () => {
    if (!employeeId.trim()) return;

    setActionLoading(true);
    try {
      const res = await fetch('/api/attendance/check-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: employeeId.trim() }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setCurrentRecord(data.record);
        showNotice('success', 'Checkout recorded successfully. Have a nice evening!');
        fetchLogs(logsDate); // refresh logs
      } else {
        showNotice('danger', data.error || 'Failed to check out.');
      }
    } catch (err: any) {
      showNotice('danger', 'Failed to process check-out request.');
    } finally {
      setActionLoading(false);
    }
  };

  const saveOfficeLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setOfficeLoading(true);
    try {
      const res = await fetch('/api/admin/office-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: parseFloat(officeLat),
          longitude: parseFloat(officeLng),
          radiusMeters: parseFloat(officeRadius),
        }),
      });
      const data = await res.json();

      if (data.success) {
        showNotice('success', 'Office boundary coordinates successfully updated!');
      } else {
        showNotice('danger', data.error || 'Failed to update boundaries.');
      }
    } catch (err: any) {
      showNotice('danger', 'Error updating boundaries.');
    } finally {
      setOfficeLoading(false);
    }
  };

  const saveManualOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideEmployeeId.trim()) {
      showNotice('danger', 'Employee ID is required for overrides.');
      return;
    }

    setOverrideLoading(true);
    try {
      const bodyPayload = {
        employeeId: overrideEmployeeId.trim(),
        date: overrideDate,
        status: overrideStatus,
        tag: overrideTag,
        checkInTime: overrideCheckIn ? `${overrideDate}T${overrideCheckIn}:00` : undefined,
        checkOutTime: overrideCheckOut ? `${overrideDate}T${overrideCheckOut}:00` : undefined,
      };

      const res = await fetch('/api/admin/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });
      const data = await res.json();

      if (data.success) {
        showNotice('success', `Attendance override saved for ${overrideEmployeeId}!`);
        fetchLogs(logsDate); // Refresh logs table
        
        // Reset form inputs
        setOverrideEmployeeId('');
        setOverrideCheckIn('');
        setOverrideCheckOut('');
        
        // If the current verified employee is the one overridden, refresh their workspace view too
        if (employeeId.trim() === overrideEmployeeId.trim()) {
          checkEmployeeStatus(employeeId.trim());
        }
      } else {
        showNotice('danger', data.error || 'Failed to apply manual override.');
      }
    } catch (err: any) {
      showNotice('danger', 'Connection error while saving override.');
    } finally {
      setOverrideLoading(false);
    }
  };

  // Helper helper alerts
  const showNotice = (type: 'success' | 'danger' | 'info', message: string) => {
    setAlert({ type, message });
  };

  // --- UI FORMATTERS ---
  const formatTime = (isoString: string | null) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusTextAndColor = () => {
    if (!currentRecord) {
      return {
        badge: 'Not checked in',
        pulseClass: 'pulse-red',
        text: 'You have not checked in for today yet.'
      };
    }

    if (currentRecord.checkOutTime) {
      return {
        badge: `Checked out at ${formatTime(currentRecord.checkOutTime)}`,
        pulseClass: 'pulse-blue',
        text: `Completed check-out at ${formatTime(currentRecord.checkOutTime)} [Tag: ${currentRecord.tag || 'Regular'}]`
      };
    }

    return {
      badge: `Checked in at ${formatTime(currentRecord.checkInTime)}`,
      pulseClass: 'pulse-green',
      text: `Active shift since ${formatTime(currentRecord.checkInTime)} [Tag: ${currentRecord.tag || 'Regular'}]`
    };
  };

  const statusDetails = getStatusTextAndColor();

  return (
    <div className="container">
      {/* App Header */}
      <header className="header">
        <div className="logo">
          Dayflow <span>Attendance</span>
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {mounted ? new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : ''}
        </div>
      </header>

      {/* Global Alert Notification Banner */}
      {alert && (
        <div className={`alert alert-${alert.type}`} role="alert">
          <div>
            {alert.type === 'danger' && '⚠️ '}
            {alert.type === 'success' && '✅ '}
            {alert.type === 'info' && '🔄 '}
            {alert.message}
          </div>
        </div>
      )}

      {/* Primary Tab Navigation */}
      <nav className="tabs">
        <button
          className={`tab-btn ${activeTab === 'employee' ? 'active' : ''}`}
          onClick={() => setActiveTab('employee')}
        >
          👤 Employee Workspace
        </button>
        <button
          className={`tab-btn ${activeTab === 'admin-location' ? 'active' : ''}`}
          onClick={() => setActiveTab('admin-location')}
        >
          ⚙️ Office Geofence Config
        </button>
        <button
          className={`tab-btn ${activeTab === 'admin-override' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('admin-override');
            fetchLogs(logsDate);
          }}
        >
          📝 Logs & Manual Override
        </button>
      </nav>

      {/* ======================================================== */}
      {/* 1. EMPLOYEE WORKSPACE VIEW                               */}
      {/* ======================================================== */}
      {activeTab === 'employee' && (
        <div className="panel">
          <h2 className="panel-title">Employee Check-In Portal</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
            Check in and out using your geofenced browser coordinates. Make sure you allow browser location requests.
          </p>

          <div className="grid-2">
            <div>
              {/* Employee ID Setup */}
              <div className="form-group">
                <label className="form-label">Employee ID</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter Employee ID (e.g. EMP001)"
                    value={employeeId}
                    onChange={(e) => {
                      setEmployeeId(e.target.value);
                      setStatusChecked(false);
                      setCurrentRecord(null);
                    }}
                    disabled={actionLoading}
                  />
                  <button
                    className="btn btn-secondary"
                    style={{ marginTop: 0, width: 'auto', flexShrink: 0 }}
                    onClick={() => checkEmployeeStatus()}
                    disabled={!employeeId.trim() || actionLoading}
                  >
                    Load Status
                  </button>
                </div>
              </div>

              {/* Status Workspace */}
              {statusChecked && (
                <div style={{ marginTop: '1.5rem' }}>
                  <label className="form-label">Active State</label>
                  <div className="status-console">
                    <div className="status-badge">
                      <span className={`pulse-indicator ${statusDetails.pulseClass}`} />
                      {statusDetails.badge}
                    </div>
                    <div className="status-text">{statusDetails.text}</div>
                    {currentRecord?.isManualOverride && (
                      <span className="badge badge-override" style={{ marginTop: '0.5rem' }}>
                        ✍️ Manual Override Active
                      </span>
                    )}
                  </div>

                  {/* Tagpill Selection (only visible when check-in is allowed) */}
                  {!currentRecord && (
                    <div className="form-group">
                      <label className="form-label">Work Tag Classification</label>
                      <div className="tag-selectors">
                        {['Regular', 'Meeting', 'Field Work', 'WFH'].map((t) => (
                          <div
                            key={t}
                            className={`tag-pill ${activeTag === t ? 'active' : ''}`}
                            onClick={() => setActiveTag(t)}
                          >
                            {t}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ marginTop: '1rem' }}>
                    {!currentRecord && (
                      <button
                        className="btn btn-success"
                        onClick={handleCheckIn}
                        disabled={actionLoading}
                      >
                        {actionLoading ? 'Checking coordinates...' : '📍 Secure Check In'}
                      </button>
                    )}

                    {currentRecord && !currentRecord.checkOutTime && (
                      <button
                        className="btn btn-primary"
                        onClick={handleCheckOut}
                        disabled={actionLoading}
                      >
                        {actionLoading ? 'Processing...' : '🚪 Check Out'}
                      </button>
                    )}

                    {currentRecord?.checkOutTime && (
                      <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--status-present)', fontWeight: 500 }}>
                        ☀️ Shift completed for today.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px dashed var(--panel-border)', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: 'var(--color-secondary)' }}>💡 How to test geofencing:</h3>
              <ol style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', paddingLeft: '1.2rem', lineHeight: '1.7' }}>
                <li style={{ marginBottom: '0.4rem' }}>Type in an Employee ID and click <strong>Load Status</strong>.</li>
                <li style={{ marginBottom: '0.4rem' }}>Set your admin coordinates to match your actual location, or make them different to test the rejection error.</li>
                <li style={{ marginBottom: '0.4rem' }}>When you click <strong>Secure Check In</strong>, click "Allow" on the browser popup.</li>
                <li>Distance and parameters will calculate instantly and verify your boundary check!</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. ADMIN OFFICE LOCATION CONFIG VIEW                    */}
      {/* ======================================================== */}
      {activeTab === 'admin-location' && (
        <div className="panel">
          <h2 className="panel-title">Admin Office Location Settings</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
            Configure the geographical center of your office building and the allowable check-in radius boundary.
          </p>

          <form onSubmit={saveOfficeLocation} style={{ maxWidth: '600px' }}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Office Latitude</label>
                <input
                  type="number"
                  step="any"
                  className="form-control"
                  value={officeLat}
                  onChange={(e) => setOfficeLat(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Office Longitude</label>
                <input
                  type="number"
                  step="any"
                  className="form-control"
                  value={officeLng}
                  onChange={(e) => setOfficeLng(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Allowed Geofence Radius (meters)</label>
              <input
                type="number"
                step="1"
                className="form-control"
                value={officeRadius}
                onChange={(e) => setOfficeRadius(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={officeLoading}
            >
              {officeLoading ? 'Saving...' : '💾 Save Geofence Settings'}
            </button>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. ADMIN ATTENDANCE LOG & MANUAL OVERRIDE VIEW            */}
      {/* ======================================================== */}
      {activeTab === 'admin-override' && (
        <div className="panel">
          <h2 className="panel-title">Attendance Logs & Manual Override</h2>
          
          <div className="grid-2" style={{ alignItems: 'start', marginBottom: '2rem' }}>
            {/* Manual Override Form */}
            <div style={{ background: 'rgba(0,0,0,0.1)', border: '1px solid var(--panel-border)', padding: '1.5rem', borderRadius: '12px' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1.2rem', color: 'var(--color-secondary)' }}>✏️ Create / Edit Attendance (Manual Override)</h3>
              
              <form onSubmit={saveManualOverride}>
                <div className="form-group">
                  <label className="form-label">Employee ID</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. EMP002"
                    value={overrideEmployeeId}
                    onChange={(e) => setOverrideEmployeeId(e.target.value)}
                    required
                  />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={overrideDate}
                      onChange={(e) => setOverrideDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select
                      className="form-control"
                      value={overrideStatus}
                      onChange={(e) => setOverrideStatus(e.target.value)}
                    >
                      <option value="Present">Present</option>
                      <option value="Absent">Absent</option>
                      <option value="Half-day">Half-day</option>
                      <option value="Leave">Leave</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Classification Tag</label>
                  <select
                    className="form-control"
                    value={overrideTag}
                    onChange={(e) => setOverrideTag(e.target.value)}
                  >
                    <option value="Regular">Regular</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Field Work">Field Work</option>
                    <option value="WFH">WFH</option>
                  </select>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Check-In (Optional)</label>
                    <input
                      type="time"
                      className="form-control"
                      value={overrideCheckIn}
                      onChange={(e) => setOverrideCheckIn(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Check-Out (Optional)</label>
                    <input
                      type="time"
                      className="form-control"
                      value={overrideCheckOut}
                      onChange={(e) => setOverrideCheckOut(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={overrideLoading}
                >
                  {overrideLoading ? 'Applying...' : '⚡ Apply Manual Override'}
                </button>
              </form>
            </div>

            {/* Attendance Logs List */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.1rem' }}>📅 Logs for Selected Date</h3>
                <input
                  type="date"
                  className="form-control"
                  style={{ width: 'auto', height: '36px', padding: '0 0.5rem', fontSize: '0.9rem' }}
                  value={logsDate}
                  onChange={(e) => {
                    setLogsDate(e.target.value);
                    fetchLogs(e.target.value);
                  }}
                />
              </div>

              {logsLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading logs...</div>
              ) : logs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed var(--panel-border)', borderRadius: '12px', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                  No attendance records found for this date.
                </div>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Tag</th>
                        <th>Check In</th>
                        <th>Check Out</th>
                        <th>Status</th>
                        <th>Override?</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <tr key={log.id}>
                          <td style={{ fontWeight: 600 }}>{log.employeeId}</td>
                          <td>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              {log.tag || 'None'}
                            </span>
                          </td>
                          <td>{formatTime(log.checkInTime)}</td>
                          <td>{formatTime(log.checkOutTime)}</td>
                          <td>
                            <span className={`badge badge-${log.status.toLowerCase().replace('-', '')}`}>
                              {log.status}
                            </span>
                          </td>
                          <td>
                            {log.isManualOverride ? (
                              <span style={{ color: 'var(--color-secondary)' }}>Yes ✍️</span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>No</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
