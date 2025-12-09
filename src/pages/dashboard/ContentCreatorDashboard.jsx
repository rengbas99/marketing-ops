import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import BreakDialog from '../../components/BreakDialog';
import BreakTimer from '../../components/BreakTimer';
import { Clock, Calendar, MessageSquare, FileText, LogIn, LogOut, Coffee, Play, Camera, Plane } from 'lucide-react';
import { COLLECTIONS, ASSET_STATUS } from '../../constants';
import { canClockIn } from '../../utils/attendanceUtils';
import Card from '../../components/primitives/Card.jsx';
import ModalPortal from '../../components/primitives/ModalPortal.jsx';
import Button from '../../components/primitives/Button.jsx';

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
  const [showAssignTaskModal, setShowAssignTaskModal] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    client_id: '',
    shoot_id: '',
    assigned_to: '',
    assigned_role: '',
    task_type: 'editing',
    deadline: '',
    fileLink: '',
    status: ASSET_STATUS.TO_EDIT,
    channel: '',
    publish_date: '',
  });

  useEffect(() => {
    startPolling('content-creator-dashboard', [
      COLLECTIONS.ATTENDANCE,
      COLLECTIONS.CONTENT_CALENDAR,
      COLLECTIONS.TASK_UPDATES,
      COLLECTIONS.ASSETS,
      COLLECTIONS.CLIENTS,
      COLLECTIONS.SHOOTS,
      COLLECTIONS.EDITOR_TIME_LOGS,
      COLLECTIONS.TIME_BREAKS,
      COLLECTIONS.USERS
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
  const users = Array.isArray(data.Users) ? data.Users : [];

  const assignedTasks = Array.isArray(assets) ? assets.filter(
    a => a && (a.assigned_creator_email === user?.email) &&
      a.status !== ASSET_STATUS.COMPLETED && a.status !== 'Final'
  ) : [];

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayAtt = attendance.find(
      a => a && a.employee_id === user?.email && a.date === today
    );
    setTodayAttendance(todayAtt);
    setClockedIn(todayAtt && todayAtt.status === 'clocked_in');
  }, [data, user, attendance]);

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

      if (hours >= 12) {
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

      // Use utility function to check if can clock in (like other dashboards)
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

  const allAvailableUsers = (Array.isArray(users) ? users : []).filter(
    u => {
      if (!u || !u.email) return false;
      if (u.active === 'FALSE' || u.active === false) return false;
      if (u.role === ROLES.MANAGER) return false;
      if (u.role === ROLES.PHOTOGRAPHER) return false;
      return u.role === ROLES.EDITOR || u.role === ROLES.CONTENT_CREATOR || u.role === ROLES.LEAD;
    }
  );

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.title || !newTask.assigned_to || !newTask.deadline) {
      error('Please fill in all required fields (Title, Assign To, and Deadline)');
      return;
    }

    try {
      const existingTask = assets.find(a => {
        if (!a || !a.title) return false;
        const titleMatch = a.title === newTask.title;
        const assigneeMatch =
          (newTask.assigned_role === ROLES.EDITOR && a.assigned_editor_email === newTask.assigned_to) ||
          (newTask.assigned_role === ROLES.CONTENT_CREATOR && a.assigned_creator_email === newTask.assigned_to) ||
          (newTask.assigned_role === ROLES.PHOTOGRAPHER && a.assigned_photographer_email === newTask.assigned_to);
        const deadlineMatch = a.deadline === newTask.deadline;
        const notCompleted = a.status !== ASSET_STATUS.COMPLETED && a.status !== 'Final';
        return titleMatch && assigneeMatch && deadlineMatch && notCompleted;
      });

      if (existingTask) {
        error('A task with the same title, assignee, and deadline already exists');
        return;
      }

      const assignedUser = users.find(u => u && u.email === newTask.assigned_to);
      const taskData = {
        asset_id: `AST-${Date.now()}`,
        title: newTask.title,
        shoot_id: newTask.shoot_id || '',
        deadline: newTask.deadline,
        status: newTask.status,
        upload_folder_link: newTask.fileLink,
        work_progress: 0,
        created_at: new Date().toISOString(),
      };

      if (newTask.assigned_role === ROLES.LEAD) {
        if (newTask.task_type === 'photography') {
          taskData.assigned_photographer_email = newTask.assigned_to;
          taskData.task_type = 'photography';
        } else if (newTask.task_type === 'posting' || newTask.task_type === 'content_creation') {
          taskData.assigned_creator_email = newTask.assigned_to;
          taskData.task_type = newTask.task_type;
          if (newTask.task_type === 'posting') {
            taskData.channel = newTask.channel;
            taskData.publish_date = newTask.publish_date;
          }
        } else {
          taskData.assigned_editor_email = newTask.assigned_to;
          taskData.task_type = 'editing';
        }
      } else if (newTask.assigned_role === ROLES.PHOTOGRAPHER) {
        taskData.assigned_photographer_email = newTask.assigned_to;
        taskData.task_type = 'photography';
      } else if (newTask.assigned_role === ROLES.CONTENT_CREATOR) {
        taskData.assigned_creator_email = newTask.assigned_to;
        taskData.task_type = newTask.task_type || 'content_creation';
        if (newTask.task_type === 'posting') {
          taskData.channel = newTask.channel;
          taskData.publish_date = newTask.publish_date;
        }
      } else {
        taskData.assigned_editor_email = newTask.assigned_to;
        taskData.task_type = 'editing';
      }

      await addRow(COLLECTIONS.ASSETS, taskData);

      if (newTask.task_type === 'posting' && newTask.publish_date && newTask.channel) {
        await addRow(COLLECTIONS.CONTENT_CALENDAR, {
          calendar_id: `CAL-${Date.now()}`,
          asset_id: taskData.asset_id,
          publish_date: newTask.publish_date,
          publish_time: '',
          channel: newTask.channel,
          status: 'scheduled',
          notes: `Posting task: ${newTask.title}`,
          created_at: new Date().toISOString(),
        });
      }

      await forceRefresh([COLLECTIONS.ASSETS, COLLECTIONS.CONTENT_CALENDAR]);
      success(`Task created and assigned to ${assignedUser?.name || newTask.assigned_to}`);
      setShowAssignTaskModal(false);
      setNewTask({
        title: '',
        client_id: '',
        shoot_id: '',
        assigned_to: '',
        assigned_role: '',
        task_type: 'editing',
        deadline: '',
        fileLink: '',
        status: ASSET_STATUS.TO_EDIT,
        channel: '',
        publish_date: '',
      });
    } catch (err) {
      error('Error creating task: ' + err.message);
    }
  };

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
      <Card glass className="p-6 rounded-2xl border-l-4 border-primary">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          Welcome back, <span className="text-gradient">{user?.name || 'Content Creator'}</span>!
        </h1>
        <p className="text-gray-600">Track attendance and view calendar</p>
      </Card>

      {/* Clock In/Out Card */}
      <Card glass className={`p-6 transition-[transform,opacity,colors,shadow] duration-300 ${clockedIn ? 'border-green-500/50 bg-green-50/50' : ''
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
                <Button
                  variant="secondary"
                  onClick={() => setShowBreakDialog(true)}
                  icon={Coffee}
                  className="flex-1"
                >
                  Take Break
                </Button>
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
              className="w-full bg-primary text-white px-6 py-4 rounded-xl font-bold text-lg shadow-lg shadow-primary/30 hover:bg-primary-dark transition-[transform,opacity,colors,shadow] transform hover:scale-[1.02] flex items-center justify-center gap-3"
            >
              <LogIn className="w-6 h-6" />
              {assignedTasks.length > 0 ? 'Clock In & Select Task' : 'Clock In'}
            </button>
          </div>
        )}
      </Card>

      <ModalPortal
        id="creator-task-selector"
        isOpen={showTaskSelector}
        onClose={() => {
          setShowTaskSelector(false);
          setSelectedTask('');
        }}
        title="Select Task"
        description="Clock in directly or pick a task to track time automatically."
        size="md"
        footer={({ close }) => (
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setSelectedTask('');
                close();
              }}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 gap-2"
              disabled={isClockInLoading}
              onClick={async () => {
                await performClockIn();
                close();
              }}
            >
              {isClockInLoading ? 'Processing…' : 'Clock In'}
            </Button>
          </div>
        )}
      >
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Select Task (Optional)
          </label>
          <select
            value={selectedTask}
            onChange={(e) => setSelectedTask(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-[transform,opacity,colors,shadow]"
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
          <p className="text-xs text-gray-500">
            You can clock in without selecting a task, or select one to track time on it.
          </p>
        </div>
      </ModalPortal>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          glass
          as="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            navigate('/dashboard/assign-shoot');
          }}
          className="p-6 flex items-center gap-4 group hover:bg-white/80"
        >
          <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
            <Camera className="w-8 h-8 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-gray-900">Add Shoot</h3>
            <p className="text-sm text-gray-600">Assign new shoots to videographers</p>
          </div>
        </Card>
        <Card
          glass
          as="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowAssignTaskModal(true);
          }}
          className="p-6 flex items-center gap-4 group hover:bg-white/80"
        >
          <div className="p-3 bg-secondary/10 rounded-xl group-hover:bg-secondary/20 transition-colors">
            <FileText className="w-8 h-8 text-secondary" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-gray-900">Assign Task</h3>
            <p className="text-sm text-gray-600">Create and assign tasks to editors</p>
          </div>
        </Card>
        <Card
          glass
          as="button"
          onClick={() => navigate('/dashboard/leave-requests')}
          className="p-6 flex items-center gap-4 group hover:bg-white/80"
        >
          <div className="p-3 bg-orange-100 rounded-xl group-hover:bg-orange-200 transition-colors">
            <Plane className="w-8 h-8 text-orange-600" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-gray-900">Leave Requests</h3>
            <p className="text-sm text-gray-600">Request leave or approve team requests</p>
          </div>
        </Card>
      </div>

      {/* Upcoming Calendar */}
      <Card glass className="p-6">
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
                  className="p-4 rounded-xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-md transition-[transform,opacity,colors,shadow]"
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
      </Card>

      {/* Assigned Tasks */}
      {assignedTasks.length > 0 && (
        <Card glass className="p-6">
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
                  className="p-4 rounded-xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-md transition-[transform,opacity,colors,shadow]"
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
        </Card>
      )}

      {/* Break Dialog */}
      <BreakDialog
        isOpen={showBreakDialog}
        onClose={() => setShowBreakDialog(false)}
        onConfirm={handleTakeBreak}
      />

      <ModalPortal
        id="creator-clockout-report"
        isOpen={showClockOutReport}
        onClose={() => {
          setShowClockOutReport(false);
          setClockOutReport('');
        }}
        title="Daily Work Report"
        description="(Optional) Provide a short summary before clocking out."
        size="md"
        footer={({ close }) => (
          <div className="flex gap-3">
            <Button
              className="flex-1 gap-2"
              disabled={isClockOutLoading}
              onClick={async () => {
                await handleClockOut(clockOutReport);
                close();
              }}
            >
              {isClockOutLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Processing…
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4" />
                  Clock Out
                </>
              )}
            </Button>
            <Button
              variant="secondary"
              disabled={isClockOutLoading}
              onClick={() => {
                setClockOutReport('');
                close();
              }}
            >
              Cancel
            </Button>
          </div>
        )}
      >
        <textarea
          value={clockOutReport}
          onChange={(e) => setClockOutReport(e.target.value)}
          placeholder="E.g., Completed 3 client assets, attended team meeting, reviewed 2 submissions..."
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-[transform,opacity,colors,shadow] resize-none"
          rows="5"
          disabled={isClockOutLoading}
        />
      </ModalPortal>

      {/* Create Task Modal */}
      <ModalPortal
        id="create-task-creator"
        isOpen={showAssignTaskModal}
        onClose={() => setShowAssignTaskModal(false)}
        title="Create New Task"
        size="md"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Task Title *</label>
            <input
              type="text"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              required
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-[transform,opacity,colors,shadow]"
              placeholder="e.g. Edit Product Photos"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Assign To *</label>
            <select
              value={newTask.assigned_to}
              onChange={(e) => {
                const user = users.find(u => u.email === e.target.value);
                setNewTask({
                  ...newTask,
                  assigned_to: e.target.value,
                  assigned_role: user ? user.role : ''
                });
              }}
              required
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-[transform,opacity,colors,shadow]"
            >
              <option value="">Select team member...</option>
              {allAvailableUsers.map(user => (
                <option key={user.email} value={user.email}>
                  {user.name} ({user.role})
                </option>
              ))}
            </select>
          </div>

          {newTask.assigned_role === ROLES.CONTENT_CREATOR && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Task Type</label>
              <select
                value={newTask.task_type}
                onChange={(e) => setNewTask({ ...newTask, task_type: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-[transform,opacity,colors,shadow]"
              >
                <option value="content_creation">Content Creation</option>
                <option value="posting">Posting</option>
              </select>
            </div>
          )}

          {newTask.task_type === 'posting' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Channel</label>
                <select
                  value={newTask.channel}
                  onChange={(e) => setNewTask({ ...newTask, channel: e.target.value })}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-[transform,opacity,colors,shadow]"
                >
                  <option value="">Select Channel...</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Facebook">Facebook</option>
                  <option value="TikTok">TikTok</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="YouTube">YouTube</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Publish Date</label>
                <input
                  type="date"
                  value={newTask.publish_date}
                  onChange={(e) => setNewTask({ ...newTask, publish_date: e.target.value })}
                  required
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-[transform,opacity,colors,shadow]"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Deadline *</label>
            <input
              type="date"
              value={newTask.deadline}
              onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              required
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-[transform,opacity,colors,shadow]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">File Link (Optional)</label>
            <input
              type="url"
              value={newTask.fileLink}
              onChange={(e) => setNewTask({ ...newTask, fileLink: e.target.value })}
              placeholder="https://drive.google.com/..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-[transform,opacity,colors,shadow]"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowAssignTaskModal(false)}
              className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 text-white bg-green-600 rounded-xl font-bold hover:bg-green-700 transition-colors"
            >
              Create Task
            </button>
          </div>
        </form>
      </ModalPortal>
    </div>
  );
}
