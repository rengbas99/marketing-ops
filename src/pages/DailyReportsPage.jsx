import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Calendar, FileText, User, Search, Filter, Clock, CheckCircle, Camera, FileEdit, MapPin, Download, X } from 'lucide-react';
import { COLLECTIONS, ROLES } from '../constants';

// Helper function to safely parse dates
const safeParseDate = (dateString) => {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    return date;
  } catch (e) {
    return null;
  }
};

// Helper function to get date string in YYYY-MM-DD format
const getDateString = (date) => {
  if (!date) return '';
  try {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  } catch (e) {
    return '';
  }
};

export default function DailyReportsPage() {
  const navigate = useNavigate();
  const { data, loading, startPolling, stopPolling } = useData();
  const { user } = useAuth();
  const [selectedWorkerEmail, setSelectedWorkerEmail] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  useEffect(() => {
    if (startPolling && stopPolling) {
      startPolling('daily-reports', [
        COLLECTIONS.ATTENDANCE,
        COLLECTIONS.USERS,
        COLLECTIONS.EDITOR_TIME_LOGS,
        COLLECTIONS.PHOTOGRAPHER_ATTENDANCE,
        COLLECTIONS.ASSETS,
        COLLECTIONS.SHOOTS,
        COLLECTIONS.CLIENTS
      ]);

      return () => stopPolling('daily-reports');
    }
  }, [startPolling, stopPolling]);

  const attendance = Array.isArray(data.Attendance) ? data.Attendance : [];
  const users = Array.isArray(data.Users) ? data.Users : [];
  const editorTimeLogs = Array.isArray(data.Editor_Time_Logs) ? data.Editor_Time_Logs : [];
  const photographerAttendance = Array.isArray(data.Photographer_Attendance) ? data.Photographer_Attendance : [];
  const assets = Array.isArray(data.Assets) ? data.Assets : [];
  const shoots = Array.isArray(data.Shoots) ? data.Shoots : [];
  const clients = Array.isArray(data.Clients) ? data.Clients : [];

  // Get workers who have clocked in/out for the selected date
  const workersWithActivity = useMemo(() => {
    const filterDate = dateFilter || new Date().toISOString().split('T')[0];
    
    const workerMap = new Map();

    // Process Attendance records
    attendance.forEach(record => {
      if (!record) return;
      
      // Try multiple date fields and safely parse
      let recordDate = '';
      if (record.date) {
        recordDate = getDateString(record.date);
      } else if (record.clock_in) {
        recordDate = getDateString(record.clock_in);
      }
      
      if (!recordDate || recordDate !== filterDate) return;
      
      // Get email from multiple possible fields
      const email = record.employee_id || record.employee_email || record.user_email;
      if (!email || typeof email !== 'string') return;

      const worker = users.find(u => u && u.email === email);
      if (!worker) return;

      if (!workerMap.has(email)) {
        workerMap.set(email, {
          worker,
          email,
          attendance: [],
          editorTimeLogs: [],
          photographerAttendance: [],
          totalHours: 0,
          hasProcessedAttendanceHours: false, // Track if we've already counted attendance hours for this day
          lastAttendanceHours: 0, // Track last attendance hours counted
          status: record.status === 'clocked_in' && !record.clock_out ? 'active' : 'clocked_out',
          clockIn: record.clock_in || null,
          clockOut: record.clock_out || null,
          dailyReport: record.daily_report || null
        });
      }

      const workerData = workerMap.get(email);
      workerData.attendance.push(record);
      
      // Safely calculate hours - only count once per day, prefer completed records
      // If multiple records exist, use the one with clock_out (completed)
      if (record.clock_out) {
        let hours = 0;
        
        // Prefer stored hours_worked if valid
        if (record.hours_worked) {
          hours = parseFloat(record.hours_worked);
          // Validate: hours should be reasonable (max 24 hours per day)
          if (hours > 24 || hours < 0 || isNaN(hours)) {
            hours = 0; // Invalid, will recalculate
          }
        }
        
        // Recalculate if hours_worked is invalid or missing
        if (hours === 0 && record.clock_in && record.clock_out) {
          try {
            const inTime = safeParseDate(record.clock_in);
            const outTime = safeParseDate(record.clock_out);
            if (inTime && outTime && outTime > inTime) {
              const totalMinutes = (outTime - inTime) / (1000 * 60);
              const breakMinutes = parseFloat(record.total_break_duration || 0);
              const workMinutes = Math.max(0, totalMinutes - breakMinutes);
              hours = workMinutes / 60;
              // Validate calculated hours
              if (hours > 24 || hours < 0) {
                hours = 0;
              }
            }
          } catch {
            hours = 0;
          }
        }
        
        // Only add if we have valid hours and haven't already counted attendance for this day
        // For attendance, only count once per day (prefer completed records)
        if (hours > 0 && hours <= 24) {
          if (!workerData.hasProcessedAttendanceHours) {
            workerData.totalHours += hours;
            workerData.hasProcessedAttendanceHours = true;
          } else if (record.clock_out) {
            // If we already counted but this is a completed record, replace the previous count
            // (This handles cases where an incomplete record was counted first)
            workerData.totalHours = (workerData.totalHours - (workerData.lastAttendanceHours || 0)) + hours;
            workerData.lastAttendanceHours = hours;
          }
        } else if (hours > 0) {
          workerData.lastAttendanceHours = hours;
        }
      }
    });

    // Process Editor Time Logs
    editorTimeLogs.forEach(log => {
      if (!log || !log.editor_email) return;
      
      const logDate = log.start_time ? getDateString(log.start_time) : '';
      if (!logDate || logDate !== filterDate) return;
      
      const email = log.editor_email;
      if (!email || typeof email !== 'string') return;
      
      const worker = users.find(u => u && u.email === email);
      if (!worker) return;

      if (!workerMap.has(email)) {
        workerMap.set(email, {
          worker,
          email,
          attendance: [],
          editorTimeLogs: [],
          photographerAttendance: [],
          totalHours: 0,
          hasProcessedAttendanceHours: false,
          lastAttendanceHours: 0,
          status: log.end_time ? 'clocked_out' : 'active',
          clockIn: null,
          clockOut: null,
          dailyReport: null
        });
      }

      const workerData = workerMap.get(email);
      workerData.editorTimeLogs.push(log);
      
      // Safely calculate duration
      if (log.work_duration) {
        const hours = parseFloat(log.work_duration);
        if (!isNaN(hours) && hours > 0) {
          workerData.totalHours += hours;
        }
      } else if (log.start_time && log.end_time) {
        const start = safeParseDate(log.start_time);
        const end = safeParseDate(log.end_time);
        if (start && end && end > start) {
          const hours = (end - start) / (1000 * 60 * 60);
          if (hours > 0 && hours < 24) { // Sanity check: hours should be reasonable
            workerData.totalHours += hours;
          }
        }
      }
    });

    // Process Photographer Attendance
    photographerAttendance.forEach(pa => {
      if (!pa || !pa.photographer_email) return;
      
      const paDate = pa.date ? getDateString(pa.date) : 
                    (pa.start_time ? getDateString(pa.start_time) : '');
      if (!paDate || paDate !== filterDate) return;
      
      const email = pa.photographer_email;
      if (!email || typeof email !== 'string') return;
      
      const worker = users.find(u => u && u.email === email);
      if (!worker) return;

      if (!workerMap.has(email)) {
        workerMap.set(email, {
          worker,
          email,
          attendance: [],
          editorTimeLogs: [],
          photographerAttendance: [],
          totalHours: 0,
          hasProcessedAttendanceHours: false,
          lastAttendanceHours: 0,
          status: pa.end_time ? 'clocked_out' : 'active',
          clockIn: pa.start_time || null,
          clockOut: pa.end_time || null,
          dailyReport: null
        });
      }

      const workerData = workerMap.get(email);
      workerData.photographerAttendance.push(pa);
      
      // Safely calculate duration
      if (pa.work_duration) {
        const hours = parseFloat(pa.work_duration);
        if (!isNaN(hours) && hours > 0) {
          workerData.totalHours += hours;
        }
      } else if (pa.start_time && pa.end_time) {
        const start = safeParseDate(pa.start_time);
        const end = safeParseDate(pa.end_time);
        if (start && end && end > start) {
          const hours = (end - start) / (1000 * 60 * 60);
          if (hours > 0 && hours < 24) { // Sanity check
            workerData.totalHours += hours;
          }
        }
      }
    });

    return Array.from(workerMap.values());
  }, [attendance, users, editorTimeLogs, photographerAttendance, dateFilter]);

  // Filter workers by role and search
  const filteredWorkers = useMemo(() => {
    let filtered = workersWithActivity;

    if (roleFilter) {
      filtered = filtered.filter(w => w.worker && w.worker.role === roleFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase().trim();
      if (query) {
        filtered = filtered.filter(w => {
          const workerName = (w.worker?.name || w.worker?.email || '').toLowerCase();
          return workerName.includes(query);
        });
      }
    }

    // Sort by total hours (descending) then by name
    return [...filtered].sort((a, b) => {
      if (b.totalHours !== a.totalHours) {
        return b.totalHours - a.totalHours;
      }
      const nameA = (a.worker?.name || a.worker?.email || a.email || '').toLowerCase();
      const nameB = (b.worker?.name || b.worker?.email || b.email || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [workersWithActivity, roleFilter, searchQuery]);

  // Get selected worker's activity stream
  const selectedWorkerActivity = useMemo(() => {
    if (!selectedWorkerEmail) return [];

    const workerData = workersWithActivity.find(w => w.email === selectedWorkerEmail);
    if (!workerData) return [];

    const activities = [];

    // Add clock-in
    if (workerData.clockIn) {
      const clockInDate = safeParseDate(workerData.clockIn);
      if (clockInDate) {
        activities.push({
          type: 'clock_in',
          time: clockInDate,
          label: 'Clock In',
          icon: Clock,
          color: 'text-green-600',
          bg: 'bg-green-50',
          border: 'border-green-200'
        });
      }
    }

    // Add editor time logs
    workerData.editorTimeLogs.forEach(log => {
      if (!log.start_time) return;
      
      const startTime = safeParseDate(log.start_time);
      if (!startTime) return;
      
      const asset = assets.find(a => a && a.asset_id === log.asset_id);
      const client = asset ? clients.find(c => c && c.client_id === asset.client_id) : null;
      
      const endTime = log.end_time ? safeParseDate(log.end_time) : null;
      
      let duration = null;
      if (log.work_duration) {
        const hours = parseFloat(log.work_duration);
        if (!isNaN(hours) && hours > 0) {
          duration = hours;
        }
      } else if (startTime && endTime && endTime > startTime) {
        const hours = (endTime - startTime) / (1000 * 60 * 60);
        if (hours > 0 && hours < 24) {
          duration = hours;
        }
      }
      
      activities.push({
        type: 'task',
        time: startTime,
        endTime: endTime,
        label: asset ? (asset.title || 'Task') : 'Task',
        client: client ? client.company_name : null,
        duration: duration,
        notes: log.notes || null,
        icon: FileEdit,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        status: log.end_time ? 'completed' : 'in_progress'
      });
    });

    // Add photographer attendance (shoots)
    workerData.photographerAttendance.forEach(pa => {
      if (!pa.start_time) return;
      
      const startTime = safeParseDate(pa.start_time);
      if (!startTime) return;
      
      const shoot = shoots.find(s => s && s.shoot_id === pa.shoot_id);
      const client = shoot ? clients.find(c => c && c.client_id === shoot.client_id) : null;
      
      const endTime = pa.end_time ? safeParseDate(pa.end_time) : null;
      
      let duration = null;
      if (pa.work_duration) {
        const hours = parseFloat(pa.work_duration);
        if (!isNaN(hours) && hours > 0) {
          duration = hours;
        }
      } else if (startTime && endTime && endTime > startTime) {
        const hours = (endTime - startTime) / (1000 * 60 * 60);
        if (hours > 0 && hours < 24) {
          duration = hours;
        }
      }
      
      activities.push({
        type: 'shoot',
        time: startTime,
        endTime: endTime,
        label: shoot ? (shoot.shoot_name || 'Shoot') : 'Shoot',
        client: client ? client.company_name : null,
        location: shoot ? (shoot.location_name || null) : (pa.location_name || null),
        duration: duration,
        notes: pa.notes || null,
        icon: Camera,
        color: 'text-purple-600',
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        status: pa.end_time ? 'completed' : 'in_progress'
      });
    });

    // Add clock-out (final entry)
    if (workerData.clockOut) {
      const clockOutDate = safeParseDate(workerData.clockOut);
      if (clockOutDate) {
        activities.push({
          type: 'clock_out',
          time: clockOutDate,
          label: 'Clock Out',
          dailyReport: workerData.dailyReport || null,
          icon: CheckCircle,
          color: 'text-gray-600',
          bg: 'bg-gray-50',
          border: 'border-gray-200'
        });
      }
    }

    // Sort by time (chronological)
    return activities.sort((a, b) => {
      if (!a.time || !b.time) return 0;
      return a.time - b.time;
    });
  }, [selectedWorkerEmail, workersWithActivity, assets, shoots, clients]);

  // Auto-select first worker if none selected
  useEffect(() => {
    if (!selectedWorkerEmail && filteredWorkers.length > 0) {
      setSelectedWorkerEmail(filteredWorkers[0].email);
    }
  }, [filteredWorkers, selectedWorkerEmail]);

  const isLoading = loading && (!data.Attendance || data.Attendance.length === 0) && (!data.Users || data.Users.length === 0);
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
        <div className="max-w-full mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  const selectedWorker = filteredWorkers.find(w => w.email === selectedWorkerEmail);
  const selectedWorkerUser = selectedWorker?.worker;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-white rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Worker Activity Stream</h1>
              <p className="text-gray-600">Monitor team activity and work logs in real-time</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="glass-card p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-bold text-gray-700 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by worker name or task/shoot title..."
                  className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                />
              </div>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-bold text-gray-700 mb-2">Filter by Role</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              >
                <option value="">All Workers</option>
                <option value={ROLES.LEAD}>Team Leads</option>
                <option value={ROLES.PHOTOGRAPHER}>Photographers</option>
                <option value={ROLES.EDITOR}>Editors</option>
                <option value={ROLES.CONTENT_CREATOR}>Content Creators</option>
              </select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-bold text-gray-700 mb-2">Filter by Date</label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              />
            </div>
          </div>
        </div>

        {/* Split-Pane Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Pane: Worker List (25-30%) */}
          <div className="lg:col-span-1">
            <div className="glass-card p-4">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Workers ({filteredWorkers.length})</h2>
              <div className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto">
                {filteredWorkers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No workers found</p>
                  </div>
                ) : (
                  filteredWorkers.map((workerData) => {
                    const isSelected = workerData.email === selectedWorkerEmail;
                    const worker = workerData.worker;
                    
                    return (
                      <button
                        key={workerData.email}
                        onClick={() => setSelectedWorkerEmail(workerData.email)}
                        className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                          isSelected
                            ? 'border-primary bg-primary/5 shadow-md'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-dark text-white flex items-center justify-center font-bold text-sm ${
                            isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
                          }`}>
                            {worker?.name?.charAt(0) || <User className="w-5 h-5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 text-sm truncate">
                              {worker?.name || workerData.email}
                            </h3>
                            <p className="text-xs text-gray-500 capitalize">
                              {worker?.role?.replace('_', ' ') || 'Worker'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1">
                            {workerData.status === 'active' ? (
                              <>
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                <span className="text-xs text-green-600 font-medium">Active</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-3 h-3 text-gray-400" />
                                <span className="text-xs text-gray-500">Clocked Out</span>
                              </>
                            )}
                          </div>
                          <span className="text-xs font-bold text-gray-700">
                            {workerData.totalHours.toFixed(1)}h
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right Pane: Activity Log (70-75%) */}
          <div className="lg:col-span-3">
            {selectedWorkerUser ? (
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">
                      {selectedWorkerUser.name || selectedWorkerEmail}'s Activity Log
                    </h2>
                    <p className="text-gray-600">
                      {dateFilter ? (() => {
                        const date = safeParseDate(dateFilter);
                        return date ? date.toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        }) : dateFilter;
                      })() : 'Today'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-700">
                      Total: {selectedWorker?.totalHours?.toFixed(1) || '0.0'}h
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  {selectedWorkerActivity.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="font-medium">No activity recorded for this date</p>
                    </div>
                  ) : (
                    selectedWorkerActivity.map((activity, index) => {
                      if (!activity.time) return null;
                      
                      const Icon = activity.icon;
                      const timeStr = activity.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      const endTimeStr = activity.endTime ? activity.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
                      // Safely convert duration to number before calling toFixed
                      const durationNum = typeof activity.duration === 'number' ? activity.duration : parseFloat(activity.duration);
                      const durationStr = (durationNum && !isNaN(durationNum) && durationNum > 0) ? `${durationNum.toFixed(1)}h` : null;

                      return (
                        <div
                          key={index}
                          className={`p-5 rounded-xl border-2 ${activity.border} ${activity.bg} transition-all`}
                        >
                          <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-lg ${activity.bg} border ${activity.border}`}>
                              <Icon className={`w-5 h-5 ${activity.color}`} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h3 className="font-bold text-gray-900 mb-1">{activity.label || 'Activity'}</h3>
                                  {activity.client && (
                                    <p className="text-sm text-gray-600 mb-1">{activity.client}</p>
                                  )}
                                  {activity.location && (
                                    <div className="flex items-center gap-1 text-sm text-gray-500 mb-1">
                                      <MapPin className="w-3 h-3" />
                                      <span>{activity.location}</span>
                                    </div>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-bold text-gray-900">{timeStr}</div>
                                  {endTimeStr && (
                                    <div className="text-xs text-gray-500">{endTimeStr}</div>
                                  )}
                                  {durationStr && (
                                    <div className="text-xs text-gray-600 mt-1">{durationStr}</div>
                                  )}
                                </div>
                              </div>
                              {activity.notes && (
                                <p className="text-sm text-gray-700 mb-2 whitespace-pre-wrap">{activity.notes}</p>
                              )}
                              {activity.type === 'clock_out' && activity.dailyReport && (
                                <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                                  <p className="text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">Daily Report</p>
                                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{activity.dailyReport}</p>
                                </div>
                              )}
                              {activity.status === 'in_progress' && (
                                <span className="inline-block px-2 py-1 text-xs font-bold bg-yellow-100 text-yellow-700 rounded-full">
                                  In Progress
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              <div className="glass-card p-12 text-center">
                <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-700 mb-2">Select a Worker</h3>
                <p className="text-gray-500">Choose a worker from the list to view their activity log</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
