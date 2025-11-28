/**
 * Network and Error Fallback Utilities
 * Handles edge cases: concurrent updates, network failures, offline mode
 */

import { AppError, ErrorTypes, logError } from './errorHandling';

/**
 * Optimistic Update Manager
 * Handles concurrent updates with conflict resolution
 */
export class OptimisticUpdateManager {
    constructor() {
        this.pendingUpdates = new Map(); // key: recordId, value: { version, data, timestamp }
        this.updateQueue = [];
    }

    /**
     * Register an optimistic update
     * @param {string} recordId - Unique record identifier
     * @param {object} data - Update data
     * @param {number} version - Version number for conflict detection
     */
    registerUpdate(recordId, data, version = Date.now()) {
        const existing = this.pendingUpdates.get(recordId);

        // Conflict detection
        if (existing && existing.version > version) {
            console.warn(`⚠️ Concurrent update conflict detected for ${recordId}`);
            return {
                conflict: true,
                existingVersion: existing.version,
                newVersion: version
            };
        }

        this.pendingUpdates.set(recordId, {
            version,
            data,
            timestamp: Date.now()
        });

        return { conflict: false, version };
    }

    /**
     * Confirm update success
     */
    confirmUpdate(recordId) {
        this.pendingUpdates.delete(recordId);
    }

    /**
     * Rollback update on failure
     */
    rollbackUpdate(recordId) {
        const update = this.pendingUpdates.get(recordId);
        this.pendingUpdates.delete(recordId);
        return update;
    }

    /**
     * Get pending updates for a record
     */
    getPendingUpdate(recordId) {
        return this.pendingUpdates.get(recordId);
    }

    /**
     * Clear old pending updates (older than 5 minutes)
     */
    clearStaleUpdates() {
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);

        for (const [recordId, update] of this.pendingUpdates.entries()) {
            if (update.timestamp < fiveMinutesAgo) {
                console.warn(`🗑️ Clearing stale update for ${recordId}`);
                this.pendingUpdates.delete(recordId);
            }
        }
    }
}

/**
 * Network Status Monitor
 * Detects online/offline status and queues operations
 */
export class NetworkMonitor {
    constructor() {
        this.isOnline = navigator.onLine;
        this.offlineQueue = [];
        this.listeners = new Set();

        // Listen for online/offline events
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
    }

    /**
     * Check if currently online
     */
    checkOnline() {
        return this.isOnline;
    }

    /**
     * Add listener for network status changes
     */
    addListener(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    /**
     * Queue operation for when online
     */
    queueOperation(operation) {
        this.offlineQueue.push({
            ...operation,
            queuedAt: Date.now()
        });

        if (import.meta.env.DEV) {
            console.log(`📥 Queued operation (offline): ${operation.type}`);
        }
    }

    /**
     * Handle coming back online
     */
    async handleOnline() {
        this.isOnline = true;
        console.log('✅ Back online! Processing queued operations...');

        // Notify listeners
        this.listeners.forEach(callback => callback(true));

        // Process offline queue
        if (this.offlineQueue.length > 0) {
            await this.processOfflineQueue();
        }
    }

    /**
     * Handle going offline
     */
    handleOffline() {
        this.isOnline = false;
        console.warn('⚠️ Offline mode activated');

        // Notify listeners
        this.listeners.forEach(callback => callback(false));
    }

    /**
     * Process operations queued while offline
     */
    async processOfflineQueue() {
        const queue = [...this.offlineQueue];
        this.offlineQueue = [];

        console.log(`⚙️ Processing ${queue.length} offline operations...`);

        for (const operation of queue) {
            try {
                await operation.execute();
                console.log(`✅ Processed offline operation: ${operation.type}`);
            } catch (error) {
                console.error(`❌ Failed to process offline operation: ${operation.type}`, error);

                // Re-queue if still relevant (less than 10 minutes old)
                const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
                if (operation.queuedAt > tenMinutesAgo) {
                    this.offlineQueue.push(operation);
                }
            }
        }
    }

    /**
     * Get offline queue status
     */
    getQueueStatus() {
        return {
            isOnline: this.isOnline,
            queuedOperations: this.offlineQueue.length,
            operations: this.offlineQueue.map(op => ({
                type: op.type,
                queuedAt: op.queuedAt
            }))
        };
    }
}

/**
 * Data Sync Manager
 * Ensures data consistency across tabs/windows
 */
export class DataSyncManager {
    constructor() {
        this.channel = new BroadcastChannel('data-sync');
        this.listeners = new Map();

        // Listen for messages from other tabs
        this.channel.onmessage = (event) => {
            this.handleSyncMessage(event.data);
        };
    }

