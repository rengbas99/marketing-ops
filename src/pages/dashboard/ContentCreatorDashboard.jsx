import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import BreakDialog from '../../components/BreakDialog';
import BreakTimer from '../../components/BreakTimer';
import { Clock, Calendar, MessageSquare, FileText, LogIn, LogOut, X, Coffee, Play, Camera, Plane } from 'lucide-react';
import { COLLECTIONS, ASSET_STATUS } from '../../constants';
import { shouldAutoClockOut, findStaleClockIns, canClockIn } from '../../utils/attendanceUtils';

export default function ContentCreatorDashboard() {
  const { data, loading, startPolling, stopPolling, addRow, updateRow, forceRefresh } = useData();
  const { user } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const [clockedIn, setClockedIn] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [selectedTask, setSelectedTask] = useState('');
  const [showTaskSelector, setShowTaskSelector] = useState(false);
  const [elapsedTime, setElapsedTime] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [isClockInLoading, setIsClockInLoading] = useState(false);
  const [isClockOutLoading, setIsClockOutLoading] = useState(false);
  const [activeBreak, setActiveBreak] = useState(null);
  const [showBreakDialog, setShowBreakDialog] = useState(false);
  const [showClockOutReport, setShowClockOutReport] = useState(false);
  const [clockOutReport, setClockOutReport] = useState('');

  useEffect(() => {
    startPolling('content-creator-dashboard', [
      COLLECTIONS.ATTENDANCE,
      COLLECTIONS.CONTENT_CALENDAR,
      COLLECTIONS.TASK_UPDATES,
      COLLECTIONS.ASSETS,
      COLLECTIONS.CLIENTS,
      COLLECTIONS.SHOOTS,
      COLLECTIONS.EDITOR_TIME_LOGS,
      COLLECTIONS.TIME_BREAKS
    ]);
    return () => stopPolling('content-creator-dashboard');
  }, [startPolling, stopPolling]);

  const attendance = Array.isArray(data.Attendance) ? data.Attendance : [];
  const calendar = Array.isArray(data.Content_Calendar) ? data.Content_Calendar : [];
  const assets = Array.isArray(data.Assets) ? data.Assets : [];
  const clients = Array.isArray(data.Clients) ? data.Clients : [];
  const shoots = Array.isArray(data.Shoots) ? data.Shoots : [];
  const breaks = Array.isArray(data.Time_Breaks) ? data.Time_Breaks : [];
  const timeLogs = Array.isArray(data.Editor_Time_Logs) ? data.Editor_Time_Logs : [];

  const assignedTasks = Array.isArray(assets) ? assets.filter(
    a => a && (a.assigned_creator_email === user?.email) &&
      a.status !== ASSET_STATUS.COMPLETED && a.status !== 'Final'
  ) : [];

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const normalizedEmail = (user?.email || '').trim();
    const todayAtt = attendance.find(
      a => a && a.employee_id && a.employee_id.trim() === normalizedEmail && a.date === today
    );

    // Check if today's attendance should be auto clocked out (over 15 hours)
    if (todayAtt && shouldAutoClockOut(todayAtt)) {
      const staleIndex = attendance.findIndex(a => a && a.attendance_id === todayAtt.attendance_id);
      if (staleIndex !== -1) {
        const clockOutTime = new Date().toISOString();
        const clockInTime = new Date(todayAtt.clock_in);
        const totalMinutes = (new Date(clockOutTime) - clockInTime) / (1000 * 60);
        const breakMinutes = parseFloat(todayAtt.total_break_duration || 0);
        const workMinutes = Math.max(0, totalMinutes - breakMinutes);
        const hoursWorked = workMinutes / 60;

        updateRow(COLLECTIONS.ATTENDANCE, staleIndex + 2, {
          ...todayAtt,
          clock_out: clockOutTime,
          status: 'clocked_out',
          hours_worked: hoursWorked.toFixed(2),
          daily_report: todayAtt.daily_report || 'Auto clocked out after 15 hours',
        }).then(() => {
          forceRefresh([COLLECTIONS.ATTENDANCE]).catch(console.error);
        }).catch(console.error);

        setClockedIn(false);
        setTodayAttendance(null);
        return;
      }
    }

    // Auto clock-out all stale records (not just today's)
    const staleRecords = findStaleClockIns(attendance.filter(
      a => a && a.employee_id && a.employee_id.trim() === normalizedEmail
    ));
    
    if (staleRecords.length > 0) {
      staleRecords.forEach(record => {
        const staleIndex = attendance.findIndex(a => a && a.attendance_id === record.attendance_id);
        if (staleIndex !== -1) {
          const clockOutTime = new Date().toISOString();
          const clockInTime = new Date(record.clock_in);
          const totalMinutes = (new Date(clockOutTime) - clockInTime) / (1000 * 60);
          const breakMinutes = parseFloat(record.total_break_duration || 0);
          const workMinutes = Math.max(0, totalMinutes - breakMinutes);
          const hoursWorked = workMinutes / 60;

          updateRow(COLLECTIONS.ATTENDANCE, staleIndex + 2, {
            ...record,
            clock_out: clockOutTime,
            status: 'clocked_out',
            hours_worked: hoursWorked.toFixed(2),
            daily_report: record.daily_report || 'Auto clocked out after 15 hours',
          }).catch(console.error);
        }
      });
      
      if (staleRecords.length > 0) {
        forceRefresh([COLLECTIONS.ATTENDANCE]).catch(console.error);
      }
    }

    setTodayAttendance(todayAtt);
    setClockedIn(todayAtt && todayAtt.clock_in && !todayAtt.clock_out && 
      (todayAtt.status === 'clocked_in' || !todayAtt.status || todayAtt.status === ''));
  }, [data, user, attendance, updateRow, forceRefresh]);

  useEffect(() => {
    if (!clockedIn || !todayAttendance) {
      setActiveBreak(null);
      return;
    }

    const activeTimeLog = timeLogs.find(
      log => log && log.editor_email === user?.email && !log.end_time
    );

    if (activeTimeLog) {
      const activeBreakRecord = breaks.find(
        b => b && b.time_log_id === activeTimeLog.log_id && !b.break_end
      );
      setActiveBreak(activeBreakRecord);
    } else {
      const activeBreakRecord = breaks.find(
        b => b && b.attendance_id === todayAttendance.attendance_id && !b.break_end
      );
      setActiveBreak(activeBreakRecord);
    }
  }, [data, clockedIn, todayAttendance, timeLogs, breaks, user]);

  useEffect(() => {
    if (!clockedIn || !todayAttendance || !todayAttendance.clock_in) {
      setElapsedTime({ hours: 0, minutes: 0, seconds: 0 });
      return;
    }

    const updateTimer = () => {
      const clockInTime = new Date(todayAttendance.clock_in);
      const now = new Date();
      const diff = now - clockInTime;

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setElapsedTime({ hours, minutes, seconds });

      // Auto clock-out after 15 hours (matching attendanceUtils)
      if (hours >= 15) {
        handleClockOut().catch(console.error);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [clockedIn, todayAttendance]);

  const handleClockIn = async () => {
    if (assignedTasks.length > 0) {
      setShowTaskSelector(true);
      return;
    }
    await performClockIn();
  };

  const performClockIn = async () => {
    if (clockedIn && todayAttendance && todayAttendance.status === 'clocked_in') {
      error('You are already clocked in!');
      return;
    }

    setIsClockInLoading(true);
    try {
      const clockInTime = new Date().toISOString();
      const today = new Date().toISOString().split('T')[0];

      // Use utility function to check if can clock in (prevents multiple sessions on same day)
      const clockInCheck = canClockIn(attendance, user?.email, today);
      
      if (!clockInCheck.canClockIn && clockInCheck.reason === 'already_clocked_in') {
        error('You already have an active clock-in session for today. Please clock out first before starting a new session.');
        setIsClockInLoading(false);
        return;
      }

      // If there's a stale record that needs auto clock-out, do it first
      if (clockInCheck.reason === 'auto_clockout_needed' && clockInCheck.existingRecord) {
        const staleIndex = attendance.findIndex(a => a && a.attendance_id === clockInCheck.existingRecord.attendance_id);
        if (staleIndex !== -1) {
          const clockOutTime = new Date().toISOString();
          const clockInTimeStale = new Date(clockInCheck.existingRecord.clock_in);
          const totalMinutes = (new Date(clockOutTime) - clockInTimeStale) / (1000 * 60);
          const breakMinutes = parseFloat(clockInCheck.existingRecord.total_break_duration || 0);
          const workMinutes = Math.max(0, totalMinutes - breakMinutes);
          const hoursWorked = workMinutes / 60;
          
          await updateRow(COLLECTIONS.ATTENDANCE, staleIndex + 2, {
            ...clockInCheck.existingRecord,
            clock_out: clockOutTime,
            status: 'clocked_out',
            hours_worked: hoursWorked.toFixed(2),
            daily_report: clockInCheck.existingRecord.daily_report || 'Auto clocked out after 15 hours',
          });
          await forceRefresh([COLLECTIONS.ATTENDANCE]);
        }
      }

      // Check if there's an ACTIVE clock-in (not just any record)
      // This prevents overwriting previous clock-in/clock-out data
      const normalizedEmail = (user?.email || '').trim();
      const activeClockIn = attendance.find(
        a => a && 
             a.employee_id && 
             a.employee_id.trim() === normalizedEmail && 
             a.date === today &&
             a.clock_in &&
             !a.clock_out &&
             (a.status === 'clocked_in' || !a.status || a.status === '')
      );

      if (activeClockIn) {
        error('You already have an active clock-in session for today. Please clock out first before starting a new session.');
        setIsClockInLoading(false);
        return;
      }

      // Always create a NEW record for a new clock-in session (don't overwrite existing records)
      // This preserves previous clock-in/clock-out data for the same day
      const normalizedEmailForNew = (user.email || '').trim();
      await addRow(COLLECTIONS.ATTENDANCE, {
        attendance_id: `ATT-${Date.now()}`,
        employee_id: normalizedEmailForNew,
        date: today,
        clock_in: clockInTime,
        status: 'clocked_in',
        created_at: clockInTime,
      });

      const newAttendance = {
        attendance_id: `ATT-${Date.now()}`,
        employee_id: normalizedEmailForNew,
        date: today,
        clock_in: clockInTime,
        status: 'clocked_in',
        created_at: clockInTime,
      };
      setTodayAttendance(newAttendance);
      setClockedIn(true);

      if (selectedTask) {
        const existingLog = timeLogs.find(
          log => log && log.asset_id === selectedTask &&
            log.editor_email === user?.email && !log.end_time
        );

        if (!existingLog) {
          const task = assignedTasks.find(t => t && t.asset_id === selectedTask);
          const shootId = task?.shoot_id || null;

          await addRow(COLLECTIONS.EDITOR_TIME_LOGS, {
            log_id: `LOG-${Date.now()}`,
            asset_id: selectedTask,
            shoot_id: shootId,
            editor_email: user.email,
            start_time: clockInTime,
            end_time: null,
            duration: 0,
            break_start_time: null,
            break_end_time: null,
            total_break_duration: 0,
            work_duration: 0,
            task_status: 'Working',
            work_links: '',
            notes: '',
          });
        }

        const assetIndex = assets.findIndex(a => a && a.asset_id === selectedTask);
        if (assetIndex !== -1) {
          await updateRow(COLLECTIONS.ASSETS, assetIndex + 2, {
            status: ASSET_STATUS.IN_PROGRESS,
            current_editor_status: 'Working',
          });
        }
      }

      await forceRefresh([COLLECTIONS.ATTENDANCE, COLLECTIONS.EDITOR_TIME_LOGS, COLLECTIONS.ASSETS]);
      setShowTaskSelector(false);
      setSelectedTask('');
      success(selectedTask ? 'Clocked in and task started!' : 'Clocked in successfully!');
    } catch (err) {
      error('Error clocking in: ' + err.message);
    } finally {
      setIsClockInLoading(false);
    }
  };

  const handleClockOutClick = () => {
    setShowClockOutReport(true);
  };

  const handleClockOut = async (reportText = '') => {
    if (!todayAttendance) return;

    setIsClockOutLoading(true);
    try {
      if (activeBreak) {
        try {
        await handleEndBreak();
        } catch (breakErr) {
          console.error('Error ending break:', breakErr);
        }
      }

      const clockOutTime = new Date();
      const clockInTime = new Date(todayAttendance.clock_in);

      const timeLogs = Array.isArray(data.Editor_Time_Logs) ? data.Editor_Time_Logs : [];
      const activeTimeLog = timeLogs.find(
        log => log && log.editor_email === user?.email && !log.end_time
      );

      let totalBreakMinutes = 0;
      if (activeTimeLog) {
        totalBreakMinutes = activeTimeLog.total_break_duration || 0;
      } else {
        const todayTimeLogs = timeLogs.filter(log => {
          if (!log || !log.start_time) return false;
          const logDate = new Date(log.start_time).toISOString().split('T')[0];
          const today = new Date().toISOString().split('T')[0];
          return logDate === today && log.editor_email === user.email;
        });
        const timeLogBreaks = todayTimeLogs.reduce((sum, log) => {
          return sum + (parseFloat(log.total_break_duration) || 0);
        }, 0);

        const attendanceBreaks = parseFloat(todayAttendance.total_break_duration || 0);

        totalBreakMinutes = timeLogBreaks + attendanceBreaks;
      }

      const totalMinutes = (clockOutTime - clockInTime) / (1000 * 60);
      const workMinutes = Math.max(0, totalMinutes - totalBreakMinutes);
      const hoursWorkedExcludingBreaks = workMinutes / 60;

      // Use the attendance array extracted earlier, not data.Attendance
      const index = attendance.findIndex(
        a => a && a.attendance_id === todayAttendance.attendance_id
      );

      if (index === -1) {
        error('Attendance record not found. Please refresh the page and try again.');
        setIsClockOutLoading(false);
        return;
      }

      if (index !== -1) {
        await updateRow(COLLECTIONS.ATTENDANCE, index + 2, {
          ...todayAttendance,
          clock_out: clockOutTime.toISOString(),
          status: 'clocked_out',
          hours_worked: hoursWorkedExcludingBreaks.toFixed(2),
          daily_report: reportText || todayAttendance.daily_report || '',
        });

        if (activeTimeLog) {
          const logIndex = timeLogs.findIndex(
            log => log && log.log_id === activeTimeLog.log_id
          );
          if (logIndex !== -1) {
            const startTime = new Date(activeTimeLog.start_time);
            const totalMinutes = (clockOutTime - startTime) / (1000 * 60);
            const breakMinutes = activeTimeLog.total_break_duration || 0;
            const workMinutes = totalMinutes - breakMinutes;
            const workDuration = workMinutes / 60;

            await updateRow(COLLECTIONS.EDITOR_TIME_LOGS, logIndex + 2, {
              ...activeTimeLog,
              end_time: clockOutTime.toISOString(),
              duration: (totalMinutes / 60).toFixed(2),
              work_duration: workDuration.toFixed(2),
              task_status: 'Completed',
            });
          }
        }

        forceRefresh([COLLECTIONS.ATTENDANCE, COLLECTIONS.EDITOR_TIME_LOGS]).catch(err => {
          console.error('Error refreshing data:', err);
        });
        
        setClockedIn(false);
        setShowClockOutReport(false);
        setClockOutReport('');

        const workHours = Math.floor(hoursWorkedExcludingBreaks);
        const workMins = Math.floor((hoursWorkedExcludingBreaks - workHours) * 60);
        success(`Clocked out! You worked ${workHours}h ${workMins}m today (excluding ${Math.floor(totalBreakMinutes / 60)}h ${totalBreakMinutes % 60}m break time).`);
      }
    } catch (err) {
      console.error('Clock out error:', err);
      error('Error clocking out: ' + (err.message || 'Unknown error'));
      setShowClockOutReport(false);
      setClockOutReport('');
    } finally {
      setIsClockOutLoading(false);
    }
  };

  const handleTakeBreak = async (breakType) => {
    if (!clockedIn || !todayAttendance) return;

    if (activeBreak) {
      error('You are already on a break!');
      return;
    }

    try {
      const activeTimeLog = timeLogs.find(
        log => log && log.editor_email === user?.email && !log.end_time
      );

      const attendanceId = activeTimeLog ? null : todayAttendance.attendance_id;
      const timeLogId = activeTimeLog ? activeTimeLog.log_id : null;

      const breakData = {
        break_id: `BRK-${Date.now()}`,
        user_email: user.email,
        attendance_id: attendanceId,
        time_log_id: timeLogId,
        break_start: new Date().toISOString(),
        break_end: null,
        duration: 0,
        break_type: breakType,
        created_at: new Date().toISOString(),
      };

      await addRow(COLLECTIONS.TIME_BREAKS, breakData);
      setActiveBreak(breakData);

      if (activeTimeLog) {
        const logIndex = timeLogs.findIndex(log => log && log.log_id === activeTimeLog.log_id);
        if (logIndex !== -1) {
          try {
            await updateRow(COLLECTIONS.EDITOR_TIME_LOGS, logIndex + 2, {
              ...activeTimeLog,
              break_start_time: new Date().toISOString(),
              task_status: 'On Break',
            });
          } catch (logErr) {
            // Log error but don't block break start
            console.error('Error updating time log for break:', logErr);
          }
        }
      } else {
        const attIndex = attendance.findIndex(
          a => a && a.attendance_id === todayAttendance.attendance_id
        );
        if (attIndex !== -1) {
          try {
            await updateRow(COLLECTIONS.ATTENDANCE, attIndex + 2, {
              ...todayAttendance,
              break_start_time: new Date().toISOString(),
            });
          } catch (attErr) {
            // Log error but don't block break start
            console.error('Error updating attendance for break:', attErr);
          }
        }
      }

      await forceRefresh([COLLECTIONS.ATTENDANCE, COLLECTIONS.EDITOR_TIME_LOGS, COLLECTIONS.TIME_BREAKS]);
      success(`Break started (${breakType})`);
    } catch (err) {
      error('Error starting break: ' + err.message);
    }
  };

  const handleEndBreak = async () => {
    if (!activeBreak || !todayAttendance) return;

    try {
      const breakEnd = new Date();
      const breakStart = new Date(activeBreak.break_start);
      const duration = Math.floor((breakEnd - breakStart) / (1000 * 60));

      const breakIndex = breaks.findIndex(b => b && b.break_id === activeBreak.break_id);
      if (breakIndex !== -1) {
        await updateRow(COLLECTIONS.TIME_BREAKS, breakIndex + 2, {
          ...activeBreak,
          break_end: breakEnd.toISOString(),
          duration: duration,
        });
      }

      const activeTimeLog = timeLogs.find(
        log => log && log.log_id === activeBreak.time_log_id && !log.end_time
      );

      if (activeTimeLog) {
        const logIndex = timeLogs.findIndex(log => log && log.log_id === activeTimeLog.log_id);
        if (logIndex !== -1) {
          const currentTotal = (activeTimeLog.total_break_duration || 0) + duration;
          await updateRow(COLLECTIONS.EDITOR_TIME_LOGS, logIndex + 2, {
            ...activeTimeLog,
            break_end_time: breakEnd.toISOString(),
            total_break_duration: currentTotal,
            task_status: 'Working',
          });
        }
      } else {
        const attIndex = attendance.findIndex(
          a => a && a.attendance_id === todayAttendance.attendance_id
        );
        if (attIndex !== -1) {
          const currentTotal = (todayAttendance.total_break_duration || 0) + duration;
          await updateRow(COLLECTIONS.ATTENDANCE, attIndex + 2, {
            ...todayAttendance,
            break_end_time: breakEnd.toISOString(),
            total_break_duration: currentTotal,
          });
        }
      }

      await forceRefresh([COLLECTIONS.ATTENDANCE, COLLECTIONS.EDITOR_TIME_LOGS, COLLECTIONS.TIME_BREAKS]);
      setActiveBreak(null);
      success('Break ended');
    } catch (err) {
      error('Error ending break: ' + err.message);
    }
  };

  const upcomingCalendar = Array.isArray(calendar) ? calendar
    .filter(entry => {
      if (!entry || !entry.publish_date) return false;
      try {
        const publishDate = new Date(entry.publish_date);
        return !isNaN(publishDate.getTime()) && publishDate >= new Date();
      } catch {
        return false;
      }
    })
    .sort((a, b) => new Date(a.publish_date || 0) - new Date(b.publish_date || 0))
    .slice(0, 5) : [];

  if (loading.all) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Loading user data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn mobile-padding pb-8 space-y-8">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border-l-4 border-primary">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          Welcome back, <span className="text-gradient">{user?.name || 'Content Creator'}</span>!
        </h1>
        <p className="text-gray-600">Track attendance and view calendar</p>
      </div>

      {/* Clock In/Out Card */}
      <div className={`glass-card p-6 transition-all duration-300 ${clockedIn ? 'border-green-500/50 bg-green-50/50' : ''
        }`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${clockedIn ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {clockedIn ? 'Currently Working' : 'Not Clocked In'}
              </h2>
              {clockedIn && todayAttendance && (
                <p className="text-sm text-gray-500">
                  Started at {new Date(todayAttendance.clock_in).toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
          {clockedIn && (
            <div className="text-right">
              <div className="text-3xl font-mono font-bold text-gray-900">
                {String(elapsedTime.hours).padStart(2, '0')}:
                {String(elapsedTime.minutes).padStart(2, '0')}:
                {String(elapsedTime.seconds).padStart(2, '0')}
              </div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Elapsed Time</p>
            </div>
          )}
        </div>

        {clockedIn ? (
          <div className="space-y-4">
            {activeBreak && (
              <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Coffee className="w-5 h-5 text-orange-500" />
                  <div>
                    <p className="font-semibold text-orange-900">On Break: {activeBreak.break_type}</p>
                    <BreakTimer breakStart={activeBreak.break_start} breakType={activeBreak.break_type} />
                  </div>
                </div>
                <button
                  onClick={handleEndBreak}
                  className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg font-medium hover:bg-orange-200 transition-colors"
                >
                  End Break
                </button>
              </div>
            )}

            <div className="flex gap-3">
              {!activeBreak && (
                <button
                  onClick={() => setShowBreakDialog(true)}
                  className="flex-1 glass-button text-gray-700 hover:text-primary flex items-center justify-center gap-2"
                >
                  <Coffee className="w-4 h-4" />
                  Take Break
                </button>
              )}
              <button
                onClick={handleClockOutClick}
                disabled={isClockOutLoading}
                className="flex-1 bg-red-50 text-red-600 px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                    <LogOut className="w-4 h-4" />
                    Clock Out
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600">
              {assignedTasks.length > 0
                ? 'Select a task and clock in to start working'
                : 'Click below to clock in for the day'}
            </p>
            <button
              onClick={handleClockIn}
              disabled={isClockInLoading}
              className="w-full bg-primary text-white px-6 py-4 rounded-xl font-bold text-lg shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all transform hover:scale-[1.02] flex items-center justify-center gap-3"
            >
              <LogIn className="w-6 h-6" />
              {assignedTasks.length > 0 ? 'Clock In & Select Task' : 'Clock In'}
            </button>
          </div>
        )}
      </div>

      {/* Task Selector Modal */}
      {showTaskSelector && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 transition-opacity z-[100]"
            style={{ background: 'rgba(0, 0, 0, 0.25)', backdropFilter: 'blur(6px)', borderRadius: '16px' }}
            onClick={() => {
              setShowTaskSelector(false);
              setSelectedTask('');
            }}
          />
          <div className="bg-white rounded-2xl max-w-md w-full p-6 relative z-[101] animate-fadeIn" style={{ borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>
            <div className="flex items-start justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Select Task</h3>
              <button
                onClick={() => {
                  setShowTaskSelector(false);
                  setSelectedTask('');
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Task (Optional)
              </label>
              <select
                value={selectedTask}
                onChange={(e) => setSelectedTask(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              >
                <option value="">No task - Just clock in</option>
                {assignedTasks
                  .filter(t => t && (t.status === ASSET_STATUS.TO_EDIT || !t.status || t.status === ASSET_STATUS.IN_PROGRESS))
                  .map(task => {
                    const shoot = shoots.find(s => s && s.shoot_id === task.shoot_id);
                    const client = shoot ? clients.find(c => c && c.client_id === shoot.client_id) : null;
                    return (
                      <option key={task.asset_id} value={task.asset_id}>
                        {task.title} {client ? `- ${client.company_name}` : ''}
                      </option>
                    );
                  })}
              </select>
              <p className="text-xs text-gray-500 mt-2">
                You can clock in without selecting a task, or select one to track time on it
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowTaskSelector(false);
                  setSelectedTask('');
                }}
                className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={performClockIn}
                disabled={isClockInLoading}
                className="flex-1 px-4 py-3 text-white bg-primary rounded-xl font-bold hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isClockInLoading ? 'Processing...' : 'Clock In'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => navigate('/dashboard/shoots')}
          className="glass-card p-6 flex items-center gap-4 group hover:bg-white/80"
        >
          <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
            <Camera className="w-8 h-8 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-gray-900">Add Shoot</h3>
            <p className="text-sm text-gray-600">Assign new shoots to videographers</p>
          </div>
        </button>
        <button
          onClick={() => navigate('/dashboard/assign-tasks?action=task')}
          className="glass-card p-6 flex items-center gap-4 group hover:bg-white/80"
        >
          <div className="p-3 bg-secondary/10 rounded-xl group-hover:bg-secondary/20 transition-colors">
            <FileText className="w-8 h-8 text-secondary" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-gray-900">Assign Task</h3>
            <p className="text-sm text-gray-600">Create and assign tasks to editors</p>
          </div>
        </button>
        <button
          onClick={() => navigate('/dashboard/leave-requests')}
          className="glass-card p-6 flex items-center gap-4 group hover:bg-white/80"
        >
          <div className="p-3 bg-orange-100 rounded-xl group-hover:bg-orange-200 transition-colors">
            <Plane className="w-8 h-8 text-orange-600" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-gray-900">Leave Requests</h3>
            <p className="text-sm text-gray-600">Request leave or approve team requests</p>
          </div>
        </button>
      </div>

      {/* Upcoming Calendar */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Upcoming Content
          </h2>
          <Link
            to="/dashboard/calendar"
            className="text-primary text-sm font-bold hover:underline flex items-center gap-1"
          >
            View All
          </Link>
        </div>
        <div className="space-y-4">
          {upcomingCalendar.length > 0 ? (
            upcomingCalendar.map((entry, index) => {
              const asset = assets.find(a => a && a.asset_id === entry.asset_id);
              const dateStr = entry.publish_date ? new Date(entry.publish_date).toLocaleDateString() : 'No date';

              return (
                <div
                  key={entry.calendar_id || index}
                  className="p-4 rounded-xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 mb-1">
                        {asset?.title || 'Content'}
                      </h3>
                      <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {dateStr}
                        </span>
                        {entry.channel && (
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-bold uppercase">
                            {entry.channel}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${entry.status === 'published' ? 'bg-green-100 text-green-700' :
                        entry.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                      }`}>
                      {entry.status || 'Scheduled'}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No upcoming content scheduled</p>
            </div>
          )}
        </div>
      </div>

      {/* Assigned Tasks */}
      {assignedTasks.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-purple-600" />
            My Assigned Tasks ({assignedTasks.length})
          </h2>
          <div className="space-y-4">
            {assignedTasks.map((task, index) => {
              const shoot = shoots.find(s => s && s.shoot_id === task.shoot_id);
              const client = shoot ? clients.find(c => c && c.client_id === shoot.client_id) : null;
              const isPostingTask = task.task_type === 'posting';
              const isContentCreation = task.task_type === 'content_creation';

              return (
                <div
                  key={task.asset_id || index}
                  className="p-4 rounded-xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-gray-900">{task.title || 'Untitled Task'}</h3>
                        {isPostingTask && (
                          <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-bold">Posting</span>
                        )}
                        {isContentCreation && (
                          <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs font-bold">Creation</span>
                        )}
                      </div>

                      {client && (
                        <p className="text-sm text-primary font-medium mb-2">{client.company_name}</p>
                      )}

                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        {task.deadline && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4 text-gray-400" />
                            Due: {new Date(task.deadline).toLocaleDateString()}
                          </span>
                        )}
                        {task.channel && (
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-4 h-4 text-gray-400" />
                            {task.channel}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${task.status === ASSET_STATUS.IN_PROGRESS ? 'bg-blue-100 text-blue-700' :
                        task.status === ASSET_STATUS.TO_EDIT ? 'bg-gray-100 text-gray-700' :
                          'bg-yellow-100 text-yellow-700'
                      }`}>
                      {task.status || 'Pending'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Break Dialog */}
      <BreakDialog
        isOpen={showBreakDialog}
        onClose={() => setShowBreakDialog(false)}
        onConfirm={handleTakeBreak}
      />

      {/* Clock Out Report Modal */}
      {showClockOutReport && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 transition-opacity z-[100]" 
            style={{ background: 'rgba(0, 0, 0, 0.25)', backdropFilter: 'blur(6px)', borderRadius: '16px' }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowClockOutReport(false);
                setClockOutReport('');
              }
            }} 
          />
          <div className="w-full max-w-md relative z-[101] animate-fadeIn bg-white rounded-3xl border border-gray-100 p-6" style={{ borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Daily Work Report</h3>
              <button
                onClick={() => {
                  setShowClockOutReport(false);
                  setClockOutReport('');
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              (Optional) Provide a brief summary of what you accomplished today before clocking out.
            </p>
            <textarea
              value={clockOutReport}
              onChange={(e) => setClockOutReport(e.target.value)}
              placeholder="E.g., Completed 3 client assets, attended team meeting, reviewed 2 submissions... (Optional)"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all resize-none mb-4"
              rows="5"
              autoFocus
              disabled={isClockOutLoading}
            />
            <div className="flex gap-3">
              <button
                onClick={() => handleClockOut(clockOutReport)}
                disabled={isClockOutLoading}
                className="flex-1 bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isClockOutLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="w-5 h-5" />
                    Clock Out
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowClockOutReport(false);
                  setClockOutReport('');
                }}
                disabled={isClockOutLoading}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
