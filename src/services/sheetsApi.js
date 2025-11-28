/**
 * Google Sheets API Service
 * Handles all communication with Google Sheets
 */

class SheetsAPI {
  constructor(spreadsheetId, apiKey) {
    this.baseURL = 'https://sheets.googleapis.com/v4/spreadsheets';
    this.spreadsheetId = spreadsheetId;
    this.apiKey = apiKey;
    this.getAccessToken = null; // Will be set by setAuthTokenGetter
  }

  /**
   * Set function to get OAuth access token
   */
  setAuthTokenGetter(getTokenFn) {
    this.getAccessToken = getTokenFn;
  }

  /**
   * Parse sheet data from Google Sheets format to array of objects
   */
  parseSheetData(rows) {
    if (!rows || rows.length === 0) return [];
    
    const [headers, ...dataRows] = rows;
    return dataRows
      .filter(row => row && row.length > 0) // Filter empty rows
      .map(row => {
        const obj = {};
        headers.forEach((header, i) => {
          obj[header] = row[i] || '';
        });
        return obj;
      });
  }

  /**
   * Retry helper with exponential backoff
   */
  async retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        // Don't retry on 400/404 (sheet doesn't exist)
        if (error.status === 400 || error.status === 404) {
          throw error;
        }
        
        // Don't retry on last attempt
        if (attempt === maxRetries - 1) {
          throw error;
        }
        
        // Exponential backoff: 1s, 2s, 4s
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Fetch with timeout
   */
  async fetchWithTimeout(url, options = {}, timeout = 10000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * Get all data from a sheet with retry and timeout
   */
  async getSheetData(sheetName, retryCount = 0) {
    if (!this.spreadsheetId || !this.apiKey) {
      console.warn('Google Sheets credentials not configured. Please add VITE_GOOGLE_SHEET_ID and VITE_GOOGLE_API_KEY to .env file');
      return []; // Return empty array instead of throwing
    }

    const maxRetries = 3;
    const url = `${this.baseURL}/${this.spreadsheetId}/values/${sheetName}?key=${this.apiKey}`;

    // Use retry helper for network errors
    try {
      const response = await this.retryWithBackoff(
        async () => {
          const res = await this.fetchWithTimeout(url, {}, 10000); // 10 second timeout
          
          if (!res.ok) {
        // Handle 400 (sheet doesn't exist or bad request) gracefully
            if (res.status === 400) {
          console.warn(`Sheet "${sheetName}" not found or invalid (400 error). Please create this sheet in Google Sheets.`);
              const error = new Error(`Sheet "${sheetName}" not found`);
              error.status = 400;
              throw error;
        }
        // Handle 404 (sheet doesn't exist) gracefully
            if (res.status === 404) {
          console.warn(`Sheet "${sheetName}" not found (404 error). Please create this sheet in Google Sheets.`);
              const error = new Error(`Sheet "${sheetName}" not found`);
              error.status = 404;
              throw error;
            }
            // Handle 429 (rate limit) - retry with longer delay
            if (res.status === 429) {
              const error = new Error(`Rate limit exceeded for ${sheetName}`);
              error.status = 429;
              throw error;
            }
            // Handle 500/503 (server errors) - retry
            if (res.status >= 500) {
              const error = new Error(`Server error for ${sheetName}: ${res.statusText}`);
              error.status = res.status;
              throw error;
        }
            throw new Error(`Failed to fetch ${sheetName}: ${res.statusText}`);
      }
          
          return res;
        },
        maxRetries,
        1000 // Start with 1 second delay
      );
      
      const data = await response.json();
      return this.parseSheetData(data.values || []);
    } catch (error) {
      // For 400/404, return empty array (sheet doesn't exist)
      if (error.status === 400 || error.status === 404) {
        return [];
      }
      
      console.error(`Error fetching ${sheetName} after ${maxRetries} retries:`, error.message);
      // Return empty array instead of throwing to prevent app crash
      // But log the error for debugging
      return [];
    }
  }

  /**
   * Append a new row to a sheet
   */
  async appendRow(sheetName, rowData) {
    if (!this.spreadsheetId || !this.apiKey) {
      throw new Error('Google Sheets credentials not configured');
    }

    try {
      let headers = await this.getSheetHeaders(sheetName);
      
      // If no headers found (empty sheet or doesn't exist), use rowData keys
      if (!headers || headers.length === 0) {
        console.warn(`Sheet "${sheetName}" appears to be empty or doesn't exist. Using rowData keys as headers.`);
        headers = Object.keys(rowData);
        
        // First, try to create headers row if sheet exists but is empty
        try {
          const accessToken = this.getAccessToken ? await this.getAccessToken().catch(() => null) : null;
          const url = accessToken 
            ? `${this.baseURL}/${this.spreadsheetId}/values/${sheetName}!A1:${String.fromCharCode(65 + headers.length - 1)}1?valueInputOption=RAW`
            : `${this.baseURL}/${this.spreadsheetId}/values/${sheetName}!A1:${String.fromCharCode(65 + headers.length - 1)}1?valueInputOption=RAW&key=${this.apiKey}`;
          
          await fetch(url, {
            method: 'PUT',
            headers: { 
              'Content-Type': 'application/json',
              ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
            },
            body: JSON.stringify({ values: [headers] })
          });
        } catch (headerError) {
          console.warn(`Could not create headers for ${sheetName}, will try to append anyway:`, headerError);
        }
      }
      
      const values = headers.map(header => {
        const value = rowData[header];
        // Handle null/undefined
        if (value === null || value === undefined) return '';
        // Convert objects/arrays to JSON strings
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
      });
      
      // Try with OAuth token first, fallback to API key
      const accessToken = this.getAccessToken ? await this.getAccessToken().catch(() => null) : null;
      const url = accessToken 
        ? `${this.baseURL}/${this.spreadsheetId}/values/${sheetName}:append?valueInputOption=RAW`
        : `${this.baseURL}/${this.spreadsheetId}/values/${sheetName}:append?valueInputOption=RAW&key=${this.apiKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
        },
        body: JSON.stringify({ values: [values] })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || response.statusText;
        
        // Check if it's an OAuth2 authentication error
        if (errorMessage.includes('OAuth2') || errorMessage.includes('API keys are not supported') || errorMessage.includes('authentication credentials') || response.status === 401) {
          const oauthError = new Error(`OAuth2_REQUIRED: Write operations require OAuth2 authentication. API keys only work for read-only access. The app will use local storage for now.`);
          oauthError.isOAuthError = true;
          throw oauthError;
        }
        
        throw new Error(`Failed to append row to ${sheetName}: ${errorMessage}. Please ensure the sheet exists and has proper headers.`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error appending row to ${sheetName}:`, error);
      throw error;
    }
  }

