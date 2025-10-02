const createVehicleModel = require("../Model/Vehicle");
const redisService = require("../../shared/services/RedisService");
const { sendSuccess, sendError, sendPaginatedResponse, createPagination, asyncHandler } = require("../../shared/utils/responseHelper");
const { parsePagination, buildVehicleSearchQuery, buildSortQuery } = require("../../shared/utils/queryHelper");

// Initialize Vehicle model after connection is established
let Vehicle;

// Initialize Vehicle model
function initializeVehicleModel() {
    if (!Vehicle) {
        Vehicle = createVehicleModel();
        console.log("✅ Vehicle model initialized in Controller");
    }
}

// UC1: Register vehicle by VIN
const registerVehicle = asyncHandler(async (req, res) => {
    const {
        vin, model, year, color, batteryCapacity, motorPower,
        ownerName, ownerPhone, ownerEmail, ownerAddress,
        purchaseDate, warrantyEndDate, serviceCenter
    } = req.body;

    // Validation
    if (!vin || !model || !year || !ownerName || !ownerPhone || !purchaseDate || !warrantyEndDate) {
        return sendError(res, "VIN, model, năm sản xuất, tên chủ xe, số điện thoại, ngày mua và ngày hết hạn bảo hành là bắt buộc", 400);
    }

    // Check if VIN already exists
    const existingVehicle = await Vehicle.findByVIN(vin);
    if (existingVehicle) {
        return sendError(res, "VIN đã tồn tại trong hệ thống", 400);
    }

    // Create new vehicle
    const newVehicle = new Vehicle({
        vin: vin.toUpperCase(),
        model,
        year,
        color,
        batteryCapacity,
        motorPower,
        ownerName,
        ownerPhone,
        ownerEmail,
        ownerAddress,
        purchaseDate: new Date(purchaseDate),
        warrantyStartDate: new Date(purchaseDate),
        warrantyEndDate: new Date(warrantyEndDate),
        assignedServiceCenter: serviceCenter || "Chưa phân công",
        registeredBy: req.user.userId
    });

    await newVehicle.save();

    // Cache operations with error handling
    try {
        // Invalidate specific service center cache
        await redisService.del(`vehicles:service_center:${serviceCenter || "Chưa phân công"}`);

        // Smart cache invalidation - only invalidate relevant search patterns
        // Instead of deleting ALL search cache, only delete cache that might be affected
        const invalidationPatterns = [
            `search:vehicles:*${model.toLowerCase()}*`,  // Model-related searches
            `search:vehicles:*${year}*`,                 // Year-related searches
            `search:vehicles:*${serviceCenter || "Chưa phân công"}*` // Service center searches
        ];

        for (const pattern of invalidationPatterns) {
            await redisService.deletePatternScan(pattern);
        }

        // Cache the new vehicle by VIN for future lookups
        await redisService.cacheVehicleByVin(newVehicle.vin, newVehicle.toObject(), 3600);

        console.log(`🗑️ Smart cache invalidation completed for vehicle: ${vin}`);
    } catch (cacheError) {
        console.warn(`⚠️ Cache operations failed for vehicle registration: ${vin}`, cacheError.message);
        // Continue without cache operations - fail-safe approach
    }

    console.log(`🚗 Vehicle registered: ${vin} by ${req.user.email}`);
    console.log(`🗑️ Invalidated search cache after vehicle registration`);

    return sendSuccess(res, "Đăng ký xe thành công", {
        id: newVehicle._id,
        vin: newVehicle.vin,
        model: newVehicle.model,
        year: newVehicle.year,
        ownerName: newVehicle.ownerName,
        isUnderWarranty: newVehicle.isUnderWarranty
    }, 201);
});

// Get vehicle by VIN with Redis cache
const getVehicleByVIN = asyncHandler(async (req, res) => {
    const { vin } = req.params;

    // Check Redis cache first using consistent method
    const cachedVehicle = await redisService.getVehicleByVin(vin);
    if (cachedVehicle) {
        console.log(`🚀 Cache hit for vehicle VIN: ${vin}`);
        return sendSuccess(res, "Lấy thông tin xe thành công (cached)", cachedVehicle);
    }

    const vehicle = await Vehicle.findByVIN(vin).lean();

    if (!vehicle) {
        return sendError(res, "Không tìm thấy xe với VIN này", 404);
    }

    // Cache using consistent method for 1 hour
    await redisService.cacheVehicleByVin(vin, vehicle, 3600);
    console.log(`📦 Cached vehicle VIN: ${vin}`);

    return sendSuccess(res, "Lấy thông tin xe thành công", vehicle);
});

// Get vehicles by service center with Redis cache
const getVehiclesByServiceCenter = async (req, res) => {
    try {
        const { centerName } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const cacheKey = `vehicles:service_center:${centerName}:page:${page}:limit:${limit}`;

        // Check Redis cache first
        const cachedVehicles = await redisService.get(cacheKey);
        if (cachedVehicles) {
            return res.json({
                success: true,
                message: "Lấy danh sách xe thành công (cached)",
                data: JSON.parse(cachedVehicles),
                cached: true
            });
        }

        const skip = (page - 1) * limit;
        const vehicles = await Vehicle.find({ assignedServiceCenter: centerName })
            .select("vin model year ownerName currentMileage status")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const total = await Vehicle.countDocuments({ assignedServiceCenter: centerName });

        const result = {
            vehicles,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        };

        // Cache for 10 minutes
        await redisService.set(cacheKey, JSON.stringify(result), 600);

        res.json({
            success: true,
            message: "Lấy danh sách xe thành công",
            data: result,
            cached: false
        });
    } catch (err) {
        console.error("Get vehicles by service center error:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy danh sách xe",
            error: err.message
        });
    }
};

