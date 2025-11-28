import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { mockDataService, delay } from '../services/mockDataService';

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState({});
  const [error, setError] = useState(null);

  // Load data for a collection
  const loadData = useCallback(async (collection) => {
    setLoading(prev => ({ ...prev, [collection]: true }));
    setError(null);
    
    try {
      await delay(200); // Simulate API delay
      const collectionData = mockDataService.getAll(collection);
      setData(prev => ({ ...prev, [collection]: collectionData }));
    } catch (err) {
      setError(err.message);
      console.error(`Error loading ${collection}:`, err);
    } finally {
      setLoading(prev => ({ ...prev, [collection]: false }));
    }
  }, []);

  // Load multiple collections
  const loadCollections = useCallback(async (collections) => {
    await Promise.all(collections.map(collection => loadData(collection)));
  }, [loadData]);

  // Add new record
  const addRow = useCallback(async (collection, rowData) => {
    try {
      await delay(300);
      const newRecord = mockDataService.create(collection, rowData);
      await loadData(collection); // Refresh
      return { success: true, data: newRecord };
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [loadData]);

  // Update record
  const updateRow = useCallback(async (collection, id, updates, idField = 'id') => {
    try {
      await delay(300);
      const updated = mockDataService.update(collection, id, updates, idField);
      await loadData(collection); // Refresh
      return { success: true, data: updated };
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [loadData]);

  // Delete record
  const deleteRow = useCallback(async (collection, id, idField = 'id') => {
    try {
      await delay(300);
      mockDataService.delete(collection, id, idField);
      await loadData(collection); // Refresh
      return { success: true };
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [loadData]);

  // Query records
  const query = useCallback((collection, predicate) => {
    return mockDataService.query(collection, predicate);
  }, []);

  // Get single record
  const getById = useCallback((collection, id, idField = 'id') => {
    return mockDataService.getById(collection, id, idField);
  }, []);

  const value = {
    data,
    loading,
    error,
    loadData,
    loadCollections,
    addRow,
    updateRow,
    deleteRow,
    query,
    getById,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

