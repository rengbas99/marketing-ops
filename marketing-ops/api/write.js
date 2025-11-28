/**
 * Serverless API endpoint for writing to Google Sheets
 * Uses Service Account for authentication (no OAuth needed)
 */

import { google } from 'googleapis';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sheetName, rowData } = req.body;

    if (!sheetName || !rowData) {
      return res.status(400).json({ error: 'Missing sheetName or rowData' });
    }

    // Validate Clients data
    if (sheetName === 'Clients') {
      // Log for debugging
      console.log('Client data keys:', Object.keys(rowData));
      
      // Ensure company_name exists
      if (!rowData.company_name) {
        return res.status(400).json({ error: 'company_name is required' });
      }
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
    }

    // If no headers, use rowData keys as headers
    if (headers.length === 0) {
      headers = Object.keys(rowData);
      // Try to create headers row
      try {
        await sheets.spreadsheets.values.update({
          spreadsheetId: process.env.GOOGLE_SHEET_ID,
          range: `${sheetName}!A1:${String.fromCharCode(65 + headers.length - 1)}1`,
          valueInputOption: 'RAW',
          resource: {
            values: [headers],
          },
        });
      } catch (err) {
        console.warn(`Could not create headers for ${sheetName}:`, err.message);
      }
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

    // Append row to sheet
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [values],
      },
    });

    return res.status(200).json({ 
      success: true, 
      updatedCells: response.data.updates?.updatedCells || 0,
      updatedRange: response.data.updates?.updatedRange || null,
    });
  } catch (error) {
    console.error('Error writing to Google Sheets:', error);
    return res.status(500).json({ 
      error: 'Failed to write to Google Sheets',
      message: error.message,
    });
  }
}

