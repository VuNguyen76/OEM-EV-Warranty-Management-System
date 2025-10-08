const responseHelper = require("../../shared/utils/responseHelper");
const queryHelper = require("../../shared/utils/queryHelper");
const { getCached, setCached, clearCachePatterns } = require("../../shared/services/CacheHelper");
const { verifyVINInVehicleService, normalizeVIN } = require("../../shared/services/VehicleServiceHelper");

let ServiceHistory, WarrantyVehicle, VehiclePart;

// Khởi tạo models
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

/**
 * Thêm lịch sử dịch vụ cho xe
 * Ghi lại các hoạt động bảo dưỡng, sửa chữa đã thực hiện trên xe
 *
 * @route POST /api/warranty/service-history
 * @access technician, service_staff, admin
 * @param {string} vin - VIN của xe
 * @param {string} serviceType - Loại dịch vụ (maintenance, repair, inspection)
 * @param {string} description - Mô tả chi tiết công việc
 * @param {number} mileage - Số km hiện tại của xe
 * @param {Array} files - Danh sách file đính kèm (tùy chọn)
 * @param {string} notes - Ghi chú bổ sung (tùy chọn)
 */
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

        // Các trường bắt buộc
        if (!vin || !serviceType || !description) {
            return responseHelper.error(res, "Thiếu thông tin bắt buộc: VIN, loại dịch vụ, mô tả", 400);
        }

        // Validate user authentication
        if (!req.user.sub && !req.user.userId) {
            return responseHelper.error(res, "User ID không hợp lệ trong token", 401);
        }

        // ✅ Kiểm tra xe có tồn tại trong Vehicle service
        try {
            await verifyVINInVehicleService(vin, req.headers.authorization);
        } catch (error) {
            if (error.message === 'VEHICLE_NOT_FOUND') {
                return responseHelper.error(res, "Không tìm thấy xe với VIN này. Vui lòng đăng ký xe trước", 404);
            }
            return responseHelper.error(res, "Không thể xác minh xe trong hệ thống. Vui lòng đăng ký xe trước", 400);
        }

        // Xử lý file đính kèm nếu có
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

        // Tạo bản ghi lịch sử dịch vụ
        const serviceHistory = new ServiceHistory({
            vin: normalizeVIN(vin), // ✅ Sử dụng VIN trực tiếp (không cần vehicleId)
            serviceType,
            title: `${serviceType} - ${description.substring(0, 50)}`,
            description,
            performedBy: req.user.email, // ✅ Sử dụng email thay vì ObjectId
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
            attachments, // Đính kèm files
            notes,
            status: 'completed',
            createdBy: req.user.email
        });

        // Sử dụng giao dịch to ensure data consistency
        const mongoose = require('mongoose');
        const session = await mongoose.startSession();
        let savedServiceHistory = null;

        try {
            await session.withTransaction(async () => {
                // Lưu lịch sử dịch vụ
                savedServiceHistory = await serviceHistory.save({ session });

                // ✅ Không cần cập nhật WarrantyVehicle - Vehicle service xử lý dữ liệu xe
                // Lịch sử dịch vụ là theo dõi độc lập
            });

            // Giao dịch thành công - clear cache
            await clearCachePatterns(["service-history:*"]);

            return responseHelper.success(res, {
                serviceHistory: savedServiceHistory,
                message: `Ghi lịch sử ${serviceType} cho xe ${vin.toUpperCase()} thành công`,
                attachmentsCount: attachments.length
            }, "Lưu lịch sử dịch vụ thành công", 201);
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

// Lấy Lịch sử Dịch vụ theo VIN
const getServiceHistoryByVIN = async (req, res) => {
    try {
        const { vin } = req.params;
        const { page = 1, limit = 10, serviceType, startDate, endDate } = req.query;
        // Tạo cache key tốt hơn (tránh vấn đề JSON.stringify)
        const cacheKey = `service-history:${vin}:page:${page}:limit:${limit}:type:${serviceType || 'all'}:start:${startDate || 'none'}:end:${endDate || 'none'}`;

        // Thử cache trước
        const cachedData = await getCached(cacheKey);
        if (cachedData) {
            return responseHelper.success(res, cachedData, "Lấy lịch sử bảo dưỡng thành công (từ cache)");
        }

        // ✅ Sử dụng VIN trực tiếp (không cần lookup vehicleId)
        const searchQuery = { vin: normalizeVIN(vin) };

        if (serviceType) {
            searchQuery.serviceType = serviceType;
        }

        if (startDate || endDate) {
            searchQuery.serviceDate = {};
            if (startDate) searchQuery.serviceDate.$gte = new Date(startDate);
            if (endDate) searchQuery.serviceDate.$lte = new Date(endDate);
        }

        // Lấy kết quả phân trang
        const { skip, limitNum } = queryHelper.parsePagination(page, limit);
        const [serviceHistories, total] = await Promise.all([
            ServiceHistory.find(searchQuery)
                .populate('performedBy', 'username email role')
                .populate('vehicleId', 'vin modelName ownerName')
                .select('serviceType serviceDate description laborCost partsCost mileage performedBy vehicleId createdAt')
                .lean() // Nhanh hơn 5 lần, ít bộ nhớ hơn 5 lần
                .sort({ serviceDate: -1 })
                .skip(skip)
                .limit(limitNum),
            ServiceHistory.countDocuments(searchQuery)
        ]);

        const result = {
            serviceHistories,
            pagination: responseHelper.createPagination(page, limit, total)
        };

        // Cache trong 5 minutes
        await setCached(cacheKey, result, 300);

        return responseHelper.success(res, result, "Lấy lịch sử bảo dưỡng thành công");
    } catch (error) {
        console.error('❌ Error in getServiceHistoryByVIN:', error);
        return responseHelper.error(res, "Lỗi khi lấy lịch sử bảo dưỡng", 500);
    }
};

// Lấy Tất cả Lịch sử Dịch vụ
const getAllServiceHistories = async (req, res) => {
    try {
        const { page = 1, limit = 10, serviceType, startDate, endDate, search } = req.query;
        // Tạo cache key tốt hơn (tránh vấn đề JSON.stringify)
        const cacheKey = `service-history:all:page:${page}:limit:${limit}:type:${serviceType || 'all'}:search:${search || 'none'}:start:${startDate || 'none'}:end:${endDate || 'none'}`;

        // Thử cache trước
        const cachedData = await getCached(cacheKey);
        if (cachedData) {
            return responseHelper.success(res, cachedData, "Lấy tất cả lịch sử bảo dưỡng thành công (từ cache)");
        }

        // Xây dựng query tìm kiếm
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

        // Lấy kết quả phân trang
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

        // Cache trong 3 minutes
        await setCached(cacheKey, result, 180);

        return responseHelper.success(res, result, "Lấy tất cả lịch sử bảo dưỡng thành công");
    } catch (error) {
        console.error('❌ Error in getAllServiceHistories:', error);
        return responseHelper.error(res, "Lỗi khi lấy tất cả lịch sử bảo dưỡng", 500);
    }
};

// Lấy Lịch sử Dịch vụ theo ID
const getServiceHistoryById = async (req, res) => {
    try {
        const { id } = req.params;
        const cacheKey = `service-history:${id}`;

        // Thử cache trước
        const cachedData = await getCached(cacheKey);
        if (cachedData) {
            return responseHelper.success(res, cachedData, "Lấy chi tiết lịch sử bảo dưỡng thành công (từ cache)");
        }

        const serviceHistory = await ServiceHistory.findById(id);
        if (!serviceHistory) {
            return responseHelper.error(res, "Không tìm thấy lịch sử bảo dưỡng", 404);
        }

        // Cache trong 10 minutes
        await setCached(cacheKey, serviceHistory, 600);

        return responseHelper.success(res, serviceHistory, "Lấy chi tiết lịch sử bảo dưỡng thành công");
    } catch (error) {
        console.error('❌ Error in getServiceHistoryById:', error);
        return responseHelper.error(res, "Lỗi khi lấy chi tiết lịch sử bảo dưỡng", 500);
    }
};

// Cập nhật Lịch sử Dịch vụ
const updateServiceHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body, updatedBy: req.user.email };

        const serviceHistory = await ServiceHistory.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
        if (!serviceHistory) {
            return responseHelper.error(res, "Không tìm thấy lịch sử bảo dưỡng", 404);
        }

        // Xóa cache
        await clearCachePatterns(["service-history:*"]);

        return responseHelper.success(res, serviceHistory, "Cập nhật lịch sử bảo dưỡng thành công");
    } catch (error) {
        console.error('❌ Error in updateServiceHistory:', error);
        return responseHelper.error(res, "Lỗi khi cập nhật lịch sử bảo dưỡng", 500);
    }
};

// Lấy Thống kê Dịch vụ
const getServiceStatistics = async (req, res) => {
    try {
        const { startDate, endDate, serviceType } = req.query;
        // Tạo cache key tốt hơn (tránh vấn đề JSON.stringify)
        const cacheKey = `service-history:stats:type:${serviceType || 'all'}:start:${startDate || 'none'}:end:${endDate || 'none'}`;

        // Thử cache trước
        const cachedData = await getCached(cacheKey);
        if (cachedData) {
            return responseHelper.success(res, cachedData, "Lấy thống kê bảo dưỡng thành công (từ cache)");
        }

        // Xây dựng bộ lọc ngày
        const dateFilter = {};
        if (startDate || endDate) {
            dateFilter.serviceDate = {};
            if (startDate) dateFilter.serviceDate.$gte = new Date(startDate);
            if (endDate) dateFilter.serviceDate.$lte = new Date(endDate);
        }

        // Xây dựng bộ lọc loại dịch vụ
        const serviceTypeFilter = serviceType ? { serviceType } : {};

        // Kết hợp bộ lọc
        const matchFilter = { ...dateFilter, ...serviceTypeFilter };

        // Lấy thống kê
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

        // Cache trong 10 minutes
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
