/**
 * VIN Lookup Service - Phase 2 of VIN Generation System
 * Validates VIN format and looks up vehicle information from Manufacturing DB
 */

// Note: VINGenerator is in Manufacturing service, we'll implement basic validation here
// and call Manufacturing service for complex validation if needed

class VINLookupService {
    /**
     * Validate VIN format - Basic validation
     * @param {string} vin - VIN to validate
     * @returns {Object} Validation result
     */
    static validateVINFormat(vin) {
        if (!vin || typeof vin !== 'string') {
            return { valid: false, error: 'VIN is required and must be a string' };
        }

        const cleanVIN = vin.trim().toUpperCase();

        // Basic VIN validation (17 characters, alphanumeric except I, O, Q)
        if (cleanVIN.length !== 17) {
            return { valid: false, error: 'VIN must be exactly 17 characters' };
        }

        if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(cleanVIN)) {
            return { valid: false, error: 'VIN contains invalid characters' };
        }

        return { valid: true, vin: cleanVIN };
    }

    /**
     * Parse VIN to extract manufacturer, year, plant info
     * @param {string} vin - VIN to parse
     * @returns {Object} Parsed VIN information
     */
    static parseVIN(vin) {
        try {
            const cleanVIN = vin.trim().toUpperCase();

            // Basic VIN parsing (simplified)
            const wmi = cleanVIN.substring(0, 3); // World Manufacturer Identifier
            const vds = cleanVIN.substring(3, 8); // Vehicle Descriptor Section
            const checkDigit = cleanVIN.substring(8, 9);
            const yearCode = cleanVIN.substring(9, 10);
            const plantCode = cleanVIN.substring(10, 11);
            const sequentialNumber = cleanVIN.substring(11, 17);

            return {
                wmi,
                vds,
                checkDigit,
                yearCode,
                plantCode,
                sequentialNumber,
                manufacturer: this.getManufacturerFromWMI(wmi),
                year: this.getYearFromCode(yearCode),
                plant: this.getPlantFromCode(plantCode)
            };
        } catch (error) {
            throw new Error(`VIN parsing failed: ${error.message}`);
        }
    }

    /**
     * Get manufacturer from WMI code
     */
    static getManufacturerFromWMI(wmi) {
        const wmiCodes = {
            'TMT': 'Test Motors',
            'EVM': 'EV Motors',
            'LVG': 'VinFast',
            '5YJ': 'Tesla'
        };
        return wmiCodes[wmi] || 'Unknown';
    }

    /**
     * Get year from year code
     */
    static getYearFromCode(yearCode) {
        const yearCodes = {
            'S': 2025, 'T': 2026, 'V': 2027, 'W': 2028, 'X': 2029, 'Y': 2030
        };
        return yearCodes[yearCode] || 2025;
    }

    /**
     * Get plant from plant code
     */
    static getPlantFromCode(plantCode) {
        const plantCodes = {
            'H': 'Hanoi',
            'S': 'HoChiMinh',
            'D': 'DaNang',
            'P': 'HaiPhong',
            'C': 'CanTho'
        };
        return plantCodes[plantCode] || 'Unknown';
    }

    /**
     * Lookup vehicle information from Manufacturing DB
     * @param {string} vin - VIN to lookup
     * @param {string} authToken - JWT token for authentication
     * @returns {Promise<Object>} Vehicle production information
     */
    static async lookupVehicleProduction(vin, authToken) {
        try {
            // Call Manufacturing service API to get vehicle info
            const axios = require('axios');
            const manufacturingServiceUrl = process.env.MANUFACTURING_SERVICE_URL || 'http://manufacturing-service:3003';

            const headers = {};
            if (authToken) {
                headers.Authorization = `Bearer ${authToken}`;
            }

            const response = await axios.get(`${manufacturingServiceUrl}/production/${vin.toUpperCase()}`, { headers });

            if (!response.data || !response.data.success) {
                throw new Error(`VIN ${vin} not found in Manufacturing database. Vehicle may not be produced yet.`);
            }

            const vehicleData = response.data.data;

            // Check quality status - allow pending for testing, but warn about failed
            if (vehicleData.qualityStatus === 'failed') {
                throw new Error(`VIN ${vin} has failed quality inspection. Current status: ${vehicleData.qualityStatus}`);
            }

            // Log warning for pending status
            if (vehicleData.qualityStatus === 'pending') {
                console.warn(`⚠️ VIN ${vin} quality status is still pending. Proceeding with registration.`);
            }

            // Get model information (handle both populated and non-populated cases)
            const model = vehicleData.modelId;
            if (!model) {
                throw new Error(`Model information not found for VIN ${vin}`);
            }

            // Parse year from VIN if not available in model/vehicle data
            let year = model.year || vehicleData.year;
            if (!year) {
                const parsedVIN = this.parseVIN(vin);
                year = parsedVIN.year;
                console.log(`📅 Parsed year from VIN: ${year}`);
            }

            return {
                vin: vehicleData.vin,
                modelId: model._id || model,
                modelName: model.modelName || vehicleData.modelName,
                modelCode: model.modelCode || vehicleData.modelCode,
                manufacturer: model.manufacturer || vehicleData.manufacturer,
                year: year,
                category: model.category || vehicleData.category,
                color: vehicleData.color,
                productionDate: vehicleData.productionDate,
                productionBatch: vehicleData.productionBatch,
                productionLine: vehicleData.productionLine,
                productionLocation: vehicleData.factoryLocation,
                plantCode: vehicleData.plantCode,
                qualityStatus: vehicleData.qualityStatus,
                qualityInspector: vehicleData.qualityInspector,
                batteryCapacity: model.batteryCapacity || vehicleData.batteryCapacity,
                motorPower: model.motorPower || vehicleData.motorPower,
                variant: model.variant || vehicleData.variant,
                vehicleWarrantyMonths: model.vehicleWarrantyMonths || vehicleData.vehicleWarrantyMonths
            };
        } catch (error) {
            console.error('❌ VIN Lookup Error:', error);
            if (error.response && error.response.status === 404) {
                throw new Error(`VIN ${vin} not found in Manufacturing database. Vehicle may not be produced yet.`);
            }
            throw error;
        }
    }

    /**
     * Complete VIN validation and lookup
     * @param {string} vin - VIN to validate and lookup
     * @param {string} authToken - JWT token for authentication
     * @returns {Promise<Object>} Complete vehicle information
     */
    static async validateAndLookupVIN(vin, authToken) {
        try {
            // Step 1: Validate VIN format
            const validation = this.validateVINFormat(vin);
            if (!validation.valid) {
                throw new Error(`Invalid VIN format: ${validation.error}`);
            }

            // Step 2: Parse VIN information
            const parsedVIN = this.parseVIN(vin);

            // Step 3: Lookup production information
            const productionInfo = await this.lookupVehicleProduction(vin, authToken);

            // Step 4: Cross-validate parsed vs production data
            if (parsedVIN.manufacturer !== productionInfo.manufacturer) {
                console.warn(`⚠️ VIN manufacturer mismatch: VIN=${parsedVIN.manufacturer}, Production=${productionInfo.manufacturer}`);
            }

            if (parsedVIN.year !== productionInfo.year) {
                console.warn(`⚠️ VIN year mismatch: VIN=${parsedVIN.year}, Production=${productionInfo.year}`);
            }

            return {
                ...productionInfo,
                vinInfo: parsedVIN,
                isValid: true,
                validatedAt: new Date()
            };
        } catch (error) {
            console.error('❌ VIN Validation and Lookup Error:', error);
            throw error;
        }
    }

    /**
     * Check if VIN is already registered in Vehicle service
     * @param {string} vin - VIN to check
     * @returns {Promise<Object|null>} Existing vehicle or null
     */
    static async checkVINRegistration(vin) {
        try {
            const { createVehicleModel } = require('../Model/Vehicle');
            const Vehicle = createVehicleModel();

            const existingVehicle = await Vehicle.findOne({
                vin: vin.toUpperCase()
            });

            return existingVehicle;
        } catch (error) {
            console.error('❌ VIN Registration Check Error:', error);
            throw error;
        }
    }

    /**
     * Get service center information by ID
     * @param {string} serviceCenterId - Service center ObjectId
     * @returns {Promise<Object>} Service center information
     */
    static async getServiceCenterInfo(serviceCenterId) {
        try {
            // For now, return basic info. In production, this would lookup from ServiceCenter collection
            return {
                id: serviceCenterId,
                name: `Service Center ${serviceCenterId}`,
                code: `SC_${serviceCenterId.slice(-6)}`,
                isValid: true
            };
        } catch (error) {
            console.error('❌ Service Center Lookup Error:', error);
            throw error;
        }
    }
}

module.exports = VINLookupService;
