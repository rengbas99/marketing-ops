import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

// Role-based route mapping
const roleRoutes = {
  manager: '/dashboard/manager',
  lead: '/dashboard/lead',
  photographer: '/dashboard/photographer',
  editor: '/dashboard/editor',
  content_creator: '/dashboard/content-creator',
};

// Helper function to load user from localStorage synchronously
const loadUserFromStorage = () => {
  try {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      return JSON.parse(storedUser);
    }
  } catch (err) {
    console.error('Error parsing stored user:', err);
    localStorage.removeItem('user');
  }
  return null;
};

export function AuthProvider({ children }) {
  // Initialize user state synchronously from localStorage
  const [user, setUser] = useState(() => loadUserFromStorage());
  const [loading, setLoading] = useState(true);

  // Load stored user and set up listeners
  useEffect(() => {
    // Important: only mark loading finished **after** we have attempted to read
    // User is already loaded synchronously in useState initializer
    setLoading(false);

    // Cross-tab authentication sync
    const handleStorageChange = (e) => {
      if (e.key === 'user') {
        if (e.newValue) {
          try {
            setUser(JSON.parse(e.newValue));
          } catch (err) {
            console.error('Error parsing user from storage event:', err);
          }
        } else {
          // User logged out in another tab
          setUser(null);
        }
      }
    };

    // Listen for storage changes (cross-tab sync)
    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom events (same-tab sync)
    const handleUserUpdate = (e) => {
      if (e.detail?.user !== undefined) {
        setUser(e.detail.user);
      }
    };
    window.addEventListener('userUpdated', handleUserUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userUpdated', handleUserUpdate);
    };
  }, []);

  const login = async (email, password) => {
    // Try Firebase first, then fallback to Google Sheets
    try {
      let users = [];
      let lastError = null;
      const maxRetries = 3;
      
      // Step 1: Try Firebase first (if available)
      const { isFirebaseAvailable, getCollection } = await import('../services/firebaseService');
      
      if (isFirebaseAvailable()) {
        try {
          console.log('🔐 Attempting login via Firebase...');
          users = await getCollection('Users');
          
          if (Array.isArray(users) && users.length > 0) {
            console.log('✅ Login data loaded from Firebase');
          } else {
            // Firebase has no data, fall through to Google Sheets
            console.log('⚠️ Firebase Users collection is empty, falling back to Google Sheets');
            users = [];
          }
        } catch (firebaseError) {
          console.warn('Firebase login attempt failed, falling back to Google Sheets:', firebaseError.message);
          users = []; // Reset to try Google Sheets
        }
      }
      
      // Step 2: Fallback to Google Sheets if Firebase failed or has no data
      if (!Array.isArray(users) || users.length === 0) {
        const { sheetsAPI } = await import('../services/sheetsApi');
        
        // Check if API is configured
        const hasApiKey = import.meta.env.VITE_GOOGLE_API_KEY && import.meta.env.VITE_GOOGLE_API_KEY !== 'your_api_key_here';
        const hasSheetId = import.meta.env.VITE_GOOGLE_SHEET_ID && import.meta.env.VITE_GOOGLE_SHEET_ID !== 'your_sheet_id_here';
        
        if (!hasApiKey || !hasSheetId) {
          return { success: false, error: 'Authentication service not available. Please check your configuration.' };
        }

        // Retry logic for fetching users from Google Sheets (3 attempts with exponential backoff)
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            users = await sheetsAPI.getSheetData('Users');
      
            // If we got data (even if empty), break out of retry loop
            if (Array.isArray(users)) {
              console.log('✅ Login data loaded from Google Sheets');
              break;
            }
          } catch (error) {
            lastError = error;
            console.warn(`Login attempt ${attempt + 1}/${maxRetries} failed:`, error);
            
            // Don't retry on last attempt
            if (attempt < maxRetries - 1) {
              // Exponential backoff: 1s, 2s
              const delay = 1000 * Math.pow(2, attempt);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }
        
        // If all retries failed
        if (!Array.isArray(users)) {
          console.error('All login retry attempts failed:', lastError);
          return { success: false, error: 'Unable to connect to authentication service. Please check your internet connection and try again.' };
        }
      }
      
      // If no users found from either source
      if (!Array.isArray(users) || users.length === 0) {
        return { success: false, error: 'No users found. Please contact your administrator.' };
      }
      
      // Normalize email for comparison (trim and lowercase)
      const normalizedEmail = email.trim().toLowerCase();
      
      // Find user by email (case-insensitive, trimmed)
      // Handle both Firebase and Google Sheets data formats
      const user = users.find(u => {
        if (!u || typeof u !== 'object') return false;
        const userEmail = (u.email || u.Email || '').trim().toLowerCase();
        return userEmail === normalizedEmail;
      });
      
      if (!user) {
        // User not found
        return { success: false, error: 'Invalid email or password. Please check your credentials and try again.' };
      }

      // Check if user is active (handle both string and boolean formats)
      const isActive = user.active !== undefined ? user.active : user.Active;
      if (isActive === 'FALSE' || isActive === false || isActive === 'false') {
        return { success: false, error: 'Your account has been deactivated. Please contact your manager.' };
      }

      // Validate password
      if (!password || password.trim() === '') {
        return { success: false, error: 'Password is required.' };
      }

      // Check password (handle both lowercase and original case field names)
      const storedPassword = (user.password || user.Password || '').trim();
      const inputPassword = password.trim();
      if (storedPassword !== inputPassword) {
        return { success: false, error: 'Invalid email or password. Please check your credentials and try again.' };
      }

      // Password matches - login successful
      // Extract user data (handle both Firebase and Google Sheets field name formats)
      const userData = {
        email: user.email || user.Email || normalizedEmail,
        name: user.name || user.Name || email.split('@')[0],
        role: (user.role || user.Role || 'content_creator').toLowerCase(),
        avatar: user.avatar || user.Avatar || '',
      };
      
      // Validate required fields
      if (!userData.email) {
        return { success: false, error: 'User data is invalid. Please contact your administrator.' };
      }
        
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      // Dispatch custom event for same-tab sync
      window.dispatchEvent(new CustomEvent('userUpdated', { detail: { user: userData } }));
      return { success: true, user: userData };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'An unexpected error occurred. Please try again.' };
    }
  };

  const loginWithGoogle = async () => {
    // Google OAuth implementation
    // For MVP: This would integrate with Google OAuth to get user info
    // For now, redirect to regular login flow
    try {
      return { success: false, error: 'Google OAuth login not yet implemented. Please use email login.' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    // Dispatch custom event for same-tab sync
    window.dispatchEvent(new CustomEvent('userUpdated', { detail: { user: null } }));
  };

  const getRoleRoute = (role) => {
    return roleRoutes[role] || '/dashboard';
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    loginWithGoogle,
    logout,
    getRoleRoute,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

