const createVehicleModel = require("../Model/Vehicle");
const redisService = require("../../shared/services/RedisService");

// Initialize Vehicle model after connection is established
let Vehicle;

// Initialize Vehicle model
function initializeVehicleModel() {
    if (!Vehicle) {
        Vehicle = createVehicleModel();
        console.log("✅ Vehicle model initialized in PartsController");
    }
}

// UC2: Add parts to vehicle
const addPartToVehicle = async (req, res) => {
    try {
        const { vehicleId } = req.params;
        const {
            serialNumber, partType, partName, manufacturer,
            installationDate, warrantyEndDate, cost, notes
        } = req.body;

        // Validation
        if (!serialNumber || !partType || !partName) {
            return res.status(400).json({
                success: false,
                message: "Số seri, loại phụ tùng và tên phụ tùng là bắt buộc"
            });
        }

        // Check if part serial already exists
        const existingPart = await Vehicle.findOne({
            "parts.serialNumber": serialNumber
        });

        if (existingPart) {
            return res.status(400).json({
                success: false,
                message: "Số seri phụ tùng đã tồn tại trong hệ thống"
            });
        }

        const newPart = {
            serialNumber: serialNumber.toUpperCase(),
            partType,
            partName,
            manufacturer,
            installationDate: installationDate ? new Date(installationDate) : new Date(),
            warrantyEndDate: warrantyEndDate ? new Date(warrantyEndDate) : null,
            cost: cost || 0,
            status: "active",
            notes: notes || "",
            addedBy: req.user.userId
        };

        const vehicle = await Vehicle.findByIdAndUpdate(
            vehicleId,
            { 
                $push: { parts: newPart },
                $set: { updatedAt: new Date() }
            },
            { new: true }
        ).select("vin model parts");

        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy xe"
            });
        }

        // Invalidate cache
        await redisService.del(`vehicle:${vehicle.vin}`);
        await redisService.del(`vehicle:${vehicleId}:parts`);

        console.log(`🔧 Part added: ${serialNumber} to vehicle ${vehicle.vin} by ${req.user.email}`);

        res.status(201).json({
            success: true,
            message: "Gắn phụ tùng thành công",
            data: {
                vehicleVin: vehicle.vin,
                partSerialNumber: serialNumber,
                partType,
                partName
            }
        });
    } catch (err) {
        console.error("Add part error:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi gắn phụ tùng",
            error: err.message
        });
    }
};

// Get vehicle parts with Redis cache
const getVehicleParts = async (req, res) => {
    try {
        const { vehicleId } = req.params;
        const { status, partType } = req.query;

        const cacheKey = `vehicle:${vehicleId}:parts:${status || 'all'}:${partType || 'all'}`;

        // Check Redis cache first
        const cachedParts = await redisService.get(cacheKey);
        if (cachedParts) {
            return res.json({
                success: true,
                message: "Lấy danh sách phụ tùng thành công (cached)",
                data: JSON.parse(cachedParts),
                cached: true
            });
        }

        const vehicle = await Vehicle.findById(vehicleId)
            .select("vin model parts")
            .lean();

        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy xe"
            });
        }

        let parts = vehicle.parts;

        // Filter by status if provided
        if (status) {
            parts = parts.filter(part => part.status === status);
        }

        // Filter by partType if provided
        if (partType) {
            parts = parts.filter(part => part.partType === partType);
        }

        const result = {
            vehicleVin: vehicle.vin,
            vehicleModel: vehicle.model,
            parts: parts.sort((a, b) => new Date(b.installationDate) - new Date(a.installationDate))
        };

        // Cache for 30 minutes
        await redisService.set(cacheKey, JSON.stringify(result), 1800);

        res.json({
            success: true,
            message: "Lấy danh sách phụ tùng thành công",
            data: result,
            cached: false
        });
    } catch (err) {
        console.error("Get vehicle parts error:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy danh sách phụ tùng",
            error: err.message
        });
    }
};

