const { getVehicleConnection } = require("../../shared/database/vehicleConnection");
const responseHelper = require("../../shared/utils/responseHelper");
const queryHelper = require("../../shared/utils/queryHelper");
const redisService = require("../../shared/services/RedisService");

let Part, VehiclePart, Vehicle;

// Initialize models
function initializeModels() {
    try {
        const vehicleConnection = getVehicleConnection();

        // Load models
        Part = require("../Model/Part")(vehicleConnection);
        VehiclePart = require("../Model/VehiclePart")(vehicleConnection);
        Vehicle = require("../Model/Vehicle")();

        console.log("✅ Parts models initialized successfully");
    } catch (error) {
        console.error("❌ Failed to initialize Parts models:", error.message);
        throw error;
    }
}

// UC19: Quản lý cơ sở dữ liệu bộ phận
const createPart = async (req, res) => {
    try {
        const partData = req.body;

        // Validate required fields
        if (!partData.partNumber || !partData.name || !partData.category) {
            return responseHelper.error(res, "Thiếu thông tin bắt buộc: partNumber, name, category", 400);
        }

        // Check if part already exists
        const existingPart = await Part.findOne({ partNumber: partData.partNumber });
        if (existingPart) {
            return responseHelper.error(res, "Mã phụ tùng đã tồn tại", 400);
        }

        // Create new part
        const newPart = new Part(partData);
        await newPart.save();

        // Clear cache
        await redisService.deletePattern('parts:*');

        responseHelper.success(res, newPart, "Tạo phụ tùng thành công", 201);
    } catch (error) {
        console.error("Error creating part:", error);
        responseHelper.error(res, "Lỗi tạo phụ tùng", 500);
    }
};

