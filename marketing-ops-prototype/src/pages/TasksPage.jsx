import { useEffect, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { FileText, Plus, Play, CheckCircle } from 'lucide-react';
import { ASSET_STATUS } from '../constants';

const TasksPage = () => {
  const { data, loadCollections, updateRow } = useData();
  const { user } = useAuth();
  const { success, error } = useToast();
  const [selectedStatus, setSelectedStatus] = useState(null);

  useEffect(() => {
    loadCollections(['ASSETS', 'EDITOR_TIME_LOGS']);
  }, [loadCollections]);

  const assets = data.ASSETS || [];
  const myAssets = assets.filter(a => 
    a.assigned_editor_email === user?.email || 
    a.assigned_creator_email === user?.email
  );

  const tasksByStatus = {
    [ASSET_STATUS.TO_EDIT]: myAssets.filter(a => a.status === ASSET_STATUS.TO_EDIT),
    [ASSET_STATUS.IN_PROGRESS]: myAssets.filter(a => a.status === ASSET_STATUS.IN_PROGRESS),
    [ASSET_STATUS.REVIEW]: myAssets.filter(a => a.status === ASSET_STATUS.REVIEW),
    [ASSET_STATUS.REVISION]: myAssets.filter(a => a.status === ASSET_STATUS.REVISION),
  };

  const handleStartTask = async (asset) => {
    try {
      await updateRow('ASSETS', asset.asset_id, {
        status: ASSET_STATUS.IN_PROGRESS,
        current_editor_status: 'Working',
      }, 'asset_id');

      await updateRow('EDITOR_TIME_LOGS', null, {
        log_id: `LOG-${Date.now()}`,
        asset_id: asset.asset_id,
        editor_email: user.email,
        start_time: new Date().toISOString(),
        task_status: 'Working',
      }, 'log_id');

      success('Task started!');
    } catch (err) {
      error(err.message || 'Failed to start task');
    }
  };

  const handleFinishTask = async (asset) => {
    try {
      await updateRow('ASSETS', asset.asset_id, {
        status: ASSET_STATUS.REVIEW,
        current_editor_status: 'Completed',
        progress: 100,
      }, 'asset_id');
      success('Task submitted for review!');
    } catch (err) {
      error(err.message || 'Failed to finish task');
    }
  };

  const TaskCard = ({ task }) => (
    <div className="modern-card p-4 mb-3">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-slate-900">{task.title}</h3>
        {task.progress !== undefined && (
          <span className="text-xs font-semibold text-primary-600">{task.progress}%</span>
        )}
      </div>
      {task.description && (
        <p className="text-sm text-slate-600 mb-3">{task.description}</p>
      )}
      {task.progress !== undefined && (
        <div className="w-full bg-slate-200 rounded-full h-2 mb-3">
          <div
            className="bg-primary-500 h-2 rounded-full transition-all"
            style={{ width: `${task.progress}%` }}
          />
        </div>
      )}
      <div className="flex gap-2">
        {task.status === ASSET_STATUS.TO_EDIT && (
          <button
            onClick={() => handleStartTask(task)}
            className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Start
          </button>
        )}
        {task.status === ASSET_STATUS.IN_PROGRESS && (
          <button
            onClick={() => handleFinishTask(task)}
            className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Finish
          </button>
        )}
        {task.status === ASSET_STATUS.REVISION && (
          <button
            onClick={() => handleStartTask(task)}
            className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Restart
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Tasks</h1>
          <p className="text-slate-600">Manage your assigned tasks</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {Object.entries(tasksByStatus).map(([status, tasks]) => (
          <div key={status} className="modern-card p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">{status}</h2>
              <span className="badge badge-gray">{tasks.length}</span>
            </div>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {tasks.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No tasks</p>
              ) : (
                tasks.map(task => <TaskCard key={task.asset_id} task={task} />)
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TasksPage;

