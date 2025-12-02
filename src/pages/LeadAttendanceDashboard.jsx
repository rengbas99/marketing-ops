import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Clock, User, CheckCircle, XCircle, Calendar, TrendingUp, ArrowRight, FileText, Eye } from 'lucide-react';
import { COLLECTIONS, ROLES } from '../constants';
import { formatBreakDuration } from '../utils/timeFormatting';

export default function LeadAttendanceDashboard() {
  const navigate = useNavigate();
  const { data, loading, startPolling, stopPolling } = useData();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    startPolling('lead-attendance-dashboard', [
      COLLECTIONS.ATTENDANCE,
      COLLECTIONS.USERS,
      COLLECTIONS.PHOTOGRAPHER_ATTENDANCE,
      COLLECTIONS.EDITOR_TIME_LOGS,
      COLLECTIONS.TIME_BREAKS
    ]);
    return () => stopPolling('lead-attendance-dashboard');
  }, [startPolling, stopPolling]);

  // Update current time every second for real-time elapsed time display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const attendance = Array.isArray(data.Attendance) ? data.Attendance : [];
  const users = Array.isArray(data.Users) ? data.Users : [];
  const photographerAttendance = Array.isArray(data.Photographer_Attendance) ? data.Photographer_Attendance : [];
  const editorTimeLogs = Array.isArray(data.Editor_Time_Logs) ? data.Editor_Time_Logs : [];
  const breaks = Array.isArray(data.Time_Breaks) ? data.Time_Breaks : [];

  // Get team members (active users excluding managers/leads)
  const teamMembers = useMemo(() => {
    return users.filter(u => 
      u && 
      u.active !== 'FALSE' && 
      u.active !== false &&
      u.role !== ROLES.MANAGER &&
      u.role !== ROLES.LEAD
    );
  }, [users]);

  // Get attendance status for selected date
  const getAttendanceStatus = useMemo(() => {
    const statusMap = {};
    
    // Helper to get date from record (check both date field and clock_in timestamp)
    const getRecordDate = (record) => {
      if (record.date) {
        // Handle Firestore Timestamp, Date object, or string
        let dateValue = record.date;
        if (dateValue && typeof dateValue === 'object' && dateValue.toDate) {
          dateValue = dateValue.toDate();
        }
        if (dateValue instanceof Date) {
          return dateValue.toISOString().split('T')[0];
        }
        if (typeof dateValue === 'string') {
          return new Date(dateValue).toISOString().split('T')[0];
        }
      }
      if (record.clock_in) {
        // Handle Firestore Timestamp, Date object, or string
        let clockInValue = record.clock_in;
        if (clockInValue && typeof clockInValue === 'object' && clockInValue.toDate) {
          clockInValue = clockInValue.toDate();
        }
        if (clockInValue instanceof Date) {
          return clockInValue.toISOString().split('T')[0];
        }
        if (typeof clockInValue === 'string') {
          return new Date(clockInValue).toISOString().split('T')[0];
        }
      }
      return null;
    };
    
    teamMembers.forEach(member => {
      // Get ALL attendance records for this member on the selected date
      const memberAttendanceRecords = attendance.filter(a => {
        if (!a || !a.employee_id) return false;
        // Match employee email (trim to handle spaces)
        if (a.employee_id.trim() !== member.email.trim()) return false;
        // Check if record is from the selected date
        const recordDate = getRecordDate(a);
        return recordDate === selectedDate;
      });

      if (memberAttendanceRecords.length > 0) {
        // Find the most recent active clock-in (if any)
        const activeClockIn = memberAttendanceRecords.find(a => 
          a.clock_in && 
          !a.clock_out && 
          (a.status === 'clocked_in' || !a.status)
        );
        
        // Find the most recent clocked-out record (for display purposes)
        const clockedOutRecords = memberAttendanceRecords.filter(a => 
          a.clock_out || a.status === 'clocked_out'
        );
        const mostRecentClockedOut = clockedOutRecords.length > 0 
          ? clockedOutRecords.sort((a, b) => {
              const timeA = a.clock_out ? new Date(a.clock_out) : new Date(a.clock_in);
              const timeB = b.clock_out ? new Date(b.clock_out) : new Date(b.clock_in);
              return timeB - timeA;
            })[0]
          : null;

        // If there's an active clock-in, user is currently working
        const isClockedIn = !!activeClockIn;
        // User is "finished" only if they have clocked out AND have NO active clock-in
        const isClockedOut = !isClockedIn && clockedOutRecords.length > 0;
        
        // Use active clock-in for elapsed time, or most recent record
        const displayAttendance = activeClockIn || mostRecentClockedOut || memberAttendanceRecords[0];
        
        // Calculate elapsed time if clocked in (using currentTime for real-time updates)
        let elapsedTime = null;
        if (isClockedIn && activeClockIn.clock_in) {
          const clockInTime = new Date(activeClockIn.clock_in);
          const diff = currentTime - clockInTime;
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          elapsedTime = { hours, minutes };
        }

        // Calculate total break time for the active session
        let totalBreakMinutes = 0;
        if (activeClockIn && activeClockIn.attendance_id) {
          const memberBreaks = breaks.filter(
            b => b && b.attendance_id === activeClockIn.attendance_id && b.break_end
          );
          totalBreakMinutes = memberBreaks.reduce((sum, b) => {
            return sum + (parseFloat(b.duration) || 0);
          }, 0);
        }

        statusMap[member.email] = {
          member,
          attendance: displayAttendance,
          isClockedIn,
          isClockedOut,
          elapsedTime,
          totalBreakMinutes,
          clockIn: displayAttendance?.clock_in || null,
          clockOut: displayAttendance?.clock_out || null,
          hoursWorked: displayAttendance?.hours_worked || null
        };
      } else {
        statusMap[member.email] = {
          member,
          attendance: null,
          isClockedIn: false,
          isClockedOut: false,
          elapsedTime: null,
          totalBreakMinutes: 0,
          clockIn: null,
          clockOut: null,
          hoursWorked: null
        };
      }
    });

    return statusMap;
  }, [teamMembers, attendance, selectedDate, breaks, currentTime]);

  // Separate into clocked in and clocked out
  const { clockedInMembers, clockedOutMembers, notClockedIn } = useMemo(() => {
    const clockedIn = [];
    const clockedOut = [];
    const notIn = [];

    Object.values(getAttendanceStatus).forEach(status => {
      if (status.isClockedIn) {
        clockedIn.push(status);
      } else if (status.isClockedOut) {
        clockedOut.push(status);
      } else {
        notIn.push(status);
      }
    });

    return {
      clockedInMembers: clockedIn,
      clockedOutMembers: clockedOut,
      notClockedIn: notIn
    };
  }, [getAttendanceStatus]);

  const handleViewDetails = (memberEmail) => {
    navigate(`/dashboard/attendance/user/${memberEmail}`);
  };

  if (loading.all) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn mobile-padding pb-8 space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border-l-4 border-primary flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Daily Team Status</h1>
          <p className="text-gray-600">Monitor team attendance and work status in real-time</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-900 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
          />
          <button
            onClick={() => navigate('/dashboard/attendance')}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            View History
          </button>
          <button
            onClick={() => navigate('/dashboard/daily-reports')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            View Reports
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Currently Working</p>
              <p className="text-3xl font-bold text-gray-900">{clockedInMembers.length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="glass-card p-6 border-l-4 border-gray-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Finished Today</p>
              <p className="text-3xl font-bold text-gray-900">{clockedOutMembers.length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>
        <div className="glass-card p-6 border-l-4 border-orange-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Not Clocked In</p>
              <p className="text-3xl font-bold text-gray-900">{notClockedIn.length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
              <XCircle className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* CLOCKED IN Section */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
            <h2 className="text-xl font-bold text-gray-900">Currently Working ({clockedInMembers.length})</h2>
          </div>
          {clockedInMembers.length > 0 && (
            <button
              onClick={() => navigate('/dashboard/attendance?view=team')}
              className="text-sm text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
            >
              View All <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
        {clockedInMembers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No team members currently clocked in</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clockedInMembers.map(({ member, attendance, elapsedTime, totalBreakMinutes, clockIn }) => (
              <div
                key={member.email}
                onClick={() => handleViewDetails(member.email)}
                className="p-4 bg-green-50 border-2 border-green-200 rounded-xl hover:border-green-300 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-100 text-green-700 flex items-center justify-center font-bold text-lg">
                      {member.name?.charAt(0) || <User className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{member.name || member.email}</h3>
                      <p className="text-xs text-gray-500 capitalize">{member.role?.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Clock In:</span>
                    <span className="font-bold text-gray-900">
                      {clockIn ? new Date(clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </span>
                  </div>
                  {elapsedTime && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Elapsed:</span>
                      <span className="font-bold text-green-700">
                        {elapsedTime.hours}h {elapsedTime.minutes}m
                      </span>
                    </div>
                  )}
                  {totalBreakMinutes > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Break:</span>
                      <span className="font-bold text-orange-600">{formatBreakDuration(totalBreakMinutes)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CLOCKED OUT Section */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-gray-600" />
            <h2 className="text-xl font-bold text-gray-900">Finished for the Day ({clockedOutMembers.length})</h2>
          </div>
          {clockedOutMembers.length > 0 && (
            <button
              onClick={() => navigate('/dashboard/attendance?view=team')}
              className="text-sm text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
            >
              View All <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
        {clockedOutMembers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No team members have clocked out today</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clockedOutMembers.map(({ member, attendance, clockIn, clockOut, hoursWorked, totalBreakMinutes }) => (
              <div
                key={member.email}
                onClick={() => handleViewDetails(member.email)}
                className="p-4 bg-gray-50 border-2 border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-lg">
                      {member.name?.charAt(0) || <User className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{member.name || member.email}</h3>
                      <p className="text-xs text-gray-500 capitalize">{member.role?.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Clock In:</span>
                    <span className="font-bold text-gray-900">
                      {clockIn ? new Date(clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Clock Out:</span>
                    <span className="font-bold text-gray-900">
                      {clockOut ? new Date(clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </span>
                  </div>
                  {hoursWorked && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Hours:</span>
                      <span className="font-bold text-blue-600">{parseFloat(hoursWorked).toFixed(1)}h</span>
                    </div>
                  )}
                  {totalBreakMinutes > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Break:</span>
                      <span className="font-bold text-orange-600">{formatBreakDuration(totalBreakMinutes)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Not Clocked In Section */}
      {notClockedIn.length > 0 && (
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <XCircle className="w-5 h-5 text-orange-600" />
            <h2 className="text-xl font-bold text-gray-900">Not Clocked In ({notClockedIn.length})</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {notClockedIn.map(({ member }) => (
              <div
                key={member.email}
                onClick={() => handleViewDetails(member.email)}
                className="p-4 bg-orange-50 border-2 border-orange-200 rounded-xl hover:border-orange-300 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-lg">
                      {member.name?.charAt(0) || <User className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{member.name || member.email}</h3>
                      <p className="text-xs text-gray-500 capitalize">{member.role?.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-orange-600 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