const getAllParts = async (req, res) => {
    try {
        const { page = 1, limit = 10, category, status, search, model } = req.query;
        const cacheKey = `parts:list:${JSON.stringify(req.query)}`;

        // Try cache first
        const cachedResult = await redisService.get(cacheKey);
        if (cachedResult) {
            return responseHelper.success(res, cachedResult, "Lấy danh sách phụ tùng thành công (cache)");
        }

        // Build query
        let query = {};

        if (category) query.category = category;
        if (status) query.status = status;
        if (model) query.compatibleModels = model;

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { partNumber: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Execute query with pagination
        const { page: currentPage, limit: currentLimit, skip } = queryHelper.parsePagination(req.query, { page, limit });
        const parts = await Part.find(query)
            .sort({ createdAt: -1 })
            .limit(currentLimit)
            .skip(skip);

        const total = await Part.countDocuments(query);
        const pagination = {
            page: currentPage,
            limit: currentLimit,
            total,
            pages: Math.ceil(total / currentLimit)
        };

        const result = {
            parts,
            pagination
        };

        // Cache result
        await redisService.set(cacheKey, result, 300); // 5 minutes

        responseHelper.success(res, result, "Lấy danh sách phụ tùng thành công");
    } catch (error) {
        console.error("Error getting parts:", error);
        responseHelper.error(res, "Lỗi lấy danh sách phụ tùng", 500);
    }
};

// UC2: Gắn số seri phụ tùng
const addPartToVehicle = async (req, res) => {
    try {
        const { vehicleId } = req.params;
        const { partId, serialNumber, position, installedBy } = req.body;

        // Validate required fields
        if (!partId || !serialNumber || !position || !installedBy) {
            return responseHelper.error(res, "Thiếu thông tin bắt buộc", 400);
        }

        // Check if vehicle exists
        const vehicle = await Vehicle.findById(vehicleId);
        if (!vehicle) {
            return responseHelper.error(res, "Không tìm thấy xe", 404);
        }

        // Check if part exists
        const part = await Part.findById(partId);
        if (!part) {
            return responseHelper.error(res, "Không tìm thấy phụ tùng", 404);
        }

        // Check if serial number already exists
        const existingSerial = await VehiclePart.findOne({ serialNumber });
        if (existingSerial) {
            return responseHelper.error(res, "Số seri đã tồn tại", 400);
        }

        // Calculate warranty end date
        const warrantyEndDate = new Date();
        warrantyEndDate.setMonth(warrantyEndDate.getMonth() + part.warrantyPeriod);

        // Create vehicle part record
        const vehiclePart = new VehiclePart({
            vehicleId,
            partId,
            serialNumber,
            position,
            installedBy,
            warrantyEndDate
        });

        await vehiclePart.save();

        // Update part stock if available
        if (part.stockQuantity > 0) {
            await part.updateStock(1, 'subtract');
        }

        // Clear cache
        await redisService.deletePattern(`vehicle:${vehicleId}:*`);
        await redisService.deletePattern('parts:*');

        // Populate response
        await vehiclePart.populate('partId');

        responseHelper.success(res, vehiclePart, "Gắn phụ tùng vào xe thành công", 201);
    } catch (error) {
        console.error("Error adding part to vehicle:", error);
        responseHelper.error(res, "Lỗi gắn phụ tùng vào xe", 500);
    }
};

const getVehicleParts = async (req, res) => {
    try {
        const { vehicleId } = req.params;
        const { status } = req.query;
        const cacheKey = `vehicle:${vehicleId}:parts:${status || 'all'}`;

        // Try cache first
        const cachedParts = await redisService.get(cacheKey);
        if (cachedParts) {
            return responseHelper.success(res, cachedParts, "Lấy danh sách phụ tùng xe thành công (cache)");
        }

        const parts = await VehiclePart.findByVehicle(vehicleId, status);

        // Cache result
        await redisService.set(cacheKey, parts, 300); // 5 minutes

        responseHelper.success(res, parts, "Lấy danh sách phụ tùng xe thành công");
    } catch (error) {
        console.error("Error getting vehicle parts:", error);
        responseHelper.error(res, "Lỗi lấy danh sách phụ tùng xe", 500);
    }
};

const updatePartStatus = async (req, res) => {
    try {
        const { vehicleId, partId } = req.params;
        const { status, reason } = req.body;

        const vehiclePart = await VehiclePart.findOne({
            vehicleId,
            _id: partId
        });

        if (!vehiclePart) {
            return responseHelper.error(res, "Không tìm thấy phụ tùng trong xe", 404);
        }

        vehiclePart.status = status;
        if (reason) {
            vehiclePart.notes = reason;
        }

        await vehiclePart.save();

        // Clear cache
        await redisService.deletePattern(`vehicle:${vehicleId}:*`);

        responseHelper.success(res, vehiclePart, "Cập nhật trạng thái phụ tùng thành công");
    } catch (error) {
        console.error("Error updating part status:", error);
        responseHelper.error(res, "Lỗi cập nhật trạng thái phụ tùng", 500);
    }
};

const searchPartBySerial = async (req, res) => {
    try {
        const { serialNumber } = req.params;
        const cacheKey = `part:serial:${serialNumber}`;

        // Try cache first
        const cachedResult = await redisService.get(cacheKey);
        if (cachedResult) {
            return responseHelper.success(res, cachedResult, "Tìm kiếm phụ tùng thành công (cache)");
        }

        const vehiclePart = await VehiclePart.findBySerialNumber(serialNumber);
        if (!vehiclePart) {
            return responseHelper.error(res, "Không tìm thấy phụ tùng với số seri này", 404);
        }

        // Cache result
        await redisService.set(cacheKey, vehiclePart, 600); // 10 minutes

        responseHelper.success(res, vehiclePart, "Tìm kiếm phụ tùng thành công");
    } catch (error) {
        console.error("Error searching part by serial:", error);
        responseHelper.error(res, "Lỗi tìm kiếm phụ tùng", 500);
    }
};

// UC23: Cảnh báo thiếu hụt
const getLowStockParts = async (req, res) => {
    try {
        const cacheKey = 'parts:low-stock';

        // Try cache first
        const cachedParts = await redisService.get(cacheKey);
        if (cachedParts) {
            return responseHelper.success(res, cachedParts, "Lấy danh sách phụ tùng sắp hết thành công (cache)");
        }

        const lowStockParts = await Part.findLowStock();

        // Cache result
        await redisService.set(cacheKey, lowStockParts, 300); // 5 minutes

        responseHelper.success(res, lowStockParts, "Lấy danh sách phụ tùng sắp hết thành công");
    } catch (error) {
        console.error("Error getting low stock parts:", error);
        responseHelper.error(res, "Lỗi lấy danh sách phụ tùng sắp hết", 500);
    }
};

const getPartsStatistics = async (req, res) => {
    try {
        const cacheKey = 'parts:statistics';

        // Try cache first
        const cachedStats = await redisService.get(cacheKey);
        if (cachedStats) {
            return responseHelper.success(res, cachedStats, "Lấy thống kê phụ tùng thành công (cache)");
        }

        const [
            totalParts,
            activeParts,
            lowStockParts,
            categoryStats
        ] = await Promise.all([
            Part.countDocuments(),
            Part.countDocuments({ status: 'active' }),
            Part.findLowStock(),
            Part.aggregate([
                { $group: { _id: '$category', count: { $sum: 1 } } }
            ])
        ]);

        const stats = {
            totalParts,
            activeParts,
            lowStockCount: lowStockParts.length,
            categoryBreakdown: categoryStats,
            lowStockParts: lowStockParts.slice(0, 10) // Top 10 low stock items
        };

        // Cache result
        await redisService.set(cacheKey, stats, 600); // 10 minutes

        responseHelper.success(res, stats, "Lấy thống kê phụ tùng thành công");
    } catch (error) {
        console.error("Error getting parts statistics:", error);
        responseHelper.error(res, "Lỗi lấy thống kê phụ tùng", 500);
    }
};

module.exports = {
    initializeModels,

    // Parts management (UC19)
    createPart,
    getAllParts,

    // Vehicle parts (UC2)
    addPartToVehicle,
    getVehicleParts,
    updatePartStatus,
    searchPartBySerial,

    // Stock management (UC21, UC23)
    getLowStockParts,
    getPartsStatistics
};
