/**
 * Google OAuth2 Authentication Service
 * Handles OAuth2 flow for Google Sheets API write operations
 */

class GoogleAuth {
  constructor() {
    this.clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
    this.accessToken = localStorage.getItem('google_access_token') || null;
    this.tokenExpiry = localStorage.getItem('google_token_expiry') ? parseInt(localStorage.getItem('google_token_expiry')) : null;
    this.refreshToken = localStorage.getItem('google_refresh_token') || null;
    this.refreshTimer = null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    if (!this.accessToken) {
      // If no access token but we have refresh token, we can still authenticate
      return !!this.refreshToken;
    }
    if (this.tokenExpiry && Date.now() > this.tokenExpiry) {
      // Token expired, but don't clear if we have refresh token
      if (!this.refreshToken) {
      this.clearToken();
      return false;
      }
      // We can refresh, so still considered authenticated
      return true;
    }
    return true;
  }

  /**
   * Get valid access token, automatically refresh if needed
   */
  async getAccessToken() {
    // If we have a valid token, return it
    if (this.isAuthenticated()) {
      // Check if token expires soon (within 5 minutes) and refresh proactively
      if (this.tokenExpiry && (this.tokenExpiry - Date.now()) < 5 * 60 * 1000) {
        try {
          await this.refreshAccessToken();
        } catch (err) {
          console.warn('Failed to refresh token proactively:', err);
          // Continue with current token if refresh fails
        }
      }
      return this.accessToken;
    }

    // If token expired but we have refresh token, try to refresh
    if (this.refreshToken) {
      try {
        await this.refreshAccessToken();
        return this.accessToken;
      } catch (err) {
        console.error('Failed to refresh token:', err);
        // Clear invalid refresh token
        this.clearToken();
      }
    }

    // Otherwise, need to authenticate
    throw new Error('Not authenticated. Please sign in with Google.');
  }

  /**
   * Initiate OAuth2 flow with refresh token support
   */
  async signIn() {
    if (!this.clientId) {
      throw new Error('Google Client ID not configured. Please add VITE_GOOGLE_CLIENT_ID to .env file');
    }

    return new Promise((resolve, reject) => {
      // Wait for Google Identity Services to load
      const trySignIn = () => {
        if (window.google && window.google.accounts && window.google.accounts.oauth2) {
          try {
            const client = window.google.accounts.oauth2.initTokenClient({
              client_id: this.clientId,
              scope: 'https://www.googleapis.com/auth/spreadsheets',
              callback: async (response) => {
                if (response.error) {
                  reject(new Error(response.error));
                  return;
                }
                
                // Store access token
                this.setToken(response.access_token, response.expires_in || 3600);
                
                // If we got a refresh token, store it
                if (response.refresh_token) {
                  this.refreshToken = response.refresh_token;
                  localStorage.setItem('google_refresh_token', response.refresh_token);
                }
                
                // Start auto-refresh timer
                this.startAutoRefresh();
                
                resolve(response.access_token);
              },
            });
            
            // Request offline access to get refresh token
            // Use 'consent' prompt to ensure we get refresh token
            // Note: Google Identity Services token client doesn't directly provide refresh tokens
            // Refresh tokens are typically obtained via authorization code flow
            // For now, we'll handle token refresh when available
            client.requestAccessToken({ 
              prompt: 'consent'
            });
          } catch (err) {
            reject(new Error('Failed to initialize OAuth client: ' + err.message));
          }
        } else {
          // Wait a bit and try again
          setTimeout(() => {
            if (Date.now() - startTime > 10000) {
              reject(new Error('Google Identity Services failed to load. Please refresh the page.'));
            } else {
              trySignIn();
            }
          }, 500);
        }
      };

      const startTime = Date.now();
      trySignIn();
    });
  }

