/**
 * Performance monitoring and optimization utilities
 */

/**
 * Debounce function to limit execution rate
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function to limit execution frequency
 * @param {Function} func - Function to throttle
 * @param {number} limit - Minimum time between executions in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit = 300) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}

/**
 * Memoize function results
 * @param {Function} func - Function to memoize
 * @param {Function} keyGenerator - Optional custom key generator
 * @returns {Function} Memoized function
 */
export function memoize(func, keyGenerator = (...args) => JSON.stringify(args)) {
    const cache = new Map();

    return function memoized(...args) {
        const key = keyGenerator(...args);

        if (cache.has(key)) {
            return cache.get(key);
        }

        const result = func(...args);
        cache.set(key, result);

        // Limit cache size to prevent memory leaks
        if (cache.size > 100) {
            const firstKey = cache.keys().next().value;
            cache.delete(firstKey);
        }

        return result;
    };
}

/**
 * Measure function execution time
 * @param {Function} func - Function to measure
 * @param {string} label - Label for logging
 * @returns {Function} Wrapped function with timing
 */
export function measurePerformance(func, label = 'Function') {
    return async function measured(...args) {
        const start = performance.now();
        try {
            const result = await func(...args);
            const duration = performance.now() - start;

            if (import.meta.env.DEV) {
                console.log(`⏱️ ${label} took ${duration.toFixed(2)}ms`);
            }

            return result;
        } catch (error) {
            const duration = performance.now() - start;
            console.error(`❌ ${label} failed after ${duration.toFixed(2)}ms`, error);
            throw error;
        }
    };
}

/**
 * Batch multiple operations to reduce overhead
 * @param {Function} processor - Function to process batched items
 * @param {number} batchSize - Maximum batch size
 * @param {number} delay - Delay before processing batch
 * @returns {Function} Batched function
 */
export function batchOperations(processor, batchSize = 10, delay = 100) {
    let batch = [];
    let timeout;

    const processBatch = async () => {
        if (batch.length === 0) return;

        const currentBatch = [...batch];
        batch = [];

        try {
            await processor(currentBatch);
        } catch (error) {
            console.error('Batch processing error:', error);
        }
    };

    return function batched(item) {
        batch.push(item);

        if (batch.length >= batchSize) {
            clearTimeout(timeout);
            processBatch();
        } else {
            clearTimeout(timeout);
            timeout = setTimeout(processBatch, delay);
        }
    };
}

/**
 * Create an indexed lookup map for O(1) access
 * @param {Array} array - Array to index
 * @param {string} key - Key to index by
 * @returns {Map} Indexed map
 */
export function createIndexedMap(array, key) {
    const map = new Map();

    if (!Array.isArray(array)) return map;

    array.forEach(item => {
        if (item && item[key]) {
            map.set(item[key], item);
        }
    });

    return map;
}

/**
 * Lazy load data with caching
 * @param {Function} loader - Async function to load data
 * @param {number} ttl - Time to live in milliseconds
 * @returns {Function} Lazy loader function
 */
export function createLazyLoader(loader, ttl = 60000) {
    let cache = null;
    let timestamp = 0;

    return async function load(forceRefresh = false) {
        const now = Date.now();

        if (!forceRefresh && cache && (now - timestamp) < ttl) {
            return cache;
        }

        cache = await loader();
        timestamp = now;
        return cache;
    };
}

/**
 * Chunk large arrays for processing
 * @param {Array} array - Array to chunk
 * @param {number} size - Chunk size
 * @returns {Array} Array of chunks
 */
export function chunkArray(array, size = 100) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

/**
 * Process array in parallel with concurrency limit
 * @param {Array} items - Items to process
 * @param {Function} processor - Async function to process each item
 * @param {number} concurrency - Maximum concurrent operations
 * @returns {Promise<Array>} Results
 */
export async function processInParallel(items, processor, concurrency = 5) {
    const results = [];
    const executing = [];

    for (const [index, item] of items.entries()) {
        const promise = processor(item, index).then(result => {
            results[index] = result;
            executing.splice(executing.indexOf(promise), 1);
        });

        executing.push(promise);

        if (executing.length >= concurrency) {
            await Promise.race(executing);
        }
    }

    await Promise.all(executing);
    return results;
}
