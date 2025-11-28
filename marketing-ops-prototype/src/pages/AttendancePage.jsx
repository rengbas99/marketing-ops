import { useEffect, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { Clock, LogIn, LogOut, Coffee } from 'lucide-react';
import { format } from 'date-fns';
import { ATTENDANCE_STATUS } from '../constants';

const AttendancePage = () => {
  const { data, loadCollections, addRow, updateRow } = useData();
  const { user } = useAuth();
  const { success, error } = useToast();
  const [clockedIn, setClockedIn] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCollections(['ATTENDANCE', 'TIME_BREAKS']);
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

  const myAttendance = (data.ATTENDANCE || []).filter(a => a.employee_id === user?.email);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Attendance</h1>
        <p className="text-slate-600">Track your work hours</p>
      </div>

      <div className="modern-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">Current Status</h2>
            <p className="text-sm text-slate-600">
              {clockedIn ? 'You are currently clocked in' : 'You are clocked out'}
            </p>
          </div>
          {clockedIn ? (
            <button
              onClick={handleClockOut}
              disabled={loading}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              <LogOut className="w-5 h-5" />
              {loading ? 'Clocking out...' : 'Clock Out'}
            </button>
          ) : (
            <button
              onClick={handleClockIn}
              disabled={loading}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              <LogIn className="w-5 h-5" />
              {loading ? 'Clocking in...' : 'Clock In'}
            </button>
          )}
        </div>
      </div>

      <div className="modern-card p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Attendance History</h2>
        {myAttendance.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No attendance records</p>
        ) : (
          <div className="space-y-3">
            {myAttendance
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .slice(0, 10)
              .map((record) => (
                <div key={record.attendance_id} className="p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-primary-600" />
                      <div>
                        <p className="font-semibold text-slate-900">
                          {format(new Date(record.date), 'MMM dd, yyyy')}
                        </p>
                        {record.clock_in && (
                          <p className="text-sm text-slate-600">
                            In: {format(new Date(record.clock_in), 'HH:mm')}
                            {record.clock_out && ` - Out: ${format(new Date(record.clock_out), 'HH:mm')}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {record.hours_worked && (
                        <p className="font-bold text-slate-900">{record.hours_worked}h</p>
                      )}
                      <span className={`badge ${
                        record.status === ATTENDANCE_STATUS.CLOCKED_IN ? 'badge-info' : 'badge-success'
                      }`}>
                        {record.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendancePage;

