import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { sheetsAPI } from '../services/sheetsApi';
import { backendAPI } from '../services/backendApi';
import {
  subscribeToCollection,
  addDocument,
  updateDocument,
  deleteDocument,
  getCollection,
  isFirebaseAvailable
} from '../services/firebaseService';
import { COLLECTIONS } from '../constants';
import { validateData, SCHEMAS } from '../types/schemas';
import { AppError, ErrorTypes, logError, getUserFriendlyMessage } from '../utils/errorHandling';
import { sheetsQueue } from '../services/sheetsQueue';

const DataContext = createContext();

// Smart polling manager
class DataSync {
  constructor() {
    this.pollInterval = 15000; // 15 seconds (reduced from 30)
    this.activePages = new Map(); // pageName -> Set of sheetNames
    this.lastFetch = {};
    this.debounceTimer = null;
    this.listeners = new Set();
    this.minFetchInterval = 10000; // 10 seconds minimum between fetches (reduced from 25)
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify(data) {
    this.listeners.forEach(callback => callback(data));
  }

  startPolling(pageName, sheetNames) {
    this.activePages.set(pageName, new Set(sheetNames));
    // Immediately fetch on page load
    this.scheduleFetch(sheetNames);
  }

  stopPolling(pageName) {
    this.activePages.delete(pageName);
  }

  // Get all unique sheets needed by active pages
  getAllActiveSheets() {
    const allSheets = new Set();
    this.activePages.forEach(sheetSet => {
      sheetSet.forEach(sheet => allSheets.add(sheet));
    });
    return Array.from(allSheets);
  }

  scheduleFetch(sheetNames) {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.fetchSheets(sheetNames, true); // true = force immediate
    }, 300); // Reduced debounce from 500ms
  }

  async fetchSheets(sheetNames, forceImmediate = false) {
    const now = Date.now();

    const needsFetch = sheetNames.filter(name => {
      if (forceImmediate) return true; // Force fetch on page load or manual refresh
      const lastFetchTime = this.lastFetch[name] || 0;
      return (now - lastFetchTime) > this.minFetchInterval;
    });

    if (needsFetch.length === 0) return;

    try {
      // Use Promise.allSettled instead of Promise.all to handle individual failures
      const promises = needsFetch.map(name =>
        sheetsAPI.getSheetData(name).catch(err => {
          console.error(`Failed to fetch ${name}:`, err);
          return []; // Return empty array on error to prevent blocking other sheets
        })
      );

      const results = await Promise.allSettled(promises);

      const data = {};
      needsFetch.forEach((name, index) => {
        const result = results[index];
        if (result.status === 'fulfilled') {
          data[name] = Array.isArray(result.value) ? result.value : [];
        } else {
          console.error(`Sheet ${name} fetch failed:`, result.reason);
          data[name] = []; // Use empty array on failure
        }
        // Only update lastFetch on successful fetch
        if (result.status === 'fulfilled') {
          this.lastFetch[name] = now;
        }
      });

      this.notify(data);
    } catch (error) {
      console.error('Error fetching sheets:', error);
      // Still notify with empty data to prevent UI blocking
      const data = {};
      needsFetch.forEach(name => {
        data[name] = [];
      });
      this.notify(data);
    }
  }

  // Force immediate refresh of specific sheets (after mutations)
  async forceRefresh(sheetNames) {
    sheetNames.forEach(name => {
      this.lastFetch[name] = 0; // Reset last fetch time
    });
    await this.fetchSheets(sheetNames, true);
  }

  startInterval() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.intervalId = setInterval(() => {
      if (this.activePages.size > 0) {
        // Fetch all sheets needed by active pages
        const allSheets = this.getAllActiveSheets();
        if (allSheets.length > 0) {
          this.fetchSheets(allSheets);
        }
      }
    }, this.pollInterval);
  }

  stopInterval() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

const dataSync = new DataSync();

// Define all sheet names that should be initialized
const SHEET_NAMES = Object.values(COLLECTIONS);

// Initialize empty data structure
const getEmptyData = () => {
  const empty = {};
  SHEET_NAMES.forEach(name => {
    empty[name] = [];
  });
  return empty;
};

