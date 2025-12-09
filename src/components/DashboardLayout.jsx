import { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import OverlayMount from './overlay/OverlayMount.jsx';
import Card from './primitives/Card.jsx';
import {
  LayoutDashboard,
  Users,
  Camera,
  FileEdit,
  Calendar,
  MessageSquare,
  Plane,
  Settings,
  LogOut,
  Clock,
  TrendingUp,
  Hourglass,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';
import { ROLES } from '../constants';

export default function DashboardLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Map role to dashboard route (handles underscore vs hyphen)
  const getDashboardRoute = (role) => {
    const roleRouteMap = {
      [ROLES.MANAGER]: '/dashboard/manager',
      [ROLES.LEAD]: '/dashboard/lead',
      [ROLES.PHOTOGRAPHER]: '/dashboard/photographer',
      [ROLES.EDITOR]: '/dashboard/editor',
      [ROLES.CONTENT_CREATOR]: '/dashboard/content-creator',
    };
    return roleRouteMap[role] || `/dashboard/${role}`;
  };

  const getNavGroups = () => {
    const groups = [
      {
        title: 'Overview',
        items: [
          { path: getDashboardRoute(user?.role), icon: LayoutDashboard, label: 'Dashboard' },
        ]
      }
    ];

    // Production Group
    const productionItems = [];
    if ([ROLES.MANAGER, ROLES.LEAD, ROLES.PHOTOGRAPHER, ROLES.CONTENT_CREATOR].includes(user?.role)) {
      productionItems.push({ path: '/dashboard/shoots', icon: Camera, label: 'Shoots' });
    }
    if ([ROLES.MANAGER, ROLES.LEAD, ROLES.EDITOR, ROLES.CONTENT_CREATOR].includes(user?.role)) {
      productionItems.push({ path: '/dashboard/assign-tasks', icon: FileEdit, label: 'Tasks' });
    }
    productionItems.push({ path: '/dashboard/calendar', icon: Calendar, label: 'Calendar' });

    if (productionItems.length > 0) {
      groups.push({ title: 'Production', items: productionItems });
    }

    // Team Group
    const teamItems = [];
    if ([ROLES.MANAGER, ROLES.LEAD, 'sales'].includes(user?.role)) {
      teamItems.push({ path: '/dashboard/clients', icon: Users, label: 'Clients' });
    }
    teamItems.push({ path: '/dashboard/attendance', icon: Clock, label: 'Attendance' });
    teamItems.push({ path: '/dashboard/leave-requests', icon: Plane, label: 'Leave' });
    teamItems.push({ path: '/dashboard/team', icon: MessageSquare, label: 'Team Feed' });

    if ([ROLES.MANAGER, ROLES.LEAD].includes(user?.role)) {
      teamItems.push({ path: '/dashboard/active-work', icon: TrendingUp, label: 'Active Work' });
    }

    groups.push({ title: 'Team', items: teamItems });

    // Settings Group
    if (user?.role === ROLES.MANAGER) {
      groups.push({
        title: 'System',
        items: [
          { path: '/dashboard/settings', icon: Settings, label: 'Settings' }
        ]
      });
    }

    return groups;
  };

  const navGroups = getNavGroups();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Header */}
      <Card glass className="lg:hidden fixed top-0 left-0 right-0 z-50 p-4 flex items-center justify-between rounded-none">
        <h1 className="text-lg font-bold text-gradient">Reform Media</h1>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </Card>

      {/* Sidebar */}
      <Card
        glass
        as="aside"
        className={`
        fixed lg:sticky top-0 left-0 h-screen w-72 border-r border-white/20 z-40 
        transform transition-transform duration-300 ease-in-out flex flex-col rounded-none
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
      >
        {/* Logo */}
        <div className="h-20 flex items-center px-8 border-b border-gray-100/50">
          <div className="w-8 h-8 bg-primary rounded-lg mr-3 flex items-center justify-center">
            <span className="text-white font-bold text-xl">R</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Reform<span className="text-primary">.OS</span></h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
          {navGroups.map((group, idx) => (
            <div key={idx}>
              <h3 className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {group.title}
              </h3>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`
                        flex items-center px-4 py-3 rounded-xl transition-colors duration-200 group
                        ${isActive
                          ? 'bg-primary text-white shadow-lg shadow-primary/30'
                          : 'text-gray-600 hover:bg-white hover:text-primary'
                        }
                      `}
                    >
                      <Icon className={`w-5 h-5 mr-3 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-primary'}`} />
                      <span className="font-medium flex-1">{item.label}</span>
                      {isActive && <ChevronRight className="w-4 h-4 opacity-50" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-100/50 bg-white/30 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4 p-2 rounded-xl bg-white/50">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold shadow-md">
              {user?.name?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </button>
        </div>
      </Card>

      <OverlayMount
        id="dashboard-sidebar-overlay"
        isOpen={sidebarOpen}
        blocking={false}
        pointerEvents="auto"
        priority={5}
        type="drawer"
        render={({ close }) => (
          <div
            className="lg:hidden absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => {
              setSidebarOpen(false);
              close();
            }}
          />
        )}
      />

      {/* Main Content */}
      <main className="flex-1 min-w-0 lg:pt-0 pt-16">
        <div className="h-full p-4 md:p-8 max-w-7xl mx-auto">
          {children || <Outlet />}
        </div>
      </main>
    </div>
  );
}

