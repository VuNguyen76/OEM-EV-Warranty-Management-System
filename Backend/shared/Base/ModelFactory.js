/**
 * Model Factory - Centralized model creation with consistent patterns
 */

/**
 * Add common pre-save middleware to schema
 * @param {mongoose.Schema} schema - Mongoose schema
 */
const addCommonMiddleware = (schema) => {
    // Update timestamps
    schema.pre('save', function (next) {
        this.updatedAt = new Date();
        next();
    });

    // Update timestamps for update operations
    schema.pre(['updateOne', 'findOneAndUpdate'], function (next) {
        this.set({ updatedAt: new Date() });
        next();
    });

    // Ensure virtual fields are serialized
    schema.set('toJSON', { virtuals: true });
    schema.set('toObject', { virtuals: true });
};

/**
 * Add common indexes to schema
 * @param {mongoose.Schema} schema - Mongoose schema
 */
const addCommonIndexes = (schema) => {
    // Common indexes for BaseEntity fields
    schema.index({ status: 1 });
    schema.index({ createdAt: -1 });
    schema.index({ updatedAt: -1 });
};

/**
 * Add service center indexes to schema
 * @param {mongoose.Schema} schema - Mongoose schema
 */
const addServiceCenterIndexes = (schema) => {
    schema.index({ serviceCenterId: 1 });
    schema.index({ serviceCenterCode: 1 });
};

/**
 * Add VIN indexes to schema
 * @param {mongoose.Schema} schema - Mongoose schema
 */
const addVINIndexes = (schema) => {
    schema.index({ vin: 1 });
};

/**
 * Create model with factory pattern
 * @param {Function} connectionGetter - Function to get database connection
 * @param {string} modelName - Model name
 * @param {mongoose.Schema} schema - Mongoose schema
 * @param {Object} options - Factory options
 * @returns {Function} Model factory function
 */
const createModelFactory = (connectionGetter, modelName, schema, options = {}) => {
    const {
        addCommonMiddleware: shouldAddMiddleware = true,
        addCommonIndexes: shouldAddIndexes = true,
        addServiceCenterIndexes: shouldAddServiceCenterIndexes = false,
        addVINIndexes: shouldAddVINIndexes = false
    } = options;

    // Add middleware
    if (shouldAddMiddleware) {
        addCommonMiddleware(schema);
    }

    // Add indexes
    if (shouldAddIndexes) {
        addCommonIndexes(schema);
    }

    if (shouldAddServiceCenterIndexes) {
        addServiceCenterIndexes(schema);
    }

    if (shouldAddVINIndexes) {
        addVINIndexes(schema);
    }

    // Return factory function
    return function () {
        const connection = connectionGetter();
        return connection.model(modelName, schema);
    };
};

module.exports = {
    createModelFactory,
    addCommonMiddleware,
    addCommonIndexes,
    addServiceCenterIndexes,
    addVINIndexes
};