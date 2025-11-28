import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import BreakDialog from '../components/BreakDialog';
import BreakTimer from '../components/BreakTimer';
import WorkLinksModal from '../components/WorkLinksModal';
import ProgressTracker from '../components/ProgressTracker';
import { FileEdit, Clock, AlertCircle, Coffee, Link as LinkIcon, CheckCircle, Play, Pause, Users, X, ChevronLeft, ChevronRight, Edit } from 'lucide-react';
import { COLLECTIONS, ROLES, ASSET_STATUS } from '../constants';
import UpdateAssetModal from '../components/UpdateAssetModal';

export default function TasksPage() {
  const navigate = useNavigate();
  const { data, loading, startPolling, stopPolling, updateRow, addRow, forceRefresh } = useData();
  const { user } = useAuth();
  const { success, error } = useToast();
  const [activeBreak, setActiveBreak] = useState(null);
  const [showBreakDialog, setShowBreakDialog] = useState(false);
  const [showWorkLinks, setShowWorkLinks] = useState(false);
  const [showProgressTracker, setShowProgressTracker] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [selectedEditorWorkload, setSelectedEditorWorkload] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [assetToEdit, setAssetToEdit] = useState(null);

  useEffect(() => {
    startPolling('tasks-page', [
      COLLECTIONS.ASSETS,
      COLLECTIONS.EDITOR_TIME_LOGS,
      COLLECTIONS.TIME_BREAKS,
      COLLECTIONS.SHOOTS,
      COLLECTIONS.CLIENTS,
      COLLECTIONS.USERS
    ]);
    return () => stopPolling('tasks-page');
  }, [startPolling, stopPolling]);

  const breaks = Array.isArray(data.Time_Breaks) ? data.Time_Breaks : [];
  const users = Array.isArray(data.Users) ? data.Users : [];
  const allTimeLogs = Array.isArray(data.Editor_Time_Logs) ? data.Editor_Time_Logs : [];
  const allAssets = Array.isArray(data.Assets) ? data.Assets : [];

  const assignedAssets = data.Assets?.filter(
    a => a.assigned_editor_email === user?.email
  ) || [];

  // Team workload - actively working editors
  const activeTeamWork = allTimeLogs
    .filter(log => log && !log.end_time && log.start_time)
    .map(log => {
      const editor = users.find(u => u && u.email === log.editor_email);
      const asset = allAssets.find(a => a && a.asset_id === log.asset_id);
      const shoot = asset ? data.Shoots?.find(s => s && s.shoot_id === asset.shoot_id) : null;
      const client = shoot ? data.Clients?.find(c => c && c.client_id === shoot.client_id) : null;
      const activeBreak = breaks.find(b => b && b.time_log_id === log.log_id && !b.break_end);
      
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
    })
    .filter(item => item.editor && item.asset);

  const assetsByStatus = {
    [ASSET_STATUS.TO_EDIT]: assignedAssets.filter(a => a.status === ASSET_STATUS.TO_EDIT || !a.status),
    [ASSET_STATUS.IN_PROGRESS]: assignedAssets.filter(a => a.status === ASSET_STATUS.IN_PROGRESS),
    [ASSET_STATUS.REVIEW]: assignedAssets.filter(a => a.status === ASSET_STATUS.REVIEW),
    [ASSET_STATUS.COMPLETED]: assignedAssets.filter(a => a.status === ASSET_STATUS.COMPLETED || a.status === 'Final'),
  };

  const activeTimeLog = data.Editor_Time_Logs?.find(
    log => log && log.editor_email === user?.email && !log.end_time
  );

  useEffect(() => {
    if (activeTimeLog) {
      const activeBreakRecord = breaks.find(
        b => b && b.time_log_id === activeTimeLog.log_id && !b.break_end
      );
      setActiveBreak(activeBreakRecord);
    } else {
      setActiveBreak(null);
    }
  }, [activeTimeLog, breaks]);

  const handleStartEditing = async (assetId) => {
    const existingLog = data.Editor_Time_Logs?.find(
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
        await updateRow(COLLECTIONS.ASSETS, assetIndex + 2, {
          ...allAssets[assetIndex],
          status: ASSET_STATUS.IN_PROGRESS,
          current_editor_status: 'Working',
        });
      }

      await forceRefresh([COLLECTIONS.ASSETS, COLLECTIONS.EDITOR_TIME_LOGS]);

      success('Editing started!');
    } catch (err) {
      error('Error: ' + err.message);
    }
  };

  const handleTakeBreak = async (breakType) => {
    if (!activeTimeLog) return;

    if (activeBreak) {
      error('You are already on a break!');
      return;
    }

    try {
      const breakData = {
        break_id: `BRK-${Date.now()}`,
        user_email: user.email,
        attendance_id: null,
        time_log_id: activeTimeLog.log_id,
        break_start: new Date().toISOString(),
        break_end: null,
        duration: 0,
        break_type: breakType,
        created_at: new Date().toISOString(),
      };

      await addRow(COLLECTIONS.TIME_BREAKS, breakData);

      const logIndex = data.Editor_Time_Logs?.findIndex(log => log && log.log_id === activeTimeLog.log_id);
      if (logIndex !== -1) {
        await updateRow(COLLECTIONS.EDITOR_TIME_LOGS, logIndex + 2, {
          ...activeTimeLog,
          break_start_time: new Date().toISOString(),
          task_status: 'On Break',
        });
      }

      const allAssets = Array.isArray(data.Assets) ? data.Assets : [];
      const assetIndex = allAssets.findIndex(a => a && a.asset_id === activeTimeLog.asset_id);
      if (assetIndex !== -1) {
        await updateRow(COLLECTIONS.ASSETS, assetIndex + 2, {
          ...allAssets[assetIndex],
          current_editor_status: 'On Break',
        });
      }

      await forceRefresh([COLLECTIONS.ASSETS, COLLECTIONS.EDITOR_TIME_LOGS, COLLECTIONS.TIME_BREAKS]);

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
      const duration = Math.floor((breakEnd - breakStart) / (1000 * 60));

      const breakIndex = breaks.findIndex(b => b && b.break_id === activeBreak.break_id);
      if (breakIndex !== -1) {
        await updateRow(COLLECTIONS.TIME_BREAKS, breakIndex + 2, {
          ...activeBreak,
          break_end: breakEnd.toISOString(),
          duration: duration,
        });
      }

      const logIndex = data.Editor_Time_Logs?.findIndex(log => log && log.log_id === activeTimeLog.log_id);
      if (logIndex !== -1) {
        const currentTotal = (activeTimeLog.total_break_duration || 0) + duration;
        await updateRow(COLLECTIONS.EDITOR_TIME_LOGS, logIndex + 2, {
          ...activeTimeLog,
          break_end_time: breakEnd.toISOString(),
          total_break_duration: currentTotal,
          task_status: 'Working',
        });
      }

      const allAssets = Array.isArray(data.Assets) ? data.Assets : [];
      const assetIndex = allAssets.findIndex(a => a && a.asset_id === activeTimeLog.asset_id);
      if (assetIndex !== -1) {
        await updateRow(COLLECTIONS.ASSETS, assetIndex + 2, {
          ...allAssets[assetIndex],
          current_editor_status: 'Working',
        });
      }

      await forceRefresh([COLLECTIONS.ASSETS, COLLECTIONS.EDITOR_TIME_LOGS, COLLECTIONS.TIME_BREAKS]);

      setActiveBreak(null);
      success('Break ended');
    } catch (err) {
      error('Error ending break: ' + err.message);
    }
  };

  const handleSaveWorkLinks = async (links) => {
    if (!activeTimeLog) return;

    try {
      const logIndex = data.Editor_Time_Logs?.findIndex(log => log && log.log_id === activeTimeLog.log_id);
      if (logIndex !== -1) {
        await updateRow(COLLECTIONS.EDITOR_TIME_LOGS, logIndex + 2, {
          ...activeTimeLog,
          work_links: links,
        });

        const allAssets = Array.isArray(data.Assets) ? data.Assets : [];
        const assetIndex = allAssets.findIndex(a => a && a.asset_id === activeTimeLog.asset_id);
        if (assetIndex !== -1) {
          const primaryLink = links.split(',')[0]?.trim() || '';
          await updateRow(COLLECTIONS.ASSETS, assetIndex + 2, {
            ...allAssets[assetIndex],
            upload_folder_link: primaryLink,
          });
        }

        await forceRefresh([COLLECTIONS.ASSETS, COLLECTIONS.EDITOR_TIME_LOGS]);

        success('Work links saved!');
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
          work_progress: progress,
        });

        await forceRefresh([COLLECTIONS.ASSETS]);

        success('Progress updated!');
      }
    } catch (err) {
      error('Error updating progress: ' + err.message);
    }
  };

  const handleFinishEditing = async (assetId) => {
    if (!activeTimeLog) return;

    if (activeBreak) {
      await handleEndBreak();
    }

    try {
      const logIndex = data.Editor_Time_Logs?.findIndex(log => log && log.log_id === activeTimeLog.log_id);
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
          end_time: endTime.toISOString(),
          duration: totalDuration.toFixed(2),
          work_duration: workDuration.toFixed(2),
          task_status: 'Completed',
        });
      }

      const allAssets = Array.isArray(data.Assets) ? data.Assets : [];
      const assetIndex = allAssets.findIndex(a => a && a.asset_id === assetId);
      if (assetIndex !== -1) {
        const asset = allAssets[assetIndex];
        await updateRow(COLLECTIONS.ASSETS, assetIndex + 2, {
          ...asset,
          status: ASSET_STATUS.REVIEW,
          current_editor_status: 'Review',
          work_progress: 100,
        });
      }

      await forceRefresh([COLLECTIONS.ASSETS, COLLECTIONS.EDITOR_TIME_LOGS]);

      success('Sent to review!');
    } catch (err) {
      error('Error: ' + err.message);
    }
  };

  if (loading.all) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

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

      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border-l-4 border-primary">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">My Tasks</h1>
            <p className="text-gray-600">Manage your assigned assets</p>
          </div>
          <button
            onClick={() => navigate('/dashboard/editor-task-history')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
          >
            <FileEdit className="w-4 h-4" />
            View Completed Tasks
          </button>
        </div>
      </div>

      {/* Team Workload Section */}
      {activeTeamWork.length > 0 && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Team Workload</h2>
                <p className="text-sm text-gray-600">{activeTeamWork.length} actively working</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeTeamWork.map((work, index) => {
              const editorAssets = allAssets.filter(
                a => a && (a.assigned_editor_email === work.editor_email || a.assigned_creator_email === work.editor_email)
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

              return (
                <div
                  key={work.log_id || index}
                  onClick={() => setSelectedEditorWorkload({ ...work, previousTasks, upcomingTasks })}
                  className="p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                      {work.editor?.name?.charAt(0) || 'E'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 truncate">{work.editor?.name || work.editor_email}</h3>
                      <p className="text-xs text-gray-500 truncate">{work.asset?.title || 'Working...'}</p>
                    </div>
                    {work.activeBreak && (
                      <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-bold">
                        Break
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{Math.floor(work.workMinutes / 60)}h {work.workMinutes % 60}m</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Timer Card */}
      {activeTimeLog && (
        <div className={`glass-card p-6 relative overflow-hidden ${activeBreak ? 'border-orange-200' : 'border-primary/20'
          }`}>
          {/* Background Gradient */}
          <div className={`absolute inset-0 opacity-10 pointer-events-none ${activeBreak
              ? 'bg-gradient-to-br from-orange-500 to-yellow-500'
              : 'bg-gradient-to-br from-primary to-blue-600'
            }`} />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${activeBreak ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-primary'}`}>
                  <FileEdit className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {activeBreak ? 'On Break' : 'Active Editing'}
                  </h2>
                  <p className="text-sm text-gray-500">
                    Started at {new Date(activeTimeLog.start_time).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              {activeBreak && (
                <span className="bg-orange-100 text-orange-700 px-4 py-1.5 rounded-full text-sm font-bold animate-pulse flex items-center gap-2">
                  <Coffee className="w-4 h-4" />
                  {activeBreak.break_type}
                </span>
              )}
            </div>

            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {activeAsset?.title || 'Asset'}
              </h3>
            </div>

            {activeAsset && (
              <div className="mb-6 bg-white/80 p-4 rounded-xl border border-gray-100">
                <ProgressTracker
                  currentProgress={activeAsset.work_progress || 0}
                  onUpdate={handleUpdateProgress}
                  assetTitle=""
                  readOnly={false}
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {!activeBreak ? (
                <button
                  onClick={() => setShowBreakDialog(true)}
                  className="glass-button bg-white text-gray-700 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 flex items-center justify-center gap-2 py-3"
                >
                  <Coffee className="w-5 h-5" />
                  Take Break
                </button>
              ) : (
                <button
                  onClick={handleEndBreak}
                  className="glass-button bg-orange-500 text-white hover:bg-orange-600 border-none flex items-center justify-center gap-2 py-3"
                >
                  <Play className="w-5 h-5" />
                  End Break
                </button>
              )}
              <button
                onClick={() => setShowWorkLinks(true)}
                className="glass-button bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 flex items-center justify-center gap-2 py-3"
              >
                <LinkIcon className="w-5 h-5" />
                Work Links
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex md:grid md:grid-cols-3 gap-6 min-w-max md:min-w-0">
          <KanbanColumn
            title="To Edit"
            assets={assetsByStatus[ASSET_STATUS.TO_EDIT]}
            color="bg-yellow-50/50 border-yellow-100"
            headerColor="bg-yellow-100 text-yellow-800"
            onStartEditing={handleStartEditing}
            onFinishEditing={handleFinishEditing}
            activeTimeLog={activeTimeLog}
            data={data}
            onEdit={(asset) => {
              setAssetToEdit(asset);
              setShowEditModal(true);
            }}
          />
          <KanbanColumn
            title="In Progress"
            assets={assetsByStatus[ASSET_STATUS.IN_PROGRESS]}
            color="bg-blue-50/50 border-blue-100"
            headerColor="bg-blue-100 text-blue-800"
            onStartEditing={handleStartEditing}
            onFinishEditing={handleFinishEditing}
            activeTimeLog={activeTimeLog}
            data={data}
            onEdit={(asset) => {
              setAssetToEdit(asset);
              setShowEditModal(true);
            }}
          />
          <KanbanColumn
            title="In Review"
            assets={assetsByStatus[ASSET_STATUS.REVIEW]}
            color="bg-purple-50/50 border-purple-100"
            headerColor="bg-purple-100 text-purple-800"
            onStartEditing={handleStartEditing}
            onFinishEditing={handleFinishEditing}
            activeTimeLog={activeTimeLog}
            data={data}
            onEdit={(asset) => {
              setAssetToEdit(asset);
              setShowEditModal(true);
            }}
          />
        </div>
      </div>

      {/* Editor Workload Detail Modal */}
      {selectedEditorWorkload && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="fixed inset-0 transition-opacity z-[100]" style={{ background: 'rgba(0, 0, 0, 0.25)', backdropFilter: 'blur(6px)', borderRadius: '16px' }} onClick={() => setSelectedEditorWorkload(null)} />
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto relative z-[101] animate-fadeIn bg-white rounded-3xl border border-gray-100 p-6" style={{ borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>
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
                      const shoot = task?.shoot_id ? data.Shoots?.find(s => s && s.shoot_id === task.shoot_id) : null;
                      const client = shoot ? data.Clients?.find(c => c && c.client_id === shoot.client_id) : null;
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
                      const shoot = task?.shoot_id ? data.Shoots?.find(s => s && s.shoot_id === task.shoot_id) : null;
                      const client = shoot ? data.Clients?.find(c => c && c.client_id === shoot.client_id) : null;
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

      {/* Edit Asset Modal */}
      {showEditModal && assetToEdit && (
        <UpdateAssetModal
          asset={assetToEdit}
          users={users}
          shoots={data.Shoots || []}
          clients={data.Clients || []}
          onClose={() => {
            setShowEditModal(false);
            setAssetToEdit(null);
          }}
          onUpdate={async () => {
            await forceRefresh([COLLECTIONS.ASSETS]);
            setShowEditModal(false);
            setAssetToEdit(null);
            success('Task updated successfully!');
          }}
        />
      )}
    </div>
  );
}

function KanbanColumn({ title, assets, color, headerColor, onStartEditing, onFinishEditing, activeTimeLog, data, onEdit }) {
  return (
    <div className={`glass-card ${color} p-4 min-w-[300px] md:min-w-0 flex flex-col h-full`}>
      <div className={`${headerColor} rounded-xl px-4 py-3 mb-4 flex items-center justify-between shadow-sm`}>
        <h3 className="font-bold text-sm md:text-base">{title}</h3>
        <span className="bg-white/80 px-2.5 py-0.5 rounded-full text-xs font-bold shadow-sm">
          {assets.length}
        </span>
      </div>
      <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] custom-scrollbar pr-1">
        {assets.length > 0 ? (
          assets.map((asset, index) => {
            const shoot = data.Shoots?.find(s => s.shoot_id === asset.shoot_id);
            const client = shoot ? data.Clients?.find(c => c.client_id === shoot.client_id) : null;
            const isActive = activeTimeLog?.asset_id === asset.asset_id;
            return (
              <AssetCard
                key={asset.asset_id || index}
                asset={asset}
                client={client}
                isActive={isActive}
                onStartEditing={onStartEditing}
                onFinishEditing={onFinishEditing}
                onEdit={(asset) => {
                  setAssetToEdit(asset);
                  setShowEditModal(true);
                }}
                index={index}
              />
            );
          })
        ) : (
          <div className="text-center py-12 text-gray-400 bg-white/30 rounded-xl border border-dashed border-gray-200">
            <p className="text-sm">No tasks</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AssetCard({ asset, client, isActive, onStartEditing, onFinishEditing, onEdit, index }) {
  const isOverdue = asset.deadline && new Date(asset.deadline) < new Date() && asset.status !== ASSET_STATUS.COMPLETED;

  return (
    <div
      className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all animate-fadeIn group relative overflow-hidden"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {isActive && (
        <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
      )}

      <div className="mb-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h4 className="font-bold text-gray-900 line-clamp-2 leading-tight flex-1">
          {asset.title || 'Untitled Asset'}
        </h4>
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(asset);
              }}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              title="Edit task"
            >
              <Edit className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>
        {client && (
          <p className="text-xs font-bold text-primary uppercase tracking-wider">
            {client.company_name}
          </p>
        )}
      </div>

      {asset.deadline && (
        <div className={`flex items-center gap-1.5 text-xs font-medium mb-3 ${isOverdue ? 'text-red-600 bg-red-50 px-2 py-1 rounded-lg inline-flex' : 'text-gray-500'
          }`}>
          {isOverdue ? <AlertCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
          <span>Due: {new Date(asset.deadline).toLocaleDateString()}</span>
        </div>
      )}

      <div className="flex gap-2">
      {asset.status === ASSET_STATUS.TO_EDIT && onStartEditing && (
        <button
          onClick={() => onStartEditing(asset.asset_id)}
            className="flex-1 bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-primary-dark transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          <Play className="w-3.5 h-3.5" />
            Start
        </button>
      )}

      {isActive && onFinishEditing && (
        <button
          onClick={() => onFinishEditing(asset.asset_id)}
            className="flex-1 bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          <CheckCircle className="w-3.5 h-3.5" />
            Finish
        </button>
      )}
      </div>
    </div>
  );
}
