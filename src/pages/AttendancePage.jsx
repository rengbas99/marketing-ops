import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import LeadAttendanceDashboard from './LeadAttendanceDashboard';
import { Clock, Calendar, TrendingUp, User, LogIn, LogOut, Edit2, X, ChevronLeft, ChevronRight, BarChart3, CheckCircle, FileText, Eye, ArrowRight } from 'lucide-react';
import { formatBreakDuration } from '../utils/timeFormatting';
import { COLLECTIONS, ROLES } from '../constants';
import { canClockIn, findDuplicateClockIns, findStaleClockIns, shouldAutoClockOut, applyClockOutTimes, autoClockOutStaleRecords } from '../utils/attendanceUtils';

export default function AttendancePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data, loading, startPolling, stopPolling, addRow, updateRow, forceRefresh } = useData();
  const { user } = useAuth();
  const { success, error } = useToast();
  const [clockedIn, setClockedIn] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [viewMode, setViewMode] = useState(() => {
    // Check URL parameter first
    const viewParam = searchParams.get('view');
    if (viewParam === 'personal') return 'personal';
    if (viewParam === 'team') return 'team';
    if (viewParam === 'daily-status') return 'daily-status';
    // Leads/Managers default to daily status dashboard
    return (user?.role === ROLES.MANAGER || user?.role === ROLES.LEAD) ? 'daily-status' : 'personal';
  });

  // Update view mode when URL parameter changes
  useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam === 'personal') {
      setViewMode('personal');
    } else if (viewParam === 'team') {
      setViewMode('team');
    } else if (viewParam === 'daily-status') {
      setViewMode('daily-status');
    } else if (!viewParam) {
      // Default based on user role when no param
      if (user?.role === ROLES.MANAGER || user?.role === ROLES.LEAD) {
        setViewMode('daily-status');
      } else {
        setViewMode('personal');
      }
    }
  }, [searchParams, user?.role]);
  const [elapsedTime, setElapsedTime] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [editingAttendance, setEditingAttendance] = useState(null);
  const [editClockOut, setEditClockOut] = useState('');
  const [editHours, setEditHours] = useState('');
  const [isClockInLoading, setIsClockInLoading] = useState(false);
  const [isClockOutLoading, setIsClockOutLoading] = useState(false);
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [isApplyingClockOut, setIsApplyingClockOut] = useState(false);
  const [activeBreak, setActiveBreak] = useState(null);
  const [showClockOutReport, setShowClockOutReport] = useState(false);
  const [clockOutReport, setClockOutReport] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportsView, setShowReportsView] = useState(false);

  useEffect(() => {
    startPolling('attendance-page', [
      COLLECTIONS.ATTENDANCE,
      COLLECTIONS.USERS,
      COLLECTIONS.PHOTOGRAPHER_ATTENDANCE,
      COLLECTIONS.EDITOR_TIME_LOGS,
      COLLECTIONS.TIME_BREAKS
    ]);
    return () => stopPolling('attendance-page');
  }, [startPolling, stopPolling]);

  const attendance = Array.isArray(data.Attendance) ? data.Attendance : [];
  const users = Array.isArray(data.Users) ? data.Users : [];
  const photographerAttendance = Array.isArray(data.Photographer_Attendance) ? data.Photographer_Attendance : [];
  const editorTimeLogs = Array.isArray(data.Editor_Time_Logs) ? data.Editor_Time_Logs : [];
  const breaks = Array.isArray(data.Time_Breaks) ? data.Time_Breaks : [];

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    
    // Check for and clean duplicate clock-ins
    const duplicates = findDuplicateClockIns(attendance, user?.email, today);
    if (duplicates.length > 0) {
      console.warn(`Found ${duplicates.length} duplicate clock-in records. Cleaning up...`);
      // Auto clock-out duplicates (keep only the first one)
      duplicates.forEach(async (dup) => {
        const dupIndex = attendance.findIndex(a => a && a.attendance_id === dup.attendance_id);
        if (dupIndex !== -1) {
          const clockOutTime = new Date().toISOString();
          const clockInTime = new Date(dup.clock_in);
          const totalMinutes = (new Date(clockOutTime) - clockInTime) / (1000 * 60);
          const hoursWorked = totalMinutes / 60;
          
          try {
            await updateRow(COLLECTIONS.ATTENDANCE, dupIndex + 2, {
              ...dup,
              clock_out: clockOutTime,
              status: 'clocked_out',
              hours_worked: hoursWorked.toFixed(2),
              daily_report: dup.daily_report || 'Auto clocked out (duplicate record)',
            });
          } catch (err) {
            console.error('Error cleaning duplicate clock-in:', err);
          }
        }
      });
      forceRefresh([COLLECTIONS.ATTENDANCE]).catch(console.error);
    }

    // Check for stale clock-ins (over 15 hours) and auto clock-out
    const staleClockIns = findStaleClockIns(attendance.filter(a => a && a.employee_id === user?.email));
    if (staleClockIns.length > 0) {
      staleClockIns.forEach(async (stale) => {
        const staleIndex = attendance.findIndex(a => a && a.attendance_id === stale.attendance_id);
        if (staleIndex !== -1) {
          const clockOutTime = new Date().toISOString();
          const clockInTime = new Date(stale.clock_in);
          const totalMinutes = (new Date(clockOutTime) - clockInTime) / (1000 * 60);
          const hoursWorked = totalMinutes / 60;
          
          try {
            await updateRow(COLLECTIONS.ATTENDANCE, staleIndex + 2, {
              ...stale,
              clock_out: clockOutTime,
              status: 'clocked_out',
              hours_worked: hoursWorked.toFixed(2),
              daily_report: stale.daily_report || 'Auto clocked out after 15 hours',
            });
            if (stale.employee_id === user?.email) {
              setClockedIn(false);
            }
          } catch (err) {
            console.error('Error auto clocking out stale record:', err);
          }
        }
      });
      forceRefresh([COLLECTIONS.ATTENDANCE]).catch(console.error);
    }

    const normalizedEmail = (user?.email || '').trim();
    const todayAtt = attendance.find(
      a => a && a.employee_id && a.employee_id.trim() === normalizedEmail && a.date === today
    );
    
    // Check if the found attendance should be auto clocked out
    if (todayAtt && shouldAutoClockOut(todayAtt)) {
      const staleIndex = attendance.findIndex(a => a && a.attendance_id === todayAtt.attendance_id);
      if (staleIndex !== -1) {
        const clockOutTime = new Date().toISOString();
        const clockInTime = new Date(todayAtt.clock_in);
        const totalMinutes = (new Date(clockOutTime) - clockInTime) / (1000 * 60);
        const hoursWorked = totalMinutes / 60;
        
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
    
    setTodayAttendance(todayAtt);
    setClockedIn(todayAtt && todayAtt.status === 'clocked_in' && !todayAtt.clock_out);

    if (todayAtt && todayAtt.attendance_id) {
      const activeBreakRecord = breaks.find(
        b => b && b.attendance_id === todayAtt.attendance_id && !b.break_end
      );
      setActiveBreak(activeBreakRecord);
    } else {
      setActiveBreak(null);
    }
  }, [data, user, attendance, breaks, updateRow, forceRefresh]);

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

      if (hours >= 12) {
        handleClockOut();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [clockedIn, todayAttendance]);

  const handleClockIn = async () => {
    if (clockedIn && todayAttendance && todayAttendance.status === 'clocked_in' && !todayAttendance.clock_out) {
      error('You are already clocked in!');
      return;
    }

    setIsClockInLoading(true);
    try {
      const clockInTime = new Date().toISOString();
      const today = new Date().toISOString().split('T')[0];

      // Use utility function to check if can clock in
      const { canClockIn: canClockInCheck, reason, existingRecord } = canClockIn(attendance, user?.email, today);
      
      if (!canClockInCheck && reason === 'already_clocked_in') {
        error('You already have an active clock-in session. Please clock out first.');
        setIsClockInLoading(false);
        return;
      }

      // If there's a stale record that needs auto clock-out, do it first
      if (reason === 'auto_clockout_needed' && existingRecord) {
        const staleIndex = attendance.findIndex(a => a && a.attendance_id === existingRecord.attendance_id);
        if (staleIndex !== -1) {
          const clockOutTime = new Date().toISOString();
          const clockInTimeStale = new Date(existingRecord.clock_in);
          const totalMinutes = (new Date(clockOutTime) - clockInTimeStale) / (1000 * 60);
          const hoursWorked = totalMinutes / 60;
          
          await updateRow(COLLECTIONS.ATTENDANCE, staleIndex + 2, {
            ...existingRecord,
            clock_out: clockOutTime,
            status: 'clocked_out',
            hours_worked: hoursWorked.toFixed(2),
            daily_report: existingRecord.daily_report || 'Auto clocked out after 15 hours',
          });
          await forceRefresh([COLLECTIONS.ATTENDANCE]);
        }
      }

      const normalizedEmail = (user?.email || '').trim();
      const existingAttendance = attendance.find(
        a => a && a.employee_id && a.employee_id.trim() === normalizedEmail && a.date === today
      );

      if (existingAttendance) {
        const attIndex = attendance.findIndex(
          a => a && a.attendance_id === existingAttendance.attendance_id
        );

        if (attIndex !== -1) {
          await updateRow(COLLECTIONS.ATTENDANCE, attIndex + 2, {
            ...existingAttendance,
            clock_in: clockInTime,
            clock_out: null,
            status: 'clocked_in',
            hours_worked: null,
          });

          const updatedAttendance = {
            ...existingAttendance,
            clock_in: clockInTime,
            clock_out: null,
            status: 'clocked_in',
            hours_worked: null,
          };
          setTodayAttendance(updatedAttendance);
          setClockedIn(true);
        }
      } else {
        const normalizedEmail = (user.email || '').trim();
        await addRow(COLLECTIONS.ATTENDANCE, {
          attendance_id: `ATT-${Date.now()}`,
          employee_id: normalizedEmail,
          date: today,
          clock_in: clockInTime,
          status: 'clocked_in',
          created_at: clockInTime,
        });

        const newAttendance = {
          attendance_id: `ATT-${Date.now()}`,
          employee_id: normalizedEmail,
          date: today,
          clock_in: clockInTime,
          status: 'clocked_in',
          created_at: clockInTime,
        };
        setTodayAttendance(newAttendance);
        setClockedIn(true);
      }

      await forceRefresh([COLLECTIONS.ATTENDANCE]);
      success('Clocked in successfully!');
    } catch (err) {
      const errorMsg = err.message || 'Unknown error';
      if (errorMsg.includes('OAuth2_REQUIRED') || errorMsg.includes('OAuth2')) {
        success('Clocked in! (Data saved locally. OAuth2 setup needed for Google Sheets sync)');
        setClockedIn(true);
      } else if (errorMsg.includes('not found') || errorMsg.includes('404')) {
        error('Attendance sheet not found. Please create the "Attendance" sheet in Google Sheets with proper headers.');
      } else {
        error('Error clocking in: ' + errorMsg);
      }
    } finally {
      setIsClockInLoading(false);
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

      await forceRefresh([COLLECTIONS.ATTENDANCE, COLLECTIONS.TIME_BREAKS]);

      setActiveBreak(null);
      success('Break ended');
    } catch (err) {
      error('Error ending break: ' + err.message);
    }
  };

  const handleClockOut = async (reportText = '') => {
    if (!todayAttendance) return;

    setIsClockOutLoading(true);
    try {
      if (activeBreak) {
        try {
          await handleEndBreak();
        } catch (err) {
          console.error('Error ending break before clock-out:', err);
        }
      }

      const index = attendance.findIndex(
        a => a && a.attendance_id === todayAttendance.attendance_id
      );

      if (index !== -1) {
        const clockOutTime = new Date();
        const clockInTime = new Date(todayAttendance.clock_in);

        const updatedAttendance = attendance.find(
          a => a && a.attendance_id === todayAttendance.attendance_id
        );
        const totalBreakMinutes = parseFloat(updatedAttendance?.total_break_duration || todayAttendance.total_break_duration || 0);

        const totalMinutes = (clockOutTime - clockInTime) / (1000 * 60);
        const workMinutes = Math.max(0, totalMinutes - totalBreakMinutes);
        const hoursWorkedExcludingBreaks = workMinutes / 60;

        await updateRow(COLLECTIONS.ATTENDANCE, index + 2, {
          ...todayAttendance,
          clock_out: clockOutTime.toISOString(),
          status: 'clocked_out',
          hours_worked: hoursWorkedExcludingBreaks.toFixed(2),
          daily_report: reportText || todayAttendance.daily_report || '',
        });

        await forceRefresh([COLLECTIONS.ATTENDANCE]);
        setClockedIn(false);
        setActiveBreak(null);
        setShowClockOutReport(false);
        setClockOutReport('');

        const workHours = Math.floor(hoursWorkedExcludingBreaks);
        const workMins = Math.floor((hoursWorkedExcludingBreaks - workHours) * 60);
        success(`Clocked out! You worked ${workHours}h ${workMins}m today (excluding ${formatBreakDuration(totalBreakMinutes)} break time).`);
      } else {
        error('Attendance record not found. Please refresh the page.');
      }
    } catch (err) {
      const errorMsg = err.message || 'Unknown error';
      if (errorMsg.includes('OAuth2_REQUIRED') || errorMsg.includes('OAuth2')) {
        const clockInTime = new Date(todayAttendance.clock_in);
        const clockOutTime = new Date();
        const totalBreakMinutes = parseFloat(todayAttendance.total_break_duration || 0);
        const totalMinutes = (clockOutTime - clockInTime) / (1000 * 60);
        const workMinutes = Math.max(0, totalMinutes - totalBreakMinutes);
        const hoursWorkedExcludingBreaks = workMinutes / 60;
        const workHours = Math.floor(hoursWorkedExcludingBreaks);
        const workMins = Math.floor((hoursWorkedExcludingBreaks - workHours) * 60);
        success(`Clocked out! You worked ${workHours}h ${workMins}m today. (Data saved locally. OAuth2 setup needed for Google Sheets sync)`);
        setClockedIn(false);
        setActiveBreak(null);
        setShowClockOutReport(false);
        setClockOutReport('');
      } else {
        error('Error clocking out: ' + errorMsg);
      }
    } finally {
      setIsClockOutLoading(false);
    }
  };

  const handleClockOutClick = () => {
    setShowClockOutReport(true);
  };

  const handleEditAttendance = async () => {
    // Only managers and leads can edit attendance
    if (!canEditAttendance) {
      error('Only managers and leads can edit attendance records');
      return;
    }
    if (!editingAttendance || (!editClockOut && !editHours)) {
      error('Please enter a clock-out time or manual hours');
      return;
    }

    setIsEditLoading(true);
    try {
      const index = attendance.findIndex(
        a => a && a.attendance_id === editingAttendance.attendance_id
      );

      if (index !== -1) {
        let clockOutTime = editingAttendance.clock_out ? new Date(editingAttendance.clock_out) : null;
        if (editClockOut) {
          clockOutTime = new Date(editClockOut);
        }
        const manualHours = editHours ? parseFloat(editHours) : null;
        const clockInTime = new Date(editingAttendance.clock_in);

        if (clockOutTime && clockOutTime <= clockInTime && manualHours === null) {
          error('Clock out time must be after clock in time');
          setIsEditLoading(false);
          return;
        }

        const totalBreakMinutes = parseFloat(editingAttendance.total_break_duration || 0);

        let hoursWorkedExcludingBreaks = manualHours;
        if (hoursWorkedExcludingBreaks === null && clockOutTime) {
          const totalMinutes = (clockOutTime - clockInTime) / (1000 * 60);
          const workMinutes = Math.max(0, totalMinutes - totalBreakMinutes);
          hoursWorkedExcludingBreaks = workMinutes / 60;
        }

        if (hoursWorkedExcludingBreaks === null || isNaN(hoursWorkedExcludingBreaks)) {
          error('Unable to calculate hours. Please provide valid data.');
          setIsEditLoading(false);
          return;
        }

        // Build update object, ensuring no undefined values
        const updateData = {
          ...editingAttendance,
          status: 'clocked_out',
          hours_worked: hoursWorkedExcludingBreaks.toFixed(2),
        };
        
        // Only set clock_out if we have a valid value
        if (clockOutTime) {
          updateData.clock_out = clockOutTime.toISOString();
        } else if (editingAttendance.clock_out) {
          updateData.clock_out = editingAttendance.clock_out;
        }
        // If neither exists, don't include clock_out (or set to null if field must exist)
        
        // Remove any undefined values before updating
        Object.keys(updateData).forEach(key => {
          if (updateData[key] === undefined) {
            delete updateData[key];
          }
        });
        
        await updateRow(COLLECTIONS.ATTENDANCE, index + 2, updateData);

        await forceRefresh([COLLECTIONS.ATTENDANCE]);
        setEditingAttendance(null);
        setEditClockOut('');
        setEditHours('');
        success('Attendance updated successfully!');
      } else {
        error('Attendance record not found. Please refresh the page.');
      }
    } catch (err) {
      const errorMsg = err.message || 'Unknown error';
      error('Error updating attendance: ' + errorMsg);
    } finally {
      setIsEditLoading(false);
    }
  };

  // Apply clock-out times for missing records (for managers/leads)
  const handleApplyClockOutTimes = async (employeeEmail = null, month = null) => {
    if (!canEditAttendance) {
      error('Only managers and leads can apply clock-out times');
      return;
    }

    setIsApplyingClockOut(true);
    try {
      const result = await applyClockOutTimes(attendance, {
        employeeEmail,
        month,
        updateRow,
        forceRefresh,
        collection: COLLECTIONS.ATTENDANCE,
        defaultClockOutHour: 17
      });

      if (result.updated > 0) {
        success(`Successfully applied clock-out times to ${result.updated} record(s). ${result.errors > 0 ? `${result.errors} error(s) occurred.` : ''}`);
      } else if (result.errors > 0) {
        error(`Failed to apply clock-out times. ${result.errors} error(s) occurred.`);
      } else {
        success('No records found that need clock-out times applied.');
      }
    } catch (err) {
      error('Error applying clock-out times: ' + (err.message || 'Unknown error'));
    } finally {
      setIsApplyingClockOut(false);
    }
  };

  // Auto clock-out all stale records (over 15 hours)
  const handleAutoClockOutStale = async () => {
    if (!canEditAttendance) {
      error('Only managers and leads can auto clock-out stale records');
      return;
    }

    setIsApplyingClockOut(true);
    try {
      const result = await autoClockOutStaleRecords(
        attendance,
        updateRow,
        forceRefresh,
        COLLECTIONS.ATTENDANCE
      );

      if (result.updated > 0) {
        success(`Successfully auto clocked-out ${result.updated} stale record(s). ${result.errors > 0 ? `${result.errors} error(s) occurred.` : ''}`);
      } else if (result.errors > 0) {
        error(`Failed to auto clock-out stale records. ${result.errors} error(s) occurred.`);
      } else {
        success('No stale records found.');
      }
    } catch (err) {
      error('Error auto clocking-out stale records: ' + (err.message || 'Unknown error'));
    } finally {
      setIsApplyingClockOut(false);
    }
  };

  const parseDateValue = (value) => {
    if (!value) return null;
    const nativeDate = new Date(value);
    if (!isNaN(nativeDate)) return nativeDate;
    if (typeof value === 'string') {
      const parts = value.split(/[\/-]/);
      if (parts.length === 3) {
        // Detect DD/MM/YYYY format (when first segment > 12)
        const [part1, part2, part3] = parts;
        if (parseInt(part1, 10) > 12) {
          const isoString = `${part3.length === 2 ? '20' + part3 : part3}-${part2.padStart(2, '0')}-${part1.padStart(2, '0')}`;
          const altDate = new Date(isoString);
          if (!isNaN(altDate)) return altDate;
        }
      }
    }
    return null;
  };

  const getRecordDate = (record) => {
    return (
      parseDateValue(record?.date) ||
      parseDateValue(record?.clock_in) ||
      parseDateValue(record?.clock_out) ||
      null
    );
  };

  const calculateAllTimeStats = (employeeEmail) => {
    const allAttendance = attendance.filter(
      a => a && a.employee_id === employeeEmail && a.status === 'clocked_out'
    );

    const allShoots = photographerAttendance.filter(
      a => a && a.photographer_email === employeeEmail && a.status === 'Completed'
    );

    const allEditorLogs = editorTimeLogs.filter(
      log => log && log.editor_email === employeeEmail && log.end_time && log.task_status === 'Completed'
    );

    const totalDailyHours = allAttendance.reduce((sum, a) => {
      if (a.hours_worked) {
        const hours = parseFloat(a.hours_worked);
        // Validate: hours should be reasonable (max 24 hours per day)
        if (hours > 0 && hours <= 24) {
          return sum + hours;
        }
        // If hours_worked seems invalid, recalculate from times
      }
      if (a.clock_in && a.clock_out) {
        try {
          const inTime = new Date(a.clock_in);
          const outTime = new Date(a.clock_out);
          const totalMinutes = (outTime - inTime) / (1000 * 60);
          // Subtract break time if available
          const breakMinutes = parseFloat(a.total_break_duration || 0);
          const workMinutes = Math.max(0, totalMinutes - breakMinutes);
          const hours = workMinutes / 60;
          return sum + hours;
        } catch {
          return sum;
        }
      }
      return sum;
    }, 0);

    const totalShootHours = allShoots.reduce((sum, a) => {
      const hours = parseFloat(a.work_duration || a.duration || 0);
      return sum + hours;
    }, 0);

    const totalEditingHours = allEditorLogs.reduce((sum, log) => {
      const hours = parseFloat(log.work_duration || log.duration || 0);
      return sum + hours;
    }, 0);

    return {
      totalDays: allAttendance.length,
      totalDailyHours,
      totalShootHours,
      totalEditingHours,
      totalHours: totalDailyHours + totalShootHours + totalEditingHours,
      totalShoots: allShoots.length,
      totalAssetsCompleted: allEditorLogs.length,
    };
  };

  const calculateMonthlyHours = (employeeEmail, month) => {
    const monthStart = new Date(month + '-01');
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    monthEnd.setDate(0);

    const normalizedEmail = (employeeEmail || '').trim();
    const dailyHours = attendance
      .filter(a => {
        if (!a || !a.employee_id || a.employee_id.trim() !== normalizedEmail || a.status !== 'clocked_out') return false;
        const date = getRecordDate(a);
        return date && date >= monthStart && date <= monthEnd;
      })
      .reduce((sum, a) => {
        if (a.hours_worked) {
          const hours = parseFloat(a.hours_worked);
          // Validate: hours should be reasonable (max 24 hours per day)
          if (hours > 0 && hours <= 24) {
            return sum + hours;
          }
          // If hours_worked seems invalid, recalculate from times
        }
        if (a.clock_in && a.clock_out) {
          try {
            const inTime = new Date(a.clock_in);
            const outTime = new Date(a.clock_out);
            const totalMinutes = (outTime - inTime) / (1000 * 60);
            // Subtract break time if available
            const breakMinutes = parseFloat(a.total_break_duration || 0);
            const workMinutes = Math.max(0, totalMinutes - breakMinutes);
            const hours = workMinutes / 60;
            return sum + hours;
          } catch {
            return sum;
          }
        }
        return sum;
      }, 0);

    const shootHours = photographerAttendance
      .filter(a => {
        if (!a || a.photographer_email !== employeeEmail || a.status !== 'Completed') return false;
        const date = parseDateValue(a.date || a.start_time || a.clock_in);
        return date && date >= monthStart && date <= monthEnd;
      })
      .reduce((sum, a) => {
        const hours = parseFloat(a.work_duration || a.duration || 0);
        return sum + hours;
      }, 0);

    const editingHours = editorTimeLogs
      .filter(log => {
        if (!log || log.editor_email !== employeeEmail || !log.end_time || log.task_status !== 'Completed') return false;
        const date = parseDateValue(log.start_time);
        return date && date >= monthStart && date <= monthEnd;
      })
      .reduce((sum, log) => {
        const hours = parseFloat(log.work_duration || log.duration || 0);
        return sum + hours;
      }, 0);

    return {
      daily: dailyHours,
      shoots: shootHours,
      editing: editingHours,
      total: dailyHours + shootHours + editingHours,
    };
  };

  const getUsersToDisplay = () => {
    if (viewMode === 'personal') {
      return [user];
    }

    // For daily-status view, show all team members (handled by LeadAttendanceDashboard component)
    if (viewMode === 'daily-status') {
      return [];
    }

    // Managers and leads can view team attendance history
    if (user?.role === ROLES.MANAGER || user?.role === ROLES.LEAD) {
      return users.filter(u => u && u.active !== 'FALSE' && u.active !== false);
    }

    // Others can only view their own attendance
    return [];
  };

  const usersToDisplayRaw = getUsersToDisplay();
  
  // Helper to check if user has active clock-in today (with proper date handling)
  const today = new Date().toISOString().split('T')[0];
  const hasActiveClockIn = (userEmail) => {
    const userRecords = attendance.filter(att => {
      if (!att || !att.employee_id) return false;
      if (att.employee_id.trim() !== userEmail.trim()) return false;
      
      // Check date field first (it's usually a string like "2025-12-02")
      let recordDateStr = null;
      if (att.date) {
        if (typeof att.date === 'string') {
          recordDateStr = att.date.split('T')[0]; // Handle "2025-12-02" or "2025-12-02T..."
        } else if (att.date instanceof Date) {
          recordDateStr = att.date.toISOString().split('T')[0];
        }
      }
      
      // Fallback to clock_in if date field not available
      if (!recordDateStr && att.clock_in) {
        const clockInDate = new Date(att.clock_in);
        if (!isNaN(clockInDate.getTime())) {
          recordDateStr = clockInDate.toISOString().split('T')[0];
        }
      }
      
      // Fallback to getRecordDate if both above fail
      if (!recordDateStr) {
        const recordDate = getRecordDate(att);
        if (recordDate) {
          recordDateStr = recordDate instanceof Date 
            ? recordDate.toISOString().split('T')[0] 
            : String(recordDate).split('T')[0];
        }
      }
      
      return recordDateStr === today;
    });
    
    return userRecords.some(att => {
      if (!att.clock_in || att.clock_out) return false;
      const status = att.status;
      return status === 'clocked_in' || status === undefined || status === null || status === '';
    });
  };
  
  // Group users into active and non-active
  const activeUsers = usersToDisplayRaw.filter(u => {
    const isActive = hasActiveClockIn(u.email);
    // Debug logging for Alan
    if (u.email && u.email.includes('Alan')) {
      console.log(`[DEBUG] ${u.email} - Active: ${isActive}`, {
        email: u.email,
        today,
        records: attendance.filter(a => a && a.employee_id && a.employee_id.trim() === u.email.trim())
      });
    }
    return isActive;
  });
  const inactiveUsers = usersToDisplayRaw.filter(u => !hasActiveClockIn(u.email));
  
  // Sort each group alphabetically
  activeUsers.sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
  inactiveUsers.sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
  
  // Combine: active first, then inactive
  const usersToDisplay = [...activeUsers, ...inactiveUsers];
  
  // Debug logging
  if (viewMode === 'team') {
    console.log('[DEBUG] Team View - Active Users:', activeUsers.map(u => u.email));
    console.log('[DEBUG] Team View - Inactive Users:', inactiveUsers.map(u => u.email));
  }

  if (loading.all) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isManager = user?.role === ROLES.MANAGER;
  const isLead = user?.role === ROLES.LEAD;
  const canViewTeam = isManager || isLead; // Managers and leads can view team attendance
  const canEditAttendance = isManager || isLead; // Managers and leads can edit others' attendance

  // Show Daily Status Dashboard for Leads/Managers when in daily-status mode
  if (canViewTeam && viewMode === 'daily-status') {
    return <LeadAttendanceDashboard />;
  }

  return (
    <div className="animate-fadeIn mobile-padding pb-8 space-y-8">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border-l-4 border-primary flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Attendance</h1>
          <p className="text-gray-600">
            {canViewTeam ? 'Track team attendance and work hours' : 'Clock in/out and track your attendance'}
          </p>
        </div>

        {/* View Mode Toggle */}
        {canViewTeam && (
          <div className="flex items-center gap-3 flex-wrap">
            {viewMode === 'personal' ? (
              // Personal view: Show button to go back to team view
              <>
                <button
                  onClick={() => navigate('/dashboard/attendance')}
                  className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary-dark transition-colors flex items-center gap-2 shadow-md"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" />
                  View Team Status
                </button>
                <button
                  onClick={() => navigate('/dashboard/daily-reports')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-md"
                >
                  <FileText className="w-4 h-4" />
                  Daily Reports
                </button>
              </>
            ) : (
              // Team view: Show all toggle buttons
              <>
                <div className="glass-panel p-1 flex gap-1">
                  <button
                    onClick={() => {
                      setViewMode('daily-status');
                      navigate('/dashboard/attendance?view=daily-status');
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'daily-status'
                        ? 'bg-primary text-white shadow-md'
                        : 'text-gray-500 hover:bg-gray-100'
                      }`}
                  >
                    Daily Status
                  </button>
                  <button
                    onClick={() => {
                      setViewMode('personal');
                      navigate('/dashboard/attendance?view=personal');
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'personal'
                        ? 'bg-primary text-white shadow-md'
                        : 'text-gray-500 hover:bg-gray-100'
                      }`}
                  >
                    My Attendance
                  </button>
                  <button
                    onClick={() => {
                      setViewMode('team');
                      navigate('/dashboard/attendance?view=team');
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'team'
                        ? 'bg-primary text-white shadow-md'
                        : 'text-gray-500 hover:bg-gray-100'
                      }`}
                  >
                    Team History
                  </button>
                </div>
                <button
                  onClick={() => navigate('/dashboard/daily-reports')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-md"
                >
                  <FileText className="w-4 h-4" />
                  Daily Reports
                </button>
                {/* Utility buttons for managers/leads */}
                <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-300">
                  <button
                    onClick={() => handleApplyClockOutTimes('Alan@reformmedia.co.uk', '2024-12')}
                    disabled={isApplyingClockOut}
                    className="px-3 py-2 bg-orange-600 text-white rounded-lg text-xs font-bold hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Apply clock-out times for Alan's December records"
                  >
                    {isApplyingClockOut ? 'Applying...' : 'Fix Alan Dec'}
                  </button>
                  <button
                    onClick={handleAutoClockOutStale}
                    disabled={isApplyingClockOut}
                    className="px-3 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Auto clock-out all records over 15 hours"
                  >
                    {isApplyingClockOut ? 'Processing...' : 'Auto Clock-Out Stale'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Clock In/Out Card */}
      {viewMode === 'personal' && (
        <div className={`glass-card p-6 relative overflow-hidden ${clockedIn
            ? 'border-green-200'
            : 'border-primary/20'
          }`}>
          {/* Background Gradient */}
          <div className={`absolute inset-0 opacity-5 pointer-events-none ${clockedIn
              ? 'bg-gradient-to-br from-green-500 to-emerald-600'
              : 'bg-gradient-to-br from-primary to-blue-600'
            }`} />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${clockedIn ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-primary'}`}>
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {clockedIn ? 'Clocked In' : 'Not Clocked In'}
                  </h2>
                  {clockedIn && todayAttendance && (
                    <p className="text-sm text-gray-500">
                      Started at {new Date(todayAttendance.clock_in).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {clockedIn ? (
              <div>
                {/* Running Timer */}
                <div className="mb-6 bg-white/60 p-6 rounded-xl border border-gray-100 backdrop-blur-sm text-center">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Time Elapsed</div>
                  <div className="text-4xl md:text-5xl font-bold text-gray-900 tabular-nums mb-2">
                    {String(elapsedTime.hours).padStart(2, '0')}:
                    {String(elapsedTime.minutes).padStart(2, '0')}:
                    {String(elapsedTime.seconds).padStart(2, '0')}
                  </div>
                  <div className="text-sm text-gray-500">
                    {elapsedTime.hours}h {elapsedTime.minutes}m {elapsedTime.seconds}s
                  </div>
                </div>

                <button
                  onClick={handleClockOutClick}
                  disabled={isClockOutLoading}
                  className="w-full bg-white text-green-600 border border-green-200 px-6 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                      <LogOut className="w-5 h-5" />
                      Clock Out
                </button>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 mb-6">
                  Ready to start your day? Click below to clock in.
                </p>
                <button
                  onClick={handleClockIn}
                  disabled={isClockInLoading}
                  className="w-full bg-primary text-white px-6 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/30"
                >
                  {isClockInLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
                      Clock In
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Month Selector */}
      <div className="glass-card p-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200 w-full md:w-auto">
              <button
                onClick={() => {
                  const current = new Date(selectedMonth + '-01');
                  current.setMonth(current.getMonth() - 1);
                  setSelectedMonth(current.toISOString().slice(0, 7));
                }}
                className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-500"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-900 text-center w-full"
              />
              <button
                onClick={() => {
                  const current = new Date(selectedMonth + '-01');
                  const now = new Date();
                  if (current < now) {
                    current.setMonth(current.getMonth() + 1);
                    setSelectedMonth(current.toISOString().slice(0, 7));
                  }
                }}
                disabled={selectedMonth >= new Date().toISOString().slice(0, 7)}
                className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-500 disabled:opacity-30"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={() => setSelectedMonth(new Date().toISOString().slice(0, 7))}
              className="px-4 py-2 text-sm bg-primary/10 text-primary font-bold rounded-lg hover:bg-primary/20 transition-colors whitespace-nowrap"
            >
              Today
            </button>
          </div>
          {canViewTeam && (
            <div className="flex items-center gap-2 text-sm font-medium text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
              <BarChart3 className="w-4 h-4" />
              <span>Viewing: {viewMode === 'team' ? 'Team History' : viewMode === 'daily-status' ? 'Daily Status' : 'My Attendance'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Attendance Summary */}
      <div className="space-y-6">
        {usersToDisplay.map((displayUser, userIndex) => {
          const monthlyHours = calculateMonthlyHours(displayUser.email, selectedMonth);
          const normalizedUserEmail = (displayUser.email || '').trim();
          const userAttendance = attendance.filter(
            a => a && a.employee_id && a.employee_id.trim() === normalizedUserEmail
          );

          const monthStart = new Date(selectedMonth + '-01');
          const monthEnd = new Date(monthStart);
          monthEnd.setMonth(monthEnd.getMonth() + 1);
          monthEnd.setDate(0);

          // Filter attendance records based on view mode and selected month
          const monthAttendance = userAttendance.filter(a => {
            const date = getRecordDate(a);
            // For all views, show records in selected month
            return date && date >= monthStart && date <= monthEnd;
          }).sort((a, b) => {
            const dateA = getRecordDate(a);
            const dateB = getRecordDate(b);
            return (dateB?.getTime() || 0) - (dateA?.getTime() || 0);
          });

          // Check if this is the first inactive user (to add separator)
          const isFirstInactive = userIndex === activeUsers.length && inactiveUsers.length > 0;
          const isActive = activeUsers.some(u => u.email === displayUser.email);

          return (
            <>
              {/* Separator bar between active and inactive users */}
              {isFirstInactive && (
                <div className="relative my-8">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t-2 border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white dark:bg-gray-900 px-4 text-sm font-bold text-gray-500 uppercase tracking-wider">
                      Not Currently Working
                    </span>
                  </div>
                </div>
              )}
              
              <div
                key={displayUser.email || userIndex}
                className="glass-card p-6 animate-fadeIn"
                style={{ animationDelay: `${userIndex * 0.1}s` }}
              >
              {/* User Header */}
              {(() => {
                // Check if user is currently clocked in (using same logic as LeadAttendanceDashboard)
                const today = new Date().toISOString().split('T')[0];
                const userRecords = attendance.filter(a => {
                  if (!a || !a.employee_id) return false;
                  if (a.employee_id.trim() !== displayUser.email.trim()) return false;
                  
                  // Check date field first (it's usually a string like "2025-12-02")
                  let recordDateStr = null;
                  if (a.date) {
                    if (typeof a.date === 'string') {
                      recordDateStr = a.date.split('T')[0]; // Handle "2025-12-02" or "2025-12-02T..."
                    } else if (a.date instanceof Date) {
                      recordDateStr = a.date.toISOString().split('T')[0];
                    }
                  }
                  
                  // Fallback to clock_in if date field not available
                  if (!recordDateStr && a.clock_in) {
                    const clockInDate = new Date(a.clock_in);
                    if (!isNaN(clockInDate.getTime())) {
                      recordDateStr = clockInDate.toISOString().split('T')[0];
                    }
                  }
                  
                  // Fallback to getRecordDate if both above fail
                  if (!recordDateStr) {
                    const recordDate = getRecordDate(a);
                    if (recordDate) {
                      recordDateStr = recordDate instanceof Date 
                        ? recordDate.toISOString().split('T')[0] 
                        : String(recordDate).split('T')[0];
                    }
                  }
                  
                  return recordDateStr === today;
                });
                
                const activeClockIn = userRecords.find(a => {
                  if (!a || !a.clock_in) return false;
                  if (a.clock_out) return false;
                  const status = a.status;
                  return status === 'clocked_in' || status === undefined || status === null || status === '';
                });
                
                const isCurrentlyClockedIn = !!activeClockIn;
                
                return (
                  <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-100">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-blue-600 text-white flex items-center justify-center font-bold text-xl shadow-lg shadow-primary/20">
                          {displayUser.name?.charAt(0) || <User className="w-6 h-6" />}
                        </div>
                        {isCurrentlyClockedIn && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full animate-pulse" title="Currently Clocked In" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-gray-900">
                            {displayUser.name || displayUser.email}
                          </h3>
                          {isCurrentlyClockedIn && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-bold flex items-center gap-1">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              CLOCKED IN
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 font-medium capitalize bg-gray-100 px-2 py-0.5 rounded inline-block mt-1">
                          {displayUser.role?.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    {displayUser.email === user?.email && (
                      <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold">
                        You
                      </span>
                    )}
                  </div>
                );
              })()}

              {/* Monthly Summary */}
              <div className={`grid gap-4 mb-8 ${displayUser.role === ROLES.PHOTOGRAPHER || displayUser.role === ROLES.EDITOR
                  ? 'grid-cols-2 md:grid-cols-4'
                  : 'grid-cols-2 md:grid-cols-3'
                }`}>
                <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                  <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Daily Hours</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {monthlyHours.daily.toFixed(1)}h
                  </div>
                </div>
                {displayUser.role === ROLES.PHOTOGRAPHER && (
                  <div className="bg-purple-50/50 rounded-xl p-4 border border-purple-100">
                    <div className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">Shoot Hours</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {monthlyHours.shoots.toFixed(1)}h
                    </div>
                  </div>
                )}
                {displayUser.role === ROLES.EDITOR && (
                  <div className="bg-orange-50/50 rounded-xl p-4 border border-orange-100">
                    <div className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">Editing Hours</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {monthlyHours.editing.toFixed(1)}h
                    </div>
                  </div>
                )}
                <div className="bg-green-50/50 rounded-xl p-4 border border-green-100">
                  <div className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1">Total Hours</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {monthlyHours.total.toFixed(1)}h
                  </div>
                </div>
                <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Days Worked</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {monthAttendance.filter(a => a.status === 'clocked_out').length}
                  </div>
                </div>
              </div>

              {/* Attendance History Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 font-bold rounded-tl-lg">Date</th>
                      <th className="px-4 py-3 font-bold">Clock In</th>
                      <th className="px-4 py-3 font-bold">Clock Out</th>
                      <th className="px-4 py-3 font-bold">Break</th>
                      <th className="px-4 py-3 font-bold">Hours</th>
                      <th className="px-4 py-3 font-bold">Status</th>
                      <th className="px-4 py-3 font-bold">Report</th>
                      {canEditAttendance && <th className="px-4 py-3 font-bold rounded-tr-lg text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {monthAttendance.length > 0 ? (
                      monthAttendance.map((record, idx) => {
                        const recordDate = getRecordDate(record);
                        return (
                          <tr key={record.attendance_id || idx} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-900">
                              {recordDate ? recordDate.toLocaleDateString() : '—'}
                            </td>
                          <td className="px-4 py-3 text-gray-600">
                            {record.clock_in ? new Date(record.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {record.clock_out ? new Date(record.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {formatBreakDuration(record.total_break_duration || 0)}
                          </td>
                          <td className="px-4 py-3 font-bold text-gray-900">
                            {record.hours_worked ? `${record.hours_worked}h` : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${record.status === 'clocked_in' ? 'bg-green-100 text-green-700' :
                                record.status === 'clocked_out' ? 'bg-gray-100 text-gray-600' :
                                  'bg-yellow-100 text-yellow-700'
                              }`}>
                              {record.status?.replace('_', ' ') || 'Unknown'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {record.daily_report ? (
                              <button
                                onClick={() => setSelectedReport({ ...record, user: displayUser })}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                                title="View daily report"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                View
                              </button>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          {canEditAttendance && (
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => {
                                  setEditingAttendance(record);
                                  setEditClockOut(record.clock_out ? new Date(record.clock_out).toISOString().slice(0, 16) : '');
                                  setEditHours(record.hours_worked ? parseFloat(record.hours_worked).toString() : '');
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                                Edit
                              </button>
                            </td>
                          )}
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={canEditAttendance ? 8 : 7} className="px-4 py-8 text-center text-gray-400">
                          No attendance records for this month
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {canEditAttendance && editingAttendance && (
                <div className="mt-8 p-6 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Editing Attendance</p>
                      {(() => {
                        const editingUser = users.find(u => u && u.email === editingAttendance.employee_id);
                        return (
                          <p className="text-lg font-bold text-gray-900">
                            {editingUser?.name || editingAttendance.employee_id}
                            {editingUser?.name && <span className="text-sm font-normal text-gray-500 ml-2">({editingAttendance.employee_id})</span>}
                          </p>
                        );
                      })()}
                    </div>
                    <button
                      onClick={() => {
                        setEditingAttendance(null);
                        setEditClockOut('');
                        setEditHours('');
                      }}
                      className="text-gray-500 hover:text-gray-700 text-sm font-bold flex items-center gap-1"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Clock Out Time</label>
                      <input
                        type="datetime-local"
                        value={editClockOut}
                        onChange={(e) => setEditClockOut(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                      />
                      <p className="text-xs text-gray-400 mt-1">Leave empty to keep current clock-out.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Manual Hours</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={editHours}
                        onChange={(e) => setEditHours(e.target.value)}
                        placeholder="e.g., 7.5"
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                      />
                      <p className="text-xs text-gray-400 mt-1">Optional. Overrides auto-calculated hours.</p>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={handleEditAttendance}
                      disabled={isEditLoading}
                      className="bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary-dark transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      {isEditLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          Save Changes
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setEditingAttendance(null);
                        setEditClockOut('');
                        setEditHours('');
                      }}
                      className="bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
            </>
          );
        })}
      </div>

      {/* Clock Out Report Modal */}
      {showClockOutReport && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 transition-opacity z-[100]" 
            style={{ background: 'rgba(0, 0, 0, 0.25)', backdropFilter: 'blur(6px)' }}
            onClick={(e) => {
              // Only close if clicking the backdrop, not the modal content
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

      {/* Daily Reports View Modal */}
      {showReportsView && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="fixed inset-0 transition-opacity z-[100]" style={{ background: 'rgba(0, 0, 0, 0.25)', backdropFilter: 'blur(6px)', borderRadius: '16px' }} onClick={() => setShowReportsView(false)} />
          <div className="w-full max-w-6xl max-h-[90vh] overflow-y-auto relative z-[101] animate-fadeIn bg-white rounded-3xl border border-gray-100 p-6" style={{ borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>
            <div className="sticky top-0 bg-white border-b border-gray-100 pb-4 mb-6 -mx-6 px-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Daily Work Reports</h2>
                  <p className="text-sm text-gray-600 mt-1">View all team member daily reports</p>
                </div>
                <button
                  onClick={() => setShowReportsView(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {attendance
                .filter(a => a && a.daily_report && a.status === 'clocked_out')
                .sort((a, b) => {
                  const dateA = getRecordDate(a);
                  const dateB = getRecordDate(b);
                  return (dateB?.getTime() || 0) - (dateA?.getTime() || 0);
                })
                .map((record, idx) => {
                  const recordUser = users.find(u => u && u.email === record.employee_id);
                  const recordDate = getRecordDate(record);
                  return (
                    <div
                      key={record.attendance_id || idx}
                      className="p-5 bg-gray-50 border border-gray-200 rounded-xl hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setSelectedReport({ ...record, user: recordUser })}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-blue-600 text-white flex items-center justify-center font-bold text-sm">
                            {recordUser?.name?.charAt(0) || record.employee_id?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900">{recordUser?.name || record.employee_id}</h3>
                            <p className="text-sm text-gray-600">
                              {recordDate ? recordDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown date'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-900">{record.hours_worked ? `${record.hours_worked}h` : '—'}</p>
                          <p className="text-xs text-gray-500">
                            {record.clock_in && record.clock_out && (
                              <>
                                {new Date(record.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(record.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-gray-100">
                        <p className="text-sm text-gray-700 line-clamp-3">{record.daily_report}</p>
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                        <Eye className="w-3.5 h-3.5" />
                        <span>Click to view full report</span>
                      </div>
                    </div>
                  );
                })}

              {attendance.filter(a => a && a.daily_report && a.status === 'clocked_out').length === 0 && (
                <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No daily reports available</p>
                  <p className="text-xs mt-1">Reports will appear here when team members clock out with a report</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Individual Report Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity z-[100]" onClick={() => setSelectedReport(null)} />
          <div className="w-full max-w-2xl relative z-[101] animate-fadeIn bg-white rounded-3xl shadow-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-blue-600 text-white flex items-center justify-center font-bold text-lg">
                  {selectedReport.user?.name?.charAt(0) || selectedReport.employee_id?.charAt(0) || 'U'}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedReport.user?.name || selectedReport.employee_id}</h3>
                  <p className="text-sm text-gray-600">
                    {getRecordDate(selectedReport)?.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) || 'Unknown date'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Attendance Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Clock In</div>
                  <div className="font-bold text-gray-900">
                    {selectedReport.clock_in ? new Date(selectedReport.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Clock Out</div>
                  <div className="font-bold text-gray-900">
                    {selectedReport.clock_out ? new Date(selectedReport.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Hours Worked</div>
                  <div className="font-bold text-gray-900">{selectedReport.hours_worked ? `${selectedReport.hours_worked}h` : '—'}</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Break Time</div>
                  <div className="font-bold text-gray-900">{formatBreakDuration(selectedReport.total_break_duration || 0)}</div>
                </div>
              </div>

              {/* Daily Report */}
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <h4 className="text-lg font-bold text-gray-900">Daily Work Report</h4>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{selectedReport.daily_report}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
