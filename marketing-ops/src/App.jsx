import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { ToastProvider } from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import DashboardLayout from './components/DashboardLayout';
import LoginPage from './pages/LoginPage';
import ManagerDashboard from './pages/dashboard/ManagerDashboard';
import LeadDashboard from './pages/dashboard/LeadDashboard';
import PhotographerDashboard from './pages/dashboard/PhotographerDashboard';
import EditorDashboard from './pages/dashboard/EditorDashboard';
import ContentCreatorDashboard from './pages/dashboard/ContentCreatorDashboard';
import ClientsPage from './pages/ClientsPage';
import ShootsPage from './pages/ShootsPage';
import CalendarPage from './pages/CalendarPage';
import AssignTasksPage from './pages/AssignTasksPage';
import TeamPage from './pages/TeamFeedPage';
import LeaveRequestsPage from './pages/LeavePage';
import SettingsPage from './pages/SettingsPage';
import AttendancePage from './pages/AttendancePage';
import ActiveWorkPage from './pages/ActiveWorkPage';
import ActiveEditingPage from './pages/ActiveEditingPage';
import { ROLES } from './constants';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  // Show a loading UI while we verify the session
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // No authenticated user → force login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect to their appropriate dashboard if they try to access an unauthorized route
    const roleDashboardMap = {
      [ROLES.MANAGER]: '/dashboard/manager',
      [ROLES.LEAD]: '/dashboard/lead',
      [ROLES.PHOTOGRAPHER]: '/dashboard/photographer',
      [ROLES.EDITOR]: '/dashboard/editor',
      [ROLES.CONTENT_CREATOR]: '/dashboard/content-creator',
    };
    return <Navigate to={roleDashboardMap[user.role] || '/login'} replace />;
  }

  return children ? children : <Outlet />;
};

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <DataProvider>
            <Router>
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/" element={<Navigate to="/login" replace />} />

                {/* Protected Dashboard Routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  {/* Redirect /dashboard to specific role dashboard */}
                  <Route index element={<Navigate to="/dashboard/manager" replace />} />

                  {/* Role-specific Dashboards */}
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

                  {/* Feature Pages */}
                  <Route path="clients" element={<ProtectedRoute><ClientsPage /></ProtectedRoute>} />
                  <Route path="shoots" element={<ProtectedRoute><ShootsPage /></ProtectedRoute>} />
                  <Route path="calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
                  <Route path="assign-tasks" element={<ProtectedRoute><AssignTasksPage /></ProtectedRoute>} />
                  <Route path="team" element={<ProtectedRoute><TeamPage /></ProtectedRoute>} />
                  <Route path="leave-requests" element={<ProtectedRoute><LeaveRequestsPage /></ProtectedRoute>} />
                  <Route path="attendance" element={<ProtectedRoute><AttendancePage /></ProtectedRoute>} />
                  <Route path="active-work" element={<ProtectedRoute><ActiveWorkPage /></ProtectedRoute>} />
                  <Route path="active-editing" element={<ProtectedRoute><ActiveEditingPage /></ProtectedRoute>} />
                  <Route path="settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                </Route>

                {/* Catch all - redirect to login */}
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </Router>
          </DataProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
