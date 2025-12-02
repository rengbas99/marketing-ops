import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import BreakDialog from '../../components/BreakDialog';
import BreakTimer from '../../components/BreakTimer';
import PhotographerWorkWidget from '../../components/PhotographerWorkWidget';
import { Camera, Clock, MapPin, Calendar, LogIn, LogOut, X, Coffee, CheckCircle, Plane } from 'lucide-react';
import { formatBreakDuration } from '../../utils/timeFormatting';
import { COLLECTIONS, SHOOT_STATUS } from '../../constants';
import { canClockIn } from '../../utils/attendanceUtils';

export default function PhotographerDashboard() {
  const navigate = useNavigate();
  const { data, loading, startPolling, stopPolling, addRow, updateRow, forceRefresh } = useData();
  const { user } = useAuth();
  const { success, error } = useToast();
  const [activeShoot, setActiveShoot] = useState(null);
  const [clockedIn, setClockedIn] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [selectedShoot, setSelectedShoot] = useState('');
  const [showShootSelector, setShowShootSelector] = useState(false);
  const [elapsedTime, setElapsedTime] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [isClockInLoading, setIsClockInLoading] = useState(false);
  const [isClockOutLoading, setIsClockOutLoading] = useState(false);
  const [activeBreak, setActiveBreak] = useState(null);
  const [showBreakDialog, setShowBreakDialog] = useState(false);
  const [showClockOutReport, setShowClockOutReport] = useState(false);
  const [clockOutReport, setClockOutReport] = useState('');

  useEffect(() => {
    startPolling('photographer-dashboard', [
      COLLECTIONS.SHOOTS,
      COLLECTIONS.PHOTOGRAPHER_ATTENDANCE,
      COLLECTIONS.ATTENDANCE,
      COLLECTIONS.CLIENTS,
      COLLECTIONS.TIME_BREAKS
    ]);
    return () => stopPolling('photographer-dashboard');
  }, [startPolling, stopPolling]);

  const attendance = Array.isArray(data.Attendance) ? data.Attendance : [];
  const photographerAttendance = Array.isArray(data.Photographer_Attendance) ? data.Photographer_Attendance : [];
  const shoots = Array.isArray(data.Shoots) ? data.Shoots : [];
  const clients = Array.isArray(data.Clients) ? data.Clients : [];
  const breaks = Array.isArray(data.Time_Breaks) ? data.Time_Breaks : [];

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayAtt = attendance.find(
      a => a && a.employee_id === user?.email && a.date === today
    );
    setTodayAttendance(todayAtt);
    setClockedIn(todayAtt && todayAtt.status === 'clocked_in');
  }, [data, user, attendance]);

  useEffect(() => {
    const active = photographerAttendance.find(
      a => a && a.photographer_email === user?.email && a.status === 'In Progress'
    );
    if (active) {
      if (active.shoot_id === 'GENERAL') {
        setActiveShoot({
          ...active,
          shoot: {
            shoot_id: 'GENERAL',
            shoot_name: 'General Shoot',
            client_id: null
          }
        });
      } else {
        const shoot = shoots.find(s => s && s.shoot_id === active.shoot_id);
        // Check if shoot is cancelled - auto clock out after 15 minutes
        if (shoot && shoot.status === 'cancelled') {
          const startTime = new Date(active.start_time || active.clock_in);
          const now = new Date();
          const minutesElapsed = (now - startTime) / (1000 * 60);
          
          // Auto clock out if cancelled and 15 minutes have passed
          if (minutesElapsed >= 15) {
            handleClockOut().catch(console.error);
            return;
          }
        }
        setActiveShoot({ ...active, shoot });
      }
    } else {
      setActiveShoot(null);
    }
  }, [data, user, photographerAttendance, shoots]);

  useEffect(() => {
    if (!clockedIn || !todayAttendance) {
      setActiveBreak(null);
      return;
    }

    if (activeShoot && activeShoot.attendance_id) {
      const activeBreakRecord = breaks.find(
        b => b && b.attendance_id === activeShoot.attendance_id && !b.break_end
      );
      setActiveBreak(activeBreakRecord);
    } else {
      const activeBreakRecord = breaks.find(
        b => b && b.attendance_id === todayAttendance.attendance_id && !b.break_end
      );
      setActiveBreak(activeBreakRecord);
    }
  }, [data, clockedIn, todayAttendance, activeShoot, breaks]);

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

  const assignedShoots = shoots.filter(
    s => s &&
      (s.photographer_id === user?.email || s.lead_photographer_email === user?.email) &&
      s.status !== SHOOT_STATUS.COMPLETED
  );

  const handleClockIn = async () => {
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

      const shootId = selectedShoot || 'GENERAL';

      const existingPA = photographerAttendance.find(
        pa => pa && pa.shoot_id === shootId &&
          pa.photographer_email === user?.email &&
          pa.status === 'In Progress' && !pa.end_time
      );

      if (!existingPA) {
        await addRow(COLLECTIONS.PHOTOGRAPHER_ATTENDANCE, {
          attendance_id: `PA-${Date.now()}`,
          shoot_id: shootId,
          photographer_email: user.email,
          start_time: clockInTime,
          clock_in: clockInTime,
          status: 'In Progress',
          date: today,
          break_start_time: null,
          break_end_time: null,
          total_break_duration: 0,
          work_duration: 0,
          upload_links: '',
        });
      }

      if (selectedShoot && selectedShoot !== 'GENERAL') {
        const shootIndex = shoots.findIndex(s => s && s.shoot_id === selectedShoot);
        if (shootIndex !== -1) {
          try {
            await updateRow(COLLECTIONS.SHOOTS, shootIndex + 2, { status: SHOOT_STATUS.IN_PROGRESS });
          } catch (shootErr) {
            // Log error but don't block clock-in
            console.error('Error updating shoot status:', shootErr);
          }
        }
      }

      // Make forceRefresh non-blocking
      forceRefresh([COLLECTIONS.ATTENDANCE, COLLECTIONS.PHOTOGRAPHER_ATTENDANCE, COLLECTIONS.SHOOTS]).catch(err => {
        console.error('Error refreshing data:', err);
      });

      setShowShootSelector(false);
      setSelectedShoot('');
      success(selectedShoot ? 'Clocked in and shoot started!' : 'Clocked in for general work!');
    } catch (err) {
      error('Error clocking in: ' + err.message);
      // Close popup even on error
      setShowShootSelector(false);
      setSelectedShoot('');
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
      
      // Validate clock in time
      if (!clockInTime || isNaN(clockInTime.getTime())) {
        error('Invalid clock-in time');
        setIsClockOutLoading(false);
        setShowClockOutReport(false);
        setClockOutReport('');
        return;
      }

      const clockOutTimeISO = clockOutTime.toISOString();

      let totalBreakMinutes = 0;
      try {
        if (activeShoot && activeShoot.attendance_id) {
        // Calculate breaks from Time_Breaks collection for this shoot
          const shootBreaks = (Array.isArray(breaks) ? breaks : []).filter(b => 
          b && b.attendance_id === activeShoot.attendance_id && b.break_end
        );
          const calculatedBreaks = shootBreaks.reduce((sum, b) => {
            try {
              return sum + (parseFloat(b.duration) || 0);
            } catch {
              return sum;
            }
          }, 0);
        totalBreakMinutes = Math.max(calculatedBreaks, parseFloat(activeShoot.total_break_duration || 0));
      } else {
        // No active shoot - calculate all breaks for today
          const today = new Date().toISOString().split('T')[0];
          const todayPhotographerAttendance = (Array.isArray(photographerAttendance) ? photographerAttendance : []).filter(pa => {
          if (!pa || !pa.start_time) return false;
            try {
          const paDate = new Date(pa.start_time || pa.date).toISOString().split('T')[0];
              return paDate === today && pa.photographer_email === user?.email;
            } catch {
              return false;
            }
        });
        
        // Calculate breaks from Time_Breaks collection
          const todayBreaks = (Array.isArray(breaks) ? breaks : []).filter(b => {
          if (!b || !b.break_end) return false;
          if (b.attendance_id === todayAttendance.attendance_id) return true;
            return todayPhotographerAttendance.some(pa => pa && pa.attendance_id === b.attendance_id);
        });
          
          const calculatedBreaks = todayBreaks.reduce((sum, b) => {
            try {
              return sum + (parseFloat(b.duration) || 0);
            } catch {
              return sum;
            }
          }, 0);
        
        const photographerAttendanceBreaks = todayPhotographerAttendance.reduce((sum, pa) => {
            try {
          return sum + (parseFloat(pa.total_break_duration) || 0);
            } catch {
              return sum;
            }
        }, 0);

        const attendanceBreaks = parseFloat(todayAttendance.total_break_duration || 0);
        totalBreakMinutes = Math.max(calculatedBreaks, photographerAttendanceBreaks + attendanceBreaks);
        }
      } catch (breakCalcErr) {
        console.error('Error calculating breaks:', breakCalcErr);
        // Use stored value as fallback
        totalBreakMinutes = parseFloat(todayAttendance.total_break_duration || 0);
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

      if (activeShoot) {
        const paIndex = photographerAttendance.findIndex(
          a => a && a.attendance_id === activeShoot.attendance_id
        );

        if (paIndex !== -1) {
          const startTime = new Date(activeShoot.start_time || activeShoot.clock_in);
          const totalMinutes = (clockOutTime - startTime) / (1000 * 60);
          
          // Calculate breaks from Time_Breaks collection
          const shootBreaks = breaks.filter(b => 
            b && b.attendance_id === activeShoot.attendance_id && b.break_end
          );
          const calculatedBreaks = shootBreaks.reduce((sum, b) => sum + (parseFloat(b.duration) || 0), 0);
          const breakMinutes = Math.max(calculatedBreaks, parseFloat(activeShoot.total_break_duration || 0));
          
          const workMinutes = Math.max(0, totalMinutes - breakMinutes);
          const workDuration = workMinutes / 60;

          try {
            await updateRow(COLLECTIONS.PHOTOGRAPHER_ATTENDANCE, paIndex + 2, {
              ...activeShoot,
              end_time: clockOutTimeISO,
              clock_out: clockOutTimeISO,
              status: 'Completed',
              duration: (totalMinutes / 60).toFixed(2),
              work_duration: workDuration.toFixed(2),
              total_break_duration: breakMinutes.toFixed(2),
            });

            // Mark shoot as completed
            const shootIndex = shoots.findIndex(s => s && s.shoot_id === activeShoot.shoot_id);
            if (shootIndex !== -1) {
              await updateRow(COLLECTIONS.SHOOTS, shootIndex + 2, { 
                status: SHOOT_STATUS.COMPLETED,
                updated_at: new Date().toISOString(),
              });
            }
          } catch (paErr) {
            console.error('Error updating photographer attendance on clock out:', paErr);
            // Continue with attendance update even if photographer attendance update fails
          }
        }
      }

      // Make forceRefresh non-blocking
      forceRefresh([COLLECTIONS.ATTENDANCE, COLLECTIONS.PHOTOGRAPHER_ATTENDANCE, COLLECTIONS.SHOOTS]).catch(err => {
        console.error('Error refreshing data:', err);
      });

      setClockedIn(false);
      setActiveShoot(null);
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

  const handleTakeBreak = async (breakType) => {
    if (!clockedIn || !todayAttendance) return;
    if (activeBreak) {
      error('You are already on a break!');
      return;
    }

    try {
      const attendanceId = activeShoot?.attendance_id || todayAttendance.attendance_id;

      const breakData = {
        break_id: `BRK-${Date.now()}`,
        user_email: user.email,
        attendance_id: attendanceId,
        time_log_id: null,
        break_start: new Date().toISOString(),
        break_end: null,
        duration: 0,
        break_type: breakType,
        created_at: new Date().toISOString(),
      };

      await addRow(COLLECTIONS.TIME_BREAKS, breakData);
      setActiveBreak(breakData);

      if (activeShoot && activeShoot.attendance_id) {
        const paIndex = photographerAttendance.findIndex(
          pa => pa && pa.attendance_id === activeShoot.attendance_id
        );
        if (paIndex !== -1) {
          try {
            await updateRow(COLLECTIONS.PHOTOGRAPHER_ATTENDANCE, paIndex + 2, {
              ...activeShoot,
              break_start_time: new Date().toISOString(),
            });
          } catch (paErr) {
            // Log error but don't block break start
            console.error('Error updating photographer attendance for break:', paErr);
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

      await forceRefresh([COLLECTIONS.ATTENDANCE, COLLECTIONS.PHOTOGRAPHER_ATTENDANCE, COLLECTIONS.TIME_BREAKS]);
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

      if (activeShoot && activeShoot.attendance_id === activeBreak.attendance_id) {
        const paIndex = photographerAttendance.findIndex(
          pa => pa && pa.attendance_id === activeShoot.attendance_id
        );
        if (paIndex !== -1) {
          const currentTotal = (activeShoot.total_break_duration || 0) + duration;
          await updateRow(COLLECTIONS.PHOTOGRAPHER_ATTENDANCE, paIndex + 2, {
            ...activeShoot,
            break_end_time: breakEnd.toISOString(),
            total_break_duration: currentTotal,
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

      await forceRefresh([COLLECTIONS.ATTENDANCE, COLLECTIONS.PHOTOGRAPHER_ATTENDANCE, COLLECTIONS.TIME_BREAKS]);
      setActiveBreak(null);
      success('Break ended');
    } catch (err) {
      error('Error ending break: ' + err.message);
    }
  };

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
      <div className="glass-panel p-6 rounded-2xl border-l-4 border-primary">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          Welcome back, <span className="text-gradient">{user?.name || 'Media'}</span>!
        </h1>
        <p className="text-gray-600">Manage your shoots and attendance</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/dashboard/leave-requests')}
          className="glass-card p-6 flex items-center gap-4 group hover:bg-white/80"
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
            {activeShoot && (
              <div className="p-4 bg-white/50 rounded-xl border border-white/50">
                <div className="flex items-center gap-2 mb-2">
                  <Camera className="w-4 h-4 text-primary" />
                  <span className="font-bold text-gray-900">{activeShoot.shoot?.shoot_name || 'Active Shoot'}</span>
                </div>
                {activeShoot.shoot && (() => {
                  const client = clients.find(c => c && c.client_id === activeShoot.shoot.client_id);
                  return client && (
                    <p className="text-sm text-gray-600">{client.company_name}</p>
                  );
                })()}
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

            {activeShoot && (
              <PhotographerWorkWidget
                activeShoot={activeShoot}
                onSave={async (notes) => {
                  if (!activeShoot) return;
                  const index = attendance.findIndex(a => a && a.attendance_id === activeShoot.attendance_id);
                  if (index !== -1) {
                    await updateRow(COLLECTIONS.PHOTOGRAPHER_ATTENDANCE, index + 2, {
                      ...activeShoot,
                      notes: notes,
                    });
                    await forceRefresh([COLLECTIONS.PHOTOGRAPHER_ATTENDANCE]);
                    success('Work description saved!');
                  }
                }}
                readOnly={false}
              />
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
            <p className="text-gray-600">Select a shoot and clock in to start working</p>
            <button
              onClick={() => setShowShootSelector(true)}
              className="w-full bg-primary text-white px-6 py-4 rounded-xl font-bold text-lg shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all transform hover:scale-[1.02] flex items-center justify-center gap-3"
            >
              <LogIn className="w-6 h-6" />
              Clock In & Select Shoot
            </button>
          </div>
        )}
      </div>

      {/* Shoot Selector Modal */}
      {showShootSelector && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 transition-opacity z-[100]"
            style={{ background: 'rgba(0, 0, 0, 0.25)', backdropFilter: 'blur(6px)', borderRadius: '16px' }}
            onClick={() => {
              setShowShootSelector(false);
              setSelectedShoot('');
            }}
          />
          <div className="bg-white rounded-2xl max-w-md w-full p-6 relative z-[101] animate-fadeIn" style={{ borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>
            <div className="flex items-start justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Select Shoot</h3>
              <button
                onClick={() => {
                  setShowShootSelector(false);
                  setSelectedShoot('');
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">Available Shoots</label>
              <select
                value={selectedShoot}
                onChange={(e) => setSelectedShoot(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              >
                <option value="">General Shoot (No specific shoot)</option>
                {assignedShoots
                  .filter(s => s && s.status !== SHOOT_STATUS.COMPLETED)
                  .map(shoot => {
                    const client = clients.find(c => c && c.client_id === shoot.client_id);
                    return (
                      <option key={shoot.shoot_id} value={shoot.shoot_id}>
                        {shoot.shoot_name} {client ? `- ${client.company_name}` : ''}
                      </option>
                    );
                  })}
              </select>
              <p className="text-xs text-gray-500 mt-2">
                Clock in for general work or select a specific shoot
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowShootSelector(false);
                  setSelectedShoot('');
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

      {/* Upcoming Shoots */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Upcoming Shoots
        </h2>
        <div className="space-y-4">
          {assignedShoots.length > 0 ? (
            assignedShoots
              .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0))
              .map((shoot, index) => {
                const client = clients.find(c => c && c.client_id === shoot.client_id);
                const dateStr = shoot.date ? new Date(shoot.date).toLocaleDateString() : 'No date';

                return (
                  <div
                    key={shoot.shoot_id || index}
                    className="p-4 rounded-xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 mb-1">
                          {shoot.title || shoot.shoot_name || 'Untitled Shoot'}
                        </h3>
                        {client && (
                          <p className="text-sm text-primary font-medium mb-2">
                            {client.company_name}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {dateStr}
                          </span>
                          {(shoot.location || shoot.location_name) && (
                            <span className="flex items-center gap-1.5">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              {shoot.location || shoot.location_name}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${shoot.status === SHOOT_STATUS.SCHEDULED ? 'bg-blue-100 text-blue-700' :
                          shoot.status === SHOOT_STATUS.IN_PROGRESS ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                        }`}>
                        {shoot.status || 'Scheduled'}
                      </span>
                    </div>
                  </div>
                );
              })
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Camera className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No upcoming shoots assigned</p>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card p-4">
          <div className="text-3xl font-bold text-primary mb-1">
            {assignedShoots.length}
          </div>
          <div className="text-sm text-gray-600 font-medium">Assigned Shoots</div>
        </div>
        <div className="glass-card p-4">
          <div className="text-3xl font-bold text-green-600 mb-1">
            {photographerAttendance.filter(
              a => a && a.photographer_email === user?.email && a.status === 'Completed'
            ).length}
          </div>
          <div className="text-sm text-gray-600 font-medium">Completed</div>
        </div>
      </div>

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
