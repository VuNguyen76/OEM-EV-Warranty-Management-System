// shared/utils/responseHelper.js
// Helper functions for consistent API responses

/**
 * Send success response
 * @param {Object} res - Express response object
 * @param {string} message - Success message
 * @param {Object} data - Response data
 * @param {number} statusCode - HTTP status code (default: 200)
 * @param {Object} meta - Additional metadata (pagination, cached, etc.)
 */
const sendSuccess = (res, message, data = null, statusCode = 200, meta = {}) => {
    const response = {
        success: true,
        message,
        ...(data && { data }),
        ...meta
    };

    return res.status(statusCode).json(response);
};

/**
 * Send error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {Object} errorDetails - Error details including type, fields, etc.
 * @param {Object} meta - Additional metadata
 */
const sendError = (res, message, statusCode = 500, errorDetails = null, meta = {}) => {
    const response = {
        success: false,
        error: {
            message,
            code: statusCode,
            type: errorDetails?.type || 'Error',
            ...(errorDetails?.fields && { fields: errorDetails.fields }),
            ...errorDetails,
            ...meta
        }
    };

    return res.status(statusCode).json(response);
};

/**
 * Send paginated response
 * @param {Object} res - Express response object
 * @param {string} message - Success message
 * @param {Array} data - Array of data items
 * @param {Object} pagination - Pagination info
 * @param {boolean} cached - Whether data is from cache
 */
const sendPaginatedResponse = (res, message, data, pagination, cached = false) => {
    return sendSuccess(res, message, {
        [Array.isArray(data) ? 'items' : 'data']: data,
        pagination
    }, 200, { cached });
};

/**
 * Create pagination object
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} total - Total items count
 * @returns {Object} Pagination object
 */
const createPagination = (page, limit, total) => {
    const currentPage = parseInt(page);
    const itemsPerPage = parseInt(limit);
    const totalPages = Math.ceil(total / itemsPerPage);

    return {
        page: currentPage,
        limit: itemsPerPage,
        total,
        pages: totalPages,
        hasNext: currentPage < totalPages,
        hasPrev: currentPage > 1
    };
};

/**
 * Standard error handler middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const validationErrors = Object.values(err.errors).map(e => ({
            field: e.path,
            message: e.message,
            value: e.value
        }));
        return sendError(res, 'Dữ liệu không hợp lệ', 400, {
            type: 'ValidationError',
            fields: validationErrors
        });
    }

    // Mongoose cast error (invalid ObjectId)
    if (err.name === 'CastError') {
        return sendError(res, 'ID không hợp lệ', 400, {
            type: 'CastError',
            field: err.path,
            value: err.value
        });
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return sendError(res, `${field} đã tồn tại`, 400, 'Duplicate field value');
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return sendError(res, 'Token không hợp lệ', 401, err.message);
    }

    if (err.name === 'TokenExpiredError') {
        return sendError(res, 'Token đã hết hạn', 401, err.message);
    }

    // Default server error
    sendError(res, 'Lỗi server nội bộ', 500, err.message);
};

/**
 * 404 handler middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const notFoundHandler = (req, res) => {
    sendError(res, `Route ${req.originalUrl} không tồn tại`, 404);
};

// Aliases for backward compatibility
const success = (res, data, message, statusCode = 200) => {
    return sendSuccess(res, message, data, statusCode);
};

const error = (res, message, statusCode = 500, errorDetails = null) => {
    return sendError(res, message, statusCode, errorDetails);
};

module.exports = {
    sendSuccess,
    sendError,
    sendPaginatedResponse,
    createPagination,
    errorHandler,
    notFoundHandler,
    // Aliases
    success,
    error
};
