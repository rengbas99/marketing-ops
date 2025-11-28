import { useEffect, useMemo, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import { Clock, Camera, FileText, Users } from 'lucide-react';
import { format } from 'date-fns';
import { ATTENDANCE_STATUS } from '../../constants';

const LeadDashboard = () => {
  const { data, loadCollections, addRow, updateRow } = useData();
  const { user } = useAuth();
  const { success, error } = useToast();
  const [clockedIn, setClockedIn] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCollections(['ATTENDANCE', 'SHOOTS', 'ASSETS', 'PHOTOGRAPHER_ATTENDANCE', 'EDITOR_TIME_LOGS']);
    checkClockInStatus();
  }, [loadCollections]);

  const checkClockInStatus = () => {
    const attendance = data.ATTENDANCE || [];
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = attendance.find(
      a => a.employee_id === user?.email && a.date === today && a.status === ATTENDANCE_STATUS.CLOCKED_IN
    );
    setClockedIn(!!todayAttendance);
  };

  useEffect(() => {
    checkClockInStatus();
  }, [data.ATTENDANCE, user]);

  const handleClockIn = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();

      await addRow('ATTENDANCE', {
        attendance_id: `ATT-${Date.now()}`,
        employee_id: user.email,
        date: today,
        clock_in: now,
        status: ATTENDANCE_STATUS.CLOCKED_IN,
      });

      setClockedIn(true);
      success('Clocked in successfully!');
    } catch (err) {
      error(err.message || 'Failed to clock in');
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    setLoading(true);
    try {
      const attendance = data.ATTENDANCE || [];
      const today = new Date().toISOString().split('T')[0];
      const todayAttendance = attendance.find(
        a => a.employee_id === user?.email && a.date === today && a.status === ATTENDANCE_STATUS.CLOCKED_IN
      );

      if (!todayAttendance) {
        throw new Error('No active clock-in found');
      }

      const clockInTime = new Date(todayAttendance.clock_in);
      const clockOutTime = new Date();
      const hoursWorked = ((clockOutTime - clockInTime) / (1000 * 60 * 60)).toFixed(2);

      await updateRow('ATTENDANCE', todayAttendance.attendance_id, {
        clock_out: clockOutTime.toISOString(),
        status: ATTENDANCE_STATUS.CLOCKED_OUT,
        hours_worked: parseFloat(hoursWorked),
      }, 'attendance_id');

      setClockedIn(false);
      success(`Clocked out! You worked ${hoursWorked} hours.`);
    } catch (err) {
      error(err.message || 'Failed to clock out');
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const shoots = data.SHOOTS || [];
    const assets = data.ASSETS || [];
    const photographerAttendance = data.PHOTOGRAPHER_ATTENDANCE || [];
    const editorTimeLogs = data.EDITOR_TIME_LOGS || [];

    const today = new Date().toISOString().split('T')[0];
    const activeShoots = photographerAttendance.filter(pa => pa.status === 'In Progress');
    const activeTasks = editorTimeLogs.filter(log => !log.end_time);
    const todayShoots = shoots.filter(s => s.date === today);

    return {
      activeShoots: activeShoots.length,
      activeTasks: activeTasks.length,
      todayShoots: todayShoots.length,
      totalAssets: assets.length,
    };
  }, [data]);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Lead Dashboard</h1>
        <p className="text-slate-600">Team overview and quick actions</p>
      </div>

      {/* Clock In/Out */}
      <div className="modern-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">Attendance</h2>
            <p className="text-sm text-slate-600">
              {clockedIn ? 'You are currently clocked in' : 'Clock in to start tracking your time'}
            </p>
          </div>
          {clockedIn ? (
            <button
              onClick={handleClockOut}
              disabled={loading}
              className="btn-primary disabled:opacity-50"
            >
              {loading ? 'Clocking out...' : 'Clock Out'}
            </button>
          ) : (
            <button
              onClick={handleClockIn}
              disabled={loading}
              className="btn-primary disabled:opacity-50"
            >
              {loading ? 'Clocking in...' : 'Clock In'}
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="modern-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-purple-100">
              <Camera className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Active Shoots</h3>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.activeShoots}</p>
        </div>

        <div className="modern-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-100">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Active Tasks</h3>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.activeTasks}</p>
        </div>

        <div className="modern-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-amber-100">
              <Camera className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Shoots Today</h3>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.todayShoots}</p>
        </div>

        <div className="modern-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-emerald-100">
              <Users className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Total Assets</h3>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.totalAssets}</p>
        </div>
      </div>
    </div>
  );
};

export default LeadDashboard;

