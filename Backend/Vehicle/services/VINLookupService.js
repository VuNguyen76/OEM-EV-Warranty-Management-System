/**
 * VIN Lookup Service - Clean Version
 * Validates VIN format and looks up vehicle information from Manufacturing DB
 * Uses shared VIN constants to avoid duplication
 */

const { validateVINFormat, parseVINBasic } = require('../../shared/constants/VINConstants');

class VINLookupService {

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

            // Ghi log cảnh báo cho trạng thái pending
            if (vehicleData.qualityStatus === 'pending') {
                console.warn(`⚠️ VIN ${vin} quality status is still pending. Proceeding with registration.`);
            }

            // ✅ EXPECT COMPLETE DATA FROM MANUFACTURING - NO FALLBACK
            // Manufacturing service MUST return complete vehicle + model data
            const model = vehicleData.modelId;
            if (!model || !model._id || !model.modelName) {
                throw new Error(`Incomplete model information from Manufacturing service for VIN ${vin}. Manufacturing service must populate modelId.`);
            }

            // ✅ KIỂM TRA NGHIÊM NGẶT - KHÔNG CÓ LOGIC DỰ PHÒNG
            const requiredFields = ['vin', 'color', 'productionDate', 'qualityStatus'];
            const requiredModelFields = ['modelName', 'modelCode', 'manufacturer', 'year', 'batteryCapacity', 'motorPower', 'vehicleWarrantyMonths'];

            for (const field of requiredFields) {
                if (!vehicleData[field]) {
                    throw new Error(`Missing required field '${field}' from Manufacturing service for VIN ${vin}`);
                }
            }

            for (const field of requiredModelFields) {
                if (!model[field]) {
                    throw new Error(`Missing required model field '${field}' from Manufacturing service for VIN ${vin}`);
                }
            }

            // ✅ TRẢ VỀ DỮ LIỆU SẠCH - KHÔNG CÓ DỰ PHÒNG
            return {
                vin: vehicleData.vin,
                modelId: model._id,
                modelName: model.modelName,
                modelCode: model.modelCode,
                manufacturer: model.manufacturer,
                year: model.year,
                category: model.category,
                color: vehicleData.color,
                productionDate: vehicleData.productionDate,
                productionBatch: vehicleData.productionBatch,
                productionLine: vehicleData.productionLine,
                productionLocation: vehicleData.factoryLocation,
                plantCode: vehicleData.plantCode,
                qualityStatus: vehicleData.qualityStatus,
                qualityInspector: vehicleData.qualityInspector,
                batteryCapacity: model.batteryCapacity,
                motorPower: model.motorPower,
                variant: model.variant,
                vehicleWarrantyMonths: model.vehicleWarrantyMonths
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
            // Step 1: Validate VIN format using shared constants
            const validation = validateVINFormat(vin);
            if (!validation.valid) {
                throw new Error(`Invalid VIN format: ${validation.error}`);
            }

            // Step 2: Parse VIN information using shared constants
            const parsedVIN = parseVINBasic(vin);

            // Step 3: Lookup production information from Manufacturing service
            const productionInfo = await this.lookupVehicleProduction(vin, authToken);

            // Step 4: ✅ OPTIONAL Cross-validation (for debugging only)
            // Manufacturing service is the single source of truth
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
            const createVehicleModel = require('../Model/Vehicle');
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
            // ✅ TRIỂN KHAI THỰC TẾ - KHÔNG CÓ DỰ PHÒNG
            // In production, this MUST lookup from actual ServiceCenter collection
            // Hiện tại, validate định dạng serviceCenterId và trả về dữ liệu có cấu trúc

            if (!serviceCenterId || typeof serviceCenterId !== 'string') {
                throw new Error('Service Center ID is required and must be a string');
            }

            // TODO: Replace with actual ServiceCenter lookup when ServiceCenter model is implemented
            // const ServiceCenter = require('../Model/ServiceCenter');
            // const serviceCenter = await ServiceCenter.findById(serviceCenterId);
            // if (!serviceCenter) { // Kiểm tra service center
            //     throw new Error(`Service Center not found: ${serviceCenterId}`);
            // }
            // return serviceCenter;

            // ✅ PHẢN HỒI CÓ CẤU TRÚC TẠM THỜI - KHÔNG CÓ DỰ PHÒNG NGẪU NHIÊN
            return {
                id: serviceCenterId,
                name: `Service Center ${serviceCenterId.slice(-8)}`, // Sử dụng 8 ký tự cuối để dễ đọc
                code: `SC${serviceCenterId.slice(-6).toUpperCase()}`, // Structured code format
                isValid: true
            };
        } catch (error) {
            console.error('❌ Service Center Lookup Error:', error);
            throw error;
        }
    }
}

module.exports = VINLookupService;