    /**
     * Broadcast data change to other tabs
     */
    broadcastChange(collection, recordId, data) {
        this.channel.postMessage({
            type: 'DATA_CHANGE',
            collection,
            recordId,
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Subscribe to data changes
     */
    subscribe(collection, callback) {
        if (!this.listeners.has(collection)) {
            this.listeners.set(collection, new Set());
        }

        this.listeners.get(collection).add(callback);

        return () => {
            this.listeners.get(collection)?.delete(callback);
        };
    }

    /**
     * Handle sync message from another tab
     */
    handleSyncMessage(message) {
        if (message.type === 'DATA_CHANGE') {
            const listeners = this.listeners.get(message.collection);
            if (listeners) {
                listeners.forEach(callback => {
                    callback(message.recordId, message.data);
                });
            }
        }
    }

    /**
     * Close sync channel
     */
    close() {
        this.channel.close();
    }
}

/**
 * Fallback Data Provider
 * Provides cached/default data when network fails
 */
export class FallbackDataProvider {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Cache data for fallback
     */
    cacheData(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Get cached data
     */
    getCachedData(key) {
        const cached = this.cache.get(key);

        if (!cached) {
            return null;
        }

        // Check if expired
        if (Date.now() - cached.timestamp > this.cacheExpiry) {
            this.cache.delete(key);
            return null;
        }

        return cached.data;
    }

    /**
     * Get default empty data structure
     */
    getDefaultData(collection) {
        const defaults = {
            Users: [],
            Shoots: [],
            Assets: [],
            Clients: [],
            Attendance: [],
            Photographer_Attendance: [],
            Editor_Time_Logs: [],
            Time_Breaks: [],
            Leave_Requests: [],
            Content_Calendar: [],
            Monthly_Hours: [],
            Asset_Comments: []
        };

        return defaults[collection] || [];
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }
}

/**
 * Safe Data Accessor
 * Provides safe access to data with fallbacks
 */
export function safeDataAccess(data, path, defaultValue = null) {
    try {
        const keys = path.split('.');
        let current = data;

        for (const key of keys) {
            if (current == null || typeof current !== 'object') {
                return defaultValue;
            }
            current = current[key];
        }

        return current !== undefined ? current : defaultValue;
    } catch (error) {
        console.warn(`Safe data access failed for path: ${path}`, error);
        return defaultValue;
    }
}

/**
 * Safe Array Filter
 * Filters array with error handling
 */
export function safeFilter(array, predicate, context = 'filter') {
    if (!Array.isArray(array)) {
        console.warn(`${context}: Expected array, got ${typeof array}`);
        return [];
    }

    try {
        return array.filter((item, index) => {
            try {
                return predicate(item, index);
            } catch (error) {
                console.warn(`${context}: Error filtering item at index ${index}`, error);
                return false;
            }
        });
    } catch (error) {
        console.error(`${context}: Filter operation failed`, error);
        return [];
    }
}

/**
 * Safe Array Map
 * Maps array with error handling
 */
export function safeMap(array, mapper, context = 'map') {
    if (!Array.isArray(array)) {
        console.warn(`${context}: Expected array, got ${typeof array}`);
        return [];
    }

    try {
        return array.map((item, index) => {
            try {
                return mapper(item, index);
            } catch (error) {
                console.warn(`${context}: Error mapping item at index ${index}`, error);
                return null;
            }
        }).filter(item => item !== null);
    } catch (error) {
        console.error(`${context}: Map operation failed`, error);
        return [];
    }
}

/**
 * Safe Find
 * Finds item with error handling
 */
export function safeFind(array, predicate, context = 'find') {
    if (!Array.isArray(array)) {
        console.warn(`${context}: Expected array, got ${typeof array}`);
        return null;
    }

    try {
        return array.find((item, index) => {
            try {
                return predicate(item, index);
            } catch (error) {
                console.warn(`${context}: Error checking item at index ${index}`, error);
                return false;
            }
        }) || null;
    } catch (error) {
        console.error(`${context}: Find operation failed`, error);
        return null;
    }
}

// Export singleton instances
export const optimisticUpdateManager = new OptimisticUpdateManager();
export const networkMonitor = new NetworkMonitor();
export const dataSyncManager = new DataSyncManager();
export const fallbackDataProvider = new FallbackDataProvider();

// Cleanup stale updates every minute
setInterval(() => {
    optimisticUpdateManager.clearStaleUpdates();
}, 60 * 1000);
