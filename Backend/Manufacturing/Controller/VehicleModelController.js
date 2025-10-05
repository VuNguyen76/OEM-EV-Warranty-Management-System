const responseHelper = require('../../shared/utils/responseHelper');
const queryHelper = require('../../shared/utils/queryHelper');
const redisService = require('../../shared/services/RedisService');

let VehicleModel;

function initializeModels() {
    if (!VehicleModel) {
        VehicleModel = require('../Model/VehicleModel')();
    }
}

const createVehicleModel = async (req, res) => {
    try {
        initializeModels();

        const {
            modelName,
            modelCode,
            manufacturer,
            batteryCapacity,
            motorPower,
            range,
            vehicleWarrantyMonths,
            batteryWarrantyMonths,
            basePrice,
            description,
            category,
            year
        } = req.body;

        const existingModel = await VehicleModel.findOne({ modelCode: modelCode.toUpperCase() });
        if (existingModel) {
            return responseHelper.error(res, "Mã model đã tồn tại", 400);
        }

        const newModel = new VehicleModel({
            modelName,
            modelCode: modelCode.toUpperCase(),
            manufacturer,
            batteryCapacity,
            motorPower,
            range: range || 400,
            vehicleWarrantyMonths: vehicleWarrantyMonths || 36,
            batteryWarrantyMonths: batteryWarrantyMonths || 96,
            basePrice,
            description,
            category: category || 'sedan',
            year: year || new Date().getFullYear(),
            status: 'development',
            createdBy: req.user.email,
            createdByRole: req.user.role
        });

        await newModel.save();

        await redisService.del("manufacturing:models:*");

        return responseHelper.success(res, {
            id: newModel._id,
            modelName: newModel.modelName,
            modelCode: newModel.modelCode,
            manufacturer: newModel.manufacturer,
            category: newModel.category,
            year: newModel.year,
            status: newModel.status
        }, "Tạo model xe thành công", 201);
    } catch (error) {
        return responseHelper.error(res, error.message || "Lỗi tạo model xe", 500);
    }
};

const getAllVehicleModels = async (req, res) => {
    try {
        initializeModels();

        const { page = 1, limit = 10, manufacturer, category, status, search, year } = req.query;
        const cacheKey = `manufacturing:models:list:${JSON.stringify(req.query)}`;

        const cachedData = await redisService.get(cacheKey);
        if (cachedData) {
            const { models, pagination } = JSON.parse(cachedData);
            return responseHelper.sendPaginatedResponse(res, "Lấy danh sách model xe thành công (cached)", models, pagination);
        }

        let query = {};

        if (manufacturer) {
            query.manufacturer = new RegExp(manufacturer, 'i');
        }

        if (category) {
            query.category = category;
        }

        if (status) {
            query.status = status;
        }

        if (year) {
            query.year = parseInt(year);
        }

        if (search) {
            query.$or = [
                { modelName: new RegExp(search, 'i') },
                { modelCode: new RegExp(search, 'i') },
                { manufacturer: new RegExp(search, 'i') }
            ];
        }

        const { skip, limitNum } = queryHelper.parsePagination(page, limit);

        const [models, total] = await Promise.all([
            VehicleModel.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            VehicleModel.countDocuments(query)
        ]);

        const pagination = responseHelper.createPagination(page, limitNum, total);

        const cacheData = { models, pagination };
        await redisService.set(cacheKey, JSON.stringify(cacheData), 600);

        return responseHelper.sendPaginatedResponse(res, "Lấy danh sách model xe thành công", models, pagination);
    } catch (error) {
        return responseHelper.error(res, error.message || "Lỗi lấy danh sách model xe", 500);
    }
};

const getVehicleModelById = async (req, res) => {
    try {
        initializeModels();

        const { id } = req.params;
        const cacheKey = `manufacturing:models:${id}`;

        const cachedData = await redisService.get(cacheKey);
        if (cachedData) {
            return responseHelper.success(res, JSON.parse(cachedData), "Lấy thông tin model xe thành công (cached)");
        }

        const model = await VehicleModel.findById(id);
        if (!model) {
            return responseHelper.error(res, "Không tìm thấy model xe", 404);
        }

        await redisService.set(cacheKey, JSON.stringify(model), 600);

        return responseHelper.success(res, model, "Lấy thông tin model xe thành công");
    } catch (error) {
        return responseHelper.error(res, error.message || "Lỗi lấy thông tin model xe", 500);
    }
};

const updateVehicleModel = async (req, res) => {
    try {
        initializeModels();

        const { id } = req.params;
        const updateData = { ...req.body, updatedBy: req.user.email };

        const model = await VehicleModel.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!model) {
            return responseHelper.error(res, "Không tìm thấy model xe", 404);
        }

        await redisService.del("manufacturing:models:*");

        return responseHelper.success(res, model, "Cập nhật model xe thành công");
    } catch (error) {
        return responseHelper.error(res, error.message || "Lỗi cập nhật model xe", 500);
    }
};

const deleteVehicleModel = async (req, res) => {
    try {
        initializeModels();

        const { id } = req.params;

        const model = await VehicleModel.findByIdAndDelete(id);
        if (!model) {
            return responseHelper.error(res, "Không tìm thấy model xe", 404);
        }

        await redisService.del("manufacturing:models:*");

        return responseHelper.success(res, null, "Xóa model xe thành công");
    } catch (error) {
        return responseHelper.error(res, error.message || "Lỗi xóa model xe", 500);
    }
};

const getModelStatistics = async (req, res) => {
    try {
        initializeModels();

        const cacheKey = 'manufacturing:models:statistics';

        const cachedData = await redisService.get(cacheKey);
        if (cachedData) {
            return responseHelper.success(res, JSON.parse(cachedData), "Lấy thống kê model xe thành công (cached)");
        }

        const [totalModels, byStatus, byManufacturer, byCategory] = await Promise.all([
            VehicleModel.countDocuments(),
            VehicleModel.aggregate([
                { $group: { _id: "$status", count: { $sum: 1 } } }
            ]),
            VehicleModel.aggregate([
                { $group: { _id: "$manufacturer", count: { $sum: 1 } } }
            ]),
            VehicleModel.aggregate([
                { $group: { _id: "$category", count: { $sum: 1 } } }
            ])
        ]);

        const statistics = {
            totalModels,
            byStatus: byStatus.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            byManufacturer: byManufacturer.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            byCategory: byCategory.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {})
        };

        await redisService.set(cacheKey, JSON.stringify(statistics), 1800);

        return responseHelper.success(res, statistics, "Lấy thống kê model xe thành công");
    } catch (error) {
        return responseHelper.error(res, error.message || "Lỗi lấy thống kê model xe", 500);
    }
};

module.exports = {
    initializeModels,
    createVehicleModel,
    getAllVehicleModels,
    getVehicleModelById,
    updateVehicleModel,
    deleteVehicleModel,
    getModelStatistics
};
