const responseHelper = require("../../shared/utils/responseHelper");
const queryHelper = require("../../shared/utils/queryHelper");
const { getCached, setCached, clearCachePatterns } = require("../../shared/services/CacheHelper");
const { verifyVINInVehicleService, normalizeVIN } = require("../../shared/services/VehicleServiceHelper");

let ServiceHistory, WarrantyVehicle, VehiclePart;

// Initialize models
async function initializeModels() {
    try {
        if (!ServiceHistory || !WarrantyVehicle || !VehiclePart) {
            const { connectToWarrantyDB } = require('../../shared/database/warrantyConnection');
            await connectToWarrantyDB();
            ServiceHistory = require('../Model/ServiceHistory')();
            WarrantyVehicle = require('../Model/WarrantyVehicle')();
            VehiclePart = require('../Model/VehiclePart')();
        }
    } catch (error) {
        throw error;
    }
}

// UC3: Add Service History
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
            serviceCenterInfo,
            notes
        } = req.body;

        // ✅ UC3 VALIDATION: Required fields
        if (!vin || !serviceType || !description) {
            return responseHelper.error(res, "Thiếu thông tin bắt buộc: VIN, loại dịch vụ, mô tả", 400);
        }

        // Validate user authentication
        if (!req.user.sub && !req.user.userId) {
            return responseHelper.error(res, "User ID không hợp lệ trong token", 401);
        }

        // ✅ Check if vehicle exists in Vehicle service
        try {
            await verifyVINInVehicleService(vin, req.headers.authorization);
        } catch (error) {
            if (error.message === 'VEHICLE_NOT_FOUND') {
                return responseHelper.error(res, "Không tìm thấy xe với VIN này. Vui lòng đăng ký xe trước (UC1)", 404);
            }
            return responseHelper.error(res, "Không thể xác minh xe trong hệ thống. Vui lòng đăng ký xe trước (UC1)", 400);
        }

        // ✅ Process attachments if files uploaded (UC3 Step 4)
        const attachments = [];
        if (req.files && req.files.length > 0) {
            const { generateFileUrl } = require('../../shared/middleware/MulterMiddleware');

            for (const file of req.files) {
                attachments.push({
                    name: file.originalname,
                    type: file.mimetype.startsWith('image/') ? 'image' : 'document',
                    url: generateFileUrl(req, file.filename),
                    description: `Service documentation for ${serviceType}`,
                    uploadedAt: new Date(),
                    uploadedBy: req.user.email
                });
            }
        }

        // Create service history record
        const serviceHistory = new ServiceHistory({
            vin: normalizeVIN(vin), // ✅ Use VIN directly (no vehicleId needed)
            serviceType,
            title: `${serviceType} - ${description.substring(0, 50)}`,
            description,
            performedBy: req.user.email, // ✅ Use email instead of ObjectId
            serviceCenter: {
                name: serviceCenterInfo?.name || req.user.serviceCenterName || 'Default Service Center',
                code: serviceCenterInfo?.code || req.user.serviceCenterCode || 'SC001',
                address: serviceCenterInfo?.address,
                contact: serviceCenterInfo?.contact
            },
            partsUsed: partsUsed || [],
            laborCost: laborCost !== undefined ? laborCost : 0,
            partsCost: partsCost !== undefined ? partsCost : 0,
            totalCost: totalCost !== undefined ? totalCost : (laborCost || 0) + (partsCost || 0),
            serviceDate: serviceDate ? new Date(serviceDate) : new Date(),
            nextServiceDate: nextServiceDate ? new Date(nextServiceDate) : null,
            odometerReading: mileage !== undefined ? mileage : 0,
            attachments, // ✅ UC3 Step 4: Attach files
            notes,
            status: 'completed',
            createdBy: req.user.email
        });

        // Use transaction to ensure data consistency
        const mongoose = require('mongoose');
        const session = await mongoose.startSession();
        let savedServiceHistory = null;

        try {
            await session.withTransaction(async () => {
                // Save service history
                savedServiceHistory = await serviceHistory.save({ session });

                // ✅ No need to update WarrantyVehicle - Vehicle service handles vehicle data
                // Service history is independent tracking
            });

            // Transaction successful - clear cache
            await clearCachePatterns(["service-history:*"]);

            return responseHelper.success(res, {
                serviceHistory: savedServiceHistory,
                message: `Ghi lịch sử ${serviceType} cho xe ${vin.toUpperCase()} thành công`,
                attachmentsCount: attachments.length
            }, "UC3: Lưu lịch sử dịch vụ thành công", 201);
        } catch (transactionError) {
            console.error('❌ Transaction failed in addServiceHistory:', {
                error: transactionError.message,
                stack: transactionError.stack,
                user: req.user?.email,
                vin: req.body?.vin,
                serviceType: req.body?.serviceType,
                timestamp: new Date().toISOString()
            });

            return responseHelper.error(res, "Lỗi khi lưu lịch sử bảo dưỡng - transaction rollback", 500);
        } finally {
            await session.endSession();
        }
    } catch (error) {
        console.error('❌ Error in addServiceHistory:', {
            error: error.message,
            stack: error.stack,
            user: req.user?.email,
            vin: req.body?.vin,
            serviceType: req.body?.serviceType,
            timestamp: new Date().toISOString()
        });
        return responseHelper.error(res, "Lỗi khi thêm lịch sử bảo dưỡng", 500);
    }
};

