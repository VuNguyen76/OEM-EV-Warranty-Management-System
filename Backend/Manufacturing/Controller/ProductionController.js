const responseHelper = require('../../shared/utils/responseHelper');
const queryHelper = require('../../shared/utils/queryHelper');
const redisService = require('../../shared/services/RedisService');
const VINGenerator = require('../utils/VINGenerator');

let ProducedVehicle, VehicleModel;

function initializeModels() {
    if (!ProducedVehicle || !VehicleModel) {
        ProducedVehicle = require('../Model/ProducedVehicle')();
        VehicleModel = require('../Model/VehicleModel')();
    }
}

const createVehicle = async (req, res) => {
    try {
        initializeModels();

        const {
            modelId,
            productionDate,
            productionBatch,
            productionLine,
            productionLocation,
            plantCode = 'H', // Default to Hanoi
            color,
            qualityInspector,
            productionCost,
            notes
        } = req.body;

        if (!modelId || !productionBatch || !productionLine || !productionLocation) {
            return responseHelper.error(res, "Thiếu thông tin bắt buộc: modelId, productionBatch, productionLine, productionLocation", 400);
        }

        const model = await VehicleModel.findById(modelId);
        if (!model) {
            return responseHelper.error(res, "Không tìm thấy model xe", 404);
        }

        // ✅ GENERATE VIN USING ISO 3779 STANDARD
        console.log(`🔧 Starting VIN generation for model:`, {
            manufacturer: model.manufacturer,
            modelCode: model.modelCode,
            year: model.year,
            plantCode: plantCode
        });

        let vin;
        try {
            vin = await VINGenerator.generateVIN(model, plantCode);
            console.log(`✅ Generated VIN: ${vin} for model ${model.modelName}`);
        } catch (error) {
            console.error('❌ VIN Generation Error:', error);
            console.error('❌ Error details:', error.stack);
            return responseHelper.error(res, `Lỗi tạo VIN: ${error.message}`, 500);
        }

        // Double-check VIN uniqueness (should not happen with proper counter)
        const existingVehicle = await ProducedVehicle.findOne({ vin });
        if (existingVehicle) {
            return responseHelper.error(res, "VIN đã tồn tại trong hệ thống", 500);
        }

        const producedVehicle = new ProducedVehicle({
            vin,
            modelId,
            productionDate: productionDate ? new Date(productionDate) : new Date(),
            productionBatch,
            productionLine,
            factoryLocation: productionLocation,
            plantCode: plantCode.toUpperCase(),
            color: color || 'white',
            qualityInspector,
            productionCost: productionCost || {},
            productionNotes: notes,
            status: 'manufactured',
            qualityStatus: 'pending',
            createdBy: req.user.email,
            createdByRole: req.user.role
        });

        // Save with retry logic for race condition
        let saveAttempts = 0;
        const maxSaveAttempts = 3;

        while (saveAttempts < maxSaveAttempts) {
            try {
                await producedVehicle.save();
                break; // Success, exit loop
            } catch (error) {
                if (error.code === 11000 && saveAttempts < maxSaveAttempts - 1) {
                    // Duplicate key error, generate new VIN and retry
                    saveAttempts++;
                    try {
                        vin = await VINGenerator.generateVIN(model, plantCode);
                        producedVehicle.vin = vin;
                        console.log(`🔄 Retry ${saveAttempts}: Generated new VIN: ${vin}`);
                    } catch (vinError) {
                        console.error('❌ VIN Generation Error on retry:', vinError);
                        throw new Error(`Failed to generate VIN on retry: ${vinError.message}`);
                    }

                    // Check if new VIN exists (should be very rare with proper counter)
                    const existingVehicle = await ProducedVehicle.findOne({ vin });
                    if (existingVehicle) {
                        console.log(`⚠️ VIN ${vin} still exists, retrying...`);
                        continue; // Try again with another VIN
                    }
                } else {
                    throw error; // Re-throw if not duplicate key or max attempts reached
                }
            }
        }

        await redisService.deletePatternScan("manufacturing:production:*");

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

const getAllProducedVehicles = async (req, res) => {
    try {
        initializeModels();

        const { page = 1, limit = 10, status, qualityStatus, batch, search, startDate, endDate } = req.query;
        const cacheKey = `manufacturing:production:list:${JSON.stringify(req.query)}`;

        const cachedData = await redisService.get(cacheKey);
        if (cachedData) {
            const { vehicles, pagination } = JSON.parse(cachedData);
            return responseHelper.sendPaginatedResponse(res, "Lấy danh sách xe sản xuất thành công (cached)", vehicles, pagination);
        }

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

        const cacheData = { vehicles, pagination };
        await redisService.set(cacheKey, JSON.stringify(cacheData), 300);

        return responseHelper.sendPaginatedResponse(res, "Lấy danh sách xe sản xuất thành công", vehicles, pagination);
    } catch (error) {
        return responseHelper.error(res, error.message || "Lỗi lấy danh sách xe sản xuất", 500);
    }
};

const getVehicleByVIN = async (req, res) => {
    try {
        initializeModels();

        const { vin } = req.params;
        const cacheKey = `manufacturing:production:vin:${vin}`;

        const cachedData = await redisService.get(cacheKey);
        if (cachedData) {
            return responseHelper.success(res, JSON.parse(cachedData), "Lấy thông tin xe thành công (cached)");
        }

        const vehicle = await ProducedVehicle.findOne({ vin: vin.toUpperCase() })
            .populate('modelId', 'modelName modelCode manufacturer batteryCapacity motorPower range');

        if (!vehicle) {
            return responseHelper.error(res, "Không tìm thấy xe với VIN này", 404);
        }

        await redisService.set(cacheKey, JSON.stringify(vehicle), 600);

        return responseHelper.success(res, vehicle, "Lấy thông tin xe thành công");
    } catch (error) {
        return responseHelper.error(res, error.message || "Lỗi lấy thông tin xe", 500);
    }
};

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

        await redisService.del("manufacturing:production:*");

        return responseHelper.success(res, vehicle, "Cập nhật thông tin xe thành công");
    } catch (error) {
        return responseHelper.error(res, error.message || "Lỗi cập nhật thông tin xe", 500);
    }
};

