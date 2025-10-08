/**
 * Centralized error handling utility
 * Provides consistent error logging and response formatting
 */

/**
 * Log error with context information
 * @param {string} functionName - Name of the function where error occurred
 * @param {Error} error - Error object
 * @param {Object} context - Additional context (optional)
 */
const logError = (functionName, error, context = {}) => {
    const errorInfo = {
        function: functionName,
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        ...context
    };

    console.error(`❌ Error in ${functionName}:`, errorInfo);
};

/**
 * Handle controller errors with consistent logging and response
 * @param {Object} res - Express response object
 * @param {string} functionName - Name of the function
 * @param {Error} error - Error object
 * @param {string} userMessage - User-friendly error message
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {Object} context - Additional context for logging
 * @returns {Object} Express response
 */
const handleControllerError = (res, functionName, error, userMessage, statusCode = 500, context = {}) => {
    logError(functionName, error, context);

    const responseHelper = require('./responseHelper');
    
    // Use error's statusCode if available
    const finalStatusCode = error.statusCode || statusCode;
    
    // Create error response object
    const errorResponse = {
        success: false,
        error: {
            type: error.name || 'Error',
            message: userMessage || error.message,
            code: finalStatusCode,
            ...context
        }
    };

    // Add validation fields if available
    if (error instanceof ValidationError && error.fields?.length > 0) {
        errorResponse.error.fields = error.fields;
    }

    return responseHelper.error(res, errorResponse.error.message, finalStatusCode, errorResponse.error);
};

/**
 * Handle async controller function with automatic error handling
 * @param {Function} fn - Async controller function
 * @param {string} functionName - Name of the function for logging
 * @param {string} errorMessage - User-friendly error message
 * @returns {Function} Wrapped async function
 */
const asyncHandler = (fn, functionName, errorMessage) => {
    return async (req, res, next) => {
        try {
            await fn(req, res, next);
        } catch (error) {
            handleControllerError(res, functionName, error, errorMessage, 500, {
                user: req.user?.email,
                params: req.params,
                query: req.query
            });
        }
    };
};

/**
 * Safe cache operation wrapper
 * Catches cache errors silently and logs them
 * @param {Function} cacheOperation - Cache operation function
 * @param {string} operationName - Name of the operation for logging
 * @returns {Promise<any>} Result of cache operation or null on error
 */
const safeCacheOperation = async (cacheOperation, operationName) => {
    try {
        return await cacheOperation();
    } catch (cacheError) {
        console.warn(`⚠️ Cache operation failed (${operationName}):`, cacheError.message);
        return null;
    }
};

/**
 * Validate required fields in request body
 * @param {Object} body - Request body
 * @param {string[]} requiredFields - Array of required field names
 * @returns {Object} { isValid: boolean, missingFields: string[] }
 */
const validateRequiredFields = (body, requiredFields) => {
    const missingFields = requiredFields.filter(field => !body[field]);
    return {
        isValid: missingFields.length === 0,
        missingFields
    };
};

// Custom Error Classes
class ValidationError extends Error {
    constructor(message, fields = []) {
        super(message);
        this.name = 'ValidationError';
        this.statusCode = 400;
        this.fields = fields;
    }
}

class AuthenticationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AuthenticationError';
        this.statusCode = 401;
    }
}

class BusinessLogicError extends Error {
    constructor(message) {
        super(message);
        this.name = 'BusinessLogicError';
        this.statusCode = 400;
    }
}

/**
 * Create validation error response
 * @param {Object} res - Express response object
 * @param {string[]} missingFields - Array of missing field names
 * @returns {Object} Express response
 */
const validationError = (res, missingFields) => {
    const responseHelper = require('./responseHelper');
    const error = new ValidationError('Thiếu thông tin bắt buộc', missingFields);
    return responseHelper.error(
        res,
        `Thiếu thông tin bắt buộc: ${missingFields.join(', ')}`,
        400
    );
};

module.exports = {
    logError,
    handleControllerError,
    asyncHandler,
    safeCacheOperation,
    validateRequiredFields,
    validationError
};
