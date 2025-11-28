import { useEffect, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, FileText, TrendingUp, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

const ContentCreatorDashboard = () => {
  const { data, loadCollections } = useData();
  const { user } = useAuth();

  useEffect(() => {
    loadCollections(['ASSETS', 'CONTENT_CALENDAR']);
  }, [loadCollections]);

  const myTasks = useMemo(() => {
    const assets = data.ASSETS || [];
    return assets.filter(a => a.assigned_creator_email === user?.email);
  }, [data.ASSETS, user]);

  const calendarItems = useMemo(() => {
    const calendar = data.CONTENT_CALENDAR || [];
    const today = new Date().toISOString().split('T')[0];
    return calendar
      .filter(item => item.publish_date >= today)
      .sort((a, b) => new Date(a.publish_date) - new Date(b.publish_date))
      .slice(0, 5);
  }, [data.CONTENT_CALENDAR]);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Content Creator Dashboard</h1>
        <p className="text-slate-600">Your content tasks and calendar</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="modern-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-purple-100">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="font-semibold text-slate-900">My Tasks</h3>
          </div>
          <p className="text-2xl font-bold text-slate-900">{myTasks.length}</p>
        </div>

        <div className="modern-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-100">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Scheduled</h3>
          </div>
          <p className="text-2xl font-bold text-slate-900">{calendarItems.length}</p>
        </div>

        <div className="modern-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-emerald-100">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Completed</h3>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {myTasks.filter(t => t.status === 'Published' || t.status === 'Final').length}
          </p>
        </div>
      </div>

      <div className="modern-card p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Upcoming Publishing Schedule</h2>
        {calendarItems.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No upcoming publishing scheduled</p>
        ) : (
          <div className="space-y-3">
            {calendarItems.map((item) => (
              <div
                key={item.calendar_id}
                className="p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-semibold text-slate-900">
                        {format(new Date(item.publish_date), 'MMM dd, yyyy')}
                      </span>
                      {item.publish_time && (
                        <span className="text-sm text-slate-600">at {item.publish_time}</span>
                      )}
                    </div>
                    <p className="text-slate-700 mb-1">Channel: <span className="font-semibold capitalize">{item.channel}</span></p>
                  </div>
                  <span className={`badge ${
                    item.status === 'published' ? 'badge-success' :
                    item.status === 'cancelled' ? 'badge-danger' :
                    'badge-info'
                  } capitalize`}>
                    {item.status}
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

export default ContentCreatorDashboard;

