const responseHelper = require('../../shared/utils/responseHelper');
const queryHelper = require('../../shared/utils/queryHelper');
const redisService = require('../../shared/services/RedisService');

// Models
let ProducedVehicle, VehicleModel;

function initializeModels() {
    if (!ProducedVehicle || !VehicleModel) {
        ProducedVehicle = require('../Model/ProducedVehicle')();
        VehicleModel = require('../Model/VehicleModel')();
    }
}

// Generate VIN
function generateVIN() {
    const chars = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
    let vin = '';
    for (let i = 0; i < 17; i++) {
        vin += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return vin;
}

// Create Vehicle (Production)
const createVehicle = async (req, res) => {
    try {
        initializeModels();

        const {
            modelId,
            productionDate,
            productionBatch,
            productionLine,
            productionLocation,
            color,
            plantCode,
            qualityGrade,
            qualityInspector,
            productionCost,
            notes
        } = req.body;

        // Validation
        if (!modelId || !productionBatch || !productionLine || !productionLocation) {
            return responseHelper.error(res, "Thiếu thông tin bắt buộc", 400);
        }

        // Check if model exists
        const model = await VehicleModel.findById(modelId);
        if (!model) {
            return responseHelper.error(res, "Không tìm thấy model xe", 404);
        }

        // Generate unique VIN
        let vin;
        let vinExists = true;
        let attempts = 0;

        while (vinExists && attempts < 10) {
            vin = generateVIN();
            const existingVehicle = await ProducedVehicle.findOne({ vin });
            vinExists = !!existingVehicle;
            attempts++;
        }

        if (vinExists) {
            return responseHelper.error(res, "Không thể tạo VIN duy nhất", 500);
        }

        // Create produced vehicle
        const producedVehicle = new ProducedVehicle({
            vin,
            modelId,
            productionDate: productionDate ? new Date(productionDate) : new Date(),
            productionBatch,
            productionLine,
            productionLocation,
            color: color || 'white',
            plantCode: plantCode || 'VN01',
            qualityGrade: qualityGrade || 'A',
            qualityInspector,
            productionCost: productionCost || 0,
            notes,
            status: 'manufactured',
            qualityStatus: 'pending',
            createdBy: req.user.email,
            createdByRole: req.user.role
        });

        await producedVehicle.save();

        // Clear cache
        await redisService.del("manufacturing:production:*");

        return responseHelper.success(res, {
            id: producedVehicle._id,
            vin: producedVehicle.vin,
            modelId: producedVehicle.modelId,
            productionBatch: producedVehicle.productionBatch,
            status: producedVehicle.status,
            qualityStatus: producedVehicle.qualityStatus
        }, "Sản xuất xe thành công", 201);
    } catch (error) {
        return responseHelper.error(res, error.message || "Lỗi sản xuất xe", 500);
    }
};

// Get All Produced Vehicles
const getAllProducedVehicles = async (req, res) => {
    try {
        initializeModels();

        const { page = 1, limit = 10, status, qualityStatus, batch, search, startDate, endDate } = req.query;
        const cacheKey = `manufacturing:production:list:${JSON.stringify(req.query)}`;

        // Try cache first
        const cachedData = await redisService.get(cacheKey);
        if (cachedData) {
            const { vehicles, pagination } = JSON.parse(cachedData);
            return responseHelper.sendPaginatedResponse(res, "Lấy danh sách xe sản xuất thành công (cached)", vehicles, pagination);
        }

        // Build query
        let query = {};

        if (status) {
            query.status = status;
        }

        if (qualityStatus) {
            query.qualityStatus = qualityStatus;
        }

        if (batch) {
            query.productionBatch = new RegExp(batch, 'i');
        }

        if (startDate || endDate) {
            query.productionDate = {};
            if (startDate) query.productionDate.$gte = new Date(startDate);
            if (endDate) query.productionDate.$lte = new Date(endDate);
        }

        if (search) {
            query.$or = [
                { vin: new RegExp(search, 'i') },
                { productionBatch: new RegExp(search, 'i') },
                { productionLine: new RegExp(search, 'i') }
            ];
        }

        // Execute query with pagination
        const { skip, limitNum } = queryHelper.parsePagination(page, limit);

        const [vehicles, total] = await Promise.all([
            ProducedVehicle.find(query)
                .populate('modelId', 'modelName modelCode manufacturer')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            ProducedVehicle.countDocuments(query)
        ]);

        const pagination = responseHelper.createPagination(page, limitNum, total);

        // Cache vehicles data for 5 minutes
        const cacheData = { vehicles, pagination };
        await redisService.set(cacheKey, JSON.stringify(cacheData), 300);

        return responseHelper.sendPaginatedResponse(res, "Lấy danh sách xe sản xuất thành công", vehicles, pagination);
    } catch (error) {
        return responseHelper.error(res, error.message || "Lỗi lấy danh sách xe sản xuất", 500);
    }
};

// Get Vehicle by VIN
const getVehicleByVIN = async (req, res) => {
    try {
        initializeModels();

        const { vin } = req.params;
        const cacheKey = `manufacturing:production:vin:${vin}`;

        // Try cache first
        const cachedData = await redisService.get(cacheKey);
        if (cachedData) {
            return responseHelper.success(res, JSON.parse(cachedData), "Lấy thông tin xe thành công (cached)");
        }

        const vehicle = await ProducedVehicle.findOne({ vin: vin.toUpperCase() })
            .populate('modelId', 'modelName modelCode manufacturer batteryCapacity motorPower range');

        if (!vehicle) {
            return responseHelper.error(res, "Không tìm thấy xe với VIN này", 404);
        }

        // Cache vehicle data for 10 minutes
        await redisService.set(cacheKey, JSON.stringify(vehicle), 600);

        return responseHelper.success(res, vehicle, "Lấy thông tin xe thành công");
    } catch (error) {
        return responseHelper.error(res, error.message || "Lỗi lấy thông tin xe", 500);
    }
};

// Update Vehicle
const updateVehicle = async (req, res) => {
    try {
        initializeModels();

        const { vin } = req.params;
        const updateData = { ...req.body, updatedBy: req.user.email };

        const vehicle = await ProducedVehicle.findOneAndUpdate(
            { vin: vin.toUpperCase() },
            updateData,
            { new: true, runValidators: true }
        ).populate('modelId', 'modelName modelCode manufacturer');

        if (!vehicle) {
            return responseHelper.error(res, "Không tìm thấy xe", 404);
        }

        // Clear cache
        await redisService.del("manufacturing:production:*");

        return responseHelper.success(res, vehicle, "Cập nhật thông tin xe thành công");
    } catch (error) {
        return responseHelper.error(res, error.message || "Lỗi cập nhật thông tin xe", 500);
    }
};

// Get Production Statistics
const getProductionStatistics = async (req, res) => {
    try {
        initializeModels();

        const cacheKey = 'manufacturing:production:statistics';

        // Try cache first
        const cachedData = await redisService.get(cacheKey);
        if (cachedData) {
            return responseHelper.success(res, JSON.parse(cachedData), "Lấy thống kê sản xuất thành công (cached)");
        }

        const [totalVehicles, byStatus, byQualityStatus, byBatch] = await Promise.all([
            ProducedVehicle.countDocuments(),
            ProducedVehicle.aggregate([
                { $group: { _id: "$status", count: { $sum: 1 } } }
            ]),
            ProducedVehicle.aggregate([
                { $group: { _id: "$qualityStatus", count: { $sum: 1 } } }
            ]),
            ProducedVehicle.aggregate([
                { $group: { _id: "$productionBatch", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ])
        ]);

        const statistics = {
            totalVehicles,
            byStatus: byStatus.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            byQualityStatus: byQualityStatus.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            topBatches: byBatch
        };

        // Cache statistics for 30 minutes
        await redisService.set(cacheKey, JSON.stringify(statistics), 1800);

        return responseHelper.success(res, statistics, "Lấy thống kê sản xuất thành công");
    } catch (error) {
        return responseHelper.error(res, error.message || "Lỗi lấy thống kê sản xuất", 500);
    }
};

module.exports = {
    initializeModels,
    createVehicle,
    getAllProducedVehicles,
    getVehicleByVIN,
    updateVehicle,
    getProductionStatistics
};