// Update part status
const updatePartStatus = async (req, res) => {
    try {
        const { vehicleId, partId } = req.params;
        const { status, notes } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: "Trạng thái phụ tùng là bắt buộc"
            });
        }

        const vehicle = await Vehicle.findOneAndUpdate(
            { 
                _id: vehicleId,
                "parts._id": partId
            },
            {
                $set: {
                    "parts.$.status": status,
                    "parts.$.notes": notes || "",
                    "parts.$.updatedAt": new Date(),
                    updatedAt: new Date()
                }
            },
            { new: true }
        ).select("vin parts");

        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy xe hoặc phụ tùng"
            });
        }

        const updatedPart = vehicle.parts.id(partId);

        // Invalidate cache
        await redisService.del(`vehicle:${vehicle.vin}`);
        await redisService.del(`vehicle:${vehicleId}:parts`);

        console.log(`🔧 Part status updated: ${updatedPart.serialNumber} to ${status} by ${req.user.email}`);

        res.json({
            success: true,
            message: "Cập nhật trạng thái phụ tùng thành công",
            data: {
                vehicleVin: vehicle.vin,
                partId: updatedPart._id,
                serialNumber: updatedPart.serialNumber,
                status: updatedPart.status
            }
        });
    } catch (err) {
        console.error("Update part status error:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi cập nhật trạng thái phụ tùng",
            error: err.message
        });
    }
};

// Search part by serial number
const searchPartBySerial = async (req, res) => {
    try {
        const { serialNumber } = req.params;

        const vehicle = await Vehicle.findOne({
            "parts.serialNumber": serialNumber.toUpperCase()
        })
        .select("vin model parts.$")
        .lean();

        if (!vehicle || !vehicle.parts || vehicle.parts.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy phụ tùng với số seri này"
            });
        }

        const part = vehicle.parts[0];

        res.json({
            success: true,
            message: "Tìm thấy phụ tùng",
            data: {
                vehicleVin: vehicle.vin,
                vehicleModel: vehicle.model,
                part
            }
        });
    } catch (err) {
        console.error("Search part by serial error:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi tìm kiếm phụ tùng",
            error: err.message
        });
    }
};

// Get parts statistics
const getPartsStatistics = async (req, res) => {
    try {
        const cacheKey = "parts:statistics";

        // Check Redis cache first
        const cachedStats = await redisService.get(cacheKey);
        if (cachedStats) {
            return res.json({
                success: true,
                message: "Lấy thống kê phụ tùng thành công (cached)",
                data: JSON.parse(cachedStats),
                cached: true
            });
        }

        const stats = await Vehicle.aggregate([
            { $unwind: "$parts" },
            {
                $group: {
                    _id: null,
                    totalParts: { $sum: 1 },
                    activeParts: {
                        $sum: { $cond: [{ $eq: ["$parts.status", "active"] }, 1, 0] }
                    },
                    replacedParts: {
                        $sum: { $cond: [{ $eq: ["$parts.status", "replaced"] }, 1, 0] }
                    },
                    defectiveParts: {
                        $sum: { $cond: [{ $eq: ["$parts.status", "defective"] }, 1, 0] }
                    },
                    partsByType: {
                        $push: "$parts.partType"
                    }
                }
            }
        ]);

        const partTypeStats = await Vehicle.aggregate([
            { $unwind: "$parts" },
            {
                $group: {
                    _id: "$parts.partType",
                    count: { $sum: 1 },
                    totalCost: { $sum: "$parts.cost" }
                }
            },
            { $sort: { count: -1 } }
        ]);

        const result = {
            overview: stats[0] || {
                totalParts: 0,
                activeParts: 0,
                replacedParts: 0,
                defectiveParts: 0
            },
            partTypes: partTypeStats
        };

        // Cache for 1 hour
        await redisService.set(cacheKey, JSON.stringify(result), 3600);

        res.json({
            success: true,
            message: "Lấy thống kê phụ tùng thành công",
            data: result,
            cached: false
        });
    } catch (err) {
        console.error("Get parts statistics error:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy thống kê phụ tùng",
            error: err.message
        });
    }
};

module.exports = {
    initializeVehicleModel,
    addPartToVehicle,
    getVehicleParts,
    updatePartStatus,
    searchPartBySerial,
    getPartsStatistics
};
