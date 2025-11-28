import { useEffect, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { TrendingUp, Camera, FileText, Clock } from 'lucide-react';
import { format } from 'date-fns';

const ActiveWorkPage = () => {
  const { data, loadCollections } = useData();

  useEffect(() => {
    loadCollections(['PHOTOGRAPHER_ATTENDANCE', 'EDITOR_TIME_LOGS', 'USERS', 'SHOOTS', 'ASSETS']);
  }, [loadCollections]);

  const activeShoots = useMemo(() => {
    const attendance = data.PHOTOGRAPHER_ATTENDANCE || [];
    const shoots = data.SHOOTS || [];
    const users = data.USERS || [];

    return attendance
      .filter(pa => pa.status === 'In Progress')
      .map(pa => {
        const shoot = shoots.find(s => s.shoot_id === pa.shoot_id);
        const user = users.find(u => u.email === pa.photographer_email);
        return {
          ...pa,
          shoot,
          user,
        };
      });
  }, [data.PHOTOGRAPHER_ATTENDANCE, data.SHOOTS, data.USERS]);

  const activeTasks = useMemo(() => {
    const logs = data.EDITOR_TIME_LOGS || [];
    const assets = data.ASSETS || [];
    const users = data.USERS || [];

    return logs
      .filter(log => !log.end_time)
      .map(log => {
        const asset = assets.find(a => a.asset_id === log.asset_id);
        const user = users.find(u => u.email === log.editor_email);
        return {
          ...log,
          asset,
          user,
        };
      });
  }, [data.EDITOR_TIME_LOGS, data.ASSETS, data.USERS]);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Active Work</h1>
        <p className="text-slate-600">Currently active shoots and tasks</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="modern-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-purple-100">
              <Camera className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Active Shoots</h2>
          </div>
          {activeShoots.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No active shoots</p>
          ) : (
            <div className="space-y-3">
              {activeShoots.map((item) => (
                <div key={item.attendance_id} className="p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900 mb-1">
                        {item.shoot?.title || 'Unknown Shoot'}
                      </p>
                      <p className="text-sm text-slate-600 mb-2">{item.user?.name || item.photographer_email}</p>
                      {item.start_time && (
                        <p className="text-xs text-slate-500">
                          Started: {format(new Date(item.start_time), 'MMM dd, HH:mm')}
                        </p>
                      )}
                    </div>
                    <span className="badge badge-info">In Progress</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modern-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-100">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Active Tasks</h2>
          </div>
          {activeTasks.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No active tasks</p>
          ) : (
            <div className="space-y-3">
              {activeTasks.map((item) => (
                <div key={item.log_id} className="p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900 mb-1">
                        {item.asset?.title || 'Unknown Task'}
                      </p>
                      <p className="text-sm text-slate-600 mb-2">{item.user?.name || item.editor_email}</p>
                      {item.start_time && (
                        <p className="text-xs text-slate-500">
                          Started: {format(new Date(item.start_time), 'MMM dd, HH:mm')}
                        </p>
                      )}
                      {item.asset?.progress !== undefined && (
                        <div className="mt-2 w-full bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-primary-500 h-2 rounded-full"
                            style={{ width: `${item.asset.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                    <span className="badge badge-info">Working</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActiveWorkPage;

