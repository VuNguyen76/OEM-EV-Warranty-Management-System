const express = require("express");
const Vehicle = require("../Model/Vehicle");
const { authenticateToken, authorizeRole } = require("../../shared/middleware/AuthMiddleware");
const redisService = require("../../shared/services/RedisService");

const router = express.Router();

// UC2: Gắn số seri phụ tùng (Nhân viên & Kỹ thuật viên trung tâm dịch vụ)
router.post("/:vehicleId/parts", authenticateToken, authorizeRole("admin", "service_staff", "technician"), async (req, res) => {
    try {
        const { vehicleId } = req.params;
        const {
            serialNumber,
            partType,
            partName,
            manufacturer,
            position,
            warrantyEndDate,
            specifications
        } = req.body;

        // Validate required fields
        if (!serialNumber || !partType || !partName || !warrantyEndDate) {
            return res.status(400).json({
                success: false,
                message: "Số seri, loại phụ tùng, tên phụ tùng và ngày hết hạn bảo hành là bắt buộc"
            });
        }

        // Check if serial number already exists
        const existingVehicleWithPart = await Vehicle.findOne({
            'parts.serialNumber': serialNumber
        });

        if (existingVehicleWithPart) {
            return res.status(400).json({
                success: false,
                message: "Số seri phụ tùng đã tồn tại trong hệ thống"
            });
        }

        // Find vehicle
        const vehicle = await Vehicle.findById(vehicleId);
        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy xe"
            });
        }

        // Create part data
        const partData = {
            serialNumber: serialNumber.trim().toUpperCase(),
            partType,
            partName: partName.trim(),
            manufacturer: manufacturer?.trim(),
            position: position?.trim(),
            warrantyEndDate: new Date(warrantyEndDate),
            specifications,
            status: 'active'
        };

        // Add part to vehicle
        await vehicle.addPart(partData);

        // Invalidate cache
        await redisService.del(`vehicle:${vehicle.vin}`);
        await redisService.del(`parts:vehicle:${vehicleId}`);

        console.log(`🔧 Part added: ${serialNumber} to vehicle ${vehicle.vin} by ${req.user.email}`);

        res.status(201).json({
            success: true,
            message: "Gắn phụ tùng thành công",
            data: {
                vehicleVin: vehicle.vin,
                partSerialNumber: partData.serialNumber,
                partType: partData.partType,
                partName: partData.partName
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
});

// Get parts of a vehicle
router.get("/:vehicleId/parts", authenticateToken, authorizeRole("admin", "service_staff", "technician"), async (req, res) => {
    try {
        const { vehicleId } = req.params;
        const { status, partType } = req.query;

        // Check cache first
        const cacheKey = `parts:vehicle:${vehicleId}:${status || 'all'}:${partType || 'all'}`;
        const cachedParts = await redisService.get(cacheKey);
        if (cachedParts) {
            return res.json({
                success: true,
                message: "Lấy danh sách phụ tùng thành công",
                data: cachedParts
            });
        }

        const vehicle = await Vehicle.findById(vehicleId).select('vin parts').lean();
        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy xe"
            });
        }

        let parts = vehicle.parts;

        // Filter by status
        if (status) {
            parts = parts.filter(part => part.status === status);
        }

        // Filter by part type
        if (partType) {
            parts = parts.filter(part => part.partType === partType);
        }

        // Add warranty status
        parts = parts.map(part => ({
            ...part,
            isUnderWarranty: new Date() <= new Date(part.warrantyEndDate)
        }));

        // Cache for 30 minutes
        await redisService.set(cacheKey, parts, 1800);

        res.json({
            success: true,
            message: "Lấy danh sách phụ tùng thành công",
            data: parts,
            vehicleVin: vehicle.vin
        });

    } catch (err) {
        console.error("Get parts error:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy danh sách phụ tùng",
            error: err.message
        });
    }
});

