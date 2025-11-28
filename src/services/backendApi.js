/**
 * Backend API Client
 * Handles all write operations through serverless backend
 * Uses Service Account (no OAuth needed)
 */

class BackendAPI {
  constructor() {
    // Use environment variable for API URL, fallback to relative path for Vercel
    this.apiUrl = import.meta.env.VITE_API_URL || '/api';
  }

  /**
   * Fetch with timeout and retry
   */
  async fetchWithRetry(url, options, maxRetries = 3) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
        
        try {
          const response = await fetch(url, {
            ...options,
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          return response;
        } catch (fetchError) {
          clearTimeout(timeoutId);
          if (fetchError.name === 'AbortError') {
            throw new Error(`Request timeout after 15s`);
          }
          throw fetchError;
        }
      } catch (error) {
        // Don't retry on 404 (API not found)
        if (error.message.includes('404') || error.message.includes('not found')) {
          throw error;
        }
        
        // Don't retry on last attempt
        if (attempt === maxRetries - 1) {
          throw error;
        }
        
        // Exponential backoff: 1s, 2s, 4s
        const delay = 1000 * Math.pow(2, attempt);
        console.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Append a new row to a sheet via backend API
   */
  async appendRow(sheetName, rowData) {
    try {
      const response = await this.fetchWithRetry(
        `${this.apiUrl}/write`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sheetName,
            rowData,
          }),
        },
        3 // max retries
      );

      if (!response.ok) {
        // Handle 404 - API endpoint not found (local development without Vercel CLI)
        if (response.status === 404) {
          throw new Error(
            `Backend API not found. For local development, run: npx vercel dev\n` +
            `Or deploy to Vercel for production. Error: ${response.statusText}`
          );
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to write to ${sheetName}: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error(`Error appending row to ${sheetName}:`, error);
      throw error;
    }
  }

  /**
   * Update a specific row in a sheet via backend API
   */
  async updateRow(sheetName, rowIndex, rowData) {
    try {
      const response = await this.fetchWithRetry(
        `${this.apiUrl}/update`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sheetName,
            rowIndex,
            rowData,
          }),
        },
        3 // max retries
      );

      if (!response.ok) {
        // Handle 404 - API endpoint not found (local development without Vercel CLI)
        if (response.status === 404) {
          throw new Error(
            `Backend API not found. For local development, run: npx vercel dev\n` +
            `Or deploy to Vercel for production. Error: ${response.statusText}`
          );
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to update ${sheetName}: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error(`Error updating row in ${sheetName}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const backendAPI = new BackendAPI();
export default BackendAPI;

