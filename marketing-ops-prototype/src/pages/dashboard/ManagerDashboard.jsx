import { useEffect, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useNavigate } from 'react-router-dom';
import { Users, Camera, FileText, Clock, TrendingUp, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

const ManagerDashboard = () => {
  const { data, loadCollections } = useData();
  const navigate = useNavigate();

  useEffect(() => {
    loadCollections(['ASSETS', 'SHOOTS', 'ATTENDANCE', 'LEAVE_REQUESTS', 'CLIENTS', 'USERS']);
  }, [loadCollections]);

  const stats = useMemo(() => {
    const assets = data.ASSETS || [];
    const shoots = data.SHOOTS || [];
    const attendance = data.ATTENDANCE || [];
    const leaveRequests = data.LEAVE_REQUESTS || [];
    const clients = data.CLIENTS || [];
    const users = data.USERS || [];

    const today = new Date().toISOString().split('T')[0];
    const todayShoots = shoots.filter(s => s.date === today);
    const pendingLeave = leaveRequests.filter(l => l.status === 'Pending');
    const assetsInReview = assets.filter(a => a.status === 'Review');
    const activeUsers = users.filter(u => u.active).length;

    return {
      totalClients: clients.length,
      todayShoots: todayShoots.length,
      pendingLeave: pendingLeave.length,
      assetsInReview: assetsInReview.length,
      activeUsers,
      totalShoots: shoots.length,
      totalAssets: assets.length,
    };
  }, [data]);

  const StatCard = ({ icon: Icon, label, value, color, onClick }) => (
    <div
      onClick={onClick}
      className={`modern-card p-6 cursor-pointer transition-all hover:scale-105 ${onClick ? 'hover:shadow-xl' : ''}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {onClick && <ArrowRight className="w-5 h-5 text-slate-400" />}
      </div>
      <p className="text-3xl font-bold text-slate-900 mb-1">{value}</p>
      <p className="text-sm text-slate-600">{label}</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Manager Dashboard</h1>
        <p className="text-slate-600">Overview of your team and operations</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Clients"
          value={stats.totalClients}
          color="bg-blue-500"
          onClick={() => navigate('/dashboard/clients')}
        />
        <StatCard
          icon={Camera}
          label="Shoots Today"
          value={stats.todayShoots}
          color="bg-purple-500"
          onClick={() => navigate('/dashboard/shoots')}
        />
        <StatCard
          icon={FileText}
          label="Assets in Review"
          value={stats.assetsInReview}
          color="bg-amber-500"
          onClick={() => navigate('/dashboard/tasks')}
        />
        <StatCard
          icon={Clock}
          label="Pending Leave"
          value={stats.pendingLeave}
          color="bg-emerald-500"
          onClick={() => navigate('/dashboard/leave')}
        />
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="modern-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary-100">
              <TrendingUp className="w-5 h-5 text-primary-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Total Shoots</h3>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.totalShoots}</p>
        </div>

        <div className="modern-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-purple-100">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Total Assets</h3>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.totalAssets}</p>
        </div>

        <div className="modern-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-emerald-100">
              <Users className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Active Users</h3>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.activeUsers}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="modern-card p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => navigate('/dashboard/assign-tasks')}
            className="btn-secondary text-left py-3"
          >
            Assign Task
          </button>
          <button
            onClick={() => navigate('/dashboard/shoots')}
            className="btn-secondary text-left py-3"
          >
            Schedule Shoot
          </button>
          <button
            onClick={() => navigate('/dashboard/settings')}
            className="btn-secondary text-left py-3"
          >
            Manage Users
          </button>
          <button
            onClick={() => navigate('/dashboard/active-work')}
            className="btn-secondary text-left py-3"
          >
            View Active Work
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;

