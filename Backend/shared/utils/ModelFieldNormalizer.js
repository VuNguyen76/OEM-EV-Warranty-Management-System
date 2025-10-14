/**
 * Model Field Normalizer - FIXED: Inconsistent field names
 * Centralizes the mapping between different model field naming conventions
 */

/**
 * Normalize vehicle model data to consistent field names
 * @param {Object} modelData - Raw model data from any source
 * @returns {Object} Normalized model data with consistent field names
 */
const normalizeModelData = (modelData) => {
    if (!modelData) return null;

    // Handle different field name variations
    const modelName = modelData.modelName || modelData.model || modelData.name;
    const modelCode = modelData.modelCode || modelData.code;
    const manufacturer = modelData.manufacturer || modelData.brand;

    if (!modelName) {
        throw new Error('Model name is required but not found in data');
    }

    return {
        modelName: modelName.trim(),
        modelCode: modelCode ? modelCode.trim().toUpperCase() : null,
        manufacturer: manufacturer ? manufacturer.trim() : null,
        // Preserve original data for debugging
        _originalData: modelData
    };
};

/**
 * Normalize vehicle data with model information
 * @param {Object} vehicleData - Raw vehicle data
 * @returns {Object} Normalized vehicle data
 */
const normalizeVehicleData = (vehicleData) => {
    if (!vehicleData) return null;

    const normalized = {
        vin: vehicleData.vin ? vehicleData.vin.toUpperCase() : null,
        ...normalizeModelData(vehicleData)
    };

    // Add other vehicle fields
    if (vehicleData.ownerName) normalized.ownerName = vehicleData.ownerName.trim();
    if (vehicleData.ownerEmail) normalized.ownerEmail = vehicleData.ownerEmail.toLowerCase().trim();
    if (vehicleData.ownerPhone) normalized.ownerPhone = vehicleData.ownerPhone.trim();
    if (vehicleData.ownerAddress) normalized.ownerAddress = vehicleData.ownerAddress.trim();

    return normalized;
};

/**
 * Create consistent model query object
 * @param {string} modelIdentifier - Model name, code, or ID
 * @returns {Object} MongoDB query object
 */
const createModelQuery = (modelIdentifier) => {
    if (!modelIdentifier) {
        throw new Error('Model identifier is required');
    }

    const identifier = modelIdentifier.trim();
    
    // If it looks like a model code (uppercase, short)
    if (identifier === identifier.toUpperCase() && identifier.length <= 10) {
        return { modelCode: identifier };
    }
    
    // Otherwise treat as model name
    return { modelName: { $regex: new RegExp(identifier, 'i') } };
};

/**
 * Validate model data consistency
 * @param {Object} modelData - Model data to validate
 * @throws {Error} If data is inconsistent
 */
const validateModelData = (modelData) => {
    if (!modelData) {
        throw new Error('Model data is required');
    }

    if (!modelData.modelName) {
        throw new Error('Model name is required');
    }

    if (modelData.modelCode && !/^[A-Z0-9-_]+$/.test(modelData.modelCode)) {
        throw new Error('Model code must contain only uppercase letters, numbers, hyphens, and underscores');
    }

    if (modelData.modelName.length < 2 || modelData.modelName.length > 100) {
        throw new Error('Model name must be between 2 and 100 characters');
    }
};

/**
 * Convert legacy model field to new format
 * @param {Object} data - Data with potentially legacy 'model' field
 * @returns {Object} Data with normalized field names
 */
const migrateLegacyModelField = (data) => {
    if (!data) return data;

    const migrated = { ...data };

    // If has legacy 'model' field but no 'modelName'
    if (data.model && !data.modelName) {
        migrated.modelName = data.model;
        delete migrated.model;
        console.warn('⚠️ Migrated legacy "model" field to "modelName"');
    }

    return migrated;
};

module.exports = {
    normalizeModelData,
    normalizeVehicleData,
    createModelQuery,
    validateModelData,
    migrateLegacyModelField
};
