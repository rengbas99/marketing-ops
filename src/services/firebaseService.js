/**
 * Firebase Service
 * Handles all Firebase Firestore operations with real-time listeners
 * Replaces Google Sheets polling with instant updates
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  writeBatch,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
let app;
let db;

try {
  // Check if config is valid before initializing
  if (firebaseConfig.apiKey && 
      firebaseConfig.projectId && 
      firebaseConfig.apiKey !== 'your_apiKey_from_firebase_config' &&
      firebaseConfig.projectId !== 'your-project-id') {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log('✅ Firebase initialized successfully');
  } else {
    console.warn('⚠️ Firebase config missing or incomplete, will use Google Sheets');
    db = null;
    app = null;
  }
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  db = null;
  app = null;
  // App will fall back to Google Sheets if Firebase fails
}

/**
 * Convert Firestore timestamp to JavaScript Date
 */
const convertTimestamp = (timestamp) => {
  if (!timestamp) return null;
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (timestamp?.toDate) {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  // If it's already a string or number, try to parse
  try {
    return new Date(timestamp);
  } catch {
    return null;
  }
};

/**
 * Convert document data to match Google Sheets format
 * Handles timestamps and nested objects
 */
const convertDocumentData = (docData, docId) => {
  // Ensure id is always set and not overwritten by docData
  const { id: _, ...restData } = docData; // Remove any existing id from docData
  const data = { ...restData, id: docId }; // Always use the Firestore document ID
  
  // Convert all timestamp fields
  Object.keys(data).forEach(key => {
    const value = data[key];
    if (value && (value instanceof Timestamp || value?.toDate)) {
      data[key] = convertTimestamp(value).toISOString();
    } else if (value && typeof value === 'object' && !Array.isArray(value) && value.constructor === Object) {
      // Recursively convert nested objects
      Object.keys(value).forEach(nestedKey => {
        if (value[nestedKey] && (value[nestedKey] instanceof Timestamp || value[nestedKey]?.toDate)) {
          value[nestedKey] = convertTimestamp(value[nestedKey]).toISOString();
        }
      });
    }
  });
  
  return data;
};

/**
 * Subscribe to a collection with real-time updates
 * @param {string} collectionName - Name of the Firestore collection
 * @param {Function} callback - Callback function that receives the data array
 * @param {Object} options - Query options (where, orderBy, limit)
 * @returns {Function} Unsubscribe function
 */
export const subscribeToCollection = (collectionName, callback, options = {}) => {
  if (!db) {
    console.warn('Firebase not initialized, cannot subscribe to', collectionName);
    callback([]);
    return () => {}; // Return no-op unsubscribe
  }

  try {
    const collectionRef = collection(db, collectionName);
    const constraints = [];

    // Apply where clauses
    if (options.where && options.where.length > 0) {
      options.where.forEach(({ field, operator, value }) => {
        constraints.push(where(field, operator, value));
      });
    }

    // Apply orderBy
    if (options.orderBy && options.orderBy.length > 0) {
      options.orderBy.forEach(({ field, direction = 'asc' }) => {
        constraints.push(orderBy(field, direction));
      });
    }

    // Apply limit
    if (options.limit) {
      constraints.push(limit(options.limit));
    }

    // Build query with constraints
    const q = constraints.length > 0 
      ? query(collectionRef, ...constraints)
      : collectionRef;

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        try {
          const data = snapshot.docs.map(doc => {
            if (!doc.exists()) return null;
            return convertDocumentData(doc.data(), doc.id);
          }).filter(doc => doc !== null); // Filter out null documents
          callback(data);
        } catch (error) {
          console.error(`Error processing snapshot for ${collectionName}:`, error);
          callback([]); // Return empty array on processing error
        }
      },
      (error) => {
        console.error(`Error listening to ${collectionName}:`, error);
        // Don't throw, just return empty array to prevent app crash
        callback([]);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error(`Error setting up listener for ${collectionName}:`, error);
    callback([]);
    return () => {}; // Return no-op unsubscribe
  }
};

/**
 * Get all documents from a collection (one-time fetch)
 */
export const getCollection = async (collectionName, options = {}) => {
  if (!db) {
    console.warn('Firebase not initialized');
    return [];
  }

  try {
    const collectionRef = collection(db, collectionName);
    const constraints = [];

    if (options.where && options.where.length > 0) {
      options.where.forEach(({ field, operator, value }) => {
        constraints.push(where(field, operator, value));
      });
    }

    if (options.orderBy && options.orderBy.length > 0) {
      options.orderBy.forEach(({ field, direction = 'asc' }) => {
        constraints.push(orderBy(field, direction));
      });
    }

    if (options.limit) {
      constraints.push(limit(options.limit));
    }

    // Build query with constraints
    const q = constraints.length > 0 
      ? query(collectionRef, ...constraints)
      : collectionRef;

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => 
      convertDocumentData(doc.data(), doc.id)
    );
  } catch (error) {
    console.error(`Error fetching ${collectionName}:`, error);
    return [];
  }
};

