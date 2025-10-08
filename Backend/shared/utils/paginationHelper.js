const queryHelper = require('./queryHelper');
const responseHelper = require('./responseHelper');

/**
 * Execute paginated query with automatic result formatting
 * @param {Object} Model - Mongoose model
 * @param {Object} query - Query filter
 * @param {Object} options - Pagination options
 * @returns {Promise<Object>} Paginated result with items and pagination info
 */
const executePaginatedQuery = async (Model, query = {}, options = {}) => {
    const {
        page = 1,
        limit = 10,
        sort = { createdAt: -1 },
        select = null,
        populate = null,
        lean = false
    } = options;

    const { skip, limitNum } = queryHelper.parsePagination(page, limit);

    let queryBuilder = Model.find(query);

    if (select) {
        queryBuilder = queryBuilder.select(select);
    }

    if (populate) {
        if (Array.isArray(populate)) {
            populate.forEach(pop => {
                queryBuilder = queryBuilder.populate(pop);
            });
        } else {
            queryBuilder = queryBuilder.populate(populate);
        }
    }

    if (lean) {
        queryBuilder = queryBuilder.lean();
    }

    queryBuilder = queryBuilder.sort(sort).skip(skip).limit(limitNum);

    const [items, total] = await Promise.all([
        queryBuilder.exec(),
        Model.countDocuments(query)
    ]);

    return {
        items,
        pagination: responseHelper.createPagination(page, limit, total),
        total
    };
};

/**
 * Build date range filter for queries
 * @param {string} startDate - Start date (ISO string)
 * @param {string} endDate - End date (ISO string)
 * @param {string} fieldName - Field name to filter (default: 'createdAt')
 * @returns {Object} Date filter object
 */
const buildDateRangeFilter = (startDate, endDate, fieldName = 'createdAt') => {
    if (!startDate && !endDate) {
        return {};
    }

    const dateFilter = {};
    if (startDate || endDate) {
        dateFilter[fieldName] = {};
        if (startDate) dateFilter[fieldName].$gte = new Date(startDate);
        if (endDate) dateFilter[fieldName].$lte = new Date(endDate);
    }

    return dateFilter;
};

/**
 * Build search filter with multiple fields
 * @param {string} searchTerm - Search term
 * @param {string[]} fields - Fields to search in
 * @returns {Object} Search filter object
 */
const buildSearchFilter = (searchTerm, fields = []) => {
    if (!searchTerm || fields.length === 0) {
        return {};
    }

    return {
        $or: fields.map(field => ({
            [field]: { $regex: searchTerm, $options: 'i' }
        }))
    };
};

module.exports = {
    executePaginatedQuery,
    buildDateRangeFilter,
    buildSearchFilter
};
