// const asyncHandler = require('express-async-handler'); // Removed - using try-catch instead
const responseHelper = require('../../shared/utils/responseHelper');

const redisService = require('../../shared/services/RedisService');

// Models
let WarrantyVehicle;

function initializeModels() {
    if (!WarrantyVehicle) {
        const warrantyConnection = require('../../shared/database/warrantyConnection');
        WarrantyVehicle = require('../Model/WarrantyVehicle')(warrantyConnection);
    }
}

// Register Warranty (Service Center registers a vehicle into warranty system)
const registerWarranty = async (req, res) => {
    try {
        const {
            vin,
            modelName,
            modelCode,
            manufacturer,
            year,
            color,
            ownerName,
            ownerPhone,
            ownerEmail,
            ownerAddress,
            serviceCenterName,
            serviceCenterCode,

            warrantyStartDate,
            notes
        } = req.body;

        // Validate required fields
        if (!vin || !modelName || !ownerName || !ownerPhone || !ownerAddress) {
            return responseHelper.error(res, "Thiếu thông tin bắt buộc: VIN, tên model, tên chủ xe, số điện thoại, địa chỉ chủ xe", 400);
        }

        // Check if VIN already exists
        const existingVehicle = await WarrantyVehicle.findOne({ vin: vin.toUpperCase() });
        if (existingVehicle) {
            return responseHelper.error(res, "VIN này đã được đăng ký bảo hành", 400);
        }

        // Calculate warranty end date based on model or default
        const startDate = warrantyStartDate ? new Date(warrantyStartDate) : new Date();
        const endDate = new Date(startDate);

        // Get warranty period from vehicle model (improved logic)
        let warrantyMonths = 36; // Default fallback
        let warrantySource = 'default';

        try {
            // First try: Get from modelCode if provided
            if (modelCode) {
                const manufacturingConnection = require('../../shared/database/manufacturingConnection');
                const VehicleModel = require('../../Manufacturing/Model/VehicleModel')(manufacturingConnection);
                const model = await VehicleModel.findOne({ modelCode });
                if (model && model.vehicleWarrantyMonths) {
                    warrantyMonths = model.vehicleWarrantyMonths;
                    warrantySource = `model:${modelCode}`;
                } else if (model) {
                    console.warn(`⚠️ Model ${modelCode} found but no warranty period defined`);
                } else {
                    console.warn(`⚠️ Model ${modelCode} not found in database`);
                }
            }

            // Second try: Get from VIN lookup in Vehicle service if still default
            if (warrantySource === 'default' && vin) {
                const vehicleConnection = require('../../shared/database/vehicleConnection');
                const Vehicle = require('../../Vehicle/Model/Vehicle')(vehicleConnection);
                const vehicle = await Vehicle.findOne({ vin: vin.toUpperCase() }).populate('modelId');
                if (vehicle && vehicle.modelId && vehicle.modelId.vehicleWarrantyMonths) {
                    warrantyMonths = vehicle.modelId.vehicleWarrantyMonths;
                    warrantySource = `vehicle:${vin}`;
                }
            }

            console.log(`✅ Warranty period: ${warrantyMonths} months (source: ${warrantySource})`);
        } catch (error) {
            console.error('❌ Error fetching warranty period:', error);
            console.warn(`⚠️ Using default warranty period: ${warrantyMonths} months`);
        }

        endDate.setMonth(endDate.getMonth() + warrantyMonths);

        // Create warranty vehicle
        const warrantyVehicle = new WarrantyVehicle({
            vin: vin.toUpperCase(),
            modelName,
            modelCode: modelCode || `${modelName.replace(/\s+/g, '').toUpperCase()}-${Date.now()}`,
            manufacturer: manufacturer || 'EV Manufacturer',
            year: year || new Date().getFullYear(),
            color: color || 'white',
            ownerName,
            ownerPhone,
            ownerEmail,
            ownerAddress,
            serviceCenterId: serviceCenterCode || req.user.serviceCenterCode || 'SC001',
            serviceCenterName: serviceCenterName || req.user.serviceCenterName || 'Default Service Center',
            warrantyStartDate: startDate,
            warrantyEndDate: endDate,
            warrantyStatus: 'active',
            registeredBy: req.user.email,
            registeredByRole: req.user.role,
            createdBy: req.user.email,
            createdByRole: req.user.role,
            notes
        });

        await warrantyVehicle.save();

        // Clear specific cache keys (better performance than pattern scan)
        const keysToInvalidate = [
            `warranty:vehicles:vin:${vin.toUpperCase()}`,
            `warranty:vehicles:list:page:1`,
            `warranty:vehicles:list:page:2`,
            `warranty:vehicles:list:page:3`,
            `warranty:vehicles:stats`
        ];
        await redisService.invalidateSpecificKeys(keysToInvalidate);

        return responseHelper.success(res, {
            id: warrantyVehicle._id,
            vin: warrantyVehicle.vin,
            ownerName: warrantyVehicle.ownerName,
            warrantyStatus: warrantyVehicle.warrantyStatus,
            warrantyStartDate: warrantyVehicle.warrantyStartDate,
            warrantyEndDate: warrantyVehicle.warrantyEndDate
        }, "Đăng ký bảo hành thành công", 201);
    } catch (error) {
        console.error('❌ Error in registerWarranty:', error);
        return responseHelper.error(res, "Lỗi khi đăng ký bảo hành", 500);
    }
};

