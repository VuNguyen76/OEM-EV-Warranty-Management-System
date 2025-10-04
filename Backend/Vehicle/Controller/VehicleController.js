const createVehicleModels = require("../Model/Vehicle");
const redisService = require("../../shared/services/RedisService");
const { sendSuccess, sendError, sendPaginatedResponse, createPagination, asyncHandler } = require("../../shared/utils/responseHelper");
const { parsePagination, buildSearchQuery } = require("../../shared/utils/queryHelper");

// Initialize models
let VehicleModel, Vehicle;

function initializeModels() {
    if (!VehicleModel || !Vehicle) {
        const models = createVehicleModels();
        VehicleModel = models.VehicleModel;
        Vehicle = models.Vehicle;
        console.log("✅ Vehicle models initialized in Controller");
    }
}

// ===========================================
// MANUFACTURER PERSPECTIVE (Hãng sản xuất)
// ===========================================

// Create Vehicle Model (for manufacturers)
const createVehicleModel = asyncHandler(async (req, res) => {
    const {
        modelName, modelCode, manufacturer, category, year,
        batteryCapacity, motorPower, range,
        vehicleWarrantyMonths, batteryWarrantyMonths, basePrice
    } = req.body;

    // Validation
    if (!modelName || !modelCode || !manufacturer || !category || !year ||
        !batteryCapacity || !motorPower || !range || !basePrice) {
        return sendError(res, "Thiếu thông tin bắt buộc", 400);
    }

    // Check if model code already exists
    const existingModel = await VehicleModel.findOne({ modelCode: modelCode.toUpperCase() });
    if (existingModel) {
        return sendError(res, "Mã model đã tồn tại", 400);
    }

    // Create new vehicle model
    const newModel = new VehicleModel({
        modelName,
        modelCode: modelCode.toUpperCase(),
        manufacturer,
        category,
        year,
        batteryCapacity,
        motorPower,
        range,
        vehicleWarrantyMonths: vehicleWarrantyMonths || 36,
        batteryWarrantyMonths: batteryWarrantyMonths || 96,
        basePrice,
        status: "production",
        createdBy: req.user.email
    });

    await newModel.save();

    // Clear cache
    await redisService.del("vehicle_models:*");

    return sendSuccess(res, "Tạo model xe thành công", {
        id: newModel._id,
        modelName: newModel.modelName,
        modelCode: newModel.modelCode,
        manufacturer: newModel.manufacturer,
        status: newModel.status
    }, 201);
});

// Get All Vehicle Models
const getAllVehicleModels = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const cacheKey = `vehicle_models:page:${page}:limit:${limit}`;

    // Try cache first
    const cached = await redisService.get(cacheKey);
    if (cached) {
        return res.json(JSON.parse(cached));
    }

    const { skip } = parsePagination(req.query, { page, limit });
    const searchQuery = buildSearchQuery(req.query.search, ['manufacturer', 'modelName', 'category']);

    const models = await VehicleModel.find(searchQuery)
        .select("modelName modelCode manufacturer category year batteryCapacity motorPower range basePrice status")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

    const total = await VehicleModel.countDocuments(searchQuery);
    const pagination = createPagination(page, limit, total);

    // Cache models data for 10 minutes
    const cacheData = { models, pagination };
    await redisService.set(cacheKey, JSON.stringify(cacheData), 600);

    return sendPaginatedResponse(res, "Lấy danh sách model xe thành công", models, pagination);
});

// Create Vehicle (for manufacturers - production)
const createVehicle = asyncHandler(async (req, res) => {
    const {
        vin, modelId, productionDate, productionBatch, color
    } = req.body;

    // Validation
    if (!vin || !color) {
        return sendError(res, "Thiếu thông tin bắt buộc: VIN và màu sắc", 400);
    }

    // Check if VIN already exists
    const existingVehicle = await Vehicle.findOne({ vin: vin.toUpperCase() });
    if (existingVehicle) {
        return sendError(res, "VIN đã tồn tại", 400);
    }

    // Validate model if provided
    if (modelId) {
        const model = await VehicleModel.findById(modelId);
        if (!model) {
            return sendError(res, "Model xe không tồn tại", 404);
        }
    }

    // Create new vehicle
    const newVehicle = new Vehicle({
        vin: vin.toUpperCase(),
        modelId: modelId || null,
        productionDate: productionDate || new Date(),
        productionBatch,
        color,
        status: "manufactured",
        createdBy: req.user.email,
        createdByRole: req.user.role
    });

    await newVehicle.save();

    // Clear cache
    await redisService.del("vehicles:*");

    return sendSuccess(res, "Tạo xe thành công", {
        id: newVehicle._id,
        vin: newVehicle.vin,
        color: newVehicle.color,
        status: newVehicle.status,
        productionDate: newVehicle.productionDate
    }, 201);
});

