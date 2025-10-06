const { createVehicleModel } = require('../Model/Vehicle');
const responseHelper = require('../../shared/utils/responseHelper');
const queryHelper = require('../../shared/utils/queryHelper');
const redisService = require('../../shared/services/RedisService');

let Vehicle = null;

const initializeModels = () => {
    if (!Vehicle) {
        Vehicle = createVehicleModel();
    }
};

const registerVehicle = async (req, res) => {
    try {
        const {
            vin,
            modelName,
            modelCode,
            manufacturer,
            year,
            color,
            productionDate,
            ownerName,
            ownerPhone,
            ownerEmail,
            ownerAddress,
            serviceCenterName,
            serviceCenterCode,
            serviceCenterAddress,
            serviceCenterPhone,
            notes
        } = req.body;

        initializeModels();

        const existingVehicle = await Vehicle.findByVIN(vin);
        if (existingVehicle) {
            return responseHelper.error(res, "VIN này đã được đăng ký", 400);
        }

        const vehicle = new Vehicle({
            vin: vin.toUpperCase(),
            modelName,
            modelCode: modelCode.toUpperCase(),
            manufacturer,
            year,
            color,
            productionDate: productionDate ? new Date(productionDate) : null,
            ownerName,
            ownerPhone,
            ownerEmail,
            ownerAddress,
            serviceCenterName: serviceCenterName || req.user.serviceCenterName || 'Default Service Center',
            serviceCenterCode: serviceCenterCode || req.user.serviceCenterCode || 'SC001',
            serviceCenterAddress,
            serviceCenterPhone,
            registeredBy: req.user.email,
            registeredByRole: req.user.role,
            createdBy: req.user.email,
            notes
        });

        await vehicle.save();

        await redisService.del("vehicles:*");

        return responseHelper.success(res, {
            id: vehicle._id,
            vin: vehicle.vin,
            modelName: vehicle.modelName,
            ownerName: vehicle.ownerName,
            serviceCenterName: vehicle.serviceCenterName,
            status: vehicle.status
        }, "Đăng ký xe thành công", 201);
    } catch (error) {
        return responseHelper.error(res, "Lỗi khi đăng ký xe", 500);
    }
};

const getVehicleByVIN = async (req, res) => {
    try {
        const { vin } = req.params;
        const cacheKey = `vehicles:vin:${vin.toUpperCase()}`;

        initializeModels();

        const cachedData = await redisService.get(cacheKey);
        if (cachedData) {
            return responseHelper.success(res, JSON.parse(cachedData), "Lấy thông tin xe thành công (từ cache)");
        }

        const vehicle = await Vehicle.findByVIN(vin);
        if (!vehicle) {
            return responseHelper.error(res, "Không tìm thấy xe với VIN này", 404);
        }

        await redisService.set(cacheKey, JSON.stringify(vehicle), 600);

        return responseHelper.success(res, vehicle, "Lấy thông tin xe thành công");
    } catch (error) {
        return responseHelper.error(res, "Lỗi khi lấy thông tin xe", 500);
    }
};

const getAllVehicles = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, status, serviceCenterCode } = req.query;
        const cacheKey = `vehicles:all:${page}:${limit}:${search || ''}:${status || ''}:${serviceCenterCode || ''}`;

        initializeModels();

        const cachedData = await redisService.get(cacheKey);
        if (cachedData) {
            return responseHelper.success(res, JSON.parse(cachedData), "Lấy danh sách xe thành công (từ cache)");
        }

        let query = {};

        if (search) {
            query = queryHelper.buildSearchQuery(search, ['vin', 'ownerName', 'ownerPhone', 'modelName']);
        }

        if (status) {
            query.status = status;
        }

        if (serviceCenterCode) {
            query.serviceCenterCode = serviceCenterCode.toUpperCase();
        }

        const { skip, limitNum } = queryHelper.parsePagination({ page, limit });

        const vehicles = await Vehicle.find(query)
            .select("vin modelName modelCode manufacturer year color ownerName ownerPhone serviceCenterName status registrationDate")
            .sort({ registrationDate: -1 })
            .skip(skip)
            .limit(limitNum);

        const total = await Vehicle.countDocuments(query);
        const pagination = responseHelper.createPagination(page, limit, total);

        const result = { vehicles, pagination };

        await redisService.set(cacheKey, JSON.stringify(result), 300);

        return responseHelper.success(res, result, "Lấy danh sách xe thành công");
    } catch (error) {
        return responseHelper.error(res, "Lỗi khi lấy danh sách xe", 500);
    }
};

