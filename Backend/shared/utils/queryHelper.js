// shared/utils/queryHelper.js
// Helper functions for database queries and search

/**
 * Parse pagination parameters from request query
 * @param {Object} query - Request query object
 * @param {Object} defaults - Default values
 * @returns {Object} Parsed pagination parameters
 */
const parsePagination = (query, defaults = { page: 1, limit: 10 }) => {
    const page = Math.max(1, parseInt(query.page) || defaults.page);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || defaults.limit));
    const skip = (page - 1) * limit;
    
    return { page, limit, skip };
};

/**
 * Build search query for text search
 * @param {string} searchTerm - Search term
 * @param {Array} fields - Fields to search in
 * @param {Object} additionalFilters - Additional filters
 * @returns {Object} MongoDB query object
 */
const buildSearchQuery = (searchTerm, fields = [], additionalFilters = {}) => {
    const query = { ...additionalFilters };
    
    if (searchTerm && fields.length > 0) {
        const searchRegex = new RegExp(searchTerm, 'i');
        query.$or = fields.map(field => ({
            [field]: searchRegex
        }));
    }
    
    return query;
};

/**
 * Build vehicle search query with multiple search types
 * @param {Object} queryParams - Query parameters
 * @returns {Object} MongoDB query object
 */
const buildVehicleSearchQuery = (queryParams) => {
    const { q, type, status, year, model } = queryParams;
    const query = {};
    
    // Status filter
    if (status) {
        query.status = status;
    }
    
    // Year filter
    if (year) {
        query.year = parseInt(year);
    }
    
    // Model filter
    if (model) {
        query.model = new RegExp(model, 'i');
    }
    
    // Search query
    if (q) {
        if (type === 'vin') {
            query.vin = new RegExp(q, 'i');
        } else if (type === 'owner') {
            query.$or = [
                { ownerName: new RegExp(q, 'i') },
                { ownerPhone: new RegExp(q, 'i') }
            ];
        } else {
            // General search across multiple fields
            query.$or = [
                { vin: new RegExp(q, 'i') },
                { model: new RegExp(q, 'i') },
                { ownerName: new RegExp(q, 'i') },
                { ownerPhone: new RegExp(q, 'i') },
                { assignedServiceCenter: new RegExp(q, 'i') }
            ];
        }
    }
    
    return query;
};

/**
 * Build user search query
 * @param {Object} queryParams - Query parameters
 * @returns {Object} MongoDB query object
 */
const buildUserSearchQuery = (queryParams) => {
    const { q, role, status, serviceCenter } = queryParams;
    const query = {};
    
    // Role filter
    if (role) {
        query.role = role;
    }
    
    // Status filter
    if (status) {
        query.status = status;
    }
    
    // Service center filter
    if (serviceCenter) {
        query.serviceCenter = serviceCenter;
    }
    
    // Search query
    if (q) {
        query.$or = [
            { username: new RegExp(q, 'i') },
            { email: new RegExp(q, 'i') },
            { fullName: new RegExp(q, 'i') },
            { phone: new RegExp(q, 'i') }
        ];
    }
    
    return query;
};

/**
 * Build sort object from query parameters
 * @param {Object} queryParams - Query parameters
 * @param {Object} defaultSort - Default sort object
 * @returns {Object} MongoDB sort object
 */
const buildSortQuery = (queryParams, defaultSort = { createdAt: -1 }) => {
    const { sortBy, sortOrder } = queryParams;
    
    if (!sortBy) {
        return defaultSort;
    }
    
    const order = sortOrder === 'asc' ? 1 : -1;
    return { [sortBy]: order };
};

/**
 * Build date range query
 * @param {Object} queryParams - Query parameters
 * @param {string} field - Date field name
 * @returns {Object} Date range query object
 */
const buildDateRangeQuery = (queryParams, field = 'createdAt') => {
    const { startDate, endDate } = queryParams;
    const dateQuery = {};
    
    if (startDate || endDate) {
        dateQuery[field] = {};
        
        if (startDate) {
            dateQuery[field].$gte = new Date(startDate);
        }
        
        if (endDate) {
            dateQuery[field].$lte = new Date(endDate);
        }
    }
    
    return dateQuery;
};

/**
 * Sanitize query parameters
 * @param {Object} query - Query object
 * @param {Array} allowedFields - Allowed field names
 * @returns {Object} Sanitized query object
 */
const sanitizeQuery = (query, allowedFields = []) => {
    const sanitized = {};
    
    allowedFields.forEach(field => {
        if (query[field] !== undefined) {
            sanitized[field] = query[field];
        }
    });
    
    return sanitized;
};

/**
 * Build aggregation pipeline for statistics
 * @param {Object} matchStage - Match stage for filtering
 * @param {Array} groupFields - Fields to group by
 * @returns {Array} Aggregation pipeline
 */
const buildStatsPipeline = (matchStage = {}, groupFields = []) => {
    const pipeline = [];
    
    // Match stage
    if (Object.keys(matchStage).length > 0) {
        pipeline.push({ $match: matchStage });
    }
    
    // Group stage
    const groupStage = {
        _id: groupFields.length > 0 ? groupFields.reduce((acc, field) => {
            acc[field] = `$${field}`;
            return acc;
        }, {}) : null,
        count: { $sum: 1 }
    };
    
    pipeline.push({ $group: groupStage });
    
    // Sort by count descending
    pipeline.push({ $sort: { count: -1 } });
    
    return pipeline;
};

module.exports = {
    parsePagination,
    buildSearchQuery,
    buildVehicleSearchQuery,
    buildUserSearchQuery,
    buildSortQuery,
    buildDateRangeQuery,
    sanitizeQuery,
    buildStatsPipeline
};
