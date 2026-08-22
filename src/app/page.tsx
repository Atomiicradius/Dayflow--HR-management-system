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

  // --- EMPLOYEE WORKSPACE STATES ---
  const [employeeId, setEmployeeId] = useState('');
  const [activeTag, setActiveTag] = useState('Regular');
  const [statusChecked, setStatusChecked] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<AttendanceRecord | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Phase 2 & 3: View Toggles & History logs
  const [employeeViewMode, setEmployeeViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [historyList, setHistoryList] = useState<HistoryDay[]>([]);
  const [last7Days, setLast7Days] = useState<HistoryDay[]>([]);
  const [pieData, setPieData] = useState<PieItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Phase 3: Monthly Calendar & Stats states
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number | null>(null);
  const [monthlyStats, setMonthlyStats] = useState({
    avgHours: 0,
    totalOvertime: 0,
    presentCount: 0,
    absentCount: 0,
    halfDayCount: 0,
    leaveCount: 0,
  });

  // --- ADMIN OFFICE CONFIG STATES ---
  const [officeLat, setOfficeLat] = useState('12.9716');
  const [officeLng, setOfficeLng] = useState('77.5946');
  const [officeRadius, setOfficeRadius] = useState('100');
  const [officeLoading, setOfficeLoading] = useState(false);

  // --- ADMIN OVERRIDE & DIRECTORY STATES ---
  const [overrideEmployeeId, setOverrideEmployeeId] = useState('');
  const [overrideDate, setOverrideDate] = useState('');
  const [overrideStatus, setOverrideStatus] = useState('Present');
  const [overrideTag, setOverrideTag] = useState('Regular');
  const [overrideCheckIn, setOverrideCheckIn] = useState('');
  const [overrideCheckOut, setOverrideCheckOut] = useState('');
  const [overrideLoading, setOverrideLoading] = useState(false);
  
  const [logsDate, setLogsDate] = useState('');
  const [adminSearch, setAdminSearch] = useState('');
  const [logs, setLogs] = useState<AttendanceRecord[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Auto-clear notifications banner
  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  // Initial loading setups
  useEffect(() => {
    setMounted(true);
    const todayStr = new Date().toISOString().split('T')[0];
    setOverrideDate(todayStr);
    setLogsDate(todayStr);
    fetchOfficeLocation();
    fetchLogs(todayStr, '');
  }, []);

  // Recalculate Monthly Calendar Stats when history loads or check-ins happen
  useEffect(() => {
    if (!statusChecked || historyList.length === 0) return;

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const todayStr = new Date().toISOString().split('T')[0];

    let activeShiftDays = 0;
    let sumHours = 0;
    let overtimeSum = 0;
    let present = 0;
    let absent = 0;
    let halfDay = 0;
    let leave = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dayData = getCalendarDayData(d);
      const dayDateObj = new Date(currentYear, currentMonth, d);
      
      // Skip future dates (excluding today)
      if (dayDateObj > new Date() && dayData.date !== todayStr) {
        continue;
      }

      if (dayData.hoursWorked > 0) {
        activeShiftDays++;
        sumHours += dayData.hoursWorked;
        if (dayData.hoursWorked > 8.0) {
          overtimeSum += (dayData.hoursWorked - 8.0);
        }
      }

      if (dayData.status === 'Present') present++;
      else if (dayData.status === 'Absent') absent++;
      else if (dayData.status === 'Half-day') halfDay++;
      else if (dayData.status === 'Leave') leave++;
    }

    setMonthlyStats({
      avgHours: activeShiftDays > 0 ? Math.round((sumHours / activeShiftDays) * 10) / 10 : 0,
      totalOvertime: Math.round(overtimeSum * 10) / 10,
      presentCount: present,
      absentCount: absent,
      halfDayCount: halfDay,
      leaveCount: leave,
    });
  }, [historyList, currentRecord, statusChecked]);

  // --- API ROUTE REQUESTS ---

  const fetchOfficeLocation = async () => {
    try {
      const res = await fetch('/api/admin/office-location');
      const data = await res.json();
      if (data.success && data.location) {
        setOfficeLat(data.location.latitude.toString());
        setOfficeLng(data.location.longitude.toString());
        setOfficeRadius(data.location.radiusMeters.toString());
      }
    } catch (err) {
      showNotice('danger', 'Failed to retrieve office settings.');
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
    } catch (err) {
      showNotice('danger', 'Failed to retrieve directory logs.');
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
    } catch (err) {
      showNotice('danger', 'Failed to load visual metrics.');
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
        setSelectedCalendarDay(new Date().getDate()); // Default select today in calendar
        fetchEmployeeHistory(targetId);
      } else {
        showNotice('danger', data.error || 'Failed to verify employee.');
      }
    } catch (err) {
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
    showNotice('info', 'Acquiring browser coordinates...');

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
            showNotice('success', `Check-in recorded! Distance: ${Math.round(data.distance)}m.`);
            fetchEmployeeHistory(employeeId); // refresh graphs and calendars
            fetchLogs(logsDate, adminSearch); // refresh admin table
          } else {
            showNotice('danger', data.error || 'Check-in was rejected by server.');
          }
        } catch (err) {
          showNotice('danger', 'Failed to log check-in.');
        } finally {
          setActionLoading(false);
        }
      },
      (error) => {
        setActionLoading(false);
        let errorMsg = 'Please allow location permissions to check in.';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Location permission denied. Please allow location access in your browser.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = 'GPS location info unavailable. Try again in a moment.';
        } else if (error.code === error.TIMEOUT) {
          errorMsg = 'GPS location request timed out. Please try again.';
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
        const hours = Math.round(data.hoursWorked * 10) / 10;
        showNotice('success', `Checkout recorded. Shift duration: ${hours}h (Status: ${data.record.status}).`);
        fetchEmployeeHistory(employeeId); // refresh graphs
        fetchLogs(logsDate, adminSearch); // refresh admin table
      } else {
        showNotice('danger', data.error || 'Failed to check out.');
      }
    } catch (err) {
      showNotice('danger', 'Failed to process checkout.');
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
        showNotice('success', 'Office geofence boundaries updated!');
      } else {
        showNotice('danger', data.error || 'Failed to update boundaries.');
      }
    } catch (err) {
      showNotice('danger', 'Error updating boundaries.');
    } finally {
      setOfficeLoading(false);
    }
  };

  const saveManualOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideEmployeeId.trim()) {
      showNotice('danger', 'Employee ID is required.');
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
        showNotice('success', `Manual log overrides saved for ${overrideEmployeeId}!`);
        fetchLogs(logsDate, adminSearch); // refresh directory list
        setOverrideEmployeeId('');
        setOverrideCheckIn('');
        setOverrideCheckOut('');
        
        if (employeeId.trim() === overrideEmployeeId.trim()) {
          checkEmployeeStatus(employeeId.trim());
        }
      } else {
        showNotice('danger', data.error || 'Failed to override log.');
      }
    } catch (err) {
      showNotice('danger', 'Connection error while saving override.');
    } finally {
      setOverrideLoading(false);
    }
  };

  const showNotice = (type: 'success' | 'danger' | 'info', message: string) => {
    setAlert({ type, message });
  };

  // --- UI FORMATTING HELPERS ---
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
      const type = currentRecord.status === 'Half-day' ? 'Half-day Shift' : 'Full Shift';
      return {
        badge: `Checked out (${currentRecord.status})`,
        pulseClass: currentRecord.status === 'Half-day' ? 'pulse-red' : 'pulse-blue',
        text: `Completed checkout at ${formatTime(currentRecord.checkOutTime)} [${type} | Tag: ${currentRecord.tag || 'Regular'}]`
      };
    }

    return {
      badge: `Checked in at ${formatTime(currentRecord.checkInTime)}`,
      pulseClass: 'pulse-green',
      text: `Active shift since ${formatTime(currentRecord.checkInTime)} [Tag: ${currentRecord.tag || 'Regular'}]`
    };
  };

  const statusDetails = getStatusTextAndColor();

  // --- MONTHLY CALENDAR GRID MATHEMATICS ---
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-11
  
  const getCalendarDays = () => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const startDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    const cells = [];
    // Padding cells at the beginning
    for (let i = 0; i < startDayOfWeek; i++) {
      cells.push({ type: 'empty', dayNum: null });
    }
    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ type: 'day', dayNum: d });
    }
    return cells;
  };

  const getCalendarDayData = (dayNum: number): HistoryDay => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Check if the date is today and uses the active live state
    if (dateStr === todayStr && currentRecord) {
      let hours = 0;
      if (currentRecord.checkOutTime) {
        hours = (new Date(currentRecord.checkOutTime).getTime() - new Date(currentRecord.checkInTime).getTime()) / (1000 * 60 * 60);
      } else {
        hours = (new Date().getTime() - new Date(currentRecord.checkInTime).getTime()) / (1000 * 60 * 60);
      }
      return {
        date: dateStr,
        displayDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        status: currentRecord.status,
        hoursWorked: Math.round(hours * 100) / 100,
        inProgress: !currentRecord.checkOutTime,
        tag: currentRecord.tag || 'Regular',
        isReal: true,
      };
    }

    // Lookup in the 30-day fetched history list
    const historyRecord = historyList.find((h) => h.date === dateStr);
    if (historyRecord) {
      return historyRecord;
    }

    // Default calculations for dates outside our 30-day range
    const dObj = new Date(currentYear, currentMonth, dayNum);
    const isFuture = dObj > new Date();
    const dayOfWeek = dObj.getDay();

    return {
      date: dateStr,
      displayDate: dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      status: isFuture ? 'None' : (dayOfWeek === 0 || dayOfWeek === 6 ? 'Weekend' : 'Absent'),
      hoursWorked: 0,
      inProgress: false,
      tag: isFuture ? null : (dayOfWeek === 0 || dayOfWeek === 6 ? 'Weekend' : null),
      isReal: false,
    };
  };

  const selectedDayData = selectedCalendarDay ? getCalendarDayData(selectedCalendarDay) : null;

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

      {/* Global Alerts Banner */}
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
      {/* 1. EMPLOYEE WORKSPACE VIEW                               */}
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
            
            {/* Phase 3: Three-way View Toggle (Daily, 7-day Weekly Grid, Monthly Calendar) */}
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
                <button
                  className={`toggle-btn ${employeeViewMode === 'monthly' ? 'active' : ''}`}
                  onClick={() => {
                    setEmployeeViewMode('monthly');
                    setSelectedCalendarDay(new Date().getDate()); // Default select today
                  }}
                >
                  📅 Monthly Calendar
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

                      {/* Phase 3: Tag Selection Dropdown (Replaces old pills layout) */}
                      {!currentRecord && (
                        <div className="form-group">
                          <label className="form-label">Work Tag Classification</label>
                          <select
                            className="form-control"
                            value={activeTag}
                            onChange={(e) => setActiveTag(e.target.value)}
                          >
                            <option value="Regular">Regular</option>
                            <option value="Meeting">Meeting</option>
                            <option value="Field Work">Field Work (Offsite)</option>
                            <option value="WFH">WFH (Remote)</option>
                          </select>
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

                  {/* --- MONTHLY CALENDAR VIEW (PHASE 3) --- */}
                  {employeeViewMode === 'monthly' && (
                    <div className="calendar-container">
                      {/* Summary KPI Stats Row */}
                      <div className="stat-cards-grid">
                        <div className="stat-card">
                          <span className="stat-card-title">Avg Daily Hours</span>
                          <span className="stat-card-value">{monthlyStats.avgHours}h</span>
                          <span className="stat-card-desc">Active shift average</span>
                        </div>
                        <div className="stat-card">
                          <span className="stat-card-title">Total Overtime</span>
                          <span className="stat-card-value" style={{ color: 'var(--color-secondary)' }}>+{monthlyStats.totalOvertime}h</span>
                          <span className="stat-card-desc">Hours worked &gt; 8.0h</span>
                        </div>
                        <div className="stat-card">
                          <span className="stat-card-title">Tally Breakdown</span>
                          <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                            <span className="weekly-status-badge badge-present">{monthlyStats.presentCount}P</span>
                            <span className="weekly-status-badge badge-halfday">{monthlyStats.halfDayCount}H</span>
                            <span className="weekly-status-badge badge-absent">{monthlyStats.absentCount}A</span>
                            <span className="weekly-status-badge badge-leave">{monthlyStats.leaveCount}L</span>
                          </div>
                          <span className="stat-card-desc">Status metrics</span>
                        </div>
                      </div>

                      {/* Calendar Month Header title */}
                      <div style={{ display: 'flex', justifyContent: 'center', fontWeight: 700, fontSize: '1rem', color: 'var(--color-secondary)', margin: '0.5rem 0' }}>
                        {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </div>

                      {/* Calendar Main Grid */}
                      <div className="calendar-grid">
                        {/* Days of the week headers */}
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                          <div key={d} className="calendar-header-cell">{d}</div>
                        ))}

                        {/* Month dates */}
                        {getCalendarDays().map((cell, idx) => {
                          if (cell.type === 'empty' || !cell.dayNum) {
                            return <div key={`empty-${idx}`} className="calendar-day-cell empty-cell" />;
                          }

                          const dayData = getCalendarDayData(cell.dayNum);
                          const statusClass = `status-${dayData.status.toLowerCase().replace('-', '')}`;
                          const isSelected = selectedCalendarDay === cell.dayNum;

                          return (
                            <div
                              key={`day-${cell.dayNum}`}
                              className={`calendar-day-cell ${statusClass} ${isSelected ? 'active-selected' : ''}`}
                              onClick={() => setSelectedCalendarDay(cell.dayNum)}
                            >
                              <span className="calendar-day-number">{cell.dayNum}</span>
                              {dayData.hoursWorked > 0 && (
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', alignSelf: 'flex-end' }}>
                                  {dayData.hoursWorked}h
                                </span>
                              )}
                              <div className="calendar-day-status-indicator" />
                            </div>
                          );
                        })}
                      </div>

                      {/* Day Detail Expansion Panel */}
                      {selectedDayData && (
                        <div className="day-details-box">
                          <div className="details-box-header">
                            📅 Details for {new Date(selectedDayData.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                          </div>
                          <div className="details-grid">
                            <div className="details-row">
                              <span className="details-label">Attendance Status:</span>
                              <span className={`weekly-status-badge badge-${selectedDayData.status.toLowerCase().replace('-', '')}`}>
                                {selectedDayData.status}
                              </span>
                            </div>
                            <div className="details-row">
                              <span className="details-label">Hours Logged:</span>
                              <span className="details-val">{selectedDayData.hoursWorked > 0 ? `${selectedDayData.hoursWorked} hours` : '0 hours'}</span>
                            </div>
                            <div className="details-row">
                              <span className="details-label">Shift Tag:</span>
                              <span className="details-val">{selectedDayData.tag || 'None'}</span>
                            </div>
                            <div className="details-row">
                              <span className="details-label">Data Authenticity:</span>
                              <span className="details-val" style={{ color: selectedDayData.isReal ? 'var(--status-present)' : 'var(--text-muted)' }}>
                                {selectedDayData.isReal ? 'Database Log' : 'Simulated Fill'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* --- HISTOGRAMS / CHARTS SECTION (CLIENT RENDERING ONLY) --- */}
          {statusChecked && mounted && historyList.length > 0 && employeeViewMode !== 'monthly' && (
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

            {/* Attendance Logs Directory */}
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
                            {/* Phase 3: Prominent Tag badge for admins */}
                            <span className="badge badge-override" style={{ fontSize: '0.75rem', border: 'none', background: 'rgba(255,255,255,0.06)' }}>
                              {log.tag || 'Regular'}
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
