import { useEffect, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { FileEdit, Clock, Coffee, User, MapPin, Link as LinkIcon, TrendingUp, CheckCircle, Activity, Eye, Edit, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatBreakDuration, formatTime as formatTimeUtil } from '../utils/timeFormatting';
import { COLLECTIONS, ASSET_STATUS } from '../constants';
import { useNavigate } from 'react-router-dom';
import UpdateAssetModal from '../components/UpdateAssetModal';
import AssetWorkDetailsModal from '../components/AssetWorkDetailsModal';

export default function ActiveEditingPage() {
  const { data, loading, startPolling, stopPolling } = useData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showWorkDetails, setShowWorkDetails] = useState(false);
  const [selectedAssetForDetails, setSelectedAssetForDetails] = useState(null);
  const [selectedEditorWorkload, setSelectedEditorWorkload] = useState(null);

  useEffect(() => {
    startPolling('active-editing-page', [
      COLLECTIONS.EDITOR_TIME_LOGS,
      COLLECTIONS.TIME_BREAKS,
      COLLECTIONS.USERS,
      COLLECTIONS.SHOOTS,
      COLLECTIONS.ASSETS,
      COLLECTIONS.CLIENTS,
      COLLECTIONS.ATTENDANCE
    ]);
    return () => stopPolling('active-editing-page');
  }, [startPolling, stopPolling]);

  const timeLogs = Array.isArray(data.Editor_Time_Logs) ? data.Editor_Time_Logs : [];
  const breaks = Array.isArray(data.Time_Breaks) ? data.Time_Breaks : [];
  const users = Array.isArray(data.Users) ? data.Users : [];
  const shoots = Array.isArray(data.Shoots) ? data.Shoots : [];
  const assets = Array.isArray(data.Assets) ? data.Assets : [];
  const clients = Array.isArray(data.Clients) ? data.Clients : [];
  const attendance = Array.isArray(data.Attendance) ? data.Attendance : [];

  // Active editors (time logs in progress) - only show if clocked in
  const today = new Date().toISOString().split('T')[0];
  const activeEditors = timeLogs
    .filter(log => {
      if (!log || log.end_time) return false;
      // Check if editor is clocked in today
      const isClockedIn = attendance.some(
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

      let totalMinutes = 0;
      let workMinutes = 0;
      try {
        const startTime = new Date(log.start_time);
        const now = new Date();
        if (!isNaN(startTime.getTime())) {
          totalMinutes = Math.floor((now - startTime) / (1000 * 60));
          const breakMinutes = log.total_break_duration || 0;
          workMinutes = Math.max(0, totalMinutes - breakMinutes);
        }
      } catch (e) {
        console.error('Error calculating time for log:', log.log_id, e);
      }

      // Get all assets assigned to this editor
      const editorAssets = assets.filter(
        a => a && (a.assigned_editor_email === log.editor_email || a.assigned_creator_email === log.editor_email)
      );
      const previousTasks = editorAssets
        .filter(a => {
          if (!a || !a.deadline) return false;
          try {
            const deadline = new Date(a.deadline);
            if (isNaN(deadline.getTime())) return false;
            const now = new Date();
            return deadline < now && (a.status === ASSET_STATUS.COMPLETED || a.status === 'Final' || a.status === 'Published');
          } catch {
            return false;
          }
        })
        .sort((a, b) => {
          try {
            const dateA = new Date(a.deadline);
            const dateB = new Date(b.deadline);
            return (dateB.getTime() || 0) - (dateA.getTime() || 0);
          } catch {
            return 0;
          }
        })
        .slice(0, 6);
      const upcomingTasks = editorAssets
        .filter(a => {
          if (!a || !a.deadline) return false;
          try {
            const deadline = new Date(a.deadline);
            if (isNaN(deadline.getTime())) return false;
            const now = new Date();
            return deadline >= now && a.status !== ASSET_STATUS.COMPLETED && a.status !== 'Final' && a.status !== 'Published';
          } catch {
            return false;
          }
        })
        .sort((a, b) => {
          try {
            const dateA = new Date(a.deadline);
            const dateB = new Date(b.deadline);
            return (dateA.getTime() || 0) - (dateB.getTime() || 0);
          } catch {
            return 0;
          }
        })
        .slice(0, 6);

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
        previousTasks,
        upcomingTasks,
      };
    })
    .filter(item => item.editor && item.asset);

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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Active Editing Sessions</h1>
          <p className="text-gray-600">View all team members currently working on tasks</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="glass-panel p-3 bg-purple-50 border-purple-100">
            <div className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">Active</div>
            <div className="text-2xl font-bold text-gray-900">{activeEditors.length}</div>
          </div>
        </div>
      </div>

      {/* Active Editors Grid */}
      {activeEditors.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeEditors.map((log, index) => (
            <div
              key={log.log_id || index}
              className={`glass-card p-6 transition-all hover:shadow-lg ${log.activeBreak
                  ? 'border-orange-200 bg-orange-50/30'
                  : 'border-gray-100'
                }`}
            >
              {/* Editor Header */}
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

              {/* Time Stats */}
              <div className="grid grid-cols-3 gap-2 text-sm bg-white/50 rounded-lg p-3 border border-gray-100 mb-4">
                <div className="text-center">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Duration</div>
                  <div className="font-bold text-gray-900">{formatTimeUtil(log.totalMinutes)}</div>
                </div>
                <div className="text-center border-l border-gray-100">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Break</div>
                  <div className="font-bold text-orange-600">{formatBreakDuration(log.breakMinutes)}</div>
                </div>
                <div className="text-center border-l border-gray-100">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Work</div>
                  <div className="font-bold text-green-600">{formatTimeUtil(log.workMinutes)}</div>
                </div>
              </div>

              {/* Progress */}
              {log.asset && (
                <div className="mb-4">
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

              {/* Current Subtask */}
              {log.current_subtask && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Current Subtask</p>
                  <p className="text-sm font-medium text-gray-900">{log.current_subtask}</p>
                </div>
              )}

              {/* Task Status */}
              {log.task_status && (
                <div className="mb-4">
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                    log.task_status === 'Paused' ? 'bg-yellow-100 text-yellow-700' :
                    log.task_status === 'On Break' ? 'bg-orange-100 text-orange-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {log.task_status}
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => {
                    setSelectedEditorWorkload({ ...log });
                  }}
                  className="flex-1 px-3 py-2 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary/20 transition-colors flex items-center justify-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View Tasks
                </button>
                <button
                  onClick={() => {
                    setSelectedAssetForDetails(log.asset);
                    setShowWorkDetails(true);
                  }}
                  className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Details
                </button>
                <button
                  onClick={() => {
                    setSelectedAsset(log.asset);
                    setShowAssetModal(true);
                  }}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors flex items-center gap-1"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card p-12 text-center">
          <FileEdit className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Active Editing Sessions</h3>
          <p className="text-gray-600">Team members will appear here when they start working on tasks</p>
        </div>
      )}

      {/* Editor Workload Detail Modal */}
      {selectedEditorWorkload && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity z-[100]" onClick={() => setSelectedEditorWorkload(null)} />
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto relative z-[101] animate-fadeIn bg-white rounded-3xl shadow-2xl border border-gray-100 p-6">
            <div className="sticky top-0 bg-white border-b border-gray-100 pb-4 mb-6 -mx-6 px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center font-bold text-lg">
                    {selectedEditorWorkload.editor?.name?.charAt(0) || 'E'}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{selectedEditorWorkload.editor?.name || selectedEditorWorkload.editor_email}</h3>
                    <p className="text-sm text-gray-600">Currently working on: {selectedEditorWorkload.asset?.title || 'Unknown'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedEditorWorkload(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Previous Tasks */}
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <ChevronLeft className="w-5 h-5 text-gray-400" />
                  Previous Tasks (Last 6)
                </h4>
                <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                  {selectedEditorWorkload.previousTasks && selectedEditorWorkload.previousTasks.length > 0 ? (
                    selectedEditorWorkload.previousTasks.map((task, index) => {
                      const shoot = task?.shoot_id ? shoots.find(s => s && s.shoot_id === task.shoot_id) : null;
                      const client = shoot ? clients.find(c => c && c.client_id === shoot.client_id) : null;
                      let deadlineStr = '';
                      try {
                        if (task?.deadline) {
                          const deadline = new Date(task.deadline);
                          if (!isNaN(deadline.getTime())) {
                            deadlineStr = deadline.toLocaleDateString();
                          }
                        }
                      } catch (e) {
                        console.error('Error parsing deadline:', e);
                      }
                      return (
                        <div key={task?.asset_id || index} className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                          <h5 className="font-bold text-gray-900 mb-1">{task?.title || 'Untitled'}</h5>
                          {client && (
                            <p className="text-xs text-primary font-bold uppercase tracking-wider mb-2">{client.company_name}</p>
                          )}
                          {deadlineStr && (
                            <p className="text-xs text-gray-500">
                              Completed: {deadlineStr}
                            </p>
                          )}
                          <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">
                            {task?.status || 'Completed'}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <p className="text-sm">No previous tasks</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Upcoming Tasks */}
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                  Upcoming Tasks (Next 6)
                </h4>
                <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                  {selectedEditorWorkload.upcomingTasks && selectedEditorWorkload.upcomingTasks.length > 0 ? (
                    selectedEditorWorkload.upcomingTasks.map((task, index) => {
                      const shoot = task?.shoot_id ? shoots.find(s => s && s.shoot_id === task.shoot_id) : null;
                      const client = shoot ? clients.find(c => c && c.client_id === shoot.client_id) : null;
                      let isOverdue = false;
                      let deadlineStr = '';
                      try {
                        if (task?.deadline) {
                          const deadline = new Date(task.deadline);
                          if (!isNaN(deadline.getTime())) {
                            deadlineStr = deadline.toLocaleDateString();
                            isOverdue = deadline < new Date();
                          }
                        }
                      } catch (e) {
                        console.error('Error parsing deadline:', e);
                      }
                      return (
                        <div key={task?.asset_id || index} className={`p-4 border rounded-xl ${isOverdue ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
                          <h5 className="font-bold text-gray-900 mb-1">{task?.title || 'Untitled'}</h5>
                          {client && (
                            <p className="text-xs text-primary font-bold uppercase tracking-wider mb-2">{client.company_name}</p>
                          )}
                          {deadlineStr && (
                            <p className={`text-xs font-medium mb-2 ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
                              <Clock className="w-3 h-3 inline mr-1" />
                              Due: {deadlineStr}
                              {isOverdue && ' (Overdue)'}
                            </p>
                          )}
                          <span className={`inline-block mt-2 px-2 py-1 rounded text-xs font-bold ${task?.status === ASSET_STATUS.TO_EDIT ? 'bg-yellow-100 text-yellow-700' : task?.status === ASSET_STATUS.IN_PROGRESS ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                            {task?.status || 'Pending'}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <p className="text-sm">No upcoming tasks</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
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
          onUpdate={() => {
            setShowAssetModal(false);
            setSelectedAsset(null);
          }}
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
    </div>
  );
}

