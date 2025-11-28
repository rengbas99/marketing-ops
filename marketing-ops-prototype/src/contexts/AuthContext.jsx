import { createContext, useContext, useState, useEffect } from 'react';
import { mockDataService, delay } from '../services/mockDataService';
import { ROLES } from '../constants';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored user session
    const storedUser = localStorage.getItem('mock_user_session');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    await delay(500); // Simulate API delay
    
    const users = mockDataService.getAll('USERS');
    const foundUser = users.find(
      u => u.email.toLowerCase() === email.toLowerCase().trim() &&
           u.password === password.trim() &&
           u.active
    );

    if (!foundUser) {
      throw new Error('Invalid email or password');
    }

    const userData = {
      email: foundUser.email,
      name: foundUser.name,
      role: foundUser.role,
      avatar: foundUser.avatar,
    };

    setUser(userData);
    localStorage.setItem('mock_user_session', JSON.stringify(userData));
    return { success: true, user: userData };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('mock_user_session');
  };

  const getRoleRoute = (role) => {
    const roleRouteMap = {
      [ROLES.MANAGER]: '/dashboard/manager',
      [ROLES.LEAD]: '/dashboard/lead',
      [ROLES.PHOTOGRAPHER]: '/dashboard/photographer',
      [ROLES.EDITOR]: '/dashboard/editor',
      [ROLES.CONTENT_CREATOR]: '/dashboard/content-creator',
    };
    return roleRouteMap[role] || '/dashboard';
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    getRoleRoute,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

