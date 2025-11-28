import { useEffect, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { ASSET_STATUS } from '../../constants';

const EditorDashboard = () => {
  const { data, loadCollections } = useData();
  const { user } = useAuth();

  useEffect(() => {
    loadCollections(['ASSETS', 'EDITOR_TIME_LOGS']);
  }, [loadCollections]);

  const myTasks = useMemo(() => {
    const assets = data.ASSETS || [];
    return assets.filter(a => a.assigned_editor_email === user?.email);
  }, [data.ASSETS, user]);

  const tasksByStatus = useMemo(() => {
    return {
      toEdit: myTasks.filter(t => t.status === ASSET_STATUS.TO_EDIT),
      inProgress: myTasks.filter(t => t.status === ASSET_STATUS.IN_PROGRESS),
      review: myTasks.filter(t => t.status === ASSET_STATUS.REVIEW),
      revision: myTasks.filter(t => t.status === ASSET_STATUS.REVISION),
    };
  }, [myTasks]);

  const activeTimeLog = useMemo(() => {
    const logs = data.EDITOR_TIME_LOGS || [];
    return logs.find(log => log.editor_email === user?.email && !log.end_time);
  }, [data.EDITOR_TIME_LOGS, user]);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Editor Dashboard</h1>
        <p className="text-slate-600">Your assigned tasks and work</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="modern-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-slate-100">
              <FileText className="w-5 h-5 text-slate-600" />
            </div>
            <h3 className="font-semibold text-slate-900">To Edit</h3>
          </div>
          <p className="text-2xl font-bold text-slate-900">{tasksByStatus.toEdit.length}</p>
        </div>

        <div className="modern-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-100">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-slate-900">In Progress</h3>
          </div>
          <p className="text-2xl font-bold text-slate-900">{tasksByStatus.inProgress.length}</p>
        </div>

        <div className="modern-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-amber-100">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="font-semibold text-slate-900">In Review</h3>
          </div>
          <p className="text-2xl font-bold text-slate-900">{tasksByStatus.review.length}</p>
        </div>

        <div className="modern-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-red-100">
              <FileText className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Revision</h3>
          </div>
          <p className="text-2xl font-bold text-slate-900">{tasksByStatus.revision.length}</p>
        </div>
      </div>

      {activeTimeLog && (
        <div className="modern-card p-6 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-600" />
            <div>
              <p className="font-semibold text-blue-900">Currently working on a task</p>
              <p className="text-sm text-blue-700">Time tracking is active</p>
            </div>
          </div>
        </div>
      )}

      <div className="modern-card p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Recent Tasks</h2>
        {myTasks.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No tasks assigned</p>
        ) : (
          <div className="space-y-3">
            {myTasks.slice(0, 5).map((task) => (
              <div
                key={task.asset_id}
                className="p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 mb-1">{task.title}</h3>
                    {task.description && (
                      <p className="text-sm text-slate-600 mb-2">{task.description}</p>
                    )}
                    {task.progress !== undefined && (
                      <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
                        <div
                          className="bg-primary-500 h-2 rounded-full transition-all"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <span className={`badge ${
                    task.status === ASSET_STATUS.REVIEW ? 'badge-warning' :
                    task.status === ASSET_STATUS.IN_PROGRESS ? 'badge-info' :
                    task.status === ASSET_STATUS.REVISION ? 'badge-danger' :
                    'badge-gray'
                  }`}>
                    {task.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EditorDashboard;

