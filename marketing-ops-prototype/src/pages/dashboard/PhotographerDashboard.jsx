import { useEffect, useMemo, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import { Camera, Clock, MapPin, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const PhotographerDashboard = () => {
  const { data, loadCollections } = useData();
  const { user } = useAuth();

  useEffect(() => {
    loadCollections(['SHOOTS', 'PHOTOGRAPHER_ATTENDANCE']);
  }, [loadCollections]);

  const myShoots = useMemo(() => {
    const shoots = data.SHOOTS || [];
    return shoots.filter(s => s.photographer_id === user?.email || s.lead_photographer_email === user?.email);
  }, [data.SHOOTS, user]);

  const upcomingShoots = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return myShoots
      .filter(s => s.date >= today && s.status === 'scheduled')
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5);
  }, [myShoots]);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Photographer Dashboard</h1>
        <p className="text-slate-600">Your shoots and assignments</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="modern-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-purple-100">
              <Camera className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Total Shoots</h3>
          </div>
          <p className="text-2xl font-bold text-slate-900">{myShoots.length}</p>
        </div>

        <div className="modern-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-100">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Upcoming</h3>
          </div>
          <p className="text-2xl font-bold text-slate-900">{upcomingShoots.length}</p>
        </div>

        <div className="modern-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-emerald-100">
              <Clock className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Completed</h3>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {myShoots.filter(s => s.status === 'completed').length}
          </p>
        </div>
      </div>

      <div className="modern-card p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Upcoming Shoots</h2>
        {upcomingShoots.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No upcoming shoots scheduled</p>
        ) : (
          <div className="space-y-3">
            {upcomingShoots.map((shoot) => (
              <div
                key={shoot.shoot_id}
                className="p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 mb-1">{shoot.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(shoot.date), 'MMM dd, yyyy')}
                      </div>
                      {shoot.time && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {shoot.time}
                        </div>
                      )}
                      {shoot.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {shoot.location}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="badge badge-info capitalize">{shoot.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PhotographerDashboard;

