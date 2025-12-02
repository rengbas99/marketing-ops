import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import BreakDialog from '../../components/BreakDialog';
import BreakTimer from '../../components/BreakTimer';
import WorkLinksModal from '../../components/WorkLinksModal';
import ProgressTracker from '../../components/ProgressTracker';
import EditorSubtaskWidget from '../../components/EditorSubtaskWidget';
import ConfirmDialog from '../../components/ConfirmDialog';
import { FileEdit, Clock, CheckCircle, AlertCircle, AlertTriangle, Coffee, Link as LinkIcon, LogIn, LogOut, X, Play, Plane } from 'lucide-react';
import { formatBreakDuration, calculateTotalBreakDuration } from '../../utils/timeFormatting';
import { COLLECTIONS, ASSET_STATUS } from '../../constants';
import { canClockIn, shouldAutoClockOut, findStaleClockIns } from '../../utils/attendanceUtils';

export default function EditorDashboard() {
  const { data, loading, startPolling, stopPolling, updateRow, addRow, forceRefresh } = useData();
  const { user } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const [activeTimeLog, setActiveTimeLog] = useState(null);
  const [activeBreak, setActiveBreak] = useState(null);
  const [showBreakDialog, setShowBreakDialog] = useState(false);
  const [showWorkLinks, setShowWorkLinks] = useState(false);
  const [showProgressTracker, setShowProgressTracker] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [clockedIn, setClockedIn] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [selectedAssetForClockIn, setSelectedAssetForClockIn] = useState('');
  const [showAssetSelector, setShowAssetSelector] = useState(false);
  const [elapsedTime, setElapsedTime] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [isClockInLoading, setIsClockInLoading] = useState(false);
  const [isClockOutLoading, setIsClockOutLoading] = useState(false);
  const [showClockOutReport, setShowClockOutReport] = useState(false);
  const [clockOutReport, setClockOutReport] = useState('');

  useEffect(() => {
    startPolling('editor-dashboard', [
      COLLECTIONS.ASSETS,
      COLLECTIONS.EDITOR_TIME_LOGS,
      COLLECTIONS.TIME_BREAKS,
      COLLECTIONS.ATTENDANCE,
      COLLECTIONS.SHOOTS,
      COLLECTIONS.CLIENTS
    ]);
    forceRefresh([
      COLLECTIONS.ASSETS,
      COLLECTIONS.EDITOR_TIME_LOGS,
      COLLECTIONS.TIME_BREAKS,
      COLLECTIONS.ATTENDANCE,
      COLLECTIONS.SHOOTS,
      COLLECTIONS.CLIENTS
    ]);
    return () => stopPolling('editor-dashboard');
  }, [startPolling, stopPolling, forceRefresh]);

  const attendance = Array.isArray(data.Attendance) ? data.Attendance : [];
  const breaks = Array.isArray(data.Time_Breaks) ? data.Time_Breaks : [];
  const assets = Array.isArray(data.Assets) ? data.Assets : [];
  const timeLogs = Array.isArray(data.Editor_Time_Logs) ? data.Editor_Time_Logs : [];
  const shoots = Array.isArray(data.Shoots) ? data.Shoots : [];
  const clients = Array.isArray(data.Clients) ? data.Clients : [];

  useEffect(() => {
    if (isClockInLoading || isClockOutLoading) return;

    const today = new Date().toISOString().split('T')[0];
    const todayAtt = attendance.find(
      a => a && a.employee_id === user?.email && a.date === today
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
      a => a && a.employee_id === user?.email
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

    if (todayAtt) {
      setTodayAttendance(todayAtt);
      setClockedIn(todayAtt.status === 'clocked_in' && !todayAtt.clock_out);
    } else {
      if (!todayAttendance || todayAttendance.date !== today) {
        setTodayAttendance(null);
        setClockedIn(false);
      }
    }
  }, [data, user, attendance, isClockInLoading, isClockOutLoading, updateRow, forceRefresh]);

  useEffect(() => {
    const active = timeLogs.find(
      log => log && log.editor_email === user?.email && !log.end_time
    );
    setActiveTimeLog(active);

    let activeBreakRecord = null;

    if (active) {
      activeBreakRecord = breaks.find(
        b => b && b.time_log_id === active.log_id && !b.break_end
      );
    }

    if (!activeBreakRecord && todayAttendance && todayAttendance.attendance_id) {
      activeBreakRecord = breaks.find(
        b => b && b.attendance_id === todayAttendance.attendance_id && !b.break_end
      );
    }

    setActiveBreak(activeBreakRecord);
  }, [data, user, timeLogs, breaks, todayAttendance]);

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
        handleClockOut().catch(console.error);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [clockedIn, todayAttendance]);

  const assignedAssets = assets.filter(
    a => {
      if (!a) return false;
      const email = a.assigned_editor_email || a.editor_email;
      return email && email.toLowerCase() === user?.email?.toLowerCase();
    }
  );

  const assetsByStatus = {
    'To Edit': assignedAssets.filter(a => a && (a.status === ASSET_STATUS.TO_EDIT || !a.status)),
    'In Progress': assignedAssets.filter(a => a && a.status === ASSET_STATUS.IN_PROGRESS),
    'Revision': assignedAssets.filter(a => a && a.status === ASSET_STATUS.REVISION),
    'Review': assignedAssets.filter(a => a && a.status === ASSET_STATUS.REVIEW),
    'Completed': assignedAssets.filter(a => a && (a.status === ASSET_STATUS.COMPLETED || a.status === 'Final')),
  };

  const handleClockIn = async () => {
    if (clockedIn && todayAttendance && todayAttendance.status === 'clocked_in' && !todayAttendance.clock_out) {
      error('You are already clocked in!');
      return;
    }

    setIsClockInLoading(true);
    try {
      const clockInTime = new Date().toISOString();
      const today = new Date().toISOString().split('T')[0];
      const asset = selectedAssetForClockIn ? assignedAssets.find(a => a && a.asset_id === selectedAssetForClockIn) : null;
      const shootId = asset?.shoot_id || asset?.linked_shoot_id || null;

      // Use utility function to check if can clock in
      const clockInCheck = canClockIn(attendance, user?.email, today);
      
      if (!clockInCheck.canClockIn && clockInCheck.reason === 'already_clocked_in') {
        error('You already have an active clock-in session. Please clock out first.');
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
          const hoursWorked = totalMinutes / 60;
          
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

      const existingAttendance = attendance.find(
        a => a && a.employee_id === user?.email && a.date === today
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
        await addRow(COLLECTIONS.ATTENDANCE, {
          attendance_id: `ATT-${Date.now()}`,
          employee_id: user.email,
          date: today,
          clock_in: clockInTime,
          status: 'clocked_in',
          created_at: clockInTime,
        });

        const newAttendance = {
          attendance_id: `ATT-${Date.now()}`,
          employee_id: user.email,
          date: today,
          clock_in: clockInTime,
          status: 'clocked_in',
          created_at: clockInTime,
        };
        setTodayAttendance(newAttendance);
        setClockedIn(true);
      }

      if (selectedAssetForClockIn) {
        const existingLog = timeLogs.find(
          log => log && log.asset_id === selectedAssetForClockIn &&
            log.editor_email === user?.email && !log.end_time
        );

        if (!existingLog) {
          try {
            await addRow(COLLECTIONS.EDITOR_TIME_LOGS, {
              log_id: `LOG-${Date.now()}`,
              asset_id: selectedAssetForClockIn,
              shoot_id: shootId || null,
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
          } catch (logErr) {
            // Log error but don't block clock-in
            console.error('Error creating time log:', logErr);
            // Continue with clock-in even if time log creation fails
          }
        }

        const allAssets = Array.isArray(data.Assets) ? data.Assets : [];
        const assetIndex = allAssets.findIndex(a => a && a.asset_id === selectedAssetForClockIn);
        if (assetIndex !== -1) {
          try {
            const currentAsset = allAssets[assetIndex];
            await updateRow(COLLECTIONS.ASSETS, assetIndex + 2, {
              ...currentAsset,
              asset_id: selectedAssetForClockIn,
              status: currentAsset.status === ASSET_STATUS.REVISION ? ASSET_STATUS.IN_PROGRESS : ASSET_STATUS.IN_PROGRESS,
              current_editor_status: 'Working',
              updated_at: new Date().toISOString(),
            });
          } catch (assetErr) {
            // Log error but don't block clock-in
            console.error('Error updating asset status:', assetErr);
          }
        }
      }

      await forceRefresh([COLLECTIONS.ATTENDANCE, COLLECTIONS.EDITOR_TIME_LOGS, COLLECTIONS.ASSETS]);

      const hadAsset = !!selectedAssetForClockIn;
      setShowAssetSelector(false);
      setSelectedAssetForClockIn('');

      if (hadAsset) {
        success('Clocked in and editing started!');
      } else {
        success('Clocked in!');
      }
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
        } catch (err) {
          console.error('Error ending break before clock-out:', err);
        }
      }

      const clockOutTime = new Date();
      const clockInTime = new Date(todayAttendance.clock_in);
      const hoursWorked = (clockOutTime - clockInTime) / (1000 * 60 * 60);
      const hours = Math.floor(hoursWorked);
      const minutes = Math.floor((hoursWorked - hours) * 60);

      const clockOutTimeISO = clockOutTime.toISOString();
      let totalBreakMinutes = 0;
      if (activeTimeLog) {
        const timeLogBreaks = calculateTotalBreakDuration(breaks, activeTimeLog.log_id, null);
        totalBreakMinutes = timeLogBreaks || (activeTimeLog.total_break_duration || 0);
      } else {
        const todayTimeLogs = timeLogs.filter(log => {
          if (!log || !log.start_time) return false;
          const logDate = new Date(log.start_time).toISOString().split('T')[0];
          const today = new Date().toISOString().split('T')[0];
          return logDate === today && log.editor_email === user.email;
        });

        const timeLogBreaks = todayTimeLogs.reduce((sum, log) => {
          const logBreaks = calculateTotalBreakDuration(breaks, log.log_id, null);
          return sum + logBreaks;
        }, 0);

        const attendanceBreaks = calculateTotalBreakDuration(breaks, null, todayAttendance.attendance_id);
        const storedAttendanceBreaks = parseFloat(todayAttendance.total_break_duration || 0);

        totalBreakMinutes = timeLogBreaks + Math.max(attendanceBreaks, storedAttendanceBreaks);
      }

      const totalMinutes = (clockOutTime - clockInTime) / (1000 * 60);
      const workMinutes = Math.max(0, totalMinutes - totalBreakMinutes);
      const hoursWorkedExcludingBreaks = workMinutes / 60;

      const attIndex = attendance.findIndex(
        a => a && a.attendance_id === todayAttendance.attendance_id
      );

      if (attIndex !== -1) {
        await updateRow(COLLECTIONS.ATTENDANCE, attIndex + 2, {
          ...todayAttendance,
          clock_out: clockOutTimeISO,
          status: 'clocked_out',
          hours_worked: hoursWorkedExcludingBreaks.toFixed(2),
          daily_report: reportText || todayAttendance.daily_report || '',
        });
      }

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
          const totalDuration = totalMinutes / 60;

          await updateRow(COLLECTIONS.EDITOR_TIME_LOGS, logIndex + 2, {
            ...activeTimeLog,
            log_id: activeTimeLog.log_id,
            end_time: clockOutTimeISO,
            duration: totalDuration.toFixed(2),
            work_duration: workDuration.toFixed(2),
            task_status: 'Completed',
            updated_at: new Date().toISOString(),
          });

          const allAssets = Array.isArray(data.Assets) ? data.Assets : [];
          const assetIndex = allAssets.findIndex(a => a && a.asset_id === activeTimeLog.asset_id);
          if (assetIndex !== -1) {
            await updateRow(COLLECTIONS.ASSETS, assetIndex + 2, {
              ...allAssets[assetIndex],
              asset_id: activeTimeLog.asset_id,
              status: ASSET_STATUS.REVIEW,
              current_editor_status: 'Review',
              work_progress: 100,
              updated_at: new Date().toISOString(),
            });
          }
        }
      }

      forceRefresh([COLLECTIONS.ATTENDANCE, COLLECTIONS.EDITOR_TIME_LOGS, COLLECTIONS.ASSETS]).catch(err => {
        console.error('Error refreshing data:', err);
      });

      setClockedIn(false);
      setActiveTimeLog(null);
      setActiveBreak(null);
      setShowClockOutReport(false);
      setClockOutReport('');
      
      const workHours = Math.floor(hoursWorkedExcludingBreaks);
      const workMins = Math.floor((hoursWorkedExcludingBreaks - workHours) * 60);
      success(`Clocked out! You worked ${workHours}h ${workMins}m today (excluding ${formatBreakDuration(totalBreakMinutes)} break time).`);
    } catch (err) {
      console.error('Clock out error:', err);
      error('Error clocking out: ' + (err.message || 'Unknown error'));
      setShowClockOutReport(false);
      setClockOutReport('');
    } finally {
      setIsClockOutLoading(false);
    }
  };

  const handleStartEditing = async (assetId) => {
    if (!clockedIn) {
      setSelectedAssetForClockIn(assetId);
      setShowAssetSelector(true);
      return;
    }

    const existingLog = timeLogs.find(
      log => log && log.asset_id === assetId && log.editor_email === user?.email && !log.end_time
    );

    if (existingLog) {
      error('You are already editing this asset!');
      return;
    }

    try {
      const asset = assignedAssets.find(a => a && a.asset_id === assetId);
      const shootId = asset?.shoot_id || asset?.linked_shoot_id || null;

      await addRow(COLLECTIONS.EDITOR_TIME_LOGS, {
        log_id: `LOG-${Date.now()}`,
        asset_id: assetId,
        shoot_id: shootId,
        editor_email: user.email,
        start_time: new Date().toISOString(),
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

      const allAssets = Array.isArray(data.Assets) ? data.Assets : [];
      const assetIndex = allAssets.findIndex(a => a && a.asset_id === assetId);
      if (assetIndex !== -1) {
        const currentAsset = allAssets[assetIndex];
        await updateRow(COLLECTIONS.ASSETS, assetIndex + 2, {
          ...currentAsset,
          asset_id: currentAsset.asset_id,
          status: currentAsset.status === ASSET_STATUS.REVISION ? ASSET_STATUS.IN_PROGRESS : ASSET_STATUS.IN_PROGRESS,
          current_editor_status: 'Working',
          updated_at: new Date().toISOString(),
        });
      } else {
        error('Asset not found in data. Please refresh the page.');
        return;
      }

      await forceRefresh([COLLECTIONS.ASSETS, COLLECTIONS.EDITOR_TIME_LOGS]);
      success('Editing started!');
    } catch (err) {
      console.error('Error starting editing:', err);
      error('Error starting editing: ' + err.message);
    }
  };

  const handleUpdateTimeLog = async (updates) => {
    if (!activeTimeLog) return;

    try {
      const logIndex = timeLogs.findIndex(
        log => log && log.log_id === activeTimeLog.log_id
      );

      if (logIndex !== -1) {
        await updateRow(COLLECTIONS.EDITOR_TIME_LOGS, logIndex + 2, {
          ...activeTimeLog,
          log_id: activeTimeLog.log_id,
          ...updates,
          updated_at: new Date().toISOString(),
        });
        // Force refresh to ensure real-time update on lead dashboard
        await forceRefresh([COLLECTIONS.EDITOR_TIME_LOGS, COLLECTIONS.ASSETS]);
      } else {
        error('Time log not found. Please refresh the page.');
      }
    } catch (err) {
      console.error('Error updating time log:', err);
      error('Error updating time log: ' + err.message);
    }
  };

  const handlePauseSubtask = async () => {
    if (!activeTimeLog) return;
    
    try {
      // If already on break, resume (end break)
      if (activeBreak) {
        await handleEndBreak();
      } else {
        // Start break (pause) - create break record
        const breakStart = new Date().toISOString();
        await addRow(COLLECTIONS.TIME_BREAKS, {
          break_id: `BRK-${Date.now()}`,
          user_email: user.email,
          time_log_id: activeTimeLog.log_id,
          attendance_id: todayAttendance?.attendance_id || null,
          break_type: 'Short Break',
          break_start: breakStart,
          break_end: null,
          duration: 0,
          created_at: breakStart,
        });

        const logIndex = timeLogs.findIndex(log => log && log.log_id === activeTimeLog.log_id);
        if (logIndex !== -1) {
          await updateRow(COLLECTIONS.EDITOR_TIME_LOGS, logIndex + 2, {
            ...activeTimeLog,
            log_id: activeTimeLog.log_id,
            break_start_time: breakStart,
            task_status: 'Paused',
            updated_at: new Date().toISOString(),
          });
        } else {
          error('Time log not found. Please refresh the page.');
          return;
        }

        const allAssets = Array.isArray(data.Assets) ? data.Assets : [];
        const assetIndex = allAssets.findIndex(a => a && a.asset_id === activeTimeLog.asset_id);
        if (assetIndex !== -1) {
          try {
            await updateRow(COLLECTIONS.ASSETS, assetIndex + 2, {
              ...allAssets[assetIndex],
              asset_id: activeTimeLog.asset_id,
              current_editor_status: 'Paused',
              updated_at: new Date().toISOString(),
            });
          } catch (assetErr) {
            console.error('Error updating asset status for pause:', assetErr);
          }
        }

        await forceRefresh([COLLECTIONS.TIME_BREAKS, COLLECTIONS.EDITOR_TIME_LOGS, COLLECTIONS.ASSETS]);
        success('Work paused (break started)');
      }
    } catch (err) {
      error('Error pausing: ' + err.message);
    }
  };

  const handleTakeBreak = async (breakType) => {
    if (!clockedIn || !todayAttendance) {
      error('Please clock in first to take a break');
      return;
    }

    if (activeBreak) {
      error('You are already on a break!');
      return;
    }

    try {
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
          await updateRow(COLLECTIONS.EDITOR_TIME_LOGS, logIndex + 2, {
            ...activeTimeLog,
            log_id: activeTimeLog.log_id,
            break_start_time: new Date().toISOString(),
            task_status: 'On Break',
            updated_at: new Date().toISOString(),
          });
        } else {
          console.error('Time log not found at index:', logIndex);
          error('Time log not found. Please refresh the page.');
          return;
        }

        const allAssets = Array.isArray(data.Assets) ? data.Assets : [];
        const assetIndex = allAssets.findIndex(a => a && a.asset_id === activeTimeLog.asset_id);
        if (assetIndex !== -1) {
          try {
            await updateRow(COLLECTIONS.ASSETS, assetIndex + 2, {
              ...allAssets[assetIndex],
              asset_id: activeTimeLog.asset_id,
              current_editor_status: 'On Break',
              updated_at: new Date().toISOString(),
            });
          } catch (assetErr) {
            // Log error but don't block break start
            console.error('Error updating asset status for break:', assetErr);
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
            // Log error but don't block break start - attendance record might not exist in Sheets
            console.error('Error updating attendance for break:', attErr);
          }
        }
      }

      await forceRefresh([COLLECTIONS.ATTENDANCE, COLLECTIONS.EDITOR_TIME_LOGS, COLLECTIONS.TIME_BREAKS, COLLECTIONS.ASSETS]);
      success(`Break started (${breakType})`);
    } catch (err) {
      error('Error starting break: ' + err.message);
    }
  };

  const handleEndBreak = async () => {
    if (!activeBreak) return;

    try {
      const breakEnd = new Date();
      const breakStart = new Date(activeBreak.break_start);
      const duration = Math.floor((breakEnd - breakStart) / 1000 / 60);

      const breakIndex = breaks.findIndex(b => b && b.break_id === activeBreak.break_id);
      if (breakIndex !== -1) {
        await updateRow(COLLECTIONS.TIME_BREAKS, breakIndex + 2, {
          ...activeBreak,
          break_id: activeBreak.break_id,
          break_end: breakEnd.toISOString(),
          duration: duration,
          updated_at: new Date().toISOString(),
        });
      }

      if (activeTimeLog && activeBreak.time_log_id) {
        const logIndex = timeLogs.findIndex(log => log && log.log_id === activeTimeLog.log_id);
        if (logIndex !== -1) {
          const currentTotal = (activeTimeLog.total_break_duration || 0) + duration;
          await updateRow(COLLECTIONS.EDITOR_TIME_LOGS, logIndex + 2, {
            ...activeTimeLog,
            log_id: activeTimeLog.log_id,
            break_end_time: breakEnd.toISOString(),
            total_break_duration: currentTotal,
            task_status: 'Working',
            updated_at: new Date().toISOString(),
          });
        }

        const allAssets = Array.isArray(data.Assets) ? data.Assets : [];
        const assetIndex = allAssets.findIndex(a => a && a.asset_id === activeTimeLog.asset_id);
        if (assetIndex !== -1) {
          await updateRow(COLLECTIONS.ASSETS, assetIndex + 2, {
            ...allAssets[assetIndex],
            asset_id: activeTimeLog.asset_id,
            current_editor_status: 'Working',
            updated_at: new Date().toISOString(),
          });
        }
      } else if (todayAttendance && activeBreak.attendance_id) {
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

      await forceRefresh([COLLECTIONS.ATTENDANCE, COLLECTIONS.EDITOR_TIME_LOGS, COLLECTIONS.TIME_BREAKS, COLLECTIONS.ASSETS]);
      setActiveBreak(null);
      success('Break ended');
    } catch (err) {
      error('Error ending break: ' + err.message);
    }
  };

  const handleSaveWorkLinks = async (links) => {
    if (!activeTimeLog) return;

    try {
      const logIndex = timeLogs.findIndex(log => log && log.log_id === activeTimeLog.log_id);
      if (logIndex !== -1) {
        await updateRow(COLLECTIONS.EDITOR_TIME_LOGS, logIndex + 2, {
          ...activeTimeLog,
          log_id: activeTimeLog.log_id,
          work_links: links,
          updated_at: new Date().toISOString(),
        });

        const allAssets = Array.isArray(data.Assets) ? data.Assets : [];
        const assetIndex = allAssets.findIndex(a => a && a.asset_id === activeTimeLog.asset_id);
        if (assetIndex !== -1) {
          const primaryLink = links.split(',')[0]?.trim() || '';
          await updateRow(COLLECTIONS.ASSETS, assetIndex + 2, {
            ...allAssets[assetIndex],
            asset_id: activeTimeLog.asset_id,
            upload_folder_link: primaryLink,
            updated_at: new Date().toISOString(),
          });
        } else {
          error('Asset not found. Please refresh the page.');
          return;
        }

        await forceRefresh([COLLECTIONS.ASSETS, COLLECTIONS.EDITOR_TIME_LOGS]);
        success('Work links saved!');
      } else {
        error('Time log not found. Please refresh the page.');
      }
    } catch (err) {
      error('Error saving links: ' + err.message);
    }
  };

  const handleUpdateProgress = async (progress) => {
    if (!activeTimeLog) return;

    try {
      const allAssets = Array.isArray(data.Assets) ? data.Assets : [];
      const assetIndex = allAssets.findIndex(a => a && a.asset_id === activeTimeLog.asset_id);
      if (assetIndex !== -1) {
        await updateRow(COLLECTIONS.ASSETS, assetIndex + 2, {
          ...allAssets[assetIndex],
          asset_id: activeTimeLog.asset_id,
          work_progress: progress,
          updated_at: new Date().toISOString(),
        });
        // Force refresh to ensure real-time update on lead dashboard
        await forceRefresh([COLLECTIONS.ASSETS, COLLECTIONS.EDITOR_TIME_LOGS]);
        success('Progress updated!');
      } else {
        error('Asset not found. Please refresh the page.');
      }
    } catch (err) {
      error('Error updating progress: ' + err.message);
    }
  };

  const handleFinishEditing = async (assetId, status = ASSET_STATUS.REVIEW) => {
    if (!activeTimeLog) return;

    if (activeBreak) {
      setShowFinishConfirm(true);
      setSelectedAsset(assetId);
      return;
    }

    await completeEditing(assetId, status);
  };

  const completeEditing = async (assetId, status = ASSET_STATUS.REVIEW) => {
    if (!activeTimeLog) return;

    if (activeBreak) {
      await handleEndBreak();
    }

    try {
      const logIndex = timeLogs.findIndex(
        log => log && log.log_id === activeTimeLog.log_id
      );

      if (logIndex !== -1) {
        const endTime = new Date();
        const startTime = new Date(activeTimeLog.start_time);
        const totalMinutes = (endTime - startTime) / (1000 * 60);
        const breakMinutes = activeTimeLog.total_break_duration || 0;
        const workMinutes = totalMinutes - breakMinutes;
        const workDuration = workMinutes / 60;
        const totalDuration = totalMinutes / 60;

        await updateRow(COLLECTIONS.EDITOR_TIME_LOGS, logIndex + 2, {
          ...activeTimeLog,
          log_id: activeTimeLog.log_id,
          end_time: endTime.toISOString(),
          duration: totalDuration.toFixed(2),
          work_duration: workDuration.toFixed(2),
          task_status: 'Completed',
          updated_at: new Date().toISOString(),
        });

        const allAssets = Array.isArray(data.Assets) ? data.Assets : [];
        const assetIndex = allAssets.findIndex(a => a && a.asset_id === assetId);
        if (assetIndex !== -1) {
          const asset = allAssets[assetIndex];
          await updateRow(COLLECTIONS.ASSETS, assetIndex + 2, {
            ...asset,
            asset_id: assetId,
            status: status,
            current_editor_status: status === ASSET_STATUS.REVIEW ? 'Review' : 'Paused',
            work_progress: status === ASSET_STATUS.REVIEW ? 100 : (asset.work_progress || 0),
            updated_at: new Date().toISOString(),
          });
        } else {
          error('Asset not found. Please refresh the page.');
        }

        setActiveTimeLog(null);
        setActiveBreak(null);
        setShowFinishConfirm(false);

        await forceRefresh([COLLECTIONS.ASSETS, COLLECTIONS.EDITOR_TIME_LOGS]);
        success('Editing completed and sent to review!');
      }
    } catch (err) {
      error('Error finishing editing: ' + err.message);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const hoursToday = timeLogs
    .filter(log => {
      if (!log || log.editor_email !== user?.email) return false;
      return log.start_time && log.start_time.startsWith(today);
    })
    .reduce((sum, log) => sum + (parseFloat(log.duration) || 0), 0);

  const stats = {
    toEdit: assetsByStatus['To Edit'].length,
    revision: assetsByStatus['Revision'].length,
    inProgress: assetsByStatus['In Progress'].length,
    inReview: assetsByStatus['Review'].length,
    hoursToday: hoursToday || 0,
  };

  if (loading.all) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getElapsedTime = () => {
    if (!activeTimeLog || !activeTimeLog.start_time) return { hours: 0, minutes: 0 };
    const start = new Date(activeTimeLog.start_time);
    const now = new Date();
    const diff = now - start;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return { hours, minutes };
  };

  const elapsed = getElapsedTime();
  const breakDuration = activeTimeLog?.total_break_duration || 0;
  const activeAsset = activeTimeLog ? assignedAssets.find(a => a && a.asset_id === activeTimeLog.asset_id) : null;

  return (
    <div className="animate-fadeIn mobile-padding pb-8 space-y-8">
      <BreakTimer breakRecord={activeBreak} onEndBreak={handleEndBreak} />
      <BreakDialog
        isOpen={showBreakDialog}
        onClose={() => setShowBreakDialog(false)}
        onStartBreak={handleTakeBreak}
        currentBreak={activeBreak}
      />
      <WorkLinksModal
        isOpen={showWorkLinks}
        onClose={() => setShowWorkLinks(false)}
        onSave={handleSaveWorkLinks}
        existingLinks={activeTimeLog?.work_links || ''}
        title="Add Work Files & Links"
      />
      <ConfirmDialog
        isOpen={showFinishConfirm}
        onClose={() => setShowFinishConfirm(false)}
        onConfirm={() => completeEditing(selectedAsset)}
        title="Finish Editing?"
        message="You are currently on a break. Finishing editing will also end your break. Continue?"
      />

      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border-l-4 border-primary">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          Welcome back, <span className="text-gradient">{user?.name || 'Editor'}</span>!
        </h1>
        <p className="text-gray-600">Track your editing tasks and time</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            navigate('/dashboard/leave-requests');
          }}
          className="glass-card p-6 flex items-center gap-4 group hover:bg-white/80 cursor-pointer transition-all"
          type="button"
        >
          <div className="p-3 bg-orange-100 rounded-xl group-hover:bg-orange-200 transition-colors">
            <Plane className="w-8 h-8 text-orange-600" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-gray-900">Leave Requests</h3>
            <p className="text-sm text-gray-600">Request leave or view your requests</p>
          </div>
        </button>
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
            {activeTimeLog && activeAsset && (
              <div className="p-4 bg-white/50 rounded-xl border border-white/50">
                <div className="flex items-center gap-2 mb-2">
                  <FileEdit className="w-4 h-4 text-primary" />
                  <span className="font-bold text-gray-900">{activeAsset?.title || 'Active Task'}</span>
                </div>
                {activeAsset && (() => {
                  const client = clients.find(c => c && c.client_id === activeAsset.client_id);
                  return client && (
                    <p className="text-sm text-gray-600">{client.company_name}</p>
                  );
                })()}

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => setShowWorkLinks(true)}
                    className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors flex items-center gap-1"
                  >
                    <LinkIcon className="w-3 h-3" />
                    Work Links
                  </button>
                  <button
                    onClick={() => setShowProgressTracker(!showProgressTracker)}
                    className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200 transition-colors"
                  >
                    Update Progress
                  </button>
                </div>

                {showProgressTracker && (
                  <div className="mt-4">
                    <ProgressTracker
                      currentProgress={activeAsset?.work_progress || 0}
                      onUpdate={handleUpdateProgress}
                    />
                  </div>
                )}
              </div>
            )}

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

            {activeTimeLog && (
              <button
                onClick={() => handleFinishEditing(activeTimeLog.asset_id)}
                className="w-full bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Finish Editing & Submit for Review
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600">Select a task and clock in to start working</p>
            <button
              onClick={() => setShowAssetSelector(true)}
              className="w-full bg-primary text-white px-6 py-4 rounded-xl font-bold text-lg shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all transform hover:scale-[1.02] flex items-center justify-center gap-3"
            >
              <LogIn className="w-6 h-6" />
              Clock In & Select Task
            </button>
          </div>
        )}
      </div>

      {/* Asset Selector Modal */}
      {showAssetSelector && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 transition-opacity"
            style={{ background: 'rgba(0, 0, 0, 0.25)', backdropFilter: 'blur(6px)' }}
            onClick={() => {
              setShowAssetSelector(false);
              setSelectedAssetForClockIn('');
            }}
          />
          <div className="bg-white rounded-2xl max-w-md w-full p-6 relative z-[101] animate-fadeIn" style={{ borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>
            <div className="flex items-start justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Select Task</h3>
              <button
                onClick={() => {
                  setShowAssetSelector(false);
                  setSelectedAssetForClockIn('');
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">Available Tasks</label>
              <select
                value={selectedAssetForClockIn}
                onChange={(e) => setSelectedAssetForClockIn(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              >
                <option value="">General Work (No specific task)</option>
                {assetsByStatus['To Edit'].concat(assetsByStatus['Revision'], assetsByStatus['In Progress'])
                  .map(asset => {
                    const client = clients.find(c => c && c.client_id === asset.client_id);
                    return (
                      <option key={asset.asset_id} value={asset.asset_id}>
                        {asset.title} {client ? `- ${client.company_name}` : ''} ({asset.status})
                      </option>
                    );
                  })}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAssetSelector(false);
                  setSelectedAssetForClockIn('');
                }}
                className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClockIn}
                disabled={isClockInLoading}
                className="flex-1 px-4 py-3 text-white bg-primary rounded-xl font-bold hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isClockInLoading ? 'Processing...' : 'Clock In'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{stats.toEdit}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">To Edit</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">In Progress</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-bold text-orange-500">{stats.revision}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Revision</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.inReview}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">In Review</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.hoursToday.toFixed(1)}h</div>
          <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Hours Today</div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-8">
        {/* In Progress & Revisions */}
        {(assetsByStatus['In Progress'].length > 0 || assetsByStatus['Revision'].length > 0) && (
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Play className="w-5 h-5 text-blue-600" />
              Active Tasks
            </h2>
            <div className="grid gap-4">
              {[...assetsByStatus['Revision'], ...assetsByStatus['In Progress']].map(asset => (
                <TaskCard
                  key={asset.asset_id}
                  asset={asset}
                  client={clients.find(c => c && c.client_id === asset.client_id)}
                  onStart={handleStartEditing}
                  isActive={activeTimeLog?.asset_id === asset.asset_id}
                  isClockedIn={clockedIn}
                  activeTimeLog={activeTimeLog?.asset_id === asset.asset_id ? activeTimeLog : null}
                  onUpdateTimeLog={handleUpdateTimeLog}
                  onPause={handlePauseSubtask}
                />
              ))}
            </div>
          </section>
        )}

        {/* To Edit */}
        {assetsByStatus['To Edit'].length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileEdit className="w-5 h-5 text-gray-600" />
              To Edit
            </h2>
            <div className="grid gap-4">
              {assetsByStatus['To Edit'].map(asset => (
                <TaskCard
                  key={asset.asset_id}
                  asset={asset}
                  client={clients.find(c => c && c.client_id === asset.client_id)}
                  onStart={handleStartEditing}
                  isActive={false}
                  isClockedIn={clockedIn}
                  activeTimeLog={null}
                  onUpdateTimeLog={handleUpdateTimeLog}
                  onPause={handlePauseSubtask}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Clock Out Report Modal */}
      {showClockOutReport && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 transition-opacity" 
            style={{ background: 'rgba(0, 0, 0, 0.25)', backdropFilter: 'blur(6px)' }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowClockOutReport(false);
                setClockOutReport('');
              }
            }} 
          />
          <div className="w-full max-w-md relative z-[111] animate-fadeIn bg-white rounded-2xl border border-gray-100 p-6" style={{ borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>
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

function TaskCard({ asset, client, onStart, isActive, isClockedIn, activeTimeLog, onUpdateTimeLog, onPause }) {
  const isRevision = asset.status === ASSET_STATUS.REVISION;

  return (
    <div className={`glass-card p-4 transition-all ${isActive ? 'ring-2 ring-primary' : 'hover:bg-white/80'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-gray-900 truncate">{asset.title}</h3>
            {isRevision && (
              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-bold rounded-full flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Revision
              </span>
            )}
          </div>
          {client && (
            <p className="text-sm text-primary font-medium mb-2">{client.company_name}</p>
          )}

          {asset.editor_notes && (
            <div className="bg-yellow-50 border border-yellow-100 p-3 rounded-lg text-sm text-gray-700 mb-3">
              <span className="font-bold text-yellow-800 block mb-1">Notes:</span>
              {asset.editor_notes}
            </div>
          )}

          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
            {asset.shoot_date && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Shoot: {new Date(asset.shoot_date).toLocaleDateString()}
              </span>
            )}
            {asset.deadline && (
              <span className={`flex items-center gap-1 font-medium ${new Date(asset.deadline) < new Date() ? 'text-red-600' : ''
                }`}>
                <AlertCircle className="w-3 h-3" />
                Due: {new Date(asset.deadline).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {!isActive && (
          <button
            onClick={() => onStart(asset.asset_id)}
            className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors text-sm flex items-center gap-2 whitespace-nowrap"
          >
            <Play className="w-4 h-4" />
            Start Editing
          </button>
        )}
      </div>

      {isActive && activeTimeLog && (
        <EditorSubtaskWidget
          asset={asset}
          timeLog={activeTimeLog}
          onUpdateTimeLog={onUpdateTimeLog}
          onPause={onPause}
          onBack={() => {
            // Optionally handle back action - could stop editing or just hide widget
            // For now, we'll leave it as optional
          }}
        />
      )}
    </div>
  );
}
