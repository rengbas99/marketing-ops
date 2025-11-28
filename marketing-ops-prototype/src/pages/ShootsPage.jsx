import { useEffect, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { Camera, Plus, Play, CheckCircle, MapPin, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';

const ShootsPage = () => {
  const { data, loadCollections, addRow, updateRow } = useData();
  const { user } = useAuth();
  const { success, error } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    client_id: '',
  });

  useEffect(() => {
    loadCollections(['SHOOTS', 'CLIENTS', 'PHOTOGRAPHER_ATTENDANCE']);
  }, [loadCollections]);

  const shoots = data.SHOOTS || [];
  const clients = data.CLIENTS || [];

  const handleCreateShoot = async (e) => {
    e.preventDefault();
    try {
      await addRow('SHOOTS', {
        shoot_id: `SH-${Date.now()}`,
        title: formData.title,
        shoot_name: formData.title,
        date: formData.date,
        time: formData.time || '',
        location: formData.location || '',
        location_name: formData.location || '',
        client_id: formData.client_id || '',
        photographer_id: user?.email,
        lead_photographer_email: user?.email,
        status: 'scheduled',
      });
      success('Shoot created successfully!');
      setShowModal(false);
      setFormData({ title: '', date: '', time: '', location: '', client_id: '' });
    } catch (err) {
      error(err.message || 'Failed to create shoot');
    }
  };

  const handleStartShoot = async (shoot) => {
    try {
      await updateRow('SHOOTS', shoot.shoot_id, {
        status: 'in_progress',
      }, 'shoot_id');

      await addRow('PHOTOGRAPHER_ATTENDANCE', {
        attendance_id: `PA-${Date.now()}`,
        shoot_id: shoot.shoot_id,
        photographer_email: user?.email,
        date: shoot.date,
        start_time: new Date().toISOString(),
        status: 'In Progress',
      });

      success('Shoot started!');
    } catch (err) {
      error(err.message || 'Failed to start shoot');
    }
  };

  const handleEndShoot = async (shoot) => {
    try {
      const attendance = data.PHOTOGRAPHER_ATTENDANCE || [];
      const activeAttendance = attendance.find(
        pa => pa.shoot_id === shoot.shoot_id && pa.status === 'In Progress'
      );

      if (activeAttendance) {
        await updateRow('PHOTOGRAPHER_ATTENDANCE', activeAttendance.attendance_id, {
          end_time: new Date().toISOString(),
          status: 'Completed',
        }, 'attendance_id');
      }

      await updateRow('SHOOTS', shoot.shoot_id, {
        status: 'completed',
      }, 'shoot_id');

      success('Shoot completed!');
    } catch (err) {
      error(err.message || 'Failed to end shoot');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Shoots</h1>
          <p className="text-slate-600">Manage photography shoots</p>
        </div>
        {[user?.role === 'manager' || user?.role === 'lead'] && (
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Shoot
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {shoots.map((shoot) => (
          <div key={shoot.shoot_id} className="modern-card p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-semibold text-slate-900 text-lg">{shoot.title}</h3>
              <span className={`badge ${
                shoot.status === 'completed' ? 'badge-success' :
                shoot.status === 'in_progress' ? 'badge-info' :
                shoot.status === 'cancelled' ? 'badge-danger' :
                'badge-gray'
              } capitalize`}>
                {shoot.status}
              </span>
            </div>

            <div className="space-y-2 mb-4">
              {shoot.date && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(shoot.date), 'MMM dd, yyyy')}
                </div>
              )}
              {shoot.time && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Clock className="w-4 h-4" />
                  {shoot.time}
                </div>
              )}
              {shoot.location && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin className="w-4 h-4" />
                  {shoot.location}
                </div>
              )}
            </div>

            {shoot.status === 'scheduled' && (
              <button
                onClick={() => handleStartShoot(shoot)}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                Start Shoot
              </button>
            )}

            {shoot.status === 'in_progress' && (
              <button
                onClick={() => handleEndShoot(shoot)}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                End Shoot
              </button>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="modern-card p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Create New Shoot</h2>
            <form onSubmit={handleCreateShoot} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Shoot Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Time (optional)
                </label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Location (optional)
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShootsPage;

