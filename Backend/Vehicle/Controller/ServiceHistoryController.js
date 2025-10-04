const { getVehicleConnection } = require("../../shared/database/vehicleConnection");
const responseHelper = require("../../shared/utils/responseHelper");
const queryHelper = require("../../shared/utils/queryHelper");
const redisService = require("../../shared/services/RedisService");

let ServiceHistory, Vehicle, VehiclePart;

// Initialize models
function initializeModels() {
    try {
        const vehicleConnection = getVehicleConnection();

        // Load models
        ServiceHistory = require("../Model/ServiceHistory")(vehicleConnection);
        Vehicle = require("../Model/Vehicle")();
        VehiclePart = require("../Model/VehiclePart")(vehicleConnection);

        console.log("✅ ServiceHistory models initialized successfully");
    } catch (error) {
        console.error("❌ Failed to initialize ServiceHistory models:", error.message);
        throw error;
    }
}

// UC3: Lưu lịch sử dịch vụ
const addServiceHistory = async (req, res) => {
    try {
        const { vehicleId } = req.params;
        const serviceData = req.body;

        // Validate required fields
        if (!serviceData.serviceType || !serviceData.description || !serviceData.performedBy) {
            return responseHelper.error(res, "Thiếu thông tin bắt buộc: serviceType, description, performedBy", 400);
        }

        // Check if vehicle exists
        const vehicle = await Vehicle.findById(vehicleId);
        if (!vehicle) {
            return responseHelper.error(res, "Không tìm thấy xe", 404);
        }

        // Create service history record
        const serviceHistory = new ServiceHistory({
            vehicleId,
            ...serviceData,
            serviceDate: serviceData.serviceDate || new Date()
        });

        await serviceHistory.save();

        // Update vehicle mileage if provided
        if (serviceData.odometerReading && serviceData.odometerReading > vehicle.currentMileage) {
            vehicle.currentMileage = serviceData.odometerReading;
            await vehicle.save();
        }

        // Clear cache
        await redisService.deletePattern(`vehicle:${vehicleId}:*`);
        await redisService.deletePattern('service-history:*');

        // Populate response (only populate parts, not users)
        await serviceHistory.populate('partsUsed.partId');

        responseHelper.success(res, serviceHistory, "Thêm lịch sử dịch vụ thành công", 201);
    } catch (error) {
        console.error("Error adding service history:", error);
        responseHelper.error(res, "Lỗi thêm lịch sử dịch vụ", 500);
    }
};

const getServiceHistory = async (req, res) => {
    try {
        const { vehicleId } = req.params;
        const { page = 1, limit = 10, serviceType, dateFrom, dateTo } = req.query;
        const cacheKey = `vehicle:${vehicleId}:history:${JSON.stringify(req.query)}`;

        // Try cache first
        const cachedHistory = await redisService.get(cacheKey);
        if (cachedHistory) {
            return responseHelper.success(res, cachedHistory, "Lấy lịch sử dịch vụ thành công (cache)");
        }

        // Build query options
        const options = { serviceType, dateFrom, dateTo };

        // Get service history with pagination
        const serviceHistory = await ServiceHistory.find({ vehicleId })
            .populate(['vehicleId', 'partsUsed.partId'])
            .sort({ serviceDate: -1 })
            .limit(limit)
            .skip((page - 1) * limit);

        const total = await ServiceHistory.countDocuments({ vehicleId });
        const pagination = responseHelper.createPagination(page, limit, total);

        const result = {
            serviceHistory,
            pagination
        };

        // Cache result
        await redisService.set(cacheKey, result, 300); // 5 minutes

        responseHelper.success(res, result, "Lấy lịch sử dịch vụ thành công");
    } catch (error) {
        console.error("Error getting service history:", error);
        responseHelper.error(res, "Lỗi lấy lịch sử dịch vụ", 500);
    }
};

const updateServiceHistory = async (req, res) => {
    try {
        const { vehicleId, recordId } = req.params;
        const updateData = req.body;

        const serviceHistory = await ServiceHistory.findOne({
            _id: recordId,
            vehicleId: vehicleId
        });

        if (!serviceHistory) {
            return responseHelper.error(res, "Không tìm thấy bản ghi dịch vụ", 404);
        }

        // Update service history
        Object.assign(serviceHistory, updateData);
        await serviceHistory.save();

        // Clear cache
        await redisService.deletePattern(`vehicle:${vehicleId}:*`);
        await redisService.deletePattern('service-history:*');

        responseHelper.success(res, serviceHistory, "Cập nhật lịch sử dịch vụ thành công");
    } catch (error) {
        console.error("Error updating service history:", error);
        responseHelper.error(res, "Lỗi cập nhật lịch sử dịch vụ", 500);
    }
};

