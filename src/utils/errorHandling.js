/**
 * Error handling utilities
 * Provides consistent error handling, logging, and user-friendly messages
 */

/**
 * Error types for categorization
 */
export const ErrorTypes = {
    VALIDATION: 'VALIDATION_ERROR',
    NETWORK: 'NETWORK_ERROR',
    AUTH: 'AUTH_ERROR',
    DATABASE: 'DATABASE_ERROR',
    BUSINESS_LOGIC: 'BUSINESS_LOGIC_ERROR',
    UNKNOWN: 'UNKNOWN_ERROR',
};

/**
 * Custom application error class
 */
export class AppError extends Error {
    constructor(message, type = ErrorTypes.UNKNOWN, originalError = null, context = {}) {
        super(message);
        this.name = 'AppError';
        this.type = type;
        this.originalError = originalError;
        this.context = context;
        this.timestamp = new Date().toISOString();

        // Capture stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AppError);
        }
    }

    toJSON() {
        return {
            name: this.name,
            message: this.message,
            type: this.type,
            context: this.context,
            timestamp: this.timestamp,
            stack: this.stack,
        };
    }
}

/**
 * Classify error type based on error object
 */
export function classifyError(error) {
    if (!error) return ErrorTypes.UNKNOWN;

    const message = error.message || String(error);

    // Network errors
    if (
        message.includes('fetch') ||
        message.includes('network') ||
        message.includes('timeout') ||
        message.includes('ECONNREFUSED') ||
        error.name === 'AbortError'
    ) {
        return ErrorTypes.NETWORK;
    }

    // Auth errors
    if (
        message.includes('auth') ||
        message.includes('unauthorized') ||
        message.includes('forbidden') ||
        message.includes('OAuth') ||
        error.status === 401 ||
        error.status === 403
    ) {
        return ErrorTypes.AUTH;
    }

    // Database errors
    if (
        message.includes('database') ||
        message.includes('Firebase') ||
        message.includes('Firestore') ||
        message.includes('Sheet')
    ) {
        return ErrorTypes.DATABASE;
    }

    // Validation errors
    if (
        message.includes('validation') ||
        message.includes('invalid') ||
        message.includes('required') ||
        error.name === 'ZodError'
    ) {
        return ErrorTypes.VALIDATION;
    }

    return ErrorTypes.UNKNOWN;
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error) {
    const type = classifyError(error);

    const friendlyMessages = {
        [ErrorTypes.NETWORK]: 'Connection error. Please check your internet and try again.',
        [ErrorTypes.AUTH]: 'Authentication failed. Please log in again.',
        [ErrorTypes.DATABASE]: 'Database error. Your changes may not have been saved.',
        [ErrorTypes.VALIDATION]: 'Invalid data. Please check your input and try again.',
        [ErrorTypes.BUSINESS_LOGIC]: error.message || 'An error occurred while processing your request.',
        [ErrorTypes.UNKNOWN]: 'An unexpected error occurred. Please try again.',
    };

    return friendlyMessages[type] || friendlyMessages[ErrorTypes.UNKNOWN];
}

/**
 * Log error with context
 */
export function logError(error, context = {}) {
    const errorType = classifyError(error);
    const timestamp = new Date().toISOString();

    const logEntry = {
        timestamp,
        type: errorType,
        message: error.message || String(error),
        context,
        stack: error.stack,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    };

    // Log to console in development
    if (import.meta.env.DEV) {
        console.error('🔴 Error:', logEntry);
    }

    // In production, you would send this to an error tracking service
    // Example: Sentry.captureException(error, { extra: logEntry });

    return logEntry;
}

/**
 * Async error handler wrapper
 * Wraps async functions to provide consistent error handling
 */
export function asyncErrorHandler(fn, context = {}) {
    return async (...args) => {
        try {
            return await fn(...args);
        } catch (error) {
            const appError = new AppError(
                error.message || 'An error occurred',
                classifyError(error),
                error,
                context
            );

            logError(appError, context);
            throw appError;
        }
    };
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff(
    fn,
    maxRetries = 3,
    baseDelay = 1000,
    onRetry = null
) {
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Don't retry on validation or auth errors
            const errorType = classifyError(error);
            if (errorType === ErrorTypes.VALIDATION || errorType === ErrorTypes.AUTH) {
                throw error;
            }

            // Don't retry on last attempt
            if (attempt === maxRetries - 1) {
                break;
            }

            // Calculate delay with exponential backoff
            const delay = baseDelay * Math.pow(2, attempt);

            if (onRetry) {
                onRetry(attempt + 1, maxRetries, delay);
            }

            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}

/**
 * Safe JSON parse with error handling
 */
export function safeJSONParse(jsonString, fallback = null) {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        logError(error, { jsonString: jsonString?.substring(0, 100) });
        return fallback;
    }
}

/**
 * Validate and sanitize user input
 */
export function sanitizeInput(input, maxLength = 1000) {
    if (typeof input !== 'string') {
        return String(input || '');
    }

    return input
        .trim()
        .substring(0, maxLength)
        .replace(/[<>]/g, ''); // Basic XSS prevention
}