// Get Warranty by VIN
const getWarrantyByVIN = async (req, res) => {
    try {
        const { vin } = req.params;
        const cacheKey = `warranty:vehicles:vin:${vin.toUpperCase()}`;

        // Try cache first
        const cachedData = await redisService.get(cacheKey);
        if (cachedData) {
            return responseHelper.success(res, JSON.parse(cachedData), "Lấy thông tin bảo hành thành công (từ cache)");
        }

        const vehicle = await WarrantyVehicle.findOne({ vin: vin.toUpperCase() });
        if (!vehicle) {
            return responseHelper.error(res, "Không tìm thấy thông tin bảo hành cho VIN này", 404);
        }

        // Cache vehicle data for 5 minutes
        await redisService.set(cacheKey, JSON.stringify(vehicle), 300);

        return responseHelper.success(res, vehicle, "Lấy thông tin bảo hành thành công");
    } catch (error) {
        console.error('❌ Error in getWarrantyByVIN:', error);
        return responseHelper.error(res, "Lỗi khi lấy thông tin bảo hành", 500);
    }
};

// Get All Warranties
const getAllWarranties = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, serviceCenterId, search, startDate, endDate } = req.query;
        const cacheKey = `warranty:vehicles:list:${JSON.stringify(req.query)}`;

        // Try cache first
        const cachedData = await redisService.get(cacheKey);
        if (cachedData) {
            return responseHelper.success(res, JSON.parse(cachedData), "Lấy danh sách bảo hành thành công (từ cache)");
        }

        // Build search query
        const searchQuery = {};

        if (status) {
            searchQuery.warrantyStatus = status;
        }

        if (serviceCenterId) {
            searchQuery.serviceCenterId = serviceCenterId;
        }

        if (search) {
            searchQuery.$or = [
                { vin: { $regex: search, $options: 'i' } },
                { ownerName: { $regex: search, $options: 'i' } },
                { modelName: { $regex: search, $options: 'i' } }
            ];
        }

        if (startDate || endDate) {
            searchQuery.warrantyStartDate = {};
            if (startDate) searchQuery.warrantyStartDate.$gte = new Date(startDate);
            if (endDate) searchQuery.warrantyStartDate.$lte = new Date(endDate);
        }

        // Get paginated results
        const skip = (page - 1) * limit;
        const [vehicles, total] = await Promise.all([
            WarrantyVehicle.find(searchQuery)
                .select('vin modelName ownerName ownerPhone warrantyStatus warrantyStartDate warrantyEndDate serviceCenterName createdAt')
                .lean()
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            WarrantyVehicle.countDocuments(searchQuery)
        ]);

        const result = {
            vehicles,
            pagination: responseHelper.createPagination(page, limit, total)
        };

        // Cache for 2 minutes
        await redisService.set(cacheKey, JSON.stringify(result), 120);

        return responseHelper.success(res, result, "Lấy danh sách bảo hành thành công");
    } catch (error) {
        console.error('❌ Error in getAllWarranties:', error);
        return responseHelper.error(res, "Lỗi khi lấy danh sách bảo hành", 500);
    }
};

// Update Warranty
const updateWarranty = async (req, res) => {
    try {
        const { vin } = req.params;
        const updateData = { ...req.body, updatedBy: req.user.email };

        const vehicle = await WarrantyVehicle.findOneAndUpdate(
            { vin: vin.toUpperCase() },
            updateData,
            { new: true, runValidators: true }
        );

        if (!vehicle) {
            return responseHelper.error(res, "Không tìm thấy thông tin bảo hành cho VIN này", 404);
        }

        // Clear specific cache keys (better performance than pattern scan)
        const keysToInvalidate = [
            `warranty:vehicles:vin:${vin.toUpperCase()}`,
            `warranty:vehicles:list:page:1`,
            `warranty:vehicles:list:page:2`,
            `warranty:vehicles:list:page:3`,
            `warranty:vehicles:stats`
        ];
        await redisService.invalidateSpecificKeys(keysToInvalidate);

        return responseHelper.success(res, vehicle, "Cập nhật bảo hành thành công");
    } catch (error) {
        console.error('❌ Error in updateWarranty:', error);
        return responseHelper.error(res, "Lỗi khi cập nhật bảo hành", 500);
    }
};