const getServiceCenterHistory = async (req, res) => {
    try {
        const { centerName } = req.params;
        const { page = 1, limit = 10, dateFrom, dateTo } = req.query;
        const cacheKey = `service-center:${centerName}:history:${JSON.stringify(req.query)}`;

        // Try cache first
        const cachedHistory = await redisService.get(cacheKey);
        if (cachedHistory) {
            return responseHelper.success(res, cachedHistory, "Lấy lịch sử dịch vụ trung tâm thành công (cache)");
        }

        // Build query
        let query = { 'serviceCenter.name': centerName };

        if (dateFrom || dateTo) {
            query.serviceDate = {};
            if (dateFrom) query.serviceDate.$gte = new Date(dateFrom);
            if (dateTo) query.serviceDate.$lte = new Date(dateTo);
        }

        // Execute query with pagination
        const options = queryHelper.getPaginationOptions(page, limit);
        const serviceHistory = await ServiceHistory.find(query)
            .populate(['vehicleId', 'partsUsed.partId'])
            .sort({ serviceDate: -1 })
            .limit(options.limit)
            .skip(options.skip);

        const total = await ServiceHistory.countDocuments(query);
        const pagination = queryHelper.getPaginationInfo(page, limit, total);

        const result = {
            serviceHistory,
            pagination
        };

        // Cache result
        await redisService.set(cacheKey, result, 300); // 5 minutes

        responseHelper.success(res, result, "Lấy lịch sử dịch vụ trung tâm thành công");
    } catch (error) {
        console.error("Error getting service center history:", error);
        responseHelper.error(res, "Lỗi lấy lịch sử dịch vụ trung tâm", 500);
    }
};

const completeService = async (req, res) => {
    try {
        const { vehicleId, recordId } = req.params;
        const completionData = req.body;

        const serviceHistory = await ServiceHistory.findOne({
            _id: recordId,
            vehicleId: vehicleId
        });

        if (!serviceHistory) {
            return responseHelper.error(res, "Không tìm thấy bản ghi dịch vụ", 404);
        }

        // Complete the service
        await serviceHistory.completeService(completionData);

        // Clear cache
        await redisService.deletePattern(`vehicle:${vehicleId}:*`);
        await redisService.deletePattern('service-history:*');

        responseHelper.success(res, serviceHistory, "Hoàn thành dịch vụ thành công");
    } catch (error) {
        console.error("Error completing service:", error);
        responseHelper.error(res, "Lỗi hoàn thành dịch vụ", 500);
    }
};

const getServiceStatistics = async (req, res) => {
    try {
        const { dateFrom, dateTo, serviceCenter } = req.query;
        const cacheKey = `service-stats:${JSON.stringify(req.query)}`;

        // Try cache first
        const cachedStats = await redisService.get(cacheKey);
        if (cachedStats) {
            return responseHelper.success(res, cachedStats, "Lấy thống kê dịch vụ thành công (cache)");
        }

        // Build filters
        const filters = {};
        if (dateFrom || dateTo) {
            filters.dateFrom = dateFrom;
            filters.dateTo = dateTo;
        }
        if (serviceCenter) {
            filters.serviceCenter = serviceCenter;
        }

        const stats = await ServiceHistory.getServiceStats(filters);

        // Cache result
        await redisService.set(cacheKey, stats, 600); // 10 minutes

        responseHelper.success(res, stats, "Lấy thống kê dịch vụ thành công");
    } catch (error) {
        console.error("Error getting service statistics:", error);
        responseHelper.error(res, "Lỗi lấy thống kê dịch vụ", 500);
    }
};

const getUpcomingServices = async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const cacheKey = `upcoming-services:${days}`;

        // Try cache first
        const cachedServices = await redisService.get(cacheKey);
        if (cachedServices) {
            return responseHelper.success(res, cachedServices, "Lấy danh sách dịch vụ sắp tới thành công (cache)");
        }

        const upcomingServices = await ServiceHistory.findUpcomingServices(parseInt(days));

        // Cache result
        await redisService.set(cacheKey, upcomingServices, 300); // 5 minutes

        responseHelper.success(res, upcomingServices, "Lấy danh sách dịch vụ sắp tới thành công");
    } catch (error) {
        console.error("Error getting upcoming services:", error);
        responseHelper.error(res, "Lỗi lấy danh sách dịch vụ sắp tới", 500);
    }
};

module.exports = {
    initializeModels,

    // Service history management (UC3)
    addServiceHistory,
    getServiceHistory,
    updateServiceHistory,
    completeService,

    // Service center operations
    getServiceCenterHistory,

    // Statistics and reporting
    getServiceStatistics,
    getUpcomingServices
};