export function DataProvider({ children }) {
  const [data, setData] = useState(getEmptyData());
  const [loading, setLoading] = useState({});
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [useFirebase, setUseFirebase] = useState(undefined); // undefined = not determined yet
  const firebaseUnsubscribes = useRef({}); // Store unsubscribe functions for Firebase listeners

  // Check if Firebase is available and initialize
  useEffect(() => {
    // Check Firebase config first
    const hasFirebaseConfig =
      import.meta.env.VITE_FIREBASE_API_KEY &&
      import.meta.env.VITE_FIREBASE_PROJECT_ID &&
      import.meta.env.VITE_FIREBASE_API_KEY !== 'your_apiKey_from_firebase_config';

    if (hasFirebaseConfig) {
      const firebaseAvailable = isFirebaseAvailable();
      setUseFirebase(firebaseAvailable);

      if (firebaseAvailable) {
        console.log('✅ Using Firebase for real-time updates');
      } else {
        console.log('⚠️ Firebase config present but initialization failed, using Google Sheets polling');
      }
    } else {
      console.log('ℹ️ Firebase not configured, using Google Sheets polling');
      setUseFirebase(false);
    }
  }, []);

  // Initialize OAuth token getter for write operations (fallback)
  useEffect(() => {
    // Set up OAuth token getter for sheetsAPI
    const setupOAuth = async () => {
      try {
        const { googleAuth } = await import('../services/googleAuth');
        sheetsAPI.setAuthTokenGetter(async () => {
          try {
            if (googleAuth.isAuthenticated()) {
              return await googleAuth.getAccessToken();
            }
            return null;
          } catch (err) {
            return null;
          }
        });
      } catch (err) {
        console.warn('OAuth setup failed:', err);
      }
    };
    setupOAuth();
  }, []);

  // Initial data fetch and setup listeners
  useEffect(() => {
    // Don't run until useFirebase is determined
    if (useFirebase === undefined) return;

    const fetchAllData = async () => {
      setLoading({ all: true });

      if (useFirebase) {
        // Use Firebase real-time listeners
        try {
          const newData = {};
          const unsubscribes = {};

          // Set up real-time listeners for each collection
          SHEET_NAMES.forEach(sheetName => {
            const unsubscribe = subscribeToCollection(sheetName, (collectionData) => {
              setData(prev => ({
                ...prev,
                [sheetName]: Array.isArray(collectionData) ? collectionData : []
              }));
              setIsConnected(true);
              setError(null);
            });

            unsubscribes[sheetName] = unsubscribe;
            newData[sheetName] = []; // Initialize empty
          });

          // Store unsubscribe functions
          firebaseUnsubscribes.current = unsubscribes;

          setData(newData);
          setIsConnected(true);
          setError(null);
        } catch (err) {
          const appError = new AppError(
            'Error setting up Firebase listeners',
            ErrorTypes.DATABASE,
            err,
            { collections: SHEET_NAMES }
          );
          logError(appError, { component: 'DataContext', action: 'fetchAllData-Firebase' });

          setData(getEmptyData());
          setIsConnected(false);
          setError(getUserFriendlyMessage(appError));
          setUseFirebase(false); // Fall back to Google Sheets
        } finally {
          setLoading({ all: false });
        }
      } else {
        // Use Google Sheets polling (fallback)
        try {
          // Check if API is configured
          const hasApiKey = import.meta.env.VITE_GOOGLE_API_KEY && import.meta.env.VITE_GOOGLE_API_KEY !== 'your_api_key_here';
          const hasSheetId = import.meta.env.VITE_GOOGLE_SHEET_ID && import.meta.env.VITE_GOOGLE_SHEET_ID !== 'your_sheet_id_here';

          if (hasApiKey && hasSheetId) {
            // Try to fetch from Google Sheets with individual error handling
            const promises = SHEET_NAMES.map(name =>
              sheetsAPI.getSheetData(name).catch(err => {
                console.error(`Failed to fetch ${name} on initial load:`, err);
                return []; // Return empty array on error
              })
            );

            // Use allSettled to handle individual failures
            const results = await Promise.allSettled(promises);

            const newData = {};
            let hasAnyData = false;
            SHEET_NAMES.forEach((name, index) => {
              const result = results[index];
              if (result.status === 'fulfilled') {
                newData[name] = Array.isArray(result.value) ? result.value : [];
                hasAnyData = true;
              } else {
                console.error(`Sheet ${name} failed to load:`, result.reason);
                newData[name] = [];
              }
            });

            setData(newData);
            setIsConnected(hasAnyData);
            setError(null);
          } else {
            const appError = new AppError(
              'Google Sheets API not configured',
              ErrorTypes.VALIDATION,
              null,
              { hasApiKey, hasSheetId }
            );
            logError(appError, { component: 'DataContext', action: 'fetchAllData-Sheets' });

            setData(getEmptyData());
            setIsConnected(false);
            setError('Google Sheets API not configured. Please configure your API key and Sheet ID.');
          }
        } catch (err) {
          const appError = new AppError(
            'Error fetching data from Google Sheets',
            ErrorTypes.DATABASE,
            err,
            { collections: SHEET_NAMES }
          );
          logError(appError, { component: 'DataContext', action: 'fetchAllData-Sheets' });

          setData(getEmptyData());
          setIsConnected(false);
          setError(getUserFriendlyMessage(appError));
        } finally {
          setLoading({ all: false });
        }
      }
    };

    fetchAllData();

    // Set up Google Sheets polling (only if not using Firebase)
    if (!useFirebase) {
      dataSync.startInterval();

      // Subscribe to polling updates
      const unsubscribe = dataSync.subscribe((newData) => {
        setData(prev => {
          const updated = { ...prev };
          Object.keys(newData).forEach(sheetName => {
            updated[sheetName] = Array.isArray(newData[sheetName]) ? newData[sheetName] : [];
          });
          return updated;
        });

        setIsConnected(prev => {
          const hasAnyResponse = Object.keys(newData).length > 0;
          return hasAnyResponse || prev;
        });
      });

      return () => {
        unsubscribe();
        dataSync.stopInterval();
      };
    } else {
      // Cleanup Firebase listeners
      return () => {
        Object.values(firebaseUnsubscribes.current).forEach(unsubscribe => {
          if (typeof unsubscribe === 'function') {
            unsubscribe();
          }
        });
        firebaseUnsubscribes.current = {};
      };
    }
  }, [useFirebase]); // Re-run if Firebase availability changes

  const refreshData = useCallback(async (sheetName) => {
    setLoading(prev => ({ ...prev, [sheetName]: true }));
    try {
      if (useFirebase) {
        // Use Firebase to fetch collection
        const result = await getCollection(sheetName);
        setData(prev => ({ ...prev, [sheetName]: Array.isArray(result) ? result : [] }));
        setError(null);
      } else {
        // Use Google Sheets
        const result = await sheetsAPI.getSheetData(sheetName);
        setData(prev => ({ ...prev, [sheetName]: result }));
        setError(null);
        // Update last fetch time
        dataSync.lastFetch[sheetName] = Date.now();
      }
    } catch (err) {
      const appError = new AppError(
        `Error refreshing ${sheetName}`,
        ErrorTypes.DATABASE,
        err,
        { sheetName, useFirebase }
      );
      logError(appError, { component: 'DataContext', action: 'refreshData' });
      setError(getUserFriendlyMessage(appError));
    } finally {
      setLoading(prev => ({ ...prev, [sheetName]: false }));
    }
  }, [useFirebase]);

  // Force immediate refresh of multiple sheets
  const forceRefresh = useCallback(async (sheetNames) => {
    if (useFirebase) {
      // With Firebase, data updates automatically via listeners
      // But we can manually fetch to ensure we have latest data
      try {
        const promises = sheetNames.map(sheetName => getCollection(sheetName));
        const results = await Promise.allSettled(promises);

        setData(prev => {
          const updated = { ...prev };
          sheetNames.forEach((sheetName, index) => {
            const result = results[index];
            if (result.status === 'fulfilled') {
              updated[sheetName] = Array.isArray(result.value) ? result.value : [];
            }
          });
          return updated;
        });
      } catch (err) {
        console.error('Error force refreshing Firebase data:', err);
      }
    } else {
      // Reset last fetch time for these sheets to force immediate fetch
      sheetNames.forEach(name => {
        dataSync.lastFetch[name] = 0;
      });
      // Fetch immediately via dataSync (which will notify subscribers)
      await dataSync.fetchSheets(sheetNames, true);
    }
  }, [useFirebase]);

  const addRow = useCallback(async (sheetName, rowData) => {
    // STEP 1: Validate inputs
    if (!sheetName || !rowData || typeof rowData !== 'object') {
      const error = new AppError(
        'Invalid add parameters',
        ErrorTypes.VALIDATION,
        null,
        { sheetName, rowData }
      );
      logError(error, { component: 'DataContext', action: 'addRow' });
      throw error;
    }

    // STEP 2: Validate data with Zod schema
    const validation = validateData(sheetName, rowData);
    if (!validation.success) {
      const errorList = Array.isArray(validation.errors) ? validation.errors : [];
      // Log detailed validation errors for debugging
      console.error(`Validation failed for ${sheetName}:`, {
        errors: errorList,
        data: rowData,
        sheetName
      });
      const errorDetailMessage = errorList.length
        ? errorList.map(e => `${e.field || 'unknown'}: ${e.message || 'Invalid value'}`).join(', ')
        : 'Unknown validation error';
      const error = new AppError(
        `Validation failed for ${sheetName}: ${errorDetailMessage}`,
        ErrorTypes.VALIDATION,
        null,
        { errors: errorList, data: rowData, sheetName }
      );
      logError(error, { component: 'DataContext', action: 'addRow' });
      throw error;
    }

    // STEP 3: Use validated data
    const validatedData = validation.data;

    // Optimistic update - update UI immediately
    const tempId = `temp-${Date.now()}`;
    const optimisticRow = { ...validatedData, _tempId: tempId };

    setData(prev => {
      const currentSheet = Array.isArray(prev[sheetName]) ? prev[sheetName] : [];
      return {
        ...prev,
        [sheetName]: [...currentSheet, optimisticRow],
      };
    });

    try {
      if (useFirebase) {
        // STEP 1: Write to Firebase (PRIMARY - immediate)
        await addDocument(sheetName, validatedData);

        // STEP 2: Queue Sheets write (BACKUP - async, delayed)
        sheetsQueue.enqueue({
          type: 'append',
          sheetName,
          rowData: validatedData
        });

        // Firebase listener will automatically update the UI
        // Remove temp ID after Firebase confirms
        setData(prev => {
          const currentSheet = Array.isArray(prev[sheetName]) ? prev[sheetName] : [];
          return {
            ...prev,
            [sheetName]: currentSheet.map(row =>
              row && row._tempId === tempId ? { ...row, _tempId: undefined } : row
            ).filter(row => row !== null && row !== undefined),
          };
        });
      } else {
        // Fallback: Direct Sheets write (no Firebase)
        await backendAPI.appendRow(sheetName, validatedData);
        // Force immediate refresh to get server data
        await dataSync.forceRefresh([sheetName]);
        // Remove temp ID after successful API call
        setData(prev => {
          const currentSheet = Array.isArray(prev[sheetName]) ? prev[sheetName] : [];
          return {
            ...prev,
            [sheetName]: currentSheet.map(row =>
              row && row._tempId === tempId ? { ...row, _tempId: undefined } : row
            ).filter(row => row !== null && row !== undefined),
          };
        });
      }
      return { success: true };
    } catch (err) {
      console.error(`Error adding row to ${sheetName}:`, err);
      // Rollback optimistic update on error
      setData(prev => {
        const currentSheet = Array.isArray(prev[sheetName]) ? prev[sheetName] : [];
        return {
          ...prev,
          [sheetName]: currentSheet.filter(row => row && row._tempId !== tempId),
        };
      });
      throw err; // Re-throw to let caller handle error
    }
  }, [useFirebase]);

  const updateRow = useCallback(async (sheetName, rowIndex, rowData) => {
    // STEP 1: Validate inputs
    if (!sheetName || !rowData || typeof rowData !== 'object') {
      const error = new AppError(
        'Invalid update parameters',
        ErrorTypes.VALIDATION,
        null,
        { sheetName, rowIndex, rowData }
      );
      logError(error, { component: 'DataContext', action: 'updateRow' });
      throw error;
    }

    // STEP 2: Validate partial data with Zod schema (allow partial updates)
    const schema = SCHEMAS[sheetName];
    let validatedData = rowData;

    if (schema) {
      const partialSchema = schema.partial(); // Zod partial schema
      const validation = partialSchema.safeParse(rowData);

      if (!validation.success) {
        const error = new AppError(
          `Validation failed for ${sheetName}`,
          ErrorTypes.VALIDATION,
          null,
          { errors: validation.error.errors, data: rowData, sheetName }
        );
        logError(error, { component: 'DataContext', action: 'updateRow' });
        throw error;
      }

      validatedData = validation.data;
    }

    // Optimistic update - update UI immediately
    const actualIndex = rowIndex - 2; // Convert from 1-based (with header) to 0-based
    let previousData = null;
    let docId = null;

    // Get current data snapshot before updating
    setData(prev => {
      const currentSheet = Array.isArray(prev[sheetName]) ? [...prev[sheetName]] : [];
      if (actualIndex >= 0 && actualIndex < currentSheet.length && currentSheet[actualIndex]) {
        previousData = { ...currentSheet[actualIndex] }; // Deep copy
        // For Firebase, we need the document ID
        docId = currentSheet[actualIndex].id || currentSheet[actualIndex]._id;
        currentSheet[actualIndex] = { ...currentSheet[actualIndex], ...validatedData };
      }
      return {
        ...prev,
        [sheetName]: currentSheet,
      };
    });

    try {
      if (useFirebase) {
        // STEP 1: Write to Firebase (PRIMARY - immediate) with validated data
        if (docId) {
          await updateDocument(sheetName, docId, validatedData);
        } else if (previousData) {
          // If no docId, try to find by a unique identifier from previousData
          const idField = previousData.id || previousData._id || previousData.attendance_id ||
            previousData.log_id || previousData.asset_id || previousData.shoot_id ||
            previousData.client_id || previousData.break_id;
          if (idField) {
            await updateDocument(sheetName, idField, validatedData);
          } else {
            throw new Error(`Cannot update ${sheetName}: no document ID found. Row data: ${JSON.stringify(previousData).substring(0, 100)}`);
          }
        } else {
          // Fallback: Index lookup failed - try using unique identifier from validatedData
          // This handles cases where array length/order doesn't match (e.g., Alan's records at high indices)
          const idField = validatedData.attendance_id || validatedData.log_id || 
                          validatedData.asset_id || validatedData.shoot_id || 
                          validatedData.client_id || validatedData.break_id;
          
          if (idField) {
            // Find the record in current state by unique identifier
            const currentSheet = Array.isArray(data[sheetName]) ? data[sheetName] : [];
            const recordByID = currentSheet.find(record => {
              if (!record) return false;
              return record.attendance_id === idField || 
                     record.log_id === idField || 
                     record.asset_id === idField ||
                     record.shoot_id === idField ||
                     record.client_id === idField ||
                     record.break_id === idField;
            });
            
            if (recordByID) {
              const foundDocId = recordByID.id || recordByID._id;
              if (foundDocId) {
                await updateDocument(sheetName, foundDocId, validatedData);
              } else {
                // Use the unique identifier as document ID
                await updateDocument(sheetName, idField, validatedData);
              }
            } else {
              // Last resort: use the unique identifier directly as document ID
              await updateDocument(sheetName, idField, validatedData);
            }
          } else {
            throw new Error(`Cannot update ${sheetName}: row not found at index ${actualIndex} and no unique identifier found in update data`);
          }
        }

        // STEP 2: Queue Sheets write (BACKUP - async, delayed)
        sheetsQueue.enqueue({
          type: 'update',
          sheetName,
          rowIndex,
          rowData: validatedData
        });

        // Firebase listener will automatically update the UI
      } else {
        // Fallback: Direct Sheets write (no Firebase) with validated data
        await backendAPI.updateRow(sheetName, rowIndex, validatedData);
        // Force immediate refresh to get server data
        await dataSync.forceRefresh([sheetName]);
      }
      return { success: true };
    } catch (err) {
      console.error(`Error updating row in ${sheetName}:`, err);
      // Rollback optimistic update on error
      if (previousData) {
        setData(prev => {
          const currentSheet = Array.isArray(prev[sheetName]) ? [...prev[sheetName]] : [];
          if (actualIndex >= 0 && actualIndex < currentSheet.length) {
            currentSheet[actualIndex] = previousData;
          }
          return {
            ...prev,
            [sheetName]: currentSheet,
          };
        });
      }
      throw err; // Re-throw to let caller handle error
    }
  }, [useFirebase]);

  const startPolling = useCallback((pageName, sheetNames) => {
    if (useFirebase) {
      // With Firebase, listeners are already set up globally
      // Just ensure data is loaded
      sheetNames.forEach(sheetName => {
        if (!firebaseUnsubscribes.current[sheetName]) {
          const unsubscribe = subscribeToCollection(sheetName, (collectionData) => {
            setData(prev => ({
              ...prev,
              [sheetName]: Array.isArray(collectionData) ? collectionData : []
            }));
          });
          firebaseUnsubscribes.current[sheetName] = unsubscribe;
        }
      });
    } else {
      // Use Google Sheets polling
      dataSync.startPolling(pageName, sheetNames);
    }
  }, [useFirebase]);

  const stopPolling = useCallback((pageName) => {
    if (!useFirebase) {
      dataSync.stopPolling(pageName);
    }
    // Firebase listeners are kept active globally, no need to stop
  }, [useFirebase]);

  const deleteRow = useCallback(async (sheetName, rowIndex) => {
    // STEP 1: Validate inputs
    if (!sheetName || !rowIndex) {
      const error = new AppError(
        'Invalid delete parameters',
        ErrorTypes.VALIDATION,
        null,
        { sheetName, rowIndex }
      );
      logError(error, { component: 'DataContext', action: 'deleteRow' });
      throw error;
    }

    // Get the row data to find document ID
    const actualIndex = rowIndex - 2; // Convert from 1-based (with header) to 0-based
    let docId = null;
    let rowData = null;

    setData(prev => {
      const currentSheet = Array.isArray(prev[sheetName]) ? [...prev[sheetName]] : [];
      if (actualIndex >= 0 && actualIndex < currentSheet.length && currentSheet[actualIndex]) {
        rowData = { ...currentSheet[actualIndex] };
        // For Firebase, we need the document ID
        docId = currentSheet[actualIndex].id || currentSheet[actualIndex]._id;
        // Optimistically remove from UI
        currentSheet.splice(actualIndex, 1);
        return {
          ...prev,
          [sheetName]: currentSheet,
        };
      }
      return prev;
    });

    if (!rowData) {
      throw new Error(`Cannot delete ${sheetName}: row not found at index ${actualIndex}`);
    }

    try {
      if (useFirebase) {
        if (docId) {
          await deleteDocument(sheetName, docId);
        } else {
          // Try to find by unique identifier
          const idField = rowData.id || rowData._id || rowData.attendance_id ||
            rowData.log_id || rowData.asset_id || rowData.shoot_id ||
            rowData.client_id || rowData.break_id || rowData.request_id;
          if (idField) {
            await deleteDocument(sheetName, idField);
          } else {
            throw new Error(`Cannot delete ${sheetName}: no document ID found`);
          }
        }

        // Queue Sheets delete (BACKUP - async, delayed)
        sheetsQueue.enqueue({
          type: 'delete',
          sheetName,
          rowIndex,
        });

        // Firebase listener will automatically update the UI
      } else {
        // Fallback: For Google Sheets, we can't truly delete, so mark as deleted
        // Update row with a deleted flag or status
        await backendAPI.updateRow(sheetName, rowIndex, { 
          _deleted: true,
          deleted_at: new Date().toISOString()
        });
        await dataSync.forceRefresh([sheetName]);
      }
      return { success: true };
    } catch (err) {
      // Rollback optimistic update on error
      setData(prev => {
        const currentSheet = Array.isArray(prev[sheetName]) ? [...prev[sheetName]] : [];
        // Restore the row at its original position
        currentSheet.splice(actualIndex, 0, rowData);
        return {
          ...prev,
          [sheetName]: currentSheet,
        };
      });
      throw err;
    }
  }, [useFirebase]);

  const value = {
    data,
    loading,
    error,
    isConnected,
    useFirebase, // Expose Firebase status
    refreshData,
    forceRefresh,
    addRow,
    updateRow,
    deleteRow,
    startPolling,
    stopPolling,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
}