// Update part status (replace, defective, etc.)
router.put("/:vehicleId/parts/:partId", authenticateToken, authorizeRole("admin", "service_staff", "technician"), async (req, res) => {
    try {
        const { vehicleId, partId } = req.params;
        const { status, position, specifications, notes } = req.body;

        const vehicle = await Vehicle.findById(vehicleId);
        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy xe"
            });
        }

        const part = vehicle.parts.id(partId);
        if (!part) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy phụ tùng"
            });
        }

        // Update part fields
        if (status) part.status = status;
        if (position) part.position = position;
        if (specifications) part.specifications = { ...part.specifications, ...specifications };
        if (notes) part.notes = notes;

        part.updatedAt = new Date();

        await vehicle.save();

        // Invalidate cache
        await redisService.del(`vehicle:${vehicle.vin}`);
        await redisService.del(`parts:vehicle:${vehicleId}`);

        console.log(`🔧 Part updated: ${part.serialNumber} status to ${status} by ${req.user.email}`);

        res.json({
            success: true,
            message: "Cập nhật phụ tùng thành công",
            data: {
                partId: part._id,
                serialNumber: part.serialNumber,
                status: part.status,
                updatedAt: part.updatedAt
            }
        });

    } catch (err) {
        console.error("Update part error:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi cập nhật phụ tùng",
            error: err.message
        });
    }
});

// Search parts by serial number
router.get("/search/:serialNumber", authenticateToken, authorizeRole("admin", "service_staff", "technician"), async (req, res) => {
    try {
        const { serialNumber } = req.params;

        // Check cache first
        const cacheKey = `part:search:${serialNumber.toUpperCase()}`;
        const cachedResult = await redisService.get(cacheKey);
        if (cachedResult) {
            return res.json({
                success: true,
                message: "Tìm kiếm phụ tùng thành công",
                data: cachedResult
            });
        }

        const vehicle = await Vehicle.findOne({
            'parts.serialNumber': serialNumber.toUpperCase()
        }).select('vin model year ownerName parts.$').lean();

        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy phụ tùng với số seri này"
            });
        }

        const part = vehicle.parts[0];
        const result = {
            vehicle: {
                vin: vehicle.vin,
                model: vehicle.model,
                year: vehicle.year,
                ownerName: vehicle.ownerName
            },
            part: {
                ...part,
                isUnderWarranty: new Date() <= new Date(part.warrantyEndDate)
            }
        };

        // Cache for 1 hour
        await redisService.set(cacheKey, result, 3600);

        res.json({
            success: true,
            message: "Tìm kiếm phụ tùng thành công",
            data: result
        });

    } catch (err) {
        console.error("Search part error:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi tìm kiếm phụ tùng",
            error: err.message
        });
    }
});

// Get parts statistics
router.get("/stats/overview", authenticateToken, authorizeRole("admin", "service_staff"), async (req, res) => {
    try {
        const { serviceCenter } = req.query;

        // Check cache first
        const cacheKey = `parts:stats:${serviceCenter || 'all'}`;
        const cachedStats = await redisService.get(cacheKey);
        if (cachedStats) {
            return res.json({
                success: true,
                message: "Lấy thống kê phụ tùng thành công",
                data: cachedStats
            });
        }

        const matchStage = serviceCenter ? { assignedServiceCenter: serviceCenter } : {};

        const stats = await Vehicle.aggregate([
            { $match: matchStage },
            { $unwind: '$parts' },
            {
                $group: {
                    _id: '$parts.partType',
                    totalParts: { $sum: 1 },
                    activeParts: {
                        $sum: { $cond: [{ $eq: ['$parts.status', 'active'] }, 1, 0] }
                    },
                    replacedParts: {
                        $sum: { $cond: [{ $eq: ['$parts.status', 'replaced'] }, 1, 0] }
                    },
                    defectiveParts: {
                        $sum: { $cond: [{ $eq: ['$parts.status', 'defective'] }, 1, 0] }
                    }
                }
            },
            { $sort: { totalParts: -1 } }
        ]);

        // Cache for 1 hour
        await redisService.set(cacheKey, stats, 3600);

        res.json({
            success: true,
            message: "Lấy thống kê phụ tùng thành công",
            data: stats
        });

    } catch (err) {
        console.error("Get parts stats error:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy thống kê phụ tùng",
            error: err.message
        });
    }
});

module.exports = router;