const getProductionStatistics = async (req, res) => {
    try {
        initializeModels();

        const cacheKey = 'manufacturing:production:statistics';

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

        await redisService.set(cacheKey, JSON.stringify(statistics), 1800);

        return responseHelper.success(res, statistics, "Lấy thống kê sản xuất thành công");
    } catch (error) {
        return responseHelper.error(res, error.message || "Lỗi lấy thống kê sản xuất", 500);
    }
};

const passQualityCheck = async (req, res) => {
    try {
        initializeModels();

        const { vin } = req.params;
        const { checkType, checkedBy, notes } = req.body;

        if (!checkType || !checkedBy) {
            return responseHelper.error(res, "Thiếu thông tin checkType hoặc checkedBy", 400);
        }

        const vehicle = await ProducedVehicle.findOne({ vin: vin.toUpperCase() });
        if (!vehicle) {
            return responseHelper.error(res, "Không tìm thấy xe với VIN này", 404);
        }

        try {
            await vehicle.passQualityCheck(checkType, checkedBy, notes);

            // Clear cache
            await redisService.deletePatternScan("manufacturing:production:*");

            return responseHelper.success(res, {
                vin: vehicle.vin,
                qualityStatus: vehicle.qualityStatus,
                status: vehicle.status,
                qualityChecks: vehicle.qualityChecks
            }, "Quality check passed thành công");
        } catch (error) {
            // Handle custom QualityCheckError with proper error codes
            if (error.name === 'QualityCheckError') {
                if (error.code === 'DUPLICATE_CHECK') {
                    return responseHelper.error(res, error.message, 400);
                }
                return responseHelper.error(res, error.message, 422);
            }
            throw error;
        }
    } catch (error) {
        return responseHelper.error(res, error.message || "Lỗi pass quality check", 500);
    }
};

const failQualityCheck = async (req, res) => {
    try {
        initializeModels();

        const { vin } = req.params;
        const { checkType, checkedBy, notes } = req.body;

        if (!checkType || !checkedBy) {
            return responseHelper.error(res, "Thiếu thông tin checkType hoặc checkedBy", 400);
        }

        const vehicle = await ProducedVehicle.findOne({ vin: vin.toUpperCase() });
        if (!vehicle) {
            return responseHelper.error(res, "Không tìm thấy xe với VIN này", 404);
        }

        await vehicle.failQualityCheck(checkType, checkedBy, notes);

        // Clear cache
        await redisService.deletePatternScan("manufacturing:production:*");

        return responseHelper.success(res, {
            vin: vehicle.vin,
            qualityStatus: vehicle.qualityStatus,
            status: vehicle.status,
            qualityChecks: vehicle.qualityChecks
        }, "Quality check failed được ghi nhận");
    } catch (error) {
        return responseHelper.error(res, error.message || "Lỗi fail quality check", 500);
    }
};

module.exports = {
    initializeModels,
    createVehicle,
    getAllProducedVehicles,
    getVehicleByVIN,
    updateVehicle,
    getProductionStatistics,
    passQualityCheck,
    failQualityCheck
};
