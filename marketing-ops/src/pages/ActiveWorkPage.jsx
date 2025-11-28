import { useEffect, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Camera, FileEdit, Clock, Coffee, User, MapPin, Link as LinkIcon, TrendingUp, CheckCircle, Activity } from 'lucide-react';
import { formatBreakDuration, formatTime as formatTimeUtil } from '../utils/timeFormatting';
import { COLLECTIONS, SHOOT_STATUS, ASSET_STATUS } from '../constants';

export default function ActiveWorkPage() {
  const { data, loading, startPolling, stopPolling } = useData();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState('active'); // 'active' or 'today'

  useEffect(() => {
    startPolling('active-work-page', [
      COLLECTIONS.PHOTOGRAPHER_ATTENDANCE,
      COLLECTIONS.EDITOR_TIME_LOGS,
      COLLECTIONS.TIME_BREAKS,
      COLLECTIONS.USERS,
      COLLECTIONS.SHOOTS,
      COLLECTIONS.ASSETS,
      COLLECTIONS.CLIENTS
    ]);
    return () => stopPolling('active-work-page');
  }, [startPolling, stopPolling]);

  const attendance = Array.isArray(data.Photographer_Attendance) ? data.Photographer_Attendance : [];
  const timeLogs = Array.isArray(data.Editor_Time_Logs) ? data.Editor_Time_Logs : [];
  const breaks = Array.isArray(data.Time_Breaks) ? data.Time_Breaks : [];
  const users = Array.isArray(data.Users) ? data.Users : [];
  const shoots = Array.isArray(data.Shoots) ? data.Shoots : [];
  const assets = Array.isArray(data.Assets) ? data.Assets : [];
  const clients = Array.isArray(data.Clients) ? data.Clients : [];

  // Active photographers (shoots in progress) - only show if clocked in
  const activePhotographers = attendance
    .filter(a => {
      if (!a || a.status !== 'In Progress' || a.end_time) return false;
      // Check if photographer is clocked in today
      const today = new Date().toISOString().split('T')[0];
      const photographerAttendance = Array.isArray(data.Attendance) ? data.Attendance : [];
      const isClockedIn = photographerAttendance.some(
        att => att && att.employee_id === a.photographer_email &&
          att.status === 'clocked_in' && att.date === today
      );
      return isClockedIn;
    })
    .map(att => {
      const photographer = users.find(u => u && u.email === att.photographer_email);
      // Handle "GENERAL" shoot_id
      let shoot = null;
      if (att.shoot_id === 'GENERAL') {
        shoot = { shoot_id: 'GENERAL', shoot_name: 'General Shoot', client_id: null };
      } else {
        shoot = shoots.find(s => s && s.shoot_id === att.shoot_id);
      }
      const client = shoot ? clients.find(c => c && c.client_id === shoot.client_id) : null;
      const activeBreak = breaks.find(
        b => b && b.attendance_id === att.attendance_id && !b.break_end
      );

      const startTime = new Date(att.start_time || att.clock_in);
      const now = new Date();
      const totalMinutes = Math.floor((now - startTime) / (1000 * 60));
      const breakMinutes = att.total_break_duration || 0;
      const workMinutes = totalMinutes - breakMinutes;

      return {
        ...att,
        photographer,
        shoot,
        client,
        activeBreak,
        totalMinutes,
        breakMinutes,
        workMinutes,
      };
    });

  // Active editors (time logs in progress) - only show if clocked in
  const activeEditors = timeLogs
    .filter(log => {
      if (!log || log.end_time) return false;
      // Check if editor is clocked in today
      const today = new Date().toISOString().split('T')[0];
      const editorAttendance = Array.isArray(data.Attendance) ? data.Attendance : [];
      const isClockedIn = editorAttendance.some(
        att => att && att.employee_id === log.editor_email &&
          att.status === 'clocked_in' && att.date === today
      );
      return isClockedIn;
    })
    .map(log => {
      const editor = users.find(u => u && u.email === log.editor_email);
      const asset = assets.find(a => a && a.asset_id === log.asset_id);
      const shoot = asset ? shoots.find(s => s && s.shoot_id === (asset.shoot_id || asset.linked_shoot_id)) : null;
      const client = shoot ? clients.find(c => c && c.client_id === shoot.client_id) : null;
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
        editor,
        asset,
        shoot,
        client,
        activeBreak,
        totalMinutes,
        breakMinutes,
        workMinutes,
      };
    });

  // Today's completed work
  const today = new Date().toISOString().split('T')[0];
  const completedShoots = attendance
    .filter(a => {
      if (!a || a.status !== 'Completed') return false;
      try {
        const date = new Date(a.start_time || a.clock_in).toISOString().split('T')[0];
        return date === today;
      } catch {
        return false;
      }
    })
    .map(att => {
      const photographer = users.find(u => u && u.email === att.photographer_email);
      const shoot = shoots.find(s => s && s.shoot_id === att.shoot_id);
      const client = shoot ? clients.find(c => c && c.client_id === shoot.client_id) : null;
      return { ...att, photographer, shoot, client };
    });

  const completedTasks = timeLogs
    .filter(log => {
      if (!log || log.task_status !== 'Completed' || !log.end_time) return false;
      try {
        const date = new Date(log.start_time).toISOString().split('T')[0];
        return date === today;
      } catch {
        return false;
      }
    })
    .map(log => {
      const editor = users.find(u => u && u.email === log.editor_email);
      const asset = assets.find(a => a && a.asset_id === log.asset_id);
      const shoot = asset ? shoots.find(s => s && s.shoot_id === (asset.shoot_id || asset.linked_shoot_id)) : null;
      const client = shoot ? clients.find(c => c && c.client_id === shoot.client_id) : null;
      return { ...log, editor, asset, shoot, client };
    });

  // Today's hours by person
  const hoursByPerson = {};

  // Photographer hours
  completedShoots.forEach(shoot => {
    const email = shoot.photographer_email;
    if (!hoursByPerson[email]) {
      hoursByPerson[email] = { name: shoot.photographer?.name || email, hours: 0 };
    }
    hoursByPerson[email].hours += parseFloat(shoot.work_duration || shoot.duration || 0);
  });

  // Editor hours
  completedTasks.forEach(task => {
    const email = task.editor_email;
    if (!hoursByPerson[email]) {
      hoursByPerson[email] = { name: task.editor?.name || email, hours: 0 };
    }
    hoursByPerson[email].hours += parseFloat(task.work_duration || task.duration || 0);
  });

  const formatTime = (minutes) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
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
      <div className="glass-panel p-6 rounded-2xl border-l-4 border-primary flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Active Work Tracking</h1>
          <p className="text-gray-600">Real-time view of team activity and progress</p>
        </div>

        {/* View Mode Toggle */}
        <div className="glass-panel p-1 flex gap-1">
          <button
            onClick={() => setViewMode('active')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'active'
                ? 'bg-primary text-white shadow-md'
                : 'text-gray-500 hover:bg-gray-100'
              }`}
          >
            Active Work
          </button>
          <button
            onClick={() => setViewMode('today')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'today'
                ? 'bg-primary text-white shadow-md'
                : 'text-gray-500 hover:bg-gray-100'
              }`}
          >
            Today's Summary
          </button>
        </div>
      </div>

      {viewMode === 'active' ? (
        <>
          {/* Active Photographers */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 rounded-lg text-primary">
                <Camera className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                Photographers ({activePhotographers.length} active)
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activePhotographers.length > 0 ? (
                activePhotographers.map((att, index) => (
                  <div
                    key={att.attendance_id || index}
                    className={`p-5 rounded-xl border transition-all hover:shadow-md ${att.activeBreak
                        ? 'bg-orange-50/50 border-orange-200'
                        : 'bg-white border-gray-100'
                      }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-primary/20">
                          {att.photographer?.name?.charAt(0) || <User className="w-6 h-6" />}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg">
                            {att.photographer?.name || att.photographer_email}
                          </h3>
                          <p className="text-sm text-gray-600 font-medium">
                            {att.shoot?.shoot_name || 'Shoot'}
                          </p>
                          {att.client && (
                            <p className="text-xs text-primary font-bold uppercase tracking-wider mt-0.5">
                              {att.client.company_name}
                            </p>
                          )}
                        </div>
                      </div>
                      {att.activeBreak && (
                        <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold animate-pulse flex items-center gap-1.5">
                          <Coffee className="w-3.5 h-3.5" />
                          On Break
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-sm bg-white/50 rounded-lg p-3 border border-gray-100 mb-3">
                      <div className="text-center">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Duration</div>
                        <div className="font-bold text-gray-900">{formatTime(att.totalMinutes)}</div>
                      </div>
                      <div className="text-center border-l border-gray-100">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Break</div>
                        <div className="font-bold text-orange-600">{formatBreakDuration(att.breakMinutes)}</div>
                      </div>
                      <div className="text-center border-l border-gray-100">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Work</div>
                        <div className="font-bold text-green-600">{formatTime(att.workMinutes)}</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {att.shoot?.location_name && (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded-md">
                          <MapPin className="w-3.5 h-3.5" />
                          {att.shoot.location_name}
                        </div>
                      )}
                      {att.upload_links && (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-primary bg-blue-50 px-2 py-1 rounded-md">
                          <LinkIcon className="w-3.5 h-3.5" />
                          Links Added
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-12 text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                  <Camera className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No active shoots</p>
                </div>
              )}
            </div>
          </div>

          {/* Active Editors */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                <FileEdit className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                Editors ({activeEditors.length} active)
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeEditors.length > 0 ? (
                activeEditors.map((log, index) => (
                  <div
                    key={log.log_id || index}
                    className={`p-5 rounded-xl border transition-all hover:shadow-md ${log.activeBreak
                        ? 'bg-orange-50/50 border-orange-200'
                        : 'bg-white border-gray-100'
                      }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-purple-500/20">
                          {log.editor?.name?.charAt(0) || <User className="w-6 h-6" />}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg">
                            {log.editor?.name || log.editor_email}
                          </h3>
                          <p className="text-sm text-gray-600 font-medium line-clamp-1">
                            {log.asset?.title || 'Asset'}
                          </p>
                          {log.client && (
                            <p className="text-xs text-purple-600 font-bold uppercase tracking-wider mt-0.5">
                              {log.client.company_name}
                            </p>
                          )}
                        </div>
                      </div>
                      {log.activeBreak && (
                        <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold animate-pulse flex items-center gap-1.5">
                          <Coffee className="w-3.5 h-3.5" />
                          On Break
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-sm bg-white/50 rounded-lg p-3 border border-gray-100 mb-3">
                      <div className="text-center">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Duration</div>
                        <div className="font-bold text-gray-900">{formatTime(log.totalMinutes)}</div>
                      </div>
                      <div className="text-center border-l border-gray-100">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Break</div>
                        <div className="font-bold text-orange-600">{formatBreakDuration(log.breakMinutes)}</div>
                      </div>
                      <div className="text-center border-l border-gray-100">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Work</div>
                        <div className="font-bold text-green-600">{formatTime(log.workMinutes)}</div>
                      </div>
                    </div>

                    {log.asset && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                          <span className="text-gray-500 uppercase tracking-wider">Progress</span>
                          <span className="text-primary">{log.asset.work_progress || 0}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${log.asset.work_progress || 0}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-12 text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                  <FileEdit className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No active editing sessions</p>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Today's Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="glass-card p-4 bg-blue-50/50 border-blue-100">
              <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Shoots</div>
              <div className="text-3xl font-bold text-gray-900">{completedShoots.length}</div>
            </div>
            <div className="glass-card p-4 bg-purple-50/50 border-purple-100">
              <div className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">Tasks</div>
              <div className="text-3xl font-bold text-gray-900">{completedTasks.length}</div>
            </div>
            <div className="glass-card p-4 bg-green-50/50 border-green-100">
              <div className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1">Total Hours</div>
              <div className="text-3xl font-bold text-gray-900">
                {Object.values(hoursByPerson).reduce((sum, p) => sum + p.hours, 0).toFixed(1)}h
              </div>
            </div>
            <div className="glass-card p-4 bg-orange-50/50 border-orange-100">
              <div className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">Completed</div>
              <div className="text-3xl font-bold text-gray-900">
                {completedShoots.length + completedTasks.length}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Completed Shoots */}
            <div className="glass-card p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Shoots Completed Today
              </h2>
              <div className="space-y-3">
                {completedShoots.length > 0 ? (
                  completedShoots.map((shoot, index) => (
                    <div key={shoot.attendance_id || index} className="p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-gray-900">{shoot.shoot?.shoot_name}</h3>
                          <p className="text-sm text-gray-500 font-medium mt-0.5">
                            {shoot.photographer?.name} • {formatTime(Math.floor((parseFloat(shoot.work_duration || shoot.duration || 0)) * 60))}
                          </p>
                          {shoot.client && (
                            <p className="text-xs text-primary font-bold uppercase tracking-wider mt-1">{shoot.client.company_name}</p>
                          )}
                        </div>
                        <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-lg text-xs font-bold">
                          Done
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-400 bg-gray-50/30 rounded-xl border border-dashed border-gray-200">
                    <p>No shoots completed today</p>
                  </div>
                )}
              </div>
            </div>

            {/* Completed Tasks */}
            <div className="glass-card p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Tasks Completed Today
              </h2>
              <div className="space-y-3">
                {completedTasks.length > 0 ? (
                  completedTasks.map((task, index) => (
                    <div key={task.log_id || index} className="p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-gray-900 line-clamp-1">{task.asset?.title}</h3>
                          <p className="text-sm text-gray-500 font-medium mt-0.5">
                            {task.editor?.name} • {formatTime(Math.floor((parseFloat(task.work_duration || task.duration || 0)) * 60))}
                          </p>
                          {task.client && (
                            <p className="text-xs text-primary font-bold uppercase tracking-wider mt-1">{task.client.company_name}</p>
                          )}
                        </div>
                        <span className="bg-purple-100 text-purple-700 px-2.5 py-1 rounded-lg text-xs font-bold">
                          Review
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-400 bg-gray-50/30 rounded-xl border border-dashed border-gray-200">
                    <p>No tasks completed today</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Team Hours Breakdown */}
          <div className="glass-card p-6 mt-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Team Hours Breakdown
            </h2>
            <div className="space-y-4">
              {Object.entries(hoursByPerson)
                .sort((a, b) => b[1].hours - a[1].hours)
                .map(([email, person]) => (
                  <div key={email} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                        {person.name.charAt(0)}
                      </div>
                      <span className="font-bold text-gray-900">{person.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-32 md:w-48 bg-gray-200 rounded-full h-2.5 overflow-hidden hidden sm:block">
                        <div
                          className="bg-primary h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min((person.hours / 8) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-gray-900 w-16 text-right bg-white px-2 py-1 rounded-md border border-gray-200 shadow-sm">
                        {person.hours.toFixed(1)}h
                      </span>
                    </div>
                  </div>
                ))}
              {Object.keys(hoursByPerson).length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <p>No hours logged today</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
