/**
 * Serverless API endpoint for updating rows in Google Sheets
 * Uses Service Account for authentication (no OAuth needed)
 */

import { google } from 'googleapis';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sheetName, rowIndex, rowData } = req.body;

    if (!sheetName || !rowIndex || !rowData) {
      return res.status(400).json({ error: 'Missing sheetName, rowIndex, or rowData' });
    }

    // Check if Service Account is configured
    if (!process.env.SERVICE_ACCOUNT_KEY) {
      return res.status(500).json({ 
        error: 'Service Account not configured. Please add SERVICE_ACCOUNT_KEY to environment variables.' 
      });
    }

    if (!process.env.GOOGLE_SHEET_ID) {
      return res.status(500).json({ 
        error: 'Google Sheet ID not configured. Please add GOOGLE_SHEET_ID to environment variables.' 
      });
    }

    // Initialize Google Auth with Service Account
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.SERVICE_ACCOUNT_KEY),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Get existing headers to determine column order
    let headers = [];
    try {
      const headerResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: `${sheetName}!A1:Z1`,
      });
      headers = headerResponse.data.values?.[0] || [];
      // Clean headers (remove empty strings, trim whitespace)
      headers = headers.map(h => (h || '').trim()).filter(h => h.length > 0);
    } catch (err) {
      console.warn(`Could not fetch headers for ${sheetName}, will use rowData keys`);
      headers = Object.keys(rowData);
    }

    // If no headers, use rowData keys
    if (headers.length === 0) {
      headers = Object.keys(rowData);
    }

    // Normalize header names (case-insensitive matching)
    const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
    const rowDataKeys = Object.keys(rowData);
    
    // Map rowData to header order, with case-insensitive matching
    const values = headers.map((header, index) => {
      // Try exact match first
      if (rowData.hasOwnProperty(header)) {
        const value = rowData[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
      }
      
      // Try case-insensitive match
      const normalizedHeader = normalizedHeaders[index];
      const matchingKey = rowDataKeys.find(key => key.toLowerCase().trim() === normalizedHeader);
      if (matchingKey) {
        const value = rowData[matchingKey];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
      }
      
      // No match found, return empty string
      return '';
    });

    // Determine the range (A{rowIndex}:{lastColumn}{rowIndex})
    const lastCol = headers.length > 0 ? String.fromCharCode(64 + Math.min(headers.length, 26)) : 'Z';
    const range = `${sheetName}!A${rowIndex}:${lastCol}${rowIndex}`;

    // Update the row
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: range,
      valueInputOption: 'RAW',
      resource: {
        values: [values],
      },
    });

    return res.status(200).json({ 
      success: true, 
      updatedCells: response.data.updatedCells || 0,
      updatedRange: response.data.updatedRange || null,
    });
  } catch (error) {
    console.error('Error updating Google Sheets:', error);
    return res.status(500).json({ 
      error: 'Failed to update Google Sheets',
      message: error.message,
    });
  }
}