// Get Service History by VIN
const getServiceHistoryByVIN = async (req, res) => {
    try {
        const { vin } = req.params;
        const { page = 1, limit = 10, serviceType, startDate, endDate } = req.query;
        // Better cache key generation (avoid JSON.stringify issues)
        const cacheKey = `service-history:${vin}:page:${page}:limit:${limit}:type:${serviceType || 'all'}:start:${startDate || 'none'}:end:${endDate || 'none'}`;

        // Try cache first
        const cachedData = await getCached(cacheKey);
        if (cachedData) {
            return responseHelper.success(res, cachedData, "Lấy lịch sử bảo dưỡng thành công (từ cache)");
        }

        // ✅ Use VIN directly (no need to lookup vehicleId)
        const searchQuery = { vin: normalizeVIN(vin) };

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
                .populate('performedBy', 'username email role')
                .populate('vehicleId', 'vin modelName ownerName')
                .select('serviceType serviceDate description laborCost partsCost mileage performedBy vehicleId createdAt')
                .lean() // 5x faster, 5x less memory
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
        await setCached(cacheKey, result, 300);

        return responseHelper.success(res, result, "Lấy lịch sử bảo dưỡng thành công");
    } catch (error) {
        console.error('❌ Error in getServiceHistoryByVIN:', error);
        return responseHelper.error(res, "Lỗi khi lấy lịch sử bảo dưỡng", 500);
    }
};

// Get All Service Histories
const getAllServiceHistories = async (req, res) => {
    try {
        const { page = 1, limit = 10, serviceType, startDate, endDate, search } = req.query;
        // Better cache key generation (avoid JSON.stringify issues)
        const cacheKey = `service-history:all:page:${page}:limit:${limit}:type:${serviceType || 'all'}:search:${search || 'none'}:start:${startDate || 'none'}:end:${endDate || 'none'}`;

        // Try cache first
        const cachedData = await getCached(cacheKey);
        if (cachedData) {
            return responseHelper.success(res, cachedData, "Lấy tất cả lịch sử bảo dưỡng thành công (từ cache)");
        }

        // Build search query
        const searchQuery = {};

        if (serviceType) {
            searchQuery.serviceType = serviceType;
        }

        if (search) {
            searchQuery.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { 'serviceCenter.name': { $regex: search, $options: 'i' } },
                { 'serviceCenter.code': { $regex: search, $options: 'i' } }
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
        await setCached(cacheKey, result, 180);

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
        const cachedData = await getCached(cacheKey);
        if (cachedData) {
            return responseHelper.success(res, cachedData, "Lấy chi tiết lịch sử bảo dưỡng thành công (từ cache)");
        }

        const serviceHistory = await ServiceHistory.findById(id);
        if (!serviceHistory) {
            return responseHelper.error(res, "Không tìm thấy lịch sử bảo dưỡng", 404);
        }

        // Cache for 10 minutes
        await setCached(cacheKey, serviceHistory, 600);

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
        await clearCachePatterns(["service-history:*"]);

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
        // Better cache key generation (avoid JSON.stringify issues)
        const cacheKey = `service-history:stats:type:${serviceType || 'all'}:start:${startDate || 'none'}:end:${endDate || 'none'}`;

        // Try cache first
        const cachedData = await getCached(cacheKey);
        if (cachedData) {
            return responseHelper.success(res, cachedData, "Lấy thống kê bảo dưỡng thành công (từ cache)");
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
                { $group: { _id: null, total: { $sum: "$totalCost" } } }
            ]),
            ServiceHistory.aggregate([
                { $match: matchFilter },
                { $group: { _id: null, avg: { $avg: "$totalCost" } } }
            ]),
            ServiceHistory.aggregate([
                { $match: matchFilter },
                { $group: { _id: "$serviceType", count: { $sum: 1 }, totalCost: { $sum: "$totalCost" } } },
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
                        totalCost: { $sum: "$totalCost" }
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
        await setCached(cacheKey, statistics, 600);

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
