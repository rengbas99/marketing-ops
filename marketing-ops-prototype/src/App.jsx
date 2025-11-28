import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { ToastProvider } from './components/Toast';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './components/DashboardLayout';
import ManagerDashboard from './pages/dashboard/ManagerDashboard';
import LeadDashboard from './pages/dashboard/LeadDashboard';
import PhotographerDashboard from './pages/dashboard/PhotographerDashboard';
import EditorDashboard from './pages/dashboard/EditorDashboard';
import ContentCreatorDashboard from './pages/dashboard/ContentCreatorDashboard';
import ClientsPage from './pages/ClientsPage';
import ShootsPage from './pages/ShootsPage';
import TasksPage from './pages/TasksPage';
import CalendarPage from './pages/CalendarPage';
import AssignTasksPage from './pages/AssignTasksPage';
import TeamFeedPage from './pages/TeamFeedPage';
import LeavePage from './pages/LeavePage';
import AttendancePage from './pages/AttendancePage';
import ActiveWorkPage from './pages/ActiveWorkPage';
import SettingsPage from './pages/SettingsPage';
import { ROLES } from './constants';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    const roleRouteMap = {
      [ROLES.MANAGER]: '/dashboard/manager',
      [ROLES.LEAD]: '/dashboard/lead',
      [ROLES.PHOTOGRAPHER]: '/dashboard/photographer',
      [ROLES.EDITOR]: '/dashboard/editor',
      [ROLES.CONTENT_CREATOR]: '/dashboard/content-creator',
    };
    return <Navigate to={roleRouteMap[user.role] || '/login'} replace />;
  }

  return children;
};

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <DataProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<Navigate to="/login" replace />} />

              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard/manager" replace />} />
                
                <Route
                  path="manager"
                  element={
                    <ProtectedRoute allowedRoles={[ROLES.MANAGER]}>
                      <ManagerDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="lead"
                  element={
                    <ProtectedRoute allowedRoles={[ROLES.LEAD, ROLES.MANAGER]}>
                      <LeadDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="photographer"
                  element={
                    <ProtectedRoute allowedRoles={[ROLES.PHOTOGRAPHER, ROLES.LEAD, ROLES.MANAGER]}>
                      <PhotographerDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="editor"
                  element={
                    <ProtectedRoute allowedRoles={[ROLES.EDITOR, ROLES.LEAD, ROLES.MANAGER]}>
                      <EditorDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="content-creator"
                  element={
                    <ProtectedRoute allowedRoles={[ROLES.CONTENT_CREATOR, ROLES.LEAD, ROLES.MANAGER]}>
                      <ContentCreatorDashboard />
                    </ProtectedRoute>
                  }
                />

                <Route path="clients" element={<ProtectedRoute><ClientsPage /></ProtectedRoute>} />
                <Route path="shoots" element={<ProtectedRoute><ShootsPage /></ProtectedRoute>} />
                <Route path="tasks" element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
                <Route path="calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
                <Route path="assign-tasks" element={<ProtectedRoute><AssignTasksPage /></ProtectedRoute>} />
                <Route path="team" element={<ProtectedRoute><TeamFeedPage /></ProtectedRoute>} />
                <Route path="leave" element={<ProtectedRoute><LeavePage /></ProtectedRoute>} />
                <Route path="attendance" element={<ProtectedRoute><AttendancePage /></ProtectedRoute>} />
                <Route path="active-work" element={<ProtectedRoute><ActiveWorkPage /></ProtectedRoute>} />
                <Route path="settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              </Route>

              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Router>
        </DataProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;