// Search vehicles
const searchVehicles = asyncHandler(async (req, res) => {
    // Create efficient cache key based on important search parameters
    const { q, type, status, year, model, page = 1, limit = 10 } = req.query;

    if (!q) {
        return sendError(res, "Từ khóa tìm kiếm là bắt buộc", 400);
    }
    const cacheKey = `search:vehicles:q=${q}:type=${type || 'all'}:status=${status || 'all'}:year=${year || 'all'}:model=${model || 'all'}:page=${page}:limit=${limit}`;

    // Check Redis cache first (with error handling)
    let cachedResult = null;
    try {
        cachedResult = await redisService.get(cacheKey);
        if (cachedResult) {
            console.log(`🚀 Cache hit for vehicle search: ${q}`);
            return sendSuccess(res, "Tìm kiếm xe thành công (cached)", cachedResult);
        }
    } catch (cacheError) {
        console.warn(`⚠️ Cache read failed for search: ${q}`, cacheError.message);
        // Continue without cache - fail-safe approach
    }

    const { skip } = parsePagination(req.query, { page, limit });
    const searchQuery = buildVehicleSearchQuery(req.query);

    const vehicles = await Vehicle.find(searchQuery)
        .select("vin model year ownerName ownerPhone currentMileage status")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    const total = await Vehicle.countDocuments(searchQuery);
    const pagination = createPagination(page, limit, total);

    const result = { vehicles, pagination };

    // Cache for 5 minutes (search results can change frequently) - with error handling
    try {
        await redisService.set(cacheKey, result, 300);
        console.log(`📦 Cached vehicle search: ${q}`);
    } catch (cacheError) {
        console.warn(`⚠️ Cache write failed for search: ${q}`, cacheError.message);
        // Continue without caching - fail-safe approach
    }

    return sendSuccess(res, "Tìm kiếm xe thành công", result);
});

// Update vehicle information
const updateVehicle = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Remove fields that shouldn't be updated directly
        delete updates._id;
        delete updates.__v;
        delete updates.createdAt;
        delete updates.vin; // VIN shouldn't be changed

        const vehicle = await Vehicle.findByIdAndUpdate(
            id,
            { ...updates, updatedAt: new Date() },
            { new: true, runValidators: true }
        ).lean();

        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy xe"
            });
        }

        // Invalidate cache
        await redisService.del(`vehicle:${vehicle.vin}`);

        res.json({
            success: true,
            message: "Cập nhật thông tin xe thành công",
            data: vehicle
        });
    } catch (err) {
        console.error("Update vehicle error:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi cập nhật xe",
            error: err.message
        });
    }
};

// Get vehicle overview statistics
const getVehicleOverviewStats = async (req, res) => {
    try {
        const { serviceCenter } = req.query;
        const cacheKey = `vehicle_overview:${serviceCenter || 'all'}`;

        // Check Redis cache first
        const cachedStats = await redisService.get(cacheKey);
        if (cachedStats) {
            return res.json({
                success: true,
                message: "Lấy tổng quan thống kê thành công (cached)",
                data: JSON.parse(cachedStats),
                cached: true
            });
        }

        const matchStage = serviceCenter ? { assignedServiceCenter: serviceCenter } : {};

        const [vehicleStats, warrantyStats, serviceStats] = await Promise.all([
            // Vehicle statistics
            Vehicle.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: null,
                        totalVehicles: { $sum: 1 },
                        activeVehicles: {
                            $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] }
                        },
                        avgMileage: { $avg: "$currentMileage" },
                        totalMileage: { $sum: "$currentMileage" }
                    }
                }
            ]),

            // Warranty statistics
            Vehicle.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: null,
                        underWarranty: {
                            $sum: {
                                $cond: [
                                    { $gt: ["$warrantyEndDate", new Date()] },
                                    1,
                                    0
                                ]
                            }
                        },
                        expiredWarranty: {
                            $sum: {
                                $cond: [
                                    { $lte: ["$warrantyEndDate", new Date()] },
                                    1,
                                    0
                                ]
                            }
                        }
                    }
                }
            ]),

            // Service statistics
            Vehicle.aggregate([
                { $match: matchStage },
                { $unwind: "$serviceHistory" },
                {
                    $group: {
                        _id: null,
                        totalServices: { $sum: 1 },
                        totalServiceCost: { $sum: "$serviceHistory.cost" },
                        avgServiceCost: { $avg: "$serviceHistory.cost" }
                    }
                }
            ])
        ]);

        const overviewStats = {
            vehicles: vehicleStats[0] || {
                totalVehicles: 0,
                activeVehicles: 0,
                avgMileage: 0,
                totalMileage: 0
            },
            warranty: warrantyStats[0] || {
                underWarranty: 0,
                expiredWarranty: 0
            },
            services: serviceStats[0] || {
                totalServices: 0,
                totalServiceCost: 0,
                avgServiceCost: 0
            },
            generatedAt: new Date().toISOString()
        };

        // Cache for 30 minutes
        await redisService.set(cacheKey, JSON.stringify(overviewStats), 1800);

        res.json({
            success: true,
            message: "Lấy tổng quan thống kê thành công",
            data: overviewStats,
            cached: false
        });
    } catch (err) {
        console.error("Get overview statistics error:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy tổng quan thống kê",
            error: err.message
        });
    }
};

module.exports = {
    initializeVehicleModel,
    registerVehicle,
    getVehicleByVIN,
    getVehiclesByServiceCenter,
    searchVehicles,
    updateVehicle,
    getVehicleOverviewStats
};
