const responseHelper = require("../../shared/utils/responseHelper");
const queryHelper = require("../../shared/utils/queryHelper");
const redisService = require("../../shared/services/RedisService");

let ServiceHistory, WarrantyVehicle, VehiclePart;

// Initialize models
function initializeModels() {
    try {
        if (!ServiceHistory || !WarrantyVehicle || !VehiclePart) {
            const warrantyConnection = require('../../shared/database/warrantyConnection');
            ServiceHistory = require('../Model/ServiceHistory')(warrantyConnection);
            WarrantyVehicle = require('../Model/WarrantyVehicle')(warrantyConnection);
            VehiclePart = require('../Model/VehiclePart')(warrantyConnection);
        }
    } catch (error) {
        throw error;
    }
}

// Add Service History
const addServiceHistory = async (req, res) => {
    try {
        const {
            vin,
            serviceType,
            description,
            partsUsed,
            laborCost,
            partsCost,
            totalCost,
            serviceDate,
            nextServiceDate,
            mileage,
            technicianName,
            serviceCenterInfo,
            notes,
            qualityRating
        } = req.body;

        // Validate required fields
        if (!vin || !serviceType || !description) {
            return responseHelper.error(res, "Thiếu thông tin bắt buộc: VIN, loại dịch vụ, mô tả", 400);
        }

        // Check if vehicle exists
        const vehicle = await WarrantyVehicle.findOne({ vin: vin.toUpperCase() });
        if (!vehicle) {
            return responseHelper.error(res, "Không tìm thấy xe với VIN này", 404);
        }

        // Create service history record
        const serviceHistory = new ServiceHistory({
            vin: vin.toUpperCase(),
            serviceType,
            description,
            partsUsed: partsUsed || [],
            costs: {
                labor: laborCost || 0,
                parts: partsCost || 0,
                total: totalCost || (laborCost || 0) + (partsCost || 0)
            },
            serviceDate: serviceDate ? new Date(serviceDate) : new Date(),
            nextServiceDate: nextServiceDate ? new Date(nextServiceDate) : null,
            mileage: mileage || 0,
            technicianName: technicianName || req.user.fullName,
            serviceCenterInfo: serviceCenterInfo || {
                name: req.user.serviceCenterName,
                code: req.user.serviceCenterCode
            },
            notes,
            qualityRating: qualityRating || 5,
            createdBy: req.user.email
        });

        await serviceHistory.save();

        // Update vehicle's last service info
        vehicle.lastServiceDate = serviceHistory.serviceDate;
        vehicle.currentMileage = mileage || vehicle.currentMileage;
        await vehicle.save();

        // Clear cache
        await redisService.del("service-history:*");

        return responseHelper.success(res, serviceHistory, "Thêm lịch sử bảo dưỡng thành công", 201);
    } catch (error) {
        console.error('❌ Error in addServiceHistory:', error);
        return responseHelper.error(res, "Lỗi khi thêm lịch sử bảo dưỡng", 500);
    }
};

// Get Service History by VIN
const getServiceHistoryByVIN = async (req, res) => {
    try {
        const { vin } = req.params;
        const { page = 1, limit = 10, serviceType, startDate, endDate } = req.query;
        const cacheKey = `service-history:${vin}:${JSON.stringify(req.query)}`;

        // Try cache first
        const cachedData = await redisService.get(cacheKey);
        if (cachedData) {
            return responseHelper.success(res, JSON.parse(cachedData), "Lấy lịch sử bảo dưỡng thành công (từ cache)");
        }

        // Build search query
        const searchQuery = { vin: vin.toUpperCase() };

        if (serviceType) {
            searchQuery.serviceType = serviceType;
        }

        if (startDate || endDate) {
            searchQuery.serviceDate = {};
            if (startDate) searchQuery.serviceDate.$gte = new Date(startDate);
            if (endDate) searchQuery.serviceDate.$lte = new Date(endDate);
        }

        // Get paginated results
        const { skip, limitNum } = queryHelper.parsePagination(page, limit);
        const [serviceHistories, total] = await Promise.all([
            ServiceHistory.find(searchQuery)
                .sort({ serviceDate: -1 })
                .skip(skip)
                .limit(limitNum),
            ServiceHistory.countDocuments(searchQuery)
        ]);

        const result = {
            serviceHistories,
            pagination: responseHelper.createPagination(page, limit, total)
        };

        // Cache for 5 minutes
        await redisService.set(cacheKey, JSON.stringify(result), 300);

        return responseHelper.success(res, result, "Lấy lịch sử bảo dưỡng thành công");
    } catch (error) {
        console.error('❌ Error in getServiceHistoryByVIN:', error);
        return responseHelper.error(res, "Lỗi khi lấy lịch sử bảo dưỡng", 500);
    }
};

