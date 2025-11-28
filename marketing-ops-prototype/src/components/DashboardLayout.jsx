import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Camera,
  FileEdit,
  Calendar,
  Users,
  Clock,
  Plane,
  MessageSquare,
  Settings,
  TrendingUp,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { ROLES } from '../constants';

const DashboardLayout = () => {
  const { user, logout, getRoleRoute } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getNavGroups = () => {
    const groups = [
      {
        title: 'Overview',
        items: [
          { path: getRoleRoute(user?.role), icon: LayoutDashboard, label: 'Dashboard' },
        ],
      },
    ];

    const productionItems = [];
    if ([ROLES.MANAGER, ROLES.LEAD, ROLES.PHOTOGRAPHER, ROLES.CONTENT_CREATOR].includes(user?.role)) {
      productionItems.push({ path: '/dashboard/shoots', icon: Camera, label: 'Shoots' });
    }
    if ([ROLES.MANAGER, ROLES.LEAD, ROLES.EDITOR, ROLES.CONTENT_CREATOR].includes(user?.role)) {
      productionItems.push({ path: '/dashboard/tasks', icon: FileEdit, label: 'Tasks' });
    }
    productionItems.push({ path: '/dashboard/calendar', icon: Calendar, label: 'Calendar' });

    if (productionItems.length > 0) {
      groups.push({ title: 'Production', items: productionItems });
    }

    const teamItems = [];
    if ([ROLES.MANAGER, ROLES.LEAD, ROLES.SALES].includes(user?.role)) {
      teamItems.push({ path: '/dashboard/clients', icon: Users, label: 'Clients' });
    }
    teamItems.push({ path: '/dashboard/attendance', icon: Clock, label: 'Attendance' });
    teamItems.push({ path: '/dashboard/leave', icon: Plane, label: 'Leave' });
    teamItems.push({ path: '/dashboard/team', icon: MessageSquare, label: 'Team Feed' });

    if ([ROLES.MANAGER, ROLES.LEAD].includes(user?.role)) {
      teamItems.push({ path: '/dashboard/active-work', icon: TrendingUp, label: 'Active Work' });
    }

    groups.push({ title: 'Team', items: teamItems });

    if (user?.role === ROLES.MANAGER) {
      groups.push({
        title: 'System',
        items: [{ path: '/dashboard/settings', icon: Settings, label: 'Settings' }],
      });
    }

    return groups;
  };

  const navGroups = getNavGroups();

  const NavItem = ({ item, isActive }) => {
    const Icon = item.icon;
    return (
      <button
        onClick={() => {
          navigate(item.path);
          setSidebarOpen(false);
        }}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
          isActive
            ? 'bg-primary-500 text-white shadow-lg'
            : 'text-slate-700 hover:bg-slate-100'
        }`}
      >
        <Icon className="w-5 h-5" />
        <span className="font-medium">{item.label}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                Marketing Ops
              </h1>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-slate-500 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-6">
            {navGroups.map((group) => (
              <div key={group.title}>
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">
                  {group.title}
                </h2>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <NavItem
                      key={item.path}
                      item={item}
                      isActive={location.pathname === item.path}
                    />
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-200">
            <div className="flex items-center gap-3 px-4 py-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-semibold">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{user?.name}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-700 hover:bg-red-50 hover:text-red-600 transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="bg-white border-b border-slate-200 px-4 py-4 lg:px-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-slate-600 hover:text-slate-900"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex-1" />
            <div className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900 capitalize">{user?.role}</span> Dashboard
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;

