import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { ArrowLeft, Calendar, Clock, Edit2, X, Save, User, TrendingUp } from 'lucide-react';
import { formatBreakDuration } from '../utils/timeFormatting';
import { COLLECTIONS, ROLES } from '../constants';

export default function UserAttendanceDetailPage() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { data, loading, startPolling, stopPolling, updateRow } = useData();
  const { user } = useAuth();
  const { success, error } = useToast();
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [editingAttendance, setEditingAttendance] = useState(null);
  const [editClockIn, setEditClockIn] = useState('');
  const [editClockOut, setEditClockOut] = useState('');
  const [editHours, setEditHours] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Decode URL parameter for email addresses - handle both encoded and unencoded
  const decodedUserId = useMemo(() => {
    if (!userId) return '';
    try {
      // Try decoding first (handles %40 for @, etc.)
      const decoded = decodeURIComponent(userId);
      return decoded;
    } catch {
      // If decoding fails, use as-is (might already be decoded)
      return userId;
    }
  }, [userId]);

  useEffect(() => {
    startPolling('user-attendance-detail', [
      COLLECTIONS.ATTENDANCE,
      COLLECTIONS.USERS,
      COLLECTIONS.TIME_BREAKS
    ]);
    return () => stopPolling('user-attendance-detail');
  }, [startPolling, stopPolling]);

  const attendance = Array.isArray(data.Attendance) ? data.Attendance : [];
  const users = Array.isArray(data.Users) ? data.Users : [];
  const breaks = Array.isArray(data.Time_Breaks) ? data.Time_Breaks : [];

  // Get the user being viewed - case-insensitive email matching
  const viewUser = useMemo(() => {
    if (!decodedUserId) return null;
    const normalizedSearchEmail = decodedUserId.toLowerCase().trim();
    return users.find(u => {
      if (!u || !u.email) return false;
      const normalizedUserEmail = u.email.toLowerCase().trim();
      return normalizedUserEmail === normalizedSearchEmail;
    });
  }, [users, decodedUserId]);

  // Check permissions
  const canEdit = user?.role === ROLES.MANAGER || user?.role === ROLES.LEAD;

  // Get user's attendance records
  const userAttendance = useMemo(() => {
    return attendance.filter(a => a && a.employee_id === decodedUserId);
  }, [attendance, decodedUserId]);

  // Filter by selected month
  const monthAttendance = useMemo(() => {
    const monthStart = new Date(selectedMonth + '-01');
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    monthEnd.setDate(0);

    return userAttendance
      .filter(a => {
        const date = a.date ? new Date(a.date) : (a.clock_in ? new Date(a.clock_in) : null);
        return date && date >= monthStart && date <= monthEnd;
      })
      .sort((a, b) => {
        const dateA = a.date ? new Date(a.date) : (a.clock_in ? new Date(a.clock_in) : new Date(0));
        const dateB = b.date ? new Date(b.date) : (b.clock_in ? new Date(b.clock_in) : new Date(0));
        return dateB - dateA;
      });
  }, [userAttendance, selectedMonth]);

  // Calculate monthly stats - improved calculation
  const monthlyStats = useMemo(() => {
    let totalHours = 0;
    let totalBreakMinutes = 0;
    let daysWorked = 0;

    monthAttendance.forEach(a => {
      // Calculate hours worked - prefer stored value, but recalculate if needed
      let hours = 0;
      if (a.hours_worked) {
        hours = parseFloat(a.hours_worked);
        // Validate hours (should be reasonable - max 24 hours per day)
        if (hours > 24 || hours < 0) {
          // Recalculate from clock in/out times if stored value seems invalid
          if (a.clock_in && a.clock_out) {
            try {
              const clockInTime = new Date(a.clock_in);
              const clockOutTime = new Date(a.clock_out);
              const totalMinutes = (clockOutTime - clockInTime) / (1000 * 60);
              const breakMinutes = parseFloat(a.total_break_duration || 0);
              const workMinutes = Math.max(0, totalMinutes - breakMinutes);
              hours = workMinutes / 60;
            } catch {
              hours = 0;
            }
          } else {
            hours = 0;
          }
        }
      } else if (a.clock_in && a.clock_out) {
        // Calculate from times if hours_worked not set
        try {
          const clockInTime = new Date(a.clock_in);
          const clockOutTime = new Date(a.clock_out);
          const totalMinutes = (clockOutTime - clockInTime) / (1000 * 60);
          const breakMinutes = parseFloat(a.total_break_duration || 0);
          const workMinutes = Math.max(0, totalMinutes - breakMinutes);
          hours = workMinutes / 60;
        } catch {
          hours = 0;
        }
      }
      
      totalHours += hours;
      
      if (a.total_break_duration) {
        totalBreakMinutes += parseFloat(a.total_break_duration);
      }
      if (a.status === 'clocked_out' || (a.clock_in && a.clock_out)) {
        daysWorked++;
      }
    });

    return { totalHours, totalBreakMinutes, daysWorked };
  }, [monthAttendance]);

  const handleEdit = (record) => {
    setEditingAttendance(record);
    setEditClockIn(record.clock_in ? new Date(record.clock_in).toISOString().slice(0, 16) : '');
    setEditClockOut(record.clock_out ? new Date(record.clock_out).toISOString().slice(0, 16) : '');
    setEditHours(record.hours_worked ? parseFloat(record.hours_worked).toString() : '');
  };

  const handleSave = async () => {
    if (!editingAttendance || !canEdit) return;

    setIsSaving(true);
    try {
      const attIndex = attendance.findIndex(
        a => a && a.attendance_id === editingAttendance.attendance_id
      );

      if (attIndex === -1) {
        error('Attendance record not found');
        return;
      }

      let clockOutTime = null;
      if (editClockOut) {
        clockOutTime = new Date(editClockOut);
        if (isNaN(clockOutTime.getTime())) {
          error('Invalid clock out time');
          setIsSaving(false);
          return;
        }
      }

      const clockInTime = new Date(editClockIn);
      if (isNaN(clockInTime.getTime())) {
        error('Invalid clock in time');
        setIsSaving(false);
        return;
      }

      if (clockOutTime && clockOutTime <= clockInTime) {
        error('Clock out time must be after clock in time');
        setIsSaving(false);
        return;
      }

      let calculatedHours = null;
      if (clockOutTime) {
        const totalMinutes = (clockOutTime - clockInTime) / (1000 * 60);
        const breakMinutes = parseFloat(editingAttendance.total_break_duration || 0);
        calculatedHours = (totalMinutes - breakMinutes) / 60;
      } else if (editHours) {
        calculatedHours = parseFloat(editHours);
      }

      // Build update object, ensuring no undefined values
      const updateData = {
        ...editingAttendance,
        clock_in: clockInTime.toISOString(),
        hours_worked: calculatedHours,
        status: clockOutTime ? 'clocked_out' : (editingAttendance.status || 'clocked_in'),
      };
      
      // Only set clock_out if we have a valid value
      if (clockOutTime) {
        updateData.clock_out = clockOutTime.toISOString();
      } else if (editingAttendance.clock_out) {
        updateData.clock_out = editingAttendance.clock_out;
      }
      // Remove any undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });
      
      await updateRow(COLLECTIONS.ATTENDANCE, attIndex + 2, updateData);

      success('Attendance updated successfully!');
      setEditingAttendance(null);
      setEditClockIn('');
      setEditClockOut('');
      setEditHours('');
    } catch (err) {
      error('Error updating attendance: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading.all) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!viewUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="glass-card p-12 text-center">
            <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-700 mb-2">User Not Found</h3>
            <p className="text-gray-500 mb-4">The user you're looking for doesn't exist.</p>
            <button
              onClick={() => navigate('/dashboard/attendance')}
              className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-colors"
            >
              Back to Attendance
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard/attendance')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-blue-600 text-white flex items-center justify-center font-bold text-xl shadow-lg shadow-primary/20">
                  {viewUser.name?.charAt(0) || <User className="w-6 h-6" />}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{viewUser.name || viewUser.email}</h1>
                  <p className="text-sm text-gray-500 capitalize">{viewUser.role?.replace('_', ' ')}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-900 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              />
            </div>
          </div>

          {/* Monthly Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Total Hours</div>
              <div className="text-2xl font-bold text-gray-900">{monthlyStats.totalHours.toFixed(1)}h</div>
            </div>
            <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
              <div className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">Break Time</div>
              <div className="text-2xl font-bold text-gray-900">{formatBreakDuration(monthlyStats.totalBreakMinutes)}</div>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border border-green-100">
              <div className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1">Days Worked</div>
              <div className="text-2xl font-bold text-gray-900">{monthlyStats.daysWorked}</div>
            </div>
          </div>
        </div>

        {/* Calendar View / Attendance List */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Attendance History
          </h2>

          {monthAttendance.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No attendance records for this month</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 font-bold">Date</th>
                    <th className="px-4 py-3 font-bold">Clock In</th>
                    <th className="px-4 py-3 font-bold">Clock Out</th>
                    <th className="px-4 py-3 font-bold">Break</th>
                    <th className="px-4 py-3 font-bold">Hours</th>
                    <th className="px-4 py-3 font-bold">Status</th>
                    {canEdit && <th className="px-4 py-3 font-bold text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {monthAttendance.map((record, idx) => {
                    const recordDate = record.date ? new Date(record.date) : (record.clock_in ? new Date(record.clock_in) : null);
                    const isEditing = editingAttendance?.attendance_id === record.attendance_id;

                    return (
                      <tr key={record.attendance_id || idx} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {recordDate ? recordDate.toLocaleDateString() : '—'}
                        </td>
                        {isEditing ? (
                          <>
                            <td className="px-4 py-3">
                              <input
                                type="datetime-local"
                                value={editClockIn}
                                onChange={(e) => setEditClockIn(e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-xs"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="datetime-local"
                                value={editClockOut}
                                onChange={(e) => setEditClockOut(e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-xs"
                              />
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {formatBreakDuration(record.total_break_duration || 0)}
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                step="0.1"
                                value={editHours}
                                onChange={(e) => setEditHours(e.target.value)}
                                placeholder="Auto"
                                className="w-full px-2 py-1 border border-gray-200 rounded text-xs"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                                record.status === 'clocked_in' ? 'bg-green-100 text-green-700' :
                                record.status === 'clocked_out' ? 'bg-gray-100 text-gray-600' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {record.status?.replace('_', ' ') || 'Unknown'}
                              </span>
                            </td>
                            {canEdit && (
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                                  >
                                    <Save className="w-3 h-3" />
                                    Save
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingAttendance(null);
                                      setEditClockIn('');
                                      setEditClockOut('');
                                      setEditHours('');
                                    }}
                                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors flex items-center gap-1"
                                  >
                                    <X className="w-3 h-3" />
                                    Cancel
                                  </button>
                                </div>
                              </td>
                            )}
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3 text-gray-600">
                              {record.clock_in ? new Date(record.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {record.clock_out ? new Date(record.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {formatBreakDuration(record.total_break_duration || 0)}
                            </td>
                            <td className="px-4 py-3 font-bold text-gray-900">
                              {record.hours_worked ? `${parseFloat(record.hours_worked).toFixed(1)}h` : '—'}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                                record.status === 'clocked_in' ? 'bg-green-100 text-green-700' :
                                record.status === 'clocked_out' ? 'bg-gray-100 text-gray-600' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {record.status?.replace('_', ' ') || 'Unknown'}
                              </span>
                            </td>
                            {canEdit && (
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => handleEdit(record)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  Edit
                                </button>
                              </td>
                            )}
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