// Get All Service Histories
const getAllServiceHistories = async (req, res) => {
    try {
        const { page = 1, limit = 10, serviceType, technicianName, startDate, endDate, search } = req.query;
        const cacheKey = `service-history:all:${JSON.stringify(req.query)}`;

        // Try cache first
        const cachedData = await redisService.get(cacheKey);
        if (cachedData) {
            return responseHelper.success(res, JSON.parse(cachedData), "Lấy tất cả lịch sử bảo dưỡng thành công (từ cache)");
        }

        // Build search query
        const searchQuery = {};

        if (serviceType) {
            searchQuery.serviceType = serviceType;
        }

        if (technicianName) {
            searchQuery.technicianName = { $regex: technicianName, $options: 'i' };
        }

        if (search) {
            searchQuery.$or = [
                { vin: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { technicianName: { $regex: search, $options: 'i' } }
            ];
        }

        if (startDate || endDate) {
            searchQuery.serviceDate = {};
            if (startDate) searchQuery.serviceDate.$gte = new Date(startDate);
            if (endDate) searchQuery.serviceDate.$lte = new Date(endDate);
        }

        // Get paginated results
        const { skip, limitNum } = queryHelper.parsePagination(page, limit);
        const [serviceHistories, total] = await Promise.all([
            ServiceHistory.find(searchQuery)
                .sort({ serviceDate: -1 })
                .skip(skip)
                .limit(limitNum),
            ServiceHistory.countDocuments(searchQuery)
        ]);

        const result = {
            serviceHistories,
            pagination: responseHelper.createPagination(page, limit, total)
        };

        // Cache for 3 minutes
        await redisService.set(cacheKey, JSON.stringify(result), 180);

        return responseHelper.success(res, result, "Lấy tất cả lịch sử bảo dưỡng thành công");
    } catch (error) {
        console.error('❌ Error in getAllServiceHistories:', error);
        return responseHelper.error(res, "Lỗi khi lấy tất cả lịch sử bảo dưỡng", 500);
    }
};

// Get Service History by ID
const getServiceHistoryById = async (req, res) => {
    try {
        const { id } = req.params;
        const cacheKey = `service-history:${id}`;

        // Try cache first
        const cachedData = await redisService.get(cacheKey);
        if (cachedData) {
            return responseHelper.success(res, JSON.parse(cachedData), "Lấy chi tiết lịch sử bảo dưỡng thành công (từ cache)");
        }

        const serviceHistory = await ServiceHistory.findById(id);
        if (!serviceHistory) {
            return responseHelper.error(res, "Không tìm thấy lịch sử bảo dưỡng", 404);
        }

        // Cache for 10 minutes
        await redisService.set(cacheKey, JSON.stringify(serviceHistory), 600);

        return responseHelper.success(res, serviceHistory, "Lấy chi tiết lịch sử bảo dưỡng thành công");
    } catch (error) {
        console.error('❌ Error in getServiceHistoryById:', error);
        return responseHelper.error(res, "Lỗi khi lấy chi tiết lịch sử bảo dưỡng", 500);
    }
};

// Update Service History
const updateServiceHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body, updatedBy: req.user.email };

        const serviceHistory = await ServiceHistory.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
        if (!serviceHistory) {
            return responseHelper.error(res, "Không tìm thấy lịch sử bảo dưỡng", 404);
        }

        // Clear cache
        await redisService.del("service-history:*");

        return responseHelper.success(res, serviceHistory, "Cập nhật lịch sử bảo dưỡng thành công");
    } catch (error) {
        console.error('❌ Error in updateServiceHistory:', error);
        return responseHelper.error(res, "Lỗi khi cập nhật lịch sử bảo dưỡng", 500);
    }
};

// Get Service Statistics
const getServiceStatistics = async (req, res) => {
    try {
        const { startDate, endDate, serviceType } = req.query;
        const cacheKey = `service-history:stats:${JSON.stringify(req.query)}`;

        // Try cache first
        const cachedData = await redisService.get(cacheKey);
        if (cachedData) {
            return responseHelper.success(res, JSON.parse(cachedData), "Lấy thống kê bảo dưỡng thành công (từ cache)");
        }

        // Build date filter
        const dateFilter = {};
        if (startDate || endDate) {
            dateFilter.serviceDate = {};
            if (startDate) dateFilter.serviceDate.$gte = new Date(startDate);
            if (endDate) dateFilter.serviceDate.$lte = new Date(endDate);
        }

        // Build service type filter
        const serviceTypeFilter = serviceType ? { serviceType } : {};

        // Combine filters
        const matchFilter = { ...dateFilter, ...serviceTypeFilter };

        // Get statistics
        const [
            totalServices,
            totalCost,
            avgCost,
            servicesByType,
            servicesByMonth
        ] = await Promise.all([
            ServiceHistory.countDocuments(matchFilter),
            ServiceHistory.aggregate([
                { $match: matchFilter },
                { $group: { _id: null, total: { $sum: "$costs.total" } } }
            ]),
            ServiceHistory.aggregate([
                { $match: matchFilter },
                { $group: { _id: null, avg: { $avg: "$costs.total" } } }
            ]),
            ServiceHistory.aggregate([
                { $match: matchFilter },
                { $group: { _id: "$serviceType", count: { $sum: 1 }, totalCost: { $sum: "$costs.total" } } },
                { $sort: { count: -1 } }
            ]),
            ServiceHistory.aggregate([
                { $match: matchFilter },
                {
                    $group: {
                        _id: {
                            year: { $year: "$serviceDate" },
                            month: { $month: "$serviceDate" }
                        },
                        count: { $sum: 1 },
                        totalCost: { $sum: "$costs.total" }
                    }
                },
                { $sort: { "_id.year": -1, "_id.month": -1 } }
            ])
        ]);

        const statistics = {
            totalServices,
            totalCost: totalCost[0]?.total || 0,
            averageCost: avgCost[0]?.avg || 0,
            servicesByType,
            servicesByMonth
        };

        // Cache for 10 minutes
        await redisService.set(cacheKey, JSON.stringify(statistics), 600);

        return responseHelper.success(res, statistics, "Lấy thống kê bảo dưỡng thành công");
    } catch (error) {
        console.error('❌ Error in getServiceStatistics:', error);
        return responseHelper.error(res, "Lỗi khi lấy thống kê bảo dưỡng", 500);
    }
};

module.exports = {
    initializeModels,
    addServiceHistory,
    getServiceHistoryByVIN,
    getAllServiceHistories,
    getServiceHistoryById,
    updateServiceHistory,
    getServiceStatistics
};