/**
 * Get a single document by ID
 */
export const getDocument = async (collectionName, docId) => {
  if (!db) {
    console.warn('Firebase not initialized');
    return null;
  }

  try {
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return convertDocumentData(docSnap.data(), docSnap.id);
    }
    return null;
  } catch (error) {
    console.error(`Error fetching document ${docId} from ${collectionName}:`, error);
    return null;
  }
};

/**
 * Add a new document to a collection
 */
export const addDocument = async (collectionName, data) => {
  if (!db) {
    throw new Error('Firebase not initialized');
  }

  try {
    // Add timestamps
    const dataWithTimestamps = {
      ...data,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, collectionName), dataWithTimestamps);
    return { id: docRef.id, ...data };
  } catch (error) {
    console.error(`Error adding document to ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Update an existing document
 */
export const updateDocument = async (collectionName, docId, data) => {
  if (!db) {
    throw new Error('Firebase not initialized');
  }

  try {
    const docRef = doc(db, collectionName, docId);
    const updateData = {
      ...data,
      updated_at: serverTimestamp(),
    };
    
    await updateDoc(docRef, updateData);
    return { id: docId, ...data };
  } catch (error) {
    console.error(`Error updating document ${docId} in ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Delete a document
 */
export const deleteDocument = async (collectionName, docId) => {
  if (!db) {
    throw new Error('Firebase not initialized');
  }

  try {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error(`Error deleting document ${docId} from ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Query collection with filters
 */
export const queryCollection = async (collectionName, filters = {}) => {
  if (!db) {
    console.warn('Firebase not initialized');
    return [];
  }

  try {
    const collectionRef = collection(db, collectionName);
    const constraints = [];

    // Apply where clauses
    if (filters.where && filters.where.length > 0) {
      filters.where.forEach(({ field, operator, value }) => {
        constraints.push(where(field, operator, value));
      });
    }

    // Apply orderBy
    if (filters.orderBy && filters.orderBy.length > 0) {
      filters.orderBy.forEach(({ field, direction = 'asc' }) => {
        constraints.push(orderBy(field, direction));
      });
    }

    // Apply limit
    if (filters.limit) {
      constraints.push(limit(filters.limit));
    }

    // Build query with constraints
    const q = constraints.length > 0 
      ? query(collectionRef, ...constraints)
      : collectionRef;

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => 
      convertDocumentData(doc.data(), doc.id)
    );
  } catch (error) {
    console.error(`Error querying ${collectionName}:`, error);
    return [];
  }
};

/**
 * Batch write operations (for multiple updates)
 */
export const batchWrite = async (operations) => {
  if (!db) {
    throw new Error('Firebase not initialized');
  }

  try {
    const batch = writeBatch(db);

    operations.forEach(({ type, collectionName, docId, data }) => {
      let docRef;
      if (docId) {
        docRef = doc(db, collectionName, docId);
      } else {
        // For 'set' operations without docId, create a new document reference
        docRef = doc(collection(db, collectionName));
      }
      
      switch (type) {
        case 'set':
          batch.set(docRef, { ...data, updated_at: serverTimestamp() });
          break;
        case 'update':
          if (!docId) {
            throw new Error(`Cannot update document in ${collectionName}: docId is required for update operations`);
          }
          batch.update(docRef, { ...data, updated_at: serverTimestamp() });
          break;
        case 'delete':
          if (!docId) {
            throw new Error(`Cannot delete document in ${collectionName}: docId is required for delete operations`);
          }
          batch.delete(docRef);
          break;
        default:
          console.warn(`Unknown batch operation type: ${type}`);
      }
    });

    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error in batch write:', error);
    throw error;
  }
};

/**
 * Check if Firebase is initialized and available
 */
export const isFirebaseAvailable = () => {
  return !!db;
};

/**
 * Get Firebase app instance (for advanced usage)
 */
export const getFirebaseApp = () => app;

/**
 * Get Firestore instance (for advanced usage)
 */
export const getFirestoreDB = () => db;

// Export default for convenience
export default {
  subscribeToCollection,
  getCollection,
  getDocument,
  addDocument,
  updateDocument,
  deleteDocument,
  queryCollection,
  batchWrite,
  isFirebaseAvailable,
  getFirebaseApp,
  getFirestoreDB,
};