  /**
   * Refresh access token using refresh token (if available) or re-authenticate
   */
  async refreshAccessToken() {
    // If we have a refresh token, use it
    if (this.refreshToken) {
      if (!this.clientId) {
        throw new Error('Google Client ID not configured');
      }

      try {
        // Use Google's token endpoint to refresh
        const response = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: this.clientId,
            refresh_token: this.refreshToken,
            grant_type: 'refresh_token',
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          // If refresh token is invalid, clear it and re-authenticate
          if (errorData.error === 'invalid_grant') {
            this.refreshToken = null;
            localStorage.removeItem('google_refresh_token');
            throw new Error('Refresh token expired. Please sign in again.');
          }
          throw new Error(errorData.error || 'Failed to refresh token');
        }

        const data = await response.json();
        
        // Update access token
        this.setToken(data.access_token, data.expires_in || 3600);
        
        // If new refresh token provided, update it
        if (data.refresh_token) {
          this.refreshToken = data.refresh_token;
          localStorage.setItem('google_refresh_token', data.refresh_token);
        }
        
        return this.accessToken;
      } catch (error) {
        console.error('Token refresh error:', error);
        // If refresh fails and it's not an invalid grant, clear tokens
        if (!error.message.includes('expired')) {
          this.clearToken();
        }
        throw error;
      }
    } else {
      // No refresh token - need to re-authenticate
      // Google Identity Services will use cached consent if available
      throw new Error('No refresh token available. Please sign in again.');
    }
  }

  /**
   * Start automatic token refresh before expiry
   */
  startAutoRefresh() {
    // Clear existing timer
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    // Check every minute if token needs refresh
    this.refreshTimer = setInterval(() => {
      if (this.tokenExpiry) {
        // Refresh if token expires within 5 minutes
        if ((this.tokenExpiry - Date.now()) < 5 * 60 * 1000) {
          this.refreshAccessToken().catch(err => {
            console.warn('Auto-refresh failed:', err);
            // If refresh fails, user will need to re-authenticate on next operation
          });
        }
      }
    }, 60 * 1000); // Check every minute
  }

  /**
   * Stop automatic token refresh
   */
  stopAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Check if refresh token is available
   */
  hasRefreshToken() {
    return !!this.refreshToken;
  }

  /**
   * Sign in using popup (fallback method)
   */
  async signInWithPopup() {
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(this.clientId)}&` +
      `redirect_uri=${encodeURIComponent(window.location.origin)}&` +
      `response_type=token&` +
      `scope=${encodeURIComponent('https://www.googleapis.com/auth/spreadsheets')}&` +
      `include_granted_scopes=true`;

    return new Promise((resolve, reject) => {
      const popup = window.open(
        authUrl,
        'Google Sign In',
        'width=500,height=600,left=100,top=100'
      );

      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          if (!this.isAuthenticated()) {
            reject(new Error('Authentication cancelled'));
          }
        }
      }, 1000);

      // Listen for message from popup
      const messageListener = (event) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
          this.setToken(event.data.access_token, event.data.expires_in);
          clearInterval(checkClosed);
          window.removeEventListener('message', messageListener);
          popup.close();
          resolve(event.data.access_token);
        } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageListener);
          popup.close();
          reject(new Error(event.data.error));
        }
      };

      window.addEventListener('message', messageListener);
    });
  }

  /**
   * Set access token
   */
  setToken(accessToken, expiresIn) {
    this.accessToken = accessToken;
    // Calculate expiry time (expiresIn is in seconds)
    this.tokenExpiry = Date.now() + (expiresIn * 1000) - 60000; // Subtract 1 minute buffer
    
    localStorage.setItem('google_access_token', accessToken);
    localStorage.setItem('google_token_expiry', this.tokenExpiry.toString());
    
    // Start auto-refresh if we have refresh token
    if (this.refreshToken) {
      this.startAutoRefresh();
    }
  }

  /**
   * Clear access token and refresh token
   */
  clearToken() {
    this.stopAutoRefresh();
    this.accessToken = null;
    this.tokenExpiry = null;
    this.refreshToken = null;
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_token_expiry');
    localStorage.removeItem('google_refresh_token');
  }

  /**
   * Sign out
   */
  signOut() {
    this.clearToken();
    if (window.google && window.google.accounts) {
      window.google.accounts.oauth2.revoke(this.accessToken, () => {});
    }
  }
}

// Export singleton instance
export const googleAuth = new GoogleAuth();
export default GoogleAuth;