  /**
   * Update a specific row in a sheet
   */
  async updateRow(sheetName, rowIndex, rowData) {
    if (!this.spreadsheetId || !this.apiKey) {
      throw new Error('Google Sheets credentials not configured');
    }

    try {
      let headers = await this.getSheetHeaders(sheetName);
      
      // If no headers found, use rowData keys
      if (!headers || headers.length === 0) {
        console.warn(`Sheet "${sheetName}" appears to be empty. Using rowData keys as headers.`);
        headers = Object.keys(rowData);
      }
      
      const values = headers.map(header => {
        const value = rowData[header];
        // Handle null/undefined
        if (value === null || value === undefined) return '';
        // Convert objects/arrays to JSON strings
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
      });
      
      const lastCol = headers.length > 0 ? String.fromCharCode(64 + Math.min(headers.length, 26)) : 'Z';
      const range = `${sheetName}!A${rowIndex}:${lastCol}${rowIndex}`;
      
      // Try with OAuth token first, fallback to API key
      const accessToken = this.getAccessToken ? await this.getAccessToken().catch(() => null) : null;
      const url = accessToken 
        ? `${this.baseURL}/${this.spreadsheetId}/values/${range}?valueInputOption=RAW`
        : `${this.baseURL}/${this.spreadsheetId}/values/${range}?valueInputOption=RAW&key=${this.apiKey}`;
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
        },
        body: JSON.stringify({ values: [values] })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || response.statusText;
        
        // Check if it's an OAuth2 authentication error
        if (errorMessage.includes('OAuth2') || errorMessage.includes('API keys are not supported') || errorMessage.includes('authentication credentials') || response.status === 401) {
          const oauthError = new Error(`OAuth2_REQUIRED: Write operations require OAuth2 authentication. API keys only work for read-only access. The app will use local storage for now.`);
          oauthError.isOAuthError = true;
          throw oauthError;
        }
        
        throw new Error(`Failed to update row in ${sheetName}: ${errorMessage}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error updating row in ${sheetName}:`, error);
      throw error;
    }
  }

  /**
   * Get sheet headers (first row)
   * Returns empty array if sheet doesn't exist or is empty
   */
  async getSheetHeaders(sheetName) {
    if (!this.spreadsheetId || !this.apiKey) {
      console.warn('Google Sheets credentials not configured');
      return [];
    }

    try {
      const response = await fetch(
        `${this.baseURL}/${this.spreadsheetId}/values/${sheetName}!A1:Z1?key=${this.apiKey}`
      );
      
      if (!response.ok) {
        // If 404, sheet doesn't exist - return empty array
        if (response.status === 404) {
          console.warn(`Sheet "${sheetName}" not found. It may need to be created in Google Sheets.`);
          return [];
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to fetch headers from ${sheetName}: ${response.statusText} - ${errorData.error?.message || ''}`);
      }
      
      const data = await response.json();
      return data.values && data.values.length > 0 ? data.values[0] : [];
    } catch (error) {
      console.error(`Error fetching headers from ${sheetName}:`, error);
      // Return empty array instead of throwing - allows fallback to rowData keys
      return [];
    }
  }

  /**
   * Find row index by a unique identifier
   */
  async findRowIndex(sheetName, columnName, value) {
    try {
      const data = await this.getSheetData(sheetName);
      const headers = await this.getSheetHeaders(sheetName);
      const columnIndex = headers.indexOf(columnName);
      
      if (columnIndex === -1) {
        throw new Error(`Column ${columnName} not found in ${sheetName}`);
      }
      
      // Find row index (add 1 because row 1 is headers, data starts at row 2)
      const rowIndex = data.findIndex(row => row[columnName] === value);
      return rowIndex !== -1 ? rowIndex + 1 : -1;
    } catch (error) {
      console.error(`Error finding row in ${sheetName}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const sheetsAPI = new SheetsAPI(
  import.meta.env.VITE_GOOGLE_SHEET_ID || '',
  import.meta.env.VITE_GOOGLE_API_KEY || ''
);

export default SheetsAPI;