// Activate Warranty
const activateWarranty = async (req, res) => {
    try {
        const { vin } = req.params;
        const { warrantyStartDate, ownerInfo, serviceCenterInfo } = req.body;

        const vehicle = await WarrantyVehicle.findOne({ vin: vin.toUpperCase() });
        if (!vehicle) {
            return responseHelper.error(res, "Không tìm thấy thông tin bảo hành cho VIN này", 404);
        }

        // Update warranty status and info
        vehicle.warrantyStatus = 'active';
        vehicle.warrantyStartDate = warrantyStartDate || new Date();

        // Calculate warranty end date based on model warranty period (not hardcoded 3 years)
        let warrantyMonths = 36; // Default fallback
        try {
            // Try to get warranty period from model
            if (vehicle.modelCode) {
                const manufacturingConnection = require('../../shared/database/manufacturingConnection');
                const VehicleModel = require('../../Manufacturing/Model/VehicleModel')(manufacturingConnection);
                const model = await VehicleModel.findOne({ modelCode: vehicle.modelCode });
                if (model && model.vehicleWarrantyMonths) {
                    warrantyMonths = model.vehicleWarrantyMonths;
                    console.log(`✅ Using model warranty period: ${warrantyMonths} months for ${vehicle.modelCode}`);
                } else {
                    console.warn(`⚠️ Model ${vehicle.modelCode} not found or no warranty period, using default`);
                }
            }
        } catch (error) {
            console.error('❌ Error fetching warranty period for activation:', error);
            console.warn(`⚠️ Using default warranty period: ${warrantyMonths} months`);
        }

        vehicle.warrantyEndDate = new Date(vehicle.warrantyStartDate);
        vehicle.warrantyEndDate.setMonth(vehicle.warrantyEndDate.getMonth() + warrantyMonths);

        if (ownerInfo) {
            if (ownerInfo.name) vehicle.ownerName = ownerInfo.name;
            if (ownerInfo.phone) vehicle.ownerPhone = ownerInfo.phone;
            if (ownerInfo.email) vehicle.ownerEmail = ownerInfo.email;
            if (ownerInfo.address) vehicle.ownerAddress = ownerInfo.address;
        }

        if (serviceCenterInfo) {
            if (serviceCenterInfo.id) vehicle.serviceCenterId = serviceCenterInfo.id;
            if (serviceCenterInfo.name) vehicle.serviceCenterName = serviceCenterInfo.name;
        }

        vehicle.updatedBy = req.user.email;
        await vehicle.save();

        // Clear specific cache keys (better performance than pattern scan)
        const keysToInvalidate = [
            `warranty:vehicles:vin:${vin.toUpperCase()}`,
            `warranty:vehicles:list:page:1`,
            `warranty:vehicles:list:page:2`,
            `warranty:vehicles:list:page:3`,
            `warranty:vehicles:stats`
        ];
        await redisService.invalidateSpecificKeys(keysToInvalidate);

        return responseHelper.success(res, vehicle, "Kích hoạt bảo hành thành công");
    } catch (error) {
        console.error('❌ Error in activateWarranty:', error);
        return responseHelper.error(res, "Lỗi khi kích hoạt bảo hành", 500);
    }
};

// Void Warranty
const voidWarranty = async (req, res) => {
    try {
        const { vin } = req.params;
        const { reason } = req.body;

        if (!reason) {
            return responseHelper.error(res, "Vui lòng cung cấp lý do hủy bảo hành", 400);
        }

        const vehicle = await WarrantyVehicle.findOne({ vin: vin.toUpperCase() });
        if (!vehicle) {
            return responseHelper.error(res, "Không tìm thấy thông tin bảo hành cho VIN này", 404);
        }

        await vehicle.voidWarranty(reason, req.user.email);

        // Clear specific cache keys (better performance than pattern scan)
        const keysToInvalidate = [
            `warranty:vehicles:vin:${vin.toUpperCase()}`,
            `warranty:vehicles:list:page:1`,
            `warranty:vehicles:list:page:2`,
            `warranty:vehicles:list:page:3`,
            `warranty:vehicles:stats`
        ];
        await redisService.invalidateSpecificKeys(keysToInvalidate);

        return responseHelper.success(res, vehicle, "Hủy bảo hành thành công");
    } catch (error) {
        console.error('❌ Error in voidWarranty:', error);
        return responseHelper.error(res, "Lỗi khi hủy bảo hành", 500);
    }
};

module.exports = {
    initializeModels,
    registerWarranty,
    getWarrantyByVIN,
    getAllWarranties,
    updateWarranty,
    activateWarranty,
    voidWarranty
};