const updateVehicle = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        initializeModels();

        delete updateData.vin;
        delete updateData.createdBy;
        delete updateData.registeredBy;

        updateData.updatedBy = req.user.email;

        const vehicle = await Vehicle.findByIdAndUpdate(id, updateData, { new: true });
        if (!vehicle) {
            return responseHelper.error(res, "Không tìm thấy xe", 404);
        }

        await redisService.del("vehicles:*");

        return responseHelper.success(res, vehicle, "Cập nhật thông tin xe thành công");
    } catch (error) {
        return responseHelper.error(res, "Lỗi khi cập nhật xe", 500);
    }
};

const searchVehicles = async (req, res) => {
    try {
        const { q, type = 'all', page = 1, limit = 10 } = req.query;

        if (!q) {
            return responseHelper.error(res, "Thiếu từ khóa tìm kiếm", 400);
        }

        initializeModels();

        let query = {};

        switch (type) {
            case 'vin':
                query.vin = { $regex: q, $options: 'i' };
                break;
            case 'owner':
                query.$or = [
                    { ownerName: { $regex: q, $options: 'i' } },
                    { ownerPhone: { $regex: q, $options: 'i' } }
                ];
                break;
            case 'model':
                query.$or = [
                    { modelName: { $regex: q, $options: 'i' } },
                    { modelCode: { $regex: q, $options: 'i' } }
                ];
                break;
            default:
                query = queryHelper.buildSearchQuery(q, ['vin', 'ownerName', 'ownerPhone', 'modelName', 'modelCode']);
        }

        const { skip, limitNum } = queryHelper.parsePagination({ page, limit });

        const vehicles = await Vehicle.find(query)
            .select("vin modelName modelCode manufacturer year color ownerName ownerPhone serviceCenterName status")
            .sort({ registrationDate: -1 })
            .skip(skip)
            .limit(limitNum);

        const total = await Vehicle.countDocuments(query);
        const pagination = responseHelper.createPagination(page, limit, total);

        return responseHelper.success(res, { vehicles, pagination }, "Tìm kiếm xe thành công");
    } catch (error) {
        return responseHelper.error(res, "Lỗi khi tìm kiếm xe", 500);
    }
};

const getVehicleStatistics = async (req, res) => {
    try {
        const cacheKey = 'vehicle_statistics';

        const cachedStats = await redisService.get(cacheKey);
        if (cachedStats) {
            return responseHelper.success(res, cachedStats, 'Thống kê xe (từ cache)');
        }

        const totalVehicles = await Vehicle.countDocuments();
        const activeVehicles = await Vehicle.countDocuments({ status: 'active' });
        const inactiveVehicles = await Vehicle.countDocuments({ status: 'inactive' });

        const brandStats = await Vehicle.aggregate([
            { $group: { _id: '$manufacturer', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        const yearStats = await Vehicle.aggregate([
            { $group: { _id: '$year', count: { $sum: 1 } } },
            { $sort: { _id: -1 } }
        ]);

        const statistics = {
            totalVehicles,
            activeVehicles,
            inactiveVehicles,
            brandDistribution: brandStats,
            yearDistribution: yearStats,
            lastUpdated: new Date()
        };

        await redisService.set(cacheKey, statistics, 300);

        responseHelper.success(res, statistics, 'Lấy thống kê xe thành công');
    } catch (error) {
        responseHelper.error(res, 'Lỗi khi lấy thống kê xe', 500);
    }
};

module.exports = {
    initializeModels,
    registerVehicle,
    getVehicleByVIN,
    getAllVehicles,
    updateVehicle,
    searchVehicles,
    getVehicleStatistics
};