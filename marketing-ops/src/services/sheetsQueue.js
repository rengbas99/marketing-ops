/**
 * Google Sheets Write Queue
 * Handles async, delayed writes to Google Sheets as a backup to Firebase
 * 
 * Architecture:
 * - Firebase: Primary database (immediate reads/writes)
 * - Google Sheets: Backup (async writes with 5s delay)
 */

import { backendAPI } from './backendApi';
import { logError, AppError, ErrorTypes } from '../utils/errorHandling';

class SheetsWriteQueue {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
        this.batchSize = 5; // Process 5 operations at a time
        this.delay = 5000; // 5 seconds delay before processing
        this.maxRetries = 3; // Retry failed operations up to 3 times
        this.processingTimeout = null;
    }

    /**
     * Add write operation to queue
     * @param {Object} operation - Operation to queue
     * @param {string} operation.type - 'append' or 'update'
     * @param {string} operation.sheetName - Collection name
     * @param {Object} operation.rowData - Data to write
     * @param {number} operation.rowIndex - Row index (for updates)
     */
    enqueue(operation) {
        const queuedOp = {
            ...operation,
            timestamp: Date.now(),
            retries: 0,
            id: `${operation.type}-${operation.sheetName}-${Date.now()}-${Math.random()}`
        };

        this.queue.push(queuedOp);

        if (import.meta.env.DEV) {
            console.log(`📝 Queued Sheets write: ${operation.type} to ${operation.sheetName} (Queue: ${this.queue.length})`);
        }

        // Start processing if not already running
        if (!this.isProcessing) {
            this.scheduleProcessing();
        }
    }

    /**
     * Schedule queue processing with delay
     */
    scheduleProcessing() {
        // Clear any existing timeout
        if (this.processingTimeout) {
            clearTimeout(this.processingTimeout);
        }

        // Schedule processing after delay
        this.processingTimeout = setTimeout(() => {
            this.processQueue();
        }, this.delay);
    }

    /**
     * Process queued operations
     */
    async processQueue() {
        if (this.queue.length === 0) {
            this.isProcessing = false;
            return;
        }

        this.isProcessing = true;

        if (import.meta.env.DEV) {
            console.log(`⚙️ Processing Sheets queue (${this.queue.length} operations)...`);
        }

        // Take batch from queue
        const batch = this.queue.splice(0, this.batchSize);
        const failedOps = [];

        // Process each operation in batch
        for (const op of batch) {
            try {
                if (op.type === 'append') {
                    await backendAPI.appendRow(op.sheetName, op.rowData);
                    if (import.meta.env.DEV) {
                        console.log(`✅ Synced to Sheets: ${op.sheetName} (append)`);
                    }
                } else if (op.type === 'update') {
                    await backendAPI.updateRow(op.sheetName, op.rowIndex, op.rowData);
                    if (import.meta.env.DEV) {
                        console.log(`✅ Synced to Sheets: ${op.sheetName} (update row ${op.rowIndex})`);
                    }
                }
            } catch (error) {
                // Log error
                const appError = new AppError(
                    `Sheets sync failed: ${op.type} to ${op.sheetName}`,
                    ErrorTypes.DATABASE,
                    error,
                    { operation: op }
                );
                logError(appError, { component: 'SheetsQueue', action: 'processQueue' });

                // Retry logic
                if (op.retries < this.maxRetries) {
                    op.retries += 1;
                    failedOps.push(op);

                    if (import.meta.env.DEV) {
                        console.warn(`⚠️ Sheets sync failed, will retry (${op.retries}/${this.maxRetries}): ${op.sheetName}`);
                    }
                } else {
                    // Max retries reached, abandon operation
                    console.error(`🔴 Sheets sync abandoned after ${this.maxRetries} retries: ${op.sheetName}`, error);

                    // Log critical error for monitoring
                    const criticalError = new AppError(
                        `Sheets sync permanently failed: ${op.type} to ${op.sheetName}`,
                        ErrorTypes.DATABASE,
                        error,
                        { operation: op, retriesExhausted: true }
                    );
                    logError(criticalError, { component: 'SheetsQueue', action: 'processQueue', severity: 'critical' });
                }
            }
        }

        // Re-queue failed operations
        if (failedOps.length > 0) {
            this.queue.unshift(...failedOps); // Add to front of queue for priority
        }

        // Continue processing if queue not empty
        if (this.queue.length > 0) {
            this.scheduleProcessing();
        } else {
            this.isProcessing = false;
            if (import.meta.env.DEV) {
                console.log('✅ Sheets queue processing complete');
            }
        }
    }

    /**
     * Get queue status
     * @returns {Object} Queue status
     */
    getStatus() {
        return {
            pending: this.queue.length,
            isProcessing: this.isProcessing,
            operations: this.queue.map(op => ({
                id: op.id,
                type: op.type,
                sheetName: op.sheetName,
                retries: op.retries,
                timestamp: op.timestamp
            }))
        };
    }

    /**
     * Clear queue (use with caution)
     */
    clear() {
        this.queue = [];
        this.isProcessing = false;
        if (this.processingTimeout) {
            clearTimeout(this.processingTimeout);
            this.processingTimeout = null;
        }
        console.log('🗑️ Sheets queue cleared');
    }

    /**
     * Force immediate processing (skip delay)
     */
    async forceProcess() {
        if (this.processingTimeout) {
            clearTimeout(this.processingTimeout);
            this.processingTimeout = null;
        }
        await this.processQueue();
    }
}

// Export singleton instance
export const sheetsQueue = new SheetsWriteQueue();
export default SheetsWriteQueue;
