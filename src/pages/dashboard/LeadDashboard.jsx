import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import ApprovalsList from '../../components/ApprovalsList';
import BreakDialog from '../../components/BreakDialog';
import BreakTimer from '../../components/BreakTimer';
import SubTaskWidget from '../../components/SubTaskWidget';
import UpdateShootModal from '../../components/UpdateShootModal';
import UpdateAssetModal from '../../components/UpdateAssetModal';
import AssetWorkDetailsModal from '../../components/AssetWorkDetailsModal';
import ModalPortal from '../../components/primitives/ModalPortal.jsx';
import Button from '../../components/primitives/Button.jsx';
import Card from '../../components/primitives/Card.jsx';
import { Users, Camera, FileEdit, Calendar, Plus, Clock, LogIn, LogOut, Coffee, FileText, MapPin, AlertCircle, Eye, Edit, Plane } from 'lucide-react';
import { formatBreakDuration, formatTime as formatTimeUtil } from '../../utils/timeFormatting';
import { COLLECTIONS, SHOOT_STATUS, ASSET_STATUS, ROLES } from '../../constants';

export default function LeadDashboard() {
  const { data, loading, startPolling, stopPolling, addRow, updateRow, forceRefresh } = useData();
  const { user } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const [selectedClient, setSelectedClient] = useState(null);
  const [clockedIn, setClockedIn] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [elapsedTime, setElapsedTime] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [isClockInLoading, setIsClockInLoading] = useState(false);
  const [isClockOutLoading, setIsClockOutLoading] = useState(false);
  const [showClockOutReport, setShowClockOutReport] = useState(false);
  const [clockOutReport, setClockOutReport] = useState('');
  const [activeBreak, setActiveBreak] = useState(null);
  const [showBreakDialog, setShowBreakDialog] = useState(false);
  const [selectedShoot, setSelectedShoot] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [showShootModal, setShowShootModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showWorkDetails, setShowWorkDetails] = useState(false);
  const [selectedAssetForDetails, setSelectedAssetForDetails] = useState(null);
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
    startPolling('lead-dashboard', [
      COLLECTIONS.USERS,
      COLLECTIONS.CLIENTS,
      COLLECTIONS.SHOOTS,
      COLLECTIONS.ASSETS,
      COLLECTIONS.PHOTOGRAPHER_ATTENDANCE,
      COLLECTIONS.EDITOR_TIME_LOGS,
      COLLECTIONS.CONTENT_CALENDAR,
      COLLECTIONS.ATTENDANCE,
      COLLECTIONS.TIME_BREAKS
    ]);
    return () => stopPolling('lead-dashboard');
  }, [startPolling, stopPolling]);

  // Team on shoots (with client names) - safe data access
  const attendance = Array.isArray(data.Attendance) ? data.Attendance : [];
  const photographerAttendance = Array.isArray(data.Photographer_Attendance) ? data.Photographer_Attendance : [];
  const shoots = Array.isArray(data.Shoots) ? data.Shoots : [];
  const clients = Array.isArray(data.Clients) ? data.Clients : [];
  const users = Array.isArray(data.Users) ? data.Users : [];
  const assets = Array.isArray(data.Assets) ? data.Assets : [];
  const timeLogs = Array.isArray(data.Editor_Time_Logs) ? data.Editor_Time_Logs : [];
  const breaks = Array.isArray(data.Time_Breaks) ? data.Time_Breaks : [];
  const calendar = Array.isArray(data.Content_Calendar) ? data.Content_Calendar : [];

  // Count active attendance (clocked in today)
  const today = new Date().toISOString().split('T')[0];

  // Calculate past deadline shoots
  const pastDeadlineShoots = shoots.filter(s => {
    if (!s || !s.date || s.status === SHOOT_STATUS.COMPLETED || s.status === SHOOT_STATUS.CANCELLED) return false;
    try {
      const shootDate = new Date(s.date);
      const todayDate = new Date(today);
      todayDate.setHours(0, 0, 0, 0);
      shootDate.setHours(0, 0, 0, 0);
      return shootDate < todayDate;
    } catch {
      return false;
    }
  }).length || 0;

  // Check today's attendance
  useEffect(() => {
    if (isClockInLoading || isClockOutLoading) return;

    if (!user?.email || !attendance || attendance.length === 0) {
      if (!todayAttendance) setClockedIn(false);
      return;
    }

    const todayAtt = attendance.find(
      a => a && a.employee_id === user.email && a.date === today
    );

    if (todayAtt) {
      setTodayAttendance(todayAtt);
      setClockedIn(todayAtt.status === 'clocked_in');
    } else {
      if (!todayAttendance || todayAttendance.date !== today) {
        setTodayAttendance(null);
        setClockedIn(false);
      }
    }
  }, [data, user, attendance, today, isClockInLoading, isClockOutLoading]);

  // Running timer logic
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
    if (clockedIn && todayAttendance && todayAttendance.status === 'clocked_in') {
      error('You are already clocked in!');
      return;
    }

    setIsClockInLoading(true);
    try {
      const clockInTime = new Date().toISOString();
      const todayDate = new Date().toISOString().split('T')[0];

      const existingAttendance = attendance.find(
        a => a && a.employee_id === user?.email && a.date === todayDate
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
          await forceRefresh([COLLECTIONS.ATTENDANCE]);
          success('Clocked in successfully!');
        }
      } else {
        const newAttendance = {
          attendance_id: `ATT-${Date.now()}`,
          employee_id: user.email,
          date: todayDate,
          clock_in: clockInTime,
          status: 'clocked_in',
          created_at: clockInTime,
        };

        await addRow(COLLECTIONS.ATTENDANCE, newAttendance);
        setTodayAttendance(newAttendance);
        setClockedIn(true);
        success('Clocked in successfully!');
        setTimeout(async () => {
          await forceRefresh([COLLECTIONS.ATTENDANCE]);
        }, 500);
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
        } catch (breakErr) {
          console.error('Error ending break:', breakErr);
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
        
        forceRefresh([COLLECTIONS.ATTENDANCE]).catch(err => {
          console.error('Error refreshing data:', err);
        });
        
        setClockedIn(false);
        setShowClockOutReport(false);
        setClockOutReport('');
        success('Clocked out successfully!');
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
      const breakData = {
        break_id: `BRK-${Date.now()}`,
        user_email: user.email,
        attendance_id: todayAttendance.attendance_id,
        time_log_id: null,
        break_start: new Date().toISOString(),
        break_end: null,
        duration: 0,
        break_type: breakType,
        created_at: new Date().toISOString(),
      };

      await addRow(COLLECTIONS.TIME_BREAKS, breakData);
      setActiveBreak(breakData);

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
      await forceRefresh([COLLECTIONS.ATTENDANCE, COLLECTIONS.TIME_BREAKS]);
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

  const handleUpdateShoot = async (updateData) => {
    try {
      const shootIndex = shoots.findIndex(s => s && s.shoot_id === selectedShoot.shoot_id);
      if (shootIndex !== -1) {
        await updateRow(COLLECTIONS.SHOOTS, shootIndex + 2, {
          ...selectedShoot,
          ...updateData
        });
        await forceRefresh([COLLECTIONS.SHOOTS]);
        success('Shoot updated successfully!');
      }
    } catch (err) {
      error('Error updating shoot: ' + err.message);
      throw err;
    }
  };

  const handleUpdateAsset = async (updateData) => {
    try {
      const assetIndex = assets.findIndex(a => a && a.asset_id === selectedAsset.asset_id);
      if (assetIndex !== -1) {
        await updateRow(COLLECTIONS.ASSETS, assetIndex + 2, {
          ...selectedAsset,
          ...updateData
        });
        await forceRefresh([COLLECTIONS.ASSETS]);
        success('Task updated successfully!');
      }
    } catch (err) {
      error('Error updating task: ' + err.message);
      throw err;
    }
  };

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

  const teamOnShoots = photographerAttendance
    .filter(a => a && (a.status === 'In Progress' || (!a.end_time && a.status !== 'Completed')))
    .map(attendance => {
      const shoot = shoots.find(s => s && s.shoot_id === attendance.shoot_id);
      const client = shoot ? clients.find(c => c && c.client_id === shoot.client_id) : null;
      const photographer = users.find(u => u && u.email === attendance.photographer_email);
      const activeBreak = breaks.find(
        b => b && b.attendance_id === attendance.attendance_id && !b.break_end
      );

      const startTime = new Date(attendance.start_time || attendance.clock_in);
      const now = new Date();
      const totalMinutes = Math.floor((now - startTime) / (1000 * 60));
      const breakMinutes = attendance.total_break_duration || 0;
      const workMinutes = totalMinutes - breakMinutes;

      return {
        ...attendance,
        shoot,
        client,
        photographer,
        activeBreak,
        totalMinutes,
        breakMinutes,
        workMinutes,
      };
    })
    .filter(item => item.shoot && item.photographer); // Show if shoot exists and photographer exists (client optional)

  const teamEditing = timeLogs
    .filter(log => log && !log.end_time && log.start_time)
    .map(log => {
      const asset = assets.find(a => a && a.asset_id === log.asset_id);
      const shoot = asset ? shoots.find(s => s && s.shoot_id === asset.shoot_id) : null;
      // Try to get client from shoot, or directly from asset if available
      const client = shoot 
        ? clients.find(c => c && c.client_id === shoot.client_id)
        : (asset ? clients.find(c => c && c.client_id === asset.client_id) : null);
      const editor = users.find(u => u && u.email === log.editor_email);
      const activeBreak = breaks.find(
        b => b && b.time_log_id === log.log_id && !b.break_end
      );

      const startTime = new Date(log.start_time);
      const now = new Date();
      const totalMinutes = Math.floor((now - startTime) / (1000 * 60));
      const breakMinutes = log.total_break_duration || 0;
      const workMinutes = totalMinutes - breakMinutes;

      return {
        ...log,
        asset,
        shoot,
        client,
        editor,
        timeLog: log,
        activeBreak,
        totalMinutes,
        breakMinutes,
        workMinutes,
      };
    })
    .filter(item => item.asset && item.editor); // Show if asset exists and editor exists (client optional)

  // Calculate active attendance: people currently clocked in (matching attendance page exactly)
  // Use the same logic as LeadAttendanceDashboard - iterate through team members first
  const teamMembers = users.filter(u => 
    u && 
    u.active !== 'FALSE' && 
    u.active !== false &&
    u.role !== ROLES.MANAGER &&
    u.role !== ROLES.LEAD
  );

  const activeAttendanceCount = teamMembers.filter(member => {
    const memberAttendance = attendance.find(
      a => a && a.employee_id === member.email && a.date === today
    );
    
    if (!memberAttendance) return false;
    
    // Exact same check as attendance page
    const isClockedIn = memberAttendance.status === 'clocked_in' && !memberAttendance.clock_out;
    return isClockedIn;
  }).length;

  if (loading.all) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn mobile-padding pb-8 space-y-8">
      {/* Header */}
      <Card glass className="border-l-4 border-primary">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          Welcome back, <span className="text-gradient">{user?.name || 'Lead'}</span>!
        </h1>
        <p className="text-gray-600">Manage clients and track team progress</p>
      </Card>

      {/* Clock In/Out Card */}
      <Card
        glass
        className={`
          transition-[transform,opacity,colors,shadow] duration-300
          ${clockedIn ? 'border border-green-100 bg-green-50/60' : ''}
        `}
      >
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
                  variant="glass"
                  onClick={() => setShowBreakDialog(true)}
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  <Coffee className="w-4 h-4" />
                  Take Break
                </Button>
              )}
              <Button
                onClick={handleClockOutClick}
                disabled={isClockOutLoading}
                variant="destructive"
                className="flex-1 gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogOut className="w-4 h-4" />
                Clock Out
              </Button>
            </div>
          </div>
        ) : (
          <Button
            onClick={handleClockIn}
            disabled={isClockInLoading}
            size="lg"
            className="w-full shadow-lg shadow-primary/30 hover:scale-[1.02] disabled:opacity-50"
          >
            {isClockInLoading ? 'Processing...' : (
              <>
                <LogIn className="w-6 h-6" />
                Start Work Day
              </>
            )}
          </Button>
        )}
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card
          as="button"
          glass
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            navigate('/dashboard/assign-shoot');
          }}
          className="flex items-center gap-4 text-left group hover:bg-white"
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
          as="button"
          glass
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowAssignTaskModal(true);
          }}
          className="flex items-center gap-4 text-left group hover:bg-white"
        >
          <div className="p-3 bg-secondary/10 rounded-xl group-hover:bg-secondary/20 transition-colors">
            <FileEdit className="w-8 h-8 text-secondary" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-gray-900">Assign Task</h3>
            <p className="text-sm text-gray-600">Create and assign tasks to editors</p>
          </div>
        </Card>
        <Card
          as="button"
          glass
          onClick={() => navigate('/dashboard/leave-requests')}
          className="flex items-center gap-4 text-left group hover:bg-white"
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

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card
          as="button"
          glass
          onClick={() => navigate('/dashboard/attendance')}
          className="text-left hover:shadow-lg transition-[transform,opacity,colors,shadow] group"
        >
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div className={`p-2 md:p-3 rounded-xl bg-green-50 group-hover:bg-green-100 transition-colors`}>
              <Clock className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate('/dashboard/attendance?view=personal');
              }}
              className="px-2 md:px-3 py-0.5 md:py-1 text-xs bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors font-bold touch-manipulation"
            >
              My Attendance
            </button>
          </div>
          <div className="flex flex-col items-start">
            <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{activeAttendanceCount || 0}</div>
            <div className="text-xs md:text-sm text-gray-500 font-medium">Active Attendance</div>
          </div>
        </Card>
        <StatCard
          icon={Users}
          label="Total Clients"
          value={clients.length}
          color="text-primary"
          bg="bg-blue-50"
          route="/dashboard/clients"
        />
        <StatCard
          icon={Camera}
          label="Team on Shoots"
          value={teamOnShoots.length}
          color="text-blue-600"
          bg="bg-blue-50"
          route="/dashboard/active-work"
        />
        <StatCard
          icon={FileEdit}
          label="Team Editing"
          value={teamEditing.length}
          color="text-purple-600"
          bg="bg-purple-50"
          route="/dashboard/active-work"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Assets Pending Review */}
        {(() => {
          const assetsInReview = assets.filter(a => a && a.status === ASSET_STATUS.REVIEW);
          return assetsInReview.length > 0 && (
            <Card glass className="lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-purple-600" />
                  <h2 className="text-xl font-bold text-gray-900">Pending Review</h2>
                </div>
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">
                  {assetsInReview.length} Items
                </span>
              </div>
              <ApprovalsList
                assets={assetsInReview}
                users={users}
                shoots={shoots}
                clients={clients}
                onUpdate={() => forceRefresh([COLLECTIONS.ASSETS])}
              />
            </Card>
          );
        })()}

        {/* Team on Shoots */}
        <Card glass>
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Active Shoots
          </h2>
          <div className="space-y-4">
            {teamOnShoots.length > 0 ? (
              teamOnShoots.map((item, index) => (
                <div key={index} className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="font-bold text-gray-900">{item.photographer?.name || item.photographer?.email || 'Photographer'}</p>
                      {item.client?.company_name ? (
                        <p className="text-sm text-primary">{item.client.company_name}</p>
                      ) : (
                        <p className="text-sm text-gray-400">No client assigned</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">{item.shoot?.shoot_name || item.shoot?.title || 'General Shoot'}</p>
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">
                      In Progress
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{formatTimeUtil(item.workMinutes)} worked</span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedShoot(item.shoot);
                        setShowShootModal(true);
                      }}
                      className="px-3 py-1.5 text-xs bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors flex items-center gap-1"
                    >
                      <Edit className="w-3 h-3" />
                      Update
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">No active shoots</div>
            )}
          </div>
        </Card>

        {/* Team Editing */}
        <Card glass>
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <FileEdit className="w-5 h-5" />
            Active Editing
          </h2>
          <div className="space-y-4">
            {teamEditing.length > 0 ? (
              teamEditing.map((item, index) => (
                <div key={index} className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="font-bold text-gray-900">{item.editor?.name || item.editor?.email || 'Editor'}</p>
                      {item.client?.company_name ? (
                        <p className="text-sm text-primary">{item.client.company_name}</p>
                      ) : (
                        <p className="text-sm text-gray-400">No client assigned</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">{item.asset?.title || 'Untitled Task'}</p>
                      {item.timeLog?.current_subtask && (
                        <p className="text-xs text-blue-600 mt-1 font-medium">
                          Working on: {item.timeLog.current_subtask}
                        </p>
                      )}
                      {item.timeLog?.task_status === 'Paused' && (
                        <p className="text-xs text-yellow-600 mt-1 font-medium">
                          ⏸ Paused
                        </p>
                      )}
                      {item.activeBreak && (
                        <p className="text-xs text-orange-600 mt-1 font-medium">
                          ☕ On Break: {item.activeBreak.break_type}
                        </p>
                      )}
                    </div>
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-bold">
                      {item.asset?.work_progress || 0}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{formatTimeUtil(item.workMinutes)} worked</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedAssetForDetails(item.asset);
                          setShowWorkDetails(true);
                        }}
                        className="px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        Details
                      </button>
                      <button
                        onClick={() => {
                          setSelectedAsset(item.asset);
                          setShowAssetModal(true);
                        }}
                        className="px-3 py-1.5 text-xs bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors flex items-center gap-1"
                      >
                        <Edit className="w-3 h-3" />
                        Update
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">No active editing sessions</div>
            )}
          </div>
        </Card>
      </div>

      {/* Break Dialog */}
      <BreakDialog
        isOpen={showBreakDialog}
        onClose={() => setShowBreakDialog(false)}
        onConfirm={handleTakeBreak}
      />

      {/* Update Shoot Modal */}
      {selectedShoot && (
        <UpdateShootModal
          shoot={selectedShoot}
          users={users}
          clients={clients}
          onClose={() => {
            setShowShootModal(false);
            setSelectedShoot(null);
          }}
          onUpdate={handleUpdateShoot}
        />
      )}

      {/* Update Asset Modal */}
      {selectedAsset && (
        <UpdateAssetModal
          asset={selectedAsset}
          users={users}
          shoots={shoots}
          clients={clients}
          onClose={() => {
            setShowAssetModal(false);
            setSelectedAsset(null);
          }}
          onUpdate={handleUpdateAsset}
        />
      )}

      {/* Asset Work Details Modal */}
      {selectedAssetForDetails && (
        <AssetWorkDetailsModal
          asset={selectedAssetForDetails}
          timeLogs={timeLogs.filter(log => 
            log && log.asset_id === selectedAssetForDetails.asset_id
          )}
          onClose={() => {
            setShowWorkDetails(false);
            setSelectedAssetForDetails(null);
          }}
        />
      )}

      {/* Clock Out Report Modal */}
      <ModalPortal
        id="clock-out-report"
        isOpen={showClockOutReport}
        onClose={() => {
          setShowClockOutReport(false);
          setClockOutReport('');
        }}
        title="Daily Work Report"
        description="Optionally summarize what you accomplished before clocking out."
        size="md"
        footer={({ close }) => (
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                close();
                setClockOutReport('');
              }}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={() => handleClockOut(clockOutReport)}
              disabled={isClockOutLoading}
            >
              {isClockOutLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Submit &amp; Clock Out
                </>
              )}
            </Button>
          </div>
        )}
      >
        <p className="text-sm text-gray-600 mb-4">
          Provide a brief summary of what you accomplished today before clocking out.
        </p>
        <textarea
          value={clockOutReport}
          onChange={(e) => setClockOutReport(e.target.value)}
          placeholder="E.g., Completed 3 client assets, attended team meeting, reviewed 2 submissions... (Optional)"
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-[transform,opacity,colors,shadow] resize-none"
          rows="5"
          autoFocus
          disabled={isClockOutLoading}
        />
      </ModalPortal>

      {/* Create Task Modal */}
      <ModalPortal
        id="create-task-lead"
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

function StatCard({ icon: Icon, label, value, color, bg, route }) {
  const navigate = useNavigate();
  return (
    <Card
      glass
      as={route ? 'button' : 'div'}
      onClick={() => route && navigate(route)}
      className={`p-4 cursor-pointer hover:ring-2 ring-primary/20 ${route ? 'active:scale-95 text-left' : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${bg}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <span className="text-2xl font-bold text-gray-900">{value}</span>
      </div>
      <p className="text-sm font-medium text-gray-500">{label}</p>
    </Card>
  );
}
