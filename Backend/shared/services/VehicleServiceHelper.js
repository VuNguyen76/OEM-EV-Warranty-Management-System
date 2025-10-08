const axios = require('axios');

const vehicleServiceUrl = process.env.VEHICLE_SERVICE_URL || 'http://host.docker.internal:3004';

/**
 * Verify VIN exists in Vehicle Service
 * @param {string} vin - Vehicle Identification Number
 * @param {string} authToken - Authorization token from request
 * @returns {Promise<Object>} Vehicle data
 * @throws {Error} If VIN not found or service unavailable
 */
const verifyVINInVehicleService = async (vin, authToken) => {
    const vinUpper = vin.toUpperCase();

    try {
        const headers = {
            'Authorization': authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        };

        const response = await axios.get(`${vehicleServiceUrl}/vin/${vinUpper}`, { headers });
        const vehicleData = response.data?.data;

        if (!vehicleData) {
            throw new Error('VEHICLE_NOT_FOUND');
        }

        return vehicleData;
    } catch (error) {
        if (error.message === 'VEHICLE_NOT_FOUND') {
            throw error;
        }

        console.error('❌ Error verifying VIN in Vehicle Service:', error.message);
        throw new Error('VEHICLE_SERVICE_UNAVAILABLE');
    }
};

/**
 * Normalize VIN to uppercase
 * @param {string} vin - Vehicle Identification Number
 * @returns {string} Uppercase VIN
 */
const normalizeVIN = (vin) => {
    return vin ? vin.trim().toUpperCase() : '';
};

/**
 * Validate VIN format using shared VINConstants
 * @param {string} vin - Vehicle Identification Number
 * @returns {boolean} True if valid
 */
const isValidVINFormat = (vin) => {
    const { validateVINFormat } = require('../constants/VINConstants');
    const validation = validateVINFormat(vin);
    return validation.valid;
};

module.exports = {
    verifyVINInVehicleService,
    normalizeVIN,
    isValidVINFormat,
    vehicleServiceUrl
};
