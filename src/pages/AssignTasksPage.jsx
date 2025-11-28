import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { User, Calendar, FileText, CheckCircle, Clock, TrendingUp, Camera, MapPin, Link as LinkIcon, X, Plus } from 'lucide-react';
import { COLLECTIONS, ROLES, SHOOT_STATUS, ASSET_STATUS } from '../constants';

export default function AssignTasksPage() {
  const navigate = useNavigate();
  const { data, loading, startPolling, stopPolling, updateRow, addRow, forceRefresh } = useData();
  const { user } = useAuth();
  const { success, error } = useToast();
  const [searchParams] = useSearchParams();
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [selectedEditor, setSelectedEditor] = useState('');
  const [deadline, setDeadline] = useState('');
  const [fileLink, setFileLink] = useState('');
  const [showAssignToEditor, setShowAssignToEditor] = useState(false);
  const [editorToAssign, setEditorToAssign] = useState(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
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
  const [expandedEditors, setExpandedEditors] = useState(new Set());

  useEffect(() => {
    startPolling('assign-tasks-page', [
      COLLECTIONS.ASSETS,
      COLLECTIONS.USERS,
      COLLECTIONS.SHOOTS,
      COLLECTIONS.CLIENTS,
      COLLECTIONS.EDITOR_TIME_LOGS,
      COLLECTIONS.TIME_BREAKS,
      COLLECTIONS.CONTENT_CALENDAR
    ]);
    return () => stopPolling('assign-tasks-page');
  }, [startPolling, stopPolling]);

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'task') {
      setShowCreateTask(true);
    }
  }, [searchParams]);

  const assets = Array.isArray(data.Assets) ? data.Assets : [];
  const users = Array.isArray(data.Users) ? data.Users : [];
  const shoots = Array.isArray(data.Shoots) ? data.Shoots : [];
  const clients = Array.isArray(data.Clients) ? data.Clients : [];
  const timeLogs = Array.isArray(data.Editor_Time_Logs) ? data.Editor_Time_Logs : [];
  
  // Safety check: ensure arrays are always arrays
  if (!Array.isArray(users)) console.warn('Users is not an array:', users);
  if (!Array.isArray(clients)) console.warn('Clients is not an array:', clients);

  const unassignedAssets = assets.filter(
    a => {
      if (!a || !a.asset_id) return false;
      const hasNoEditor = !a.assigned_editor_email || a.assigned_editor_email === '';
      const hasNoCreator = !a.assigned_creator_email || a.assigned_creator_email === '';
      const hasNoPhotographer = !a.assigned_photographer_email || a.assigned_photographer_email === '';
      const hasNoAssignment = hasNoEditor && hasNoCreator && hasNoPhotographer;
      const isNotCompleted = a.status !== ASSET_STATUS.COMPLETED && a.status !== 'Final';
      return hasNoAssignment && isNotCompleted;
    }
  );

  const availableEditors = (Array.isArray(users) ? users : []).filter(
    u => {
      if (!u || u.active === 'FALSE') return false;
      if (user?.role === ROLES.MANAGER) {
        return u.role === ROLES.EDITOR || u.role === ROLES.LEAD || u.role === ROLES.CONTENT_CREATOR;
      }
      if (user?.role === ROLES.LEAD || user?.role === ROLES.CONTENT_CREATOR) {
        return u.role === ROLES.EDITOR || u.role === ROLES.LEAD || u.role === ROLES.CONTENT_CREATOR;
      }
      return u.role === ROLES.EDITOR;
    }
  );

  const availablePhotographers = (Array.isArray(users) ? users : []).filter(
    u => {
      if (!u || u.active === 'FALSE') return false;
      return u.role === ROLES.PHOTOGRAPHER || u.role === ROLES.LEAD;
    }
  );

  const allAvailableUsers = (Array.isArray(users) ? users : []).filter(
    u => {
      if (!u || !u.email) return false;
      if (u.active === 'FALSE' || u.active === false) return false;
      if (u.role === ROLES.MANAGER) return false;
      if (u.role === ROLES.PHOTOGRAPHER) return false;
      return u.role === ROLES.EDITOR || u.role === ROLES.CONTENT_CREATOR || u.role === ROLES.LEAD;
    }
  );

  const getEditorWorkload = (userEmail) => {
    const activeTasks = assets.filter(
      a => a && (
        a.assigned_editor_email === userEmail ||
        a.assigned_creator_email === userEmail ||
        a.assigned_photographer_email === userEmail
      ) && a.status !== ASSET_STATUS.COMPLETED && a.status !== 'Final'
    ).length;

    const activeTimeLogs = timeLogs.filter(
      log => log && log.editor_email === userEmail && !log.end_time
    ).length;

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weekHours = timeLogs
      .filter(log => {
        if (!log || log.editor_email !== userEmail || !log.end_time) return false;
        try {
          const date = new Date(log.start_time);
          return date >= weekStart;
        } catch {
          return false;
        }
      })
      .reduce((sum, log) => sum + (parseFloat(log.work_duration || log.duration || 0)), 0);

    return {
      activeTasks,
      activeTimeLogs,
      weekHours: weekHours.toFixed(1),
      status: activeTimeLogs > 0 ? 'Working' : activeTasks > 3 ? 'Busy' : 'Available',
    };
  };

  const handleAssignTask = async () => {
    if (!selectedAsset || !selectedEditor) {
      error('Please select an asset and editor');
      return;
    }

    try {
      const assetIndex = assets.findIndex(a => a && a.asset_id === selectedAsset.asset_id);
      if (assetIndex !== -1) {
        await updateRow(COLLECTIONS.ASSETS, assetIndex + 2, {
          ...selectedAsset,
          assigned_editor_email: selectedEditor,
          status: ASSET_STATUS.TO_EDIT,
          deadline: deadline || selectedAsset.deadline,
          upload_folder_link: fileLink || selectedAsset.upload_folder_link,
        });

        success(`Task assigned to ${users.find(u => u && u.email === selectedEditor)?.name || selectedEditor}`);
        setSelectedAsset(null);
        setSelectedEditor('');
        setDeadline('');
        setFileLink('');

        await forceRefresh([COLLECTIONS.ASSETS, COLLECTIONS.CONTENT_CALENDAR]);
      }
    } catch (err) {
      error('Error assigning task: ' + err.message);
    }
  };

  const handleAssignTaskToEditor = async () => {
    if (!selectedAsset || !editorToAssign) {
      error('Please select an asset');
      return;
    }

    try {
      const assetIndex = assets.findIndex(a => a && a.asset_id === selectedAsset.asset_id);
      if (assetIndex !== -1) {
        await updateRow(COLLECTIONS.ASSETS, assetIndex + 2, {
          ...selectedAsset,
          assigned_editor_email: editorToAssign.email,
          status: ASSET_STATUS.TO_EDIT,
          deadline: deadline || selectedAsset.deadline,
          upload_folder_link: fileLink || selectedAsset.upload_folder_link,
        });

        success(`Task assigned to ${editorToAssign.name || editorToAssign.email}`);
        setSelectedAsset(null);
        setEditorToAssign(null);
        setShowAssignToEditor(false);
        setDeadline('');
        setFileLink('');

        forceRefresh([COLLECTIONS.ASSETS, COLLECTIONS.CONTENT_CALENDAR]).catch(console.error);
      }
    } catch (err) {
      error('Error assigning task: ' + err.message);
    }
  };


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
      setShowCreateTask(false);
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

  return (
    <div className="animate-fadeIn mobile-padding pb-8 space-y-8">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border-l-4 border-primary flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Task Assignment</h1>
          <p className="text-gray-600">Assign shoots to photographers and create/assign tasks to editors</p>
        </div>
        {(user?.role === ROLES.MANAGER || user?.role === ROLES.LEAD || user?.role === ROLES.CONTENT_CREATOR) && (
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowCreateTask(true)}
              className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors flex items-center gap-2 shadow-lg shadow-green-600/30"
          >
            <Plus className="w-4 h-4" />
            Create Task
          </button>
        </div>
        )}
      </div>

      {/* Unassigned Assets */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-500" />
            Unassigned Assets ({unassignedAssets.length})
          </h2>
          {unassignedAssets.length === 0 && (
            <span className="text-sm text-green-600 font-medium flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              All assets assigned
            </span>
          )}
        </div>
        <div className="space-y-4">
          {unassignedAssets.length > 0 ? (
            unassignedAssets.map((asset, index) => {
              const shoot = shoots.find(s => s && s.shoot_id === asset.shoot_id);
              const client = shoot ? clients.find(c => c && c.client_id === shoot.client_id) : null;

              return (
                <div
                  key={asset.asset_id || index}
                  className="p-4 rounded-xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 mb-1">{asset.title || 'Untitled Asset'}</h3>
                      {client && (
                        <p className="text-sm text-primary font-medium mb-1">{client.company_name}</p>
                      )}
                      {shoot && (
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Camera className="w-3 h-3" />
                          {shoot.shoot_name} • {new Date(shoot.date).toLocaleDateString()}
                        </p>
                      )}
                      {asset.upload_folder_link && (
                        <a
                          href={asset.upload_folder_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline mt-2 inline-flex items-center gap-1"
                        >
                          <LinkIcon className="w-3 h-3" />
                          View Files
                        </a>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedAsset(asset)}
                      className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 hover:border-primary hover:text-primary transition-all whitespace-nowrap"
                    >
                      Assign Editor
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-gray-500 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No unassigned assets found</p>
              <p className="text-sm text-gray-400 mt-1">
                New assets will appear here when uploaded
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Editor Workload Overview */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Team Workload & Progress
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {availableEditors.map((editor, index) => {
            const workload = getEditorWorkload(editor.email);
            const editorAssets = assets.filter(
              a => a && a.assigned_editor_email === editor.email && 
              a.status !== ASSET_STATUS.COMPLETED && 
              a.status !== ASSET_STATUS.FINAL && 
              a.status !== 'Published' && 
              a.status !== ASSET_STATUS.CANCELLED
            );

            return (
              <div
                key={editor.email || index}
                className="p-4 rounded-xl border border-gray-100 bg-white/50 hover:bg-white hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-dark text-white flex items-center justify-center font-bold shadow-lg shadow-primary/20">
                      {editor.name?.charAt(0) || <User className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">{editor.name || editor.email}</h3>
                      <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${workload.status === 'Available' ? 'bg-green-100 text-green-700' :
                          workload.status === 'Working' ? 'bg-blue-100 text-blue-700' :
                            'bg-yellow-100 text-yellow-700'
                        }`}>
                        {workload.status}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">{workload.weekHours}h</div>
                    <div className="text-xs text-gray-500">This week</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4 text-sm bg-gray-50 p-2 rounded-lg">
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Active Tasks</div>
                    <div className="font-bold text-gray-900">{workload.activeTasks}</div>
                  </div>
                  <div className="text-center border-l border-gray-200">
                    <div className="text-xs text-gray-500 mb-1">Working Now</div>
                    <div className="font-bold text-blue-600">{workload.activeTimeLogs}</div>
                  </div>
                </div>

                {/* Active Tasks List */}
                {editorAssets.length > 0 && (
                  <div className="space-y-2">
                    {(expandedEditors.has(editor.email) ? editorAssets : editorAssets.slice(0, 3)).map((asset, assetIndex) => {
                      const shoot = shoots.find(s => s && s.shoot_id === asset.shoot_id);
                      const client = shoot ? clients.find(c => c && c.client_id === shoot.client_id) : null;

                      return (
                        <div key={asset.asset_id || assetIndex} className="p-2 bg-white border border-gray-100 rounded-lg text-xs shadow-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-gray-900 truncate max-w-[70%]">{asset.title}</span>
                            {asset.work_progress !== undefined && (
                              <span className="text-gray-500 font-mono">{asset.work_progress}%</span>
                            )}
                          </div>
                          {client && (
                            <p className="text-primary text-[10px] mb-1">{client.company_name}</p>
                          )}
                          {asset.work_progress !== undefined && (
                            <div className="w-full bg-gray-100 rounded-full h-1">
                              <div
                                className="bg-primary h-1 rounded-full transition-all"
                                style={{ width: `${asset.work_progress}%` }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {editorAssets.length > 3 && (
                      <button
                        onClick={() => {
                          const newExpanded = new Set(expandedEditors);
                          if (newExpanded.has(editor.email)) {
                            newExpanded.delete(editor.email);
                          } else {
                            newExpanded.add(editor.email);
                          }
                          setExpandedEditors(newExpanded);
                        }}
                        className="w-full text-xs text-primary text-center font-bold hover:text-primary-dark transition-colors py-2 px-3 bg-primary/5 hover:bg-primary/10 rounded-lg border border-primary/20"
                      >
                        {expandedEditors.has(editor.email) ? (
                          <>Show Less (Showing {editorAssets.length})</>
                        ) : (
                          <>+{editorAssets.length - 3} more tasks</>
                        )}
                      </button>
                    )}
                    <div className="flex flex-col gap-2 mt-2">
                      {(user?.role === ROLES.MANAGER || user?.role === ROLES.LEAD || user?.role === ROLES.CONTENT_CREATOR) && unassignedAssets.length > 0 && (
                        <button
                          onClick={() => {
                            setEditorToAssign(editor);
                            setShowAssignToEditor(true);
                          }}
                          className="w-full text-xs text-green-600 text-center font-bold hover:text-green-700 transition-colors py-2 px-3 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200"
                        >
                          Assign Task
                        </button>
                      )}
                      {editorAssets.length > 0 && (
                        <button
                          onClick={() => navigate('/dashboard/editor-task-history')}
                          className="w-full text-xs text-blue-600 text-center font-bold hover:text-blue-700 transition-colors py-2 px-3 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200"
                        >
                          View Completed Tasks
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Assignment Modal */}
      {selectedAsset && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 transition-opacity z-[100]"
            style={{ background: 'rgba(0, 0, 0, 0.25)', backdropFilter: 'blur(6px)', borderRadius: '16px' }}
            onClick={() => setSelectedAsset(null)}
          />
          <div className="bg-white rounded-2xl max-w-md w-full p-6 relative z-[101] animate-fadeIn" style={{ borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>
            <div className="flex items-start justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Assign Task</h3>
              <button
                onClick={() => setSelectedAsset(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Selected Asset</p>
              <p className="font-bold text-gray-900">{selectedAsset.title}</p>
              {(() => {
                const shoot = shoots.find(s => s && s.shoot_id === selectedAsset.shoot_id);
                const client = shoot ? clients.find(c => c && c.client_id === shoot.client_id) : null;
                return client && (
                  <p className="text-sm text-primary mt-1">{client.company_name}</p>
                );
              })()}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assign To *</label>
                <select
                  value={selectedEditor}
                  onChange={(e) => setSelectedEditor(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                >
                  <option value="">Select team member...</option>
                  {availableEditors.map(editor => {
                    const workload = getEditorWorkload(editor.email);
                    const roleLabel = editor.role === ROLES.CONTENT_CREATOR ? 'Content Creator' :
                      editor.role === ROLES.LEAD ? 'Lead' : 'Designer';
                    return (
                      <option key={editor.email} value={editor.email}>
                        {editor.name} ({roleLabel}) • {workload.activeTasks} tasks
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Deadline *</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">File Link (Optional)</label>
                <input
                  type="url"
                  value={fileLink}
                  onChange={(e) => setFileLink(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => {
                  setSelectedAsset(null);
                  setSelectedEditor('');
                  setDeadline('');
                  setFileLink('');
                }}
                className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignTask}
                disabled={!selectedEditor || !deadline}
                className="flex-1 px-4 py-3 text-white bg-primary rounded-xl font-bold hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                Assign Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Task Modal */}
      {showCreateTask && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 transition-opacity z-[100]"
            style={{ background: 'rgba(0, 0, 0, 0.25)', backdropFilter: 'blur(6px)', borderRadius: '16px' }}
            onClick={() => setShowCreateTask(false)}
          />
          <div className="bg-white rounded-2xl max-w-md w-full p-6 relative z-[101] animate-fadeIn overflow-y-auto max-h-[90vh]" style={{ borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>
            <div className="flex items-start justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Create New Task</h3>
              <button
                onClick={() => setShowCreateTask(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Task Title *</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
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
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
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
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
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
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
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
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
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
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">File Link (Optional)</label>
                <input
                  type="url"
                  value={newTask.fileLink}
                  onChange={(e) => setNewTask({ ...newTask, fileLink: e.target.value })}
                  placeholder="https://drive.google.com/..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateTask(false)}
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
          </div>
        </div>
      )}

      {/* Assign Task to Editor Modal */}
      {showAssignToEditor && editorToAssign && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 transition-opacity z-[100]"
            style={{ background: 'rgba(0, 0, 0, 0.25)', backdropFilter: 'blur(6px)', borderRadius: '16px' }}
            onClick={() => {
              setShowAssignToEditor(false);
              setEditorToAssign(null);
              setSelectedAsset(null);
              setDeadline('');
              setFileLink('');
            }}
          />
          <div className="bg-white rounded-2xl max-w-md w-full p-6 relative z-[101] animate-fadeIn" style={{ borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>
            <div className="flex items-start justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Assign Task to {editorToAssign.name || editorToAssign.email}</h3>
              <button
                onClick={() => {
                  setShowAssignToEditor(false);
                  setEditorToAssign(null);
                  setSelectedAsset(null);
                  setDeadline('');
                  setFileLink('');
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Assigning To</p>
              <p className="font-bold text-gray-900">{editorToAssign.name || editorToAssign.email}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Asset *</label>
                <select
                  value={selectedAsset?.asset_id || ''}
                  onChange={(e) => {
                    const asset = unassignedAssets.find(a => a && a.asset_id === e.target.value);
                    setSelectedAsset(asset || null);
                  }}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                >
                  <option value="">Select an unassigned asset...</option>
                  {unassignedAssets.map(asset => {
                    const shoot = shoots.find(s => s && s.shoot_id === asset.shoot_id);
                    const client = shoot ? clients.find(c => c && c.client_id === shoot.client_id) : null;
                    return (
                      <option key={asset.asset_id} value={asset.asset_id}>
                        {asset.title} {client ? `(${client.company_name})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedAsset && (
                <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Selected Asset</p>
                  <p className="font-bold text-gray-900">{selectedAsset.title}</p>
                  {(() => {
                    const shoot = shoots.find(s => s && s.shoot_id === selectedAsset.shoot_id);
                    const client = shoot ? clients.find(c => c && c.client_id === shoot.client_id) : null;
                    return client && (
                      <p className="text-sm text-primary mt-1">{client.company_name}</p>
                    );
                  })()}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Deadline *</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">File Link (Optional)</label>
                <input
                  type="url"
                  value={fileLink}
                  onChange={(e) => setFileLink(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => {
                  setShowAssignToEditor(false);
                  setEditorToAssign(null);
                  setSelectedAsset(null);
                  setDeadline('');
                  setFileLink('');
                }}
                className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignTaskToEditor}
                disabled={!selectedAsset || !deadline}
                className="flex-1 px-4 py-3 text-white bg-primary rounded-xl font-bold hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                Assign Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
