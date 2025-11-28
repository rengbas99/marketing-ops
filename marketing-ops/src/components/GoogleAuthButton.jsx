import { useState, useEffect } from 'react';
import { googleAuth } from '../services/googleAuth';
import { useToast } from './Toast';
import { LogIn, LogOut, CheckCircle, AlertCircle } from 'lucide-react';

export default function GoogleAuthButton() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { success, error, info } = useToast();

  useEffect(() => {
    // Check authentication status on mount
    const isAuth = googleAuth.isAuthenticated();
    setIsAuthenticated(isAuth);

    // If authenticated and we have refresh token, start auto-refresh
    if (isAuth && googleAuth.hasRefreshToken()) {
      googleAuth.startAutoRefresh();
    }

    // Check if Google Identity Services is loaded
    if (window.google && window.google.accounts) {
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
      });
    }

    // Cleanup on unmount
    return () => {
      if (googleAuth.refreshTimer) {
        googleAuth.stopAutoRefresh();
      }
    };
  }, []);

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      await googleAuth.signIn();
      setIsAuthenticated(true);

      // Check if we got a refresh token
      const hasRefreshToken = googleAuth.hasRefreshToken();
      if (hasRefreshToken) {
        success('Successfully signed in with Google! Your connection will stay active automatically.');
      } else {
        success('Successfully signed in with Google! You can now save data to Google Sheets. Note: You may need to re-authenticate after 1 hour.');
      }

      // Notify sheetsApi to use the new token
      const { sheetsAPI } = await import('../services/sheetsApi');
      sheetsAPI.setAuthTokenGetter(async () => {
        try {
          if (googleAuth.isAuthenticated()) {
            return await googleAuth.getAccessToken();
          }
          return null;
        } catch (err) {
          console.warn('Error getting access token:', err);
          return null;
        }
      });
    } catch (err) {
      console.error('Google sign-in error:', err);
      if (err.message.includes('popup_closed') || err.message.includes('cancelled') || err.message.includes('user_cancelled')) {
        info('Sign-in cancelled');
      } else {
        error('Failed to sign in with Google: ' + err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = () => {
    googleAuth.signOut();
    setIsAuthenticated(false);
    info('Signed out from Google. Data will be saved locally.');
  };

  // Don't show if client ID is not configured
  if (!import.meta.env.VITE_GOOGLE_CLIENT_ID || import.meta.env.VITE_GOOGLE_CLIENT_ID === 'your_client_id_here') {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="glass-card p-4 max-w-xs backdrop-blur-md bg-white/90 border border-white/20 shadow-2xl">
        {isAuthenticated ? (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-green-600">
              <div className="relative">
                <CheckCircle className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              </div>
              <span className="text-sm font-bold">Google Connected</span>
            </div>
            <button
              onClick={handleSignOut}
              className="ml-auto px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1 font-bold text-gray-600"
              title="Sign out from Google"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm font-bold">Enable Google Sheets Sync</span>
            </div>
            <p className="text-xs text-gray-600 font-medium leading-relaxed">
              Sign in with Google to save data directly to your Google Sheets.
            </p>
            <button
              onClick={handleSignIn}
              disabled={isLoading}
              className="mt-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign in with Google
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
