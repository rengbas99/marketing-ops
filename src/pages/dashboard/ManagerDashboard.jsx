import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import ApprovalsList from '../../components/ApprovalsList';
import ModalPortal from '../../components/primitives/ModalPortal.jsx';
import Card from '../../components/primitives/Card.jsx';
import Button from '../../components/primitives/Button.jsx';
import AssignShootForm from '../../components/AssignShootForm.jsx';
import { Users, Camera, Plane, FileEdit, TrendingUp, Clock, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import { getRelativeTime } from '../../utils/dateUtils';
import { COLLECTIONS, ASSET_STATUS, SHOOT_STATUS, ROLES } from '../../constants';

export default function ManagerDashboard() {
  const { data, loading, startPolling, stopPolling, forceRefresh, addRow } = useData();
  const { user } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const [showAssignTaskModal, setShowAssignTaskModal] = useState(false);
  const [showAssignShootModal, setShowAssignShootModal] = useState(false);
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

  useEffect(() => {
    startPolling('manager-dashboard', [
      COLLECTIONS.USERS,
      COLLECTIONS.SHOOTS,
      COLLECTIONS.ASSETS,
      COLLECTIONS.PHOTOGRAPHER_ATTENDANCE,
      COLLECTIONS.EDITOR_TIME_LOGS,
      COLLECTIONS.LEAVE_REQUESTS,
      COLLECTIONS.ATTENDANCE,
      COLLECTIONS.CLIENTS
    ]);
    return () => stopPolling('manager-dashboard');
  }, [startPolling, stopPolling]);

  // Safe data access
  const attendance = Array.isArray(data.Attendance) ? data.Attendance : [];
  const photographerAttendance = Array.isArray(data.Photographer_Attendance) ? data.Photographer_Attendance : [];
  const shoots = Array.isArray(data.Shoots) ? data.Shoots : [];
  const leaves = Array.isArray(data.Leave_Requests) ? data.Leave_Requests : [];
  const assets = Array.isArray(data.Assets) ? data.Assets : [];
  const users = Array.isArray(data.Users) ? data.Users : [];
  const timeLogs = Array.isArray(data.Editor_Time_Logs) ? data.Editor_Time_Logs : [];
  const clients = Array.isArray(data.Clients) ? data.Clients : [];

  // Assets pending review
  const assetsInReview = assets.filter(a => a && a.status === ASSET_STATUS.REVIEW);

  // Count active attendance (clocked in today)
  const today = new Date().toISOString().split('T')[0];
  const activeAttendance = attendance.filter(a => {
    if (!a || a.status !== 'clocked_in') return false;
    try {
      return a.date === today;
    } catch {
      return false;
    }
  });

  // Calculate past deadline shoots
  const pastDeadlineShoots = shoots.filter(s => {
    if (!s || !s.date || s.status === SHOOT_STATUS.COMPLETED || s.status === SHOOT_STATUS.CANCELLED) return false;
    try {
      const shootDate = new Date(s.date);
      const todayDate = new Date(today);
      todayDate.setHours(0, 0, 0, 0);
      shootDate.setHours(0, 0, 0, 0);
      return shootDate < todayDate;
    } catch {
      return false;
    }
  }).length || 0;

  const stats = {
    activeAttendance: activeAttendance.length || 0,
    teamOnShoot: photographerAttendance.filter(a => a && a.status === 'In Progress').length || 0,
    shootsToday: shoots.filter(s => {
      if (!s || !s.date) return false;
      return s.date === today || s.date === today.split('T')[0];
    }).length || 0,
    leavePending: leaves.filter(l => l && l.status === 'Pending').length || 0,
    assetsInReview: assetsInReview.length || 0,
    totalTeam: users.filter(u => u && u.active !== 'FALSE' && u.active !== false).length || users.length || 0,
    pastDeadlineShoots: pastDeadlineShoots,
    hoursThisWeek: (() => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const editorHours = timeLogs.reduce((sum, log) => {
        if (!log || !log.start_time) return sum;
        try {
          if (new Date(log.start_time) >= weekAgo) {
            return sum + (parseFloat(log.work_duration || log.duration || 0));
          }
        } catch (e) { return sum; }
        return sum;
      }, 0);

      const attendanceHours = attendance.reduce((sum, att) => {
        if (!att || !att.clock_in) return sum;
        try {
          const clockInDate = new Date(att.clock_in);
          if (clockInDate >= weekAgo && att.status === 'clocked_out' && att.hours_worked) {
            return sum + parseFloat(att.hours_worked || 0);
          }
        } catch (e) { return sum; }
        return sum;
      }, 0);

      const photographerHours = photographerAttendance.reduce((sum, att) => {
        if (!att || !att.start_time) return sum;
        try {
          const startDate = new Date(att.start_time || att.clock_in);
          if (startDate >= weekAgo && att.status === 'Completed') {
            return sum + (parseFloat(att.work_duration || att.duration || 0));
          }
        } catch (e) { return sum; }
        return sum;
      }, 0);

      return editorHours + attendanceHours + photographerHours;
    })(),
  };

  // Recent activities - Real Data
  const recentActivities = [
    ...assets.filter(a => a && a.status === ASSET_STATUS.COMPLETED).map(a => ({
      type: 'asset',
      message: `Asset "${a.title || 'Untitled'}" completed`,
      time: a.updated_at || a.created_at, // Use real timestamp
      icon: <CheckCircle className="w-5 h-5 text-green-500" />,
      sortTime: new Date(a.updated_at || a.created_at).getTime()
    })),
    ...photographerAttendance.filter(a => a && a.status === 'In Progress').map(a => ({
      type: 'shoot',
      message: `Shoot started by ${users.find(u => u.email === a.photographer_email)?.name || 'Photographer'}`,
      time: a.start_time || a.clock_in,
      icon: <Camera className="w-5 h-5 text-blue-500" />,
      sortTime: new Date(a.start_time || a.clock_in).getTime()
    })),
    ...leaves.filter(l => l && l.status === 'Pending').map(l => ({
      type: 'leave',
      message: `Leave request from ${users.find(u => u.email === l.user_email)?.name || 'Employee'}`,
      time: l.created_at,
      icon: <Plane className="w-5 h-5 text-orange-500" />,
      sortTime: new Date(l.created_at).getTime()
    }))
  ].sort((a, b) => b.sortTime - a.sortTime).slice(0, 10);

  const allAvailableUsers = (Array.isArray(users) ? users : []).filter(
    u => {
      if (!u || !u.email) return false;
      if (u.active === 'FALSE' || u.active === false) return false;
      if (u.role === ROLES.MANAGER) return false;
      if (u.role === ROLES.PHOTOGRAPHER) return false;
      return u.role === ROLES.EDITOR || u.role === ROLES.CONTENT_CREATOR || u.role === ROLES.LEAD;
    }
  );

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.title || !newTask.assigned_to || !newTask.deadline) {
      error('Please fill in all required fields (Title, Assign To, and Deadline)');
      return;
    }

    try {
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

      if (newTask.assigned_role === ROLES.PHOTOGRAPHER) {
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
      setShowAssignTaskModal(false);
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
      error(`Failed to create task: ${err.message}`);
    }
  };

  const handleAssignShoot = async (shootData) => {
    try {
      const shoot = {
        shoot_id: `SHOOT-${Date.now()}`,
        shoot_name: shootData.shoot_name,
        photographer_id: shootData.photographer_id,
        client_id: shootData.client_id || '',
        date: shootData.date,
        location_name: shootData.location_name || '',
        notes: shootData.notes || '',
        status: SHOOT_STATUS.SCHEDULED,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await addRow(COLLECTIONS.SHOOTS, shoot);
      await forceRefresh([COLLECTIONS.SHOOTS]);
      success('Shoot assigned successfully');
    } catch (err) {
      error(`Failed to assign shoot: ${err.message}`);
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
      <Card glass className="p-6 rounded-2xl border-l-4 border-primary">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          Welcome back, <span className="text-gradient">{user?.name || 'Manager'}</span>!
        </h1>
        <p className="text-gray-600">Here's what's happening with your team today.</p>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card
          glass
          as="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowAssignShootModal(true);
          }}
          className="p-6 flex items-center gap-4 group hover:bg-white/80 cursor-pointer"
        >
          <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
            <Camera className="w-8 h-8 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-gray-900">Add Shoot</h3>
            <p className="text-sm text-gray-600">Assign new shoots to videographers</p>
          </div>
        </Card>
        <Card
          glass
          as="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowAssignTaskModal(true);
          }}
          className="p-6 flex items-center gap-4 group hover:bg-white/80 cursor-pointer"
        >
          <div className="p-3 bg-secondary/10 rounded-xl group-hover:bg-secondary/20 transition-colors">
            <FileEdit className="w-8 h-8 text-secondary" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-gray-900">Assign Task</h3>
            <p className="text-sm text-gray-600">Create and assign tasks to editors</p>
          </div>
        </Card>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Clock}
          label="Active Attendance"
          value={stats.activeAttendance}
          color="text-green-600"
          bg="bg-green-50"
          route="/attendance"
        />
        <StatCard
          icon={Users}
          label="Team on Shoot"
          value={stats.teamOnShoot}
          color="text-yellow-600"
          bg="bg-yellow-50"
          route="/active-work"
        />
        <StatCard
          icon={Camera}
          label="Shoots Today"
          value={stats.shootsToday}
          color="text-blue-600"
          bg="bg-blue-50"
          route="/calendar"
        />
        <StatCard
          icon={FileEdit}
          label="In Review"
          value={stats.assetsInReview}
          color="text-purple-600"
          bg="bg-purple-50"
          route="/assets?status=Review"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Approvals & Activity */}
        <div className="lg:col-span-2 space-y-8">
          {/* Assets Pending Review */}
          {assetsInReview.length > 0 && (
            <Card glass className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-purple-600" />
                  <h2 className="text-xl font-bold text-gray-900">Pending Review</h2>
                </div>
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">
                  {stats.assetsInReview} Items
                </span>
              </div>
              <ApprovalsList
                assets={assetsInReview}
                users={users}
                shoots={shoots}
                clients={clients}
                onUpdate={() => forceRefresh([COLLECTIONS.ASSETS])}
              />
            </Card>
          )}

          {/* Recent Activity Feed */}
          <Card glass className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Activity</h2>
            <div className="space-y-4">
              {recentActivities.length > 0 ? (
                recentActivities.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-4 p-3 rounded-xl hover:bg-white/50 transition-colors"
                  >
                    <div className="mt-1">{activity.icon}</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{getRelativeTime(activity.time)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">No recent activity</div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Quick Links */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 px-2">Quick Navigation</h3>
          <QuickLink
            title="View All Clients"
            subtitle="Manage relationships"
            icon={Users}
            to="/clients"
            color="text-blue-600"
          />
          <QuickLink
            title="Active Work"
            subtitle="Real-time tracking"
            icon={TrendingUp}
            to="/active-work"
            color="text-indigo-600"
          />
          <QuickLink
            title="Team Attendance"
            subtitle="View logs"
            icon={Clock}
            to="/attendance"
            color="text-green-600"
          />
          <QuickLink
            title="Leave Requests"
            subtitle={`${stats.leavePending} pending`}
            icon={Plane}
            to="/leave-requests"
            color="text-orange-600"
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, bg, route }) {
  const navigate = useNavigate();
  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (route) {
      navigate(route);
    }
  };
  return (
    <Card
      glass
      onClick={handleClick}
      className={`p-4 cursor-pointer hover:ring-2 ring-primary/20 ${route ? 'active:scale-95' : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${bg}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <span className="text-2xl font-bold text-gray-900">{value}</span>
      </div>
      <p className="text-sm font-medium text-gray-500">{label}</p>
    </Card>
  );
}

function QuickLink({ title, subtitle, icon: Icon, to, color }) {
  return (
    <Link to={to}>
      <Card glass className="p-4 flex items-center gap-4 hover:bg-white/80 group">
        <div className={`p-2 rounded-lg bg-gray-50 group-hover:bg-white transition-colors`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <h4 className="font-semibold text-gray-900">{title}</h4>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
      </Card>
    </Link>
  );
}