// ===========================================
// SERVICE CENTER PERSPECTIVE (Trung tâm bảo hành)
// ===========================================

// Register Vehicle for Warranty (by service center)
const registerVehicleWarranty = asyncHandler(async (req, res) => {
    const {
        vin, ownerName, ownerPhone, ownerEmail, ownerAddress,
        serviceCenterId, serviceCenterName, warrantyStartDate
    } = req.body;

    // Validation
    if (!vin || !ownerName || !ownerPhone || !serviceCenterId || !serviceCenterName) {
        return sendError(res, "Thiếu thông tin bắt buộc", 400);
    }

    // Find vehicle by VIN
    const vehicle = await Vehicle.findOne({ vin: vin.toUpperCase() }).populate('modelId');
    if (!vehicle) {
        return sendError(res, "Không tìm thấy xe với VIN này", 404);
    }

    // Check if already registered
    if (vehicle.status === 'registered' || vehicle.warrantyStatus === 'active') {
        return sendError(res, "Xe đã được đăng ký bảo hành", 400);
    }

    // Calculate warranty end date based on model
    let warrantyEndDate = new Date(warrantyStartDate || new Date());
    if (vehicle.modelId && vehicle.modelId.vehicleWarrantyMonths) {
        warrantyEndDate.setMonth(warrantyEndDate.getMonth() + vehicle.modelId.vehicleWarrantyMonths);
    } else {
        // Default 36 months if no model
        warrantyEndDate.setMonth(warrantyEndDate.getMonth() + 36);
    }

    // Activate warranty
    await vehicle.activateWarranty(
        warrantyStartDate,
        { name: ownerName, phone: ownerPhone, email: ownerEmail, address: ownerAddress },
        { id: serviceCenterId, name: serviceCenterName },
        req.user.email
    );

    // Set warranty end date
    vehicle.warrantyEndDate = warrantyEndDate;
    await vehicle.save();

    // Clear cache
    await redisService.del("vehicles:*");

    return sendSuccess(res, "Đăng ký bảo hành thành công", {
        vin: vehicle.vin,
        ownerName: vehicle.ownerName,
        warrantyStatus: vehicle.warrantyStatus,
        warrantyStartDate: vehicle.warrantyStartDate,
        warrantyEndDate: vehicle.warrantyEndDate,
        serviceCenterName: vehicle.serviceCenterName
    });
});

// Get Vehicle by VIN
const getVehicleByVIN = asyncHandler(async (req, res) => {
    const { vin } = req.params;
    const cacheKey = `vehicle:vin:${vin.toUpperCase()}`;

    // Try cache first
    const cached = await redisService.get(cacheKey);
    if (cached) {
        return res.json(JSON.parse(cached));
    }

    const vehicle = await Vehicle.findOne({ vin: vin.toUpperCase() }).populate('modelId');
    if (!vehicle) {
        return sendError(res, "Không tìm thấy xe", 404);
    }

    // Cache vehicle data for 5 minutes
    await redisService.set(cacheKey, JSON.stringify(vehicle), 300);

    return sendSuccess(res, "Lấy thông tin xe thành công", vehicle);
});

// Get All Vehicles
const getAllVehicles = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const cacheKey = `vehicles:page:${page}:limit:${limit}`;

    // Try cache first
    const cached = await redisService.get(cacheKey);
    if (cached) {
        return res.json(JSON.parse(cached));
    }

    const { skip } = parsePagination(req.query, { page, limit });
    const searchQuery = buildSearchQuery(req.query.search, ['vin', 'ownerName', 'ownerPhone', 'status']);

    const vehicles = await Vehicle.find(searchQuery)
        .populate('modelId', 'modelName manufacturer')
        .select("vin modelId color status warrantyStatus ownerName ownerPhone serviceCenterName createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

    const total = await Vehicle.countDocuments(searchQuery);
    const pagination = createPagination(page, limit, total);

    // Cache vehicles data for 5 minutes
    const cacheData = { vehicles, pagination };
    await redisService.set(cacheKey, JSON.stringify(cacheData), 300);

    return sendPaginatedResponse(res, "Lấy danh sách xe thành công", vehicles, pagination);
});

module.exports = {
    initializeModels,
    // Manufacturer functions
    createVehicleModel,
    getAllVehicleModels,
    createVehicle,
    // Service Center functions
    registerVehicleWarranty,
    getVehicleByVIN,
    getAllVehicles
};