'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

// TS interfaces
interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName?: string;
  date: string;
  checkInTime: string;
  checkOutTime: string | null;
  checkInLat: number;
  checkInLng: number;
  status: string;
  isManualOverride: boolean;
  tag: string | null;
}

interface HistoryDay {
  date: string;
  displayDate: string;
  status: string;
  hoursWorked: number;
  inProgress: boolean;
  tag: string | null;
  isReal: boolean;
}

interface PieItem {
  name: string;
  value: number;
  color: string;
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
  
  // Phase 2: Employee view options and history
  const [employeeViewMode, setEmployeeViewMode] = useState<'daily' | 'weekly'>('daily');
  const [historyList, setHistoryList] = useState<HistoryDay[]>([]);
  const [last7Days, setLast7Days] = useState<HistoryDay[]>([]);
  const [pieData, setPieData] = useState<PieItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

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
  
  // Phase 2: Admin Logs search filters
  const [logsDate, setLogsDate] = useState('');
  const [adminSearch, setAdminSearch] = useState('');
  const [logs, setLogs] = useState<AttendanceRecord[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Auto-clear alert banner after 8 seconds
  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  // Load configuration and data on mount
  useEffect(() => {
    setMounted(true);
    const todayStr = new Date().toISOString().split('T')[0];
    setOverrideDate(todayStr);
    setLogsDate(todayStr);
    fetchOfficeLocation();
    fetchLogs(todayStr, '');
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

  const fetchLogs = async (dateStr: string, searchStr: string) => {
    setLogsLoading(true);
    try {
      const queryDate = dateStr || logsDate;
      const querySearch = encodeURIComponent(searchStr !== undefined ? searchStr : adminSearch);
      const res = await fetch(`/api/admin/logs?date=${queryDate}&search=${querySearch}`);
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

  const fetchEmployeeHistory = async (id: string) => {
    if (!id.trim()) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/attendance/history?employeeId=${encodeURIComponent(id.trim())}`);
      const data = await res.json();
      if (data.success) {
        setHistoryList(data.history);
        setLast7Days(data.last7Days);
        setPieData(data.pieData);
      }
    } catch (err: any) {
      showNotice('danger', 'Failed to load history metrics.');
    } finally {
      setHistoryLoading(false);
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
        // Load history analytics and weekly logs as well
        fetchEmployeeHistory(targetId);
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
            fetchEmployeeHistory(employeeId); // refresh charts
            fetchLogs(logsDate, adminSearch); // refresh admin list
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
          errorMsg = 'Location access denied. Please enable location permissions in your browser settings.';
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
        const shiftDur = Math.round(data.hoursWorked * 10) / 10;
        showNotice('success', `Checkout recorded successfully. Total hours worked: ${shiftDur}h (Status: ${data.record.status}).`);
        fetchEmployeeHistory(employeeId); // refresh charts
        fetchLogs(logsDate, adminSearch); // refresh admin list
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
        fetchLogs(logsDate, adminSearch); // Refresh logs table
        
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

  // Helper alert notifier
  const showNotice = (type: 'success' | 'danger' | 'info', message: string) => {
    setAlert({ type, message });
  };

  // --- UI FORMATTERS ---
  const formatTime = (isoString: string | null) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
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
      // Map check-out state badge
      const activeHours = currentRecord.status === 'Half-day' ? 'Half-day Shift' : 'Full Shift';
      return {
        badge: `Checked out (${currentRecord.status})`,
        pulseClass: currentRecord.status === 'Half-day' ? 'pulse-red' : 'pulse-blue',
        text: `Completed checkout at ${formatTime(currentRecord.checkOutTime)} [${activeHours} | Tag: ${currentRecord.tag || 'Regular'}]`
      };
    }

    return {
      badge: `Checked in at ${formatTime(currentRecord.checkInTime)}`,
      pulseClass: 'pulse-green',
      text: `Active shift since ${formatTime(currentRecord.checkInTime)} [Tag: ${currentRecord.tag || 'Regular'}]`
    };
  };

  const statusDetails = getStatusTextAndColor();

  // Custom tooltips for Recharts Bar Chart
  const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ background: 'rgba(15, 12, 30, 0.95)', border: '1px solid var(--panel-border)', padding: '0.75rem', borderRadius: '8px' }}>
          <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>{data.date}</p>
          <p style={{ color: 'var(--color-secondary)', fontSize: '0.85rem' }}>
            Hours worked: <span style={{ fontWeight: 700 }}>{data.hoursWorked}h</span>
            {data.inProgress && <span style={{ fontSize: '0.75rem', color: 'var(--status-halfday)', marginLeft: '4px' }}>(In Progress)</span>}
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.80rem' }}>Tag: {data.tag || 'Regular'}</p>
          <span className={`weekly-status-badge badge-${data.status.toLowerCase().replace('-', '')}`} style={{ display: 'inline-block', marginTop: '0.4rem' }}>
            {data.status}
          </span>
        </div>
      );
    }
    return null;
  };

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

      {/* Global Alert Banner */}
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

      {/* Tab Selectors */}
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
            fetchLogs(logsDate, adminSearch);
          }}
        >
          📝 Directory Logs & Override
        </button>
      </nav>

      {/* ======================================================== */}
      {/* 1. EMPLOYEE WORKSPACE VIEW (DAILY/WEEKLY TOGGLE & CHARTS) */}
      {/* ======================================================== */}
      {activeTab === 'employee' && (
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <h2 className="panel-title" style={{ marginBottom: '0.25rem' }}>Employee Work Center</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Verify status, check in, view weekly logging history, and view shift metrics.
              </p>
            </div>
            
            {/* Phase 2: Daily vs Weekly View Mode Toggle Selector */}
            {statusChecked && (
              <div className="view-toggle">
                <button
                  className={`toggle-btn ${employeeViewMode === 'daily' ? 'active' : ''}`}
                  onClick={() => setEmployeeViewMode('daily')}
                >
                  📅 Daily View
                </button>
                <button
                  className={`toggle-btn ${employeeViewMode === 'weekly' ? 'active' : ''}`}
                  onClick={() => setEmployeeViewMode('weekly')}
                >
                  📊 7-Day Grid
                </button>
              </div>
            )}
          </div>

          <div style={{ maxWidth: '680px' }}>
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
                      setHistoryList([]);
                      setLast7Days([]);
                    }}
                    disabled={actionLoading}
                  />
                  <button
                    className="btn btn-secondary"
                    style={{ marginTop: 0, width: 'auto', flexShrink: 0 }}
                    onClick={() => checkEmployeeStatus()}
                    disabled={!employeeId.trim() || actionLoading}
                  >
                    Load Portal
                  </button>
                </div>
              </div>

              {/* Status Checked Portal Content */}
              {statusChecked && (
                <div style={{ marginTop: '1.5rem' }}>
                  {/* --- DAILY VIEW --- */}
                  {employeeViewMode === 'daily' && (
                    <div>
                      <label className="form-label">Today's Status</label>
                      <div className="status-console">
                        <div className="status-badge">
                          <span className={`pulse-indicator ${statusDetails.pulseClass}`} />
                          {statusDetails.badge}
                        </div>
                        <div className="status-text">{statusDetails.text}</div>
                        {currentRecord?.isManualOverride && (
                          <span className="badge badge-override" style={{ marginTop: '0.5rem' }}>
                            ✍️ Admin Manual Override Active
                          </span>
                        )}
                      </div>

                      {/* Tagpill Selection */}
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
                            {actionLoading ? 'Verifying coordinates...' : '📍 Secure Check In'}
                          </button>
                        )}

                        {currentRecord && !currentRecord.checkOutTime && (
                          <button
                            className="btn btn-primary"
                            onClick={handleCheckOut}
                            disabled={actionLoading}
                          >
                            {actionLoading ? 'Saving check-out...' : '🚪 Check Out'}
                          </button>
                        )}

                        {currentRecord?.checkOutTime && (
                          <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--status-present)', fontWeight: 600 }}>
                            ☀️ Shift logged. Great job today!
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* --- WEEKLY VIEW --- */}
                  {employeeViewMode === 'weekly' && (
                    <div>
                      <label className="form-label" style={{ marginBottom: '0.75rem' }}>7-Day Status Log</label>
                      
                      {historyLoading ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading history...</div>
                      ) : (
                        <div className="weekly-grid">
                          {last7Days.map((day, idx) => (
                            <div key={idx} className="weekly-day-card">
                              <div className="weekly-day-name">{day.displayDate.split(' ')[0] + ' ' + day.displayDate.split(' ')[1]}</div>
                              <div className="weekly-day-date" style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}>{day.date}</div>
                              <span className={`weekly-status-badge badge-${day.status.toLowerCase().replace('-', '')}`}>
                                {day.status}
                              </span>
                              <div className="weekly-hours">
                                {day.hoursWorked > 0 ? `${day.hoursWorked}h` : '--'}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* --- HISTOGRAMS / CHARTS SECTION (CLIENT RENDERING ONLY) --- */}
          {statusChecked && mounted && historyList.length > 0 && (
            <div className="charts-grid">
              {/* Bar Chart: Hours worked per day */}
              <div className="chart-card">
                <h3 className="chart-card-title">Daily Hours Worked (Last 30 Days)</h3>
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={historyList} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="displayDate" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                      <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                      <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                      <Bar dataKey="hoursWorked" radius={[4, 4, 0, 0]}>
                        {historyList.map((entry, index) => {
                          // Handle different colors for active vs regular shift bars
                          const color = entry.inProgress ? 'var(--status-halfday)' : 'var(--color-primary)';
                          return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  <span style={{ display: 'inline-block', width: '10px', height: '10px', background: 'var(--color-primary)', marginRight: '4px', borderRadius: '2px' }}></span> Completed Shift
                  <span style={{ display: 'inline-block', width: '10px', height: '10px', background: 'var(--status-halfday)', marginLeft: '12px', marginRight: '4px', borderRadius: '2px' }}></span> In Progress
                </div>
              </div>

              {/* Pie Chart: Status Breakdown */}
              <div className="chart-card">
                <h3 className="chart-card-title">Attendance Distribution (30d)</h3>
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ background: 'rgba(15, 12, 30, 0.95)', borderColor: 'var(--panel-border)' }}
                        itemStyle={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}
                      />
                      <Legend 
                        iconType="circle" 
                        layout="horizontal" 
                        verticalAlign="bottom" 
                        align="center"
                        wrapperStyle={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
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
      {/* 3. ADMIN ATTENDANCE DIRECTORY LOG & MANUAL OVERRIDE VIEW */}
      {/* ======================================================== */}
      {activeTab === 'admin-override' && (
        <div className="panel">
          <h2 className="panel-title">Company Logs & Manual Override</h2>
          
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

            {/* Attendance Logs List with Search Filters */}
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '1.1rem' }}>👥 Employee Attendance Directory</h3>
                </div>
                
                {/* Advanced Search Filters */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by ID or Name..."
                    style={{ flex: 1, height: '38px', minWidth: '150px', fontSize: '0.85rem' }}
                    value={adminSearch}
                    onChange={(e) => {
                      setAdminSearch(e.target.value);
                      fetchLogs(logsDate, e.target.value);
                    }}
                  />
                  <input
                    type="date"
                    className="form-control"
                    style={{ width: 'auto', height: '38px', padding: '0 0.5rem', fontSize: '0.85rem' }}
                    value={logsDate}
                    onChange={(e) => {
                      setLogsDate(e.target.value);
                      fetchLogs(e.target.value, adminSearch);
                    }}
                  />
                </div>
              </div>

              {logsLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading directory logs...</div>
              ) : logs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed var(--panel-border)', borderRadius: '12px', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                  No roster logs match the filter criteria.
                </div>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Name</th>
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
                          <td>{log.employeeName || 'Unknown'}</td>
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
