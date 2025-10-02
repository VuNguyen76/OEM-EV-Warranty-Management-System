const express = require("express");
const Vehicle = require("../Model/Vehicle");
const { authenticateToken, authorizeRole } = require("../../shared/middleware/AuthMiddleware");
const redisService = require("../../shared/services/RedisService");

const router = express.Router();

// UC1: Register vehicle by VIN (admin, service_staff)
router.post("/register", authenticateToken, authorizeRole("admin", "service_staff"), async (req, res) => {
    try {
        const {
            vin, model, year, color, batteryCapacity, motorPower,
            ownerName, ownerPhone, ownerEmail, ownerAddress,
            purchaseDate, warrantyEndDate, serviceCenter
        } = req.body;

        // Validation
        if (!vin || !model || !year || !ownerName || !ownerPhone || !purchaseDate || !warrantyEndDate) {
            return res.status(400).json({
                success: false,
                message: "VIN, model, năm sản xuất, tên chủ xe, số điện thoại, ngày mua và ngày hết hạn bảo hành là bắt buộc"
            });
        }

        // Check if VIN already exists
        const existingVehicle = await Vehicle.findByVIN(vin);
        if (existingVehicle) {
            return res.status(400).json({
                success: false,
                message: "VIN đã tồn tại trong hệ thống"
            });
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

        // Invalidate cache
        await redisService.del(`vehicles:service_center:${serviceCenter || "Chưa phân công"}`);

        console.log(`🚗 Vehicle registered: ${vin} by ${req.user.email}`);

        res.status(201).json({
            success: true,
            message: "Đăng ký xe thành công",
            data: {
                id: newVehicle._id,
                vin: newVehicle.vin,
                model: newVehicle.model,
                year: newVehicle.year,
                ownerName: newVehicle.ownerName,
                isUnderWarranty: newVehicle.isUnderWarranty
            }
        });
    } catch (err) {
        console.error("Register vehicle error:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi đăng ký xe",
            error: err.message
        });
    }
});

// Get vehicle by VIN with Redis cache
router.get("/vin/:vin", authenticateToken, async (req, res) => {
    try {
        const { vin } = req.params;

        // Check Redis cache first
        const cachedVehicle = await redisService.get(`vehicle:${vin.toUpperCase()}`);
        if (cachedVehicle) {
            return res.json({
                success: true,
                message: "Lấy thông tin xe thành công (cached)",
                data: cachedVehicle,
                cached: true
            });
        }

        const vehicle = await Vehicle.findByVIN(vin)
            .lean();

        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy xe với VIN này"
            });
        }

        // Cache for 1 hour
        await redisService.set(`vehicle:${vin.toUpperCase()}`, JSON.stringify(vehicle), 3600);

        res.json({
            success: true,
            message: "Lấy thông tin xe thành công",
            data: vehicle,
            cached: false
        });
    } catch (err) {
        console.error("Get vehicle by VIN error:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy thông tin xe",
            error: err.message
        });
    }
});

// Get vehicles by service center with Redis cache
router.get("/service-center/:centerName", authenticateToken, authorizeRole("admin", "service_staff"), async (req, res) => {
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
});

// Search vehicles
router.get("/search", authenticateToken, async (req, res) => {
    try {
        const { q, type = "all", page = 1, limit = 10 } = req.query;

        if (!q) {
            return res.status(400).json({
                success: false,
                message: "Từ khóa tìm kiếm là bắt buộc"
            });
        }

        let searchQuery = {};

        if (type === "vin") {
            searchQuery.vin = { $regex: q, $options: "i" };
        } else if (type === "owner") {
            searchQuery.$or = [
                { ownerName: { $regex: q, $options: "i" } },
                { ownerPhone: { $regex: q, $options: "i" } },
                { ownerEmail: { $regex: q, $options: "i" } }
            ];
        } else {
            searchQuery.$or = [
                { vin: { $regex: q, $options: "i" } },
                { model: { $regex: q, $options: "i" } },
                { ownerName: { $regex: q, $options: "i" } },
                { ownerPhone: { $regex: q, $options: "i" } }
            ];
        }

        const skip = (page - 1) * limit;
        const vehicles = await Vehicle.find(searchQuery)
            .select("vin model year ownerName ownerPhone currentMileage status")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const total = await Vehicle.countDocuments(searchQuery);

        res.json({
            success: true,
            message: "Tìm kiếm xe thành công",
            data: {
                vehicles,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (err) {
        console.error("Search vehicles error:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi tìm kiếm xe",
            error: err.message
        });
    }
});

// Get parts statistics (move before dynamic routes)
router.get("/stats/parts", authenticateToken, authorizeRole("admin", "service_staff"), async (req, res) => {
    try {
        const { serviceCenter, partType, status } = req.query;

        const cacheKey = `parts_stats:${serviceCenter || 'all'}:${partType || 'all'}:${status || 'all'}`;

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

        // Build aggregation pipeline
        const matchStage = { $match: {} };
        if (serviceCenter) {
            matchStage.$match.assignedServiceCenter = serviceCenter;
        }

        const pipeline = [
            matchStage,
            { $unwind: "$parts" }
        ];

        // Add part filters
        const partMatch = {};
        if (partType) partMatch["parts.partType"] = partType;
        if (status) partMatch["parts.status"] = status;

        if (Object.keys(partMatch).length > 0) {
            pipeline.push({ $match: partMatch });
        }

        // Group by part type and status
        pipeline.push(
            {
                $group: {
                    _id: {
                        partType: "$parts.partType",
                        status: "$parts.status"
                    },
                    count: { $sum: 1 },
                    totalCost: { $sum: "$parts.cost" },
                    avgCost: { $avg: "$parts.cost" }
                }
            },
            {
                $group: {
                    _id: "$_id.partType",
                    statuses: {
                        $push: {
                            status: "$_id.status",
                            count: "$count",
                            totalCost: "$totalCost",
                            avgCost: "$avgCost"
                        }
                    },
                    totalParts: { $sum: "$count" },
                    totalValue: { $sum: "$totalCost" }
                }
            },
            { $sort: { totalParts: -1 } }
        );

        const stats = await Vehicle.aggregate(pipeline);

        // Calculate overall statistics
        const overallStats = {
            totalPartTypes: stats.length,
            totalParts: stats.reduce((sum, item) => sum + item.totalParts, 0),
            totalValue: stats.reduce((sum, item) => sum + item.totalValue, 0),
            partsByType: stats
        };

        // Cache for 1 hour
        await redisService.set(cacheKey, JSON.stringify(overallStats), 3600);

        res.json({
            success: true,
            message: "Lấy thống kê phụ tùng thành công",
            data: overallStats,
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
});

// Get vehicle overview statistics (move before dynamic routes)
router.get("/stats/overview", authenticateToken, authorizeRole("admin", "service_staff"), async (req, res) => {
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
});

// UC2: Add part to vehicle (admin, service_staff, technician)
router.post("/:vehicleId/parts", authenticateToken, async (req, res) => {
    try {
        const { vehicleId } = req.params;
        const {
            serialNumber, partType, partName, manufacturer,
            installationDate, warrantyEndDate, cost
        } = req.body;

        // Validation
        if (!serialNumber || !partType || !partName || !warrantyEndDate) {
            return res.status(400).json({
                success: false,
                message: "Số seri, loại phụ tùng, tên phụ tùng và ngày hết hạn bảo hành là bắt buộc"
            });
        }

        // Check if serial number already exists
        const existingPart = await Vehicle.findOne({ "parts.serialNumber": serialNumber });
        if (existingPart) {
            return res.status(400).json({
                success: false,
                message: "Số seri phụ tùng đã tồn tại trong hệ thống"
            });
        }

        const vehicle = await Vehicle.findById(vehicleId);
        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy xe"
            });
        }

        const newPart = {
            serialNumber,
            partType,
            partName,
            manufacturer: manufacturer || "Unknown",
            installationDate: installationDate ? new Date(installationDate) : new Date(),
            warrantyEndDate: new Date(warrantyEndDate),
            cost: cost || 0,
            status: "active",
            installedBy: req.user.userId
        };

        vehicle.parts.push(newPart);
        await vehicle.save();

        // Invalidate cache
        await redisService.del(`vehicle:${vehicle.vin}`);
        await redisService.del(`parts:${vehicleId}`);

        console.log(`🔧 Part added: ${serialNumber} to ${vehicle.vin} by ${req.user.email}`);

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
});

// UC3: Add service history record
router.post("/:vehicleId/service-history", authenticateToken, async (req, res) => {
    try {
        const { vehicleId } = req.params;
        const {
            serviceType, description, serviceDate, mileage,
            serviceCenter, cost, technicianId, partsReplaced
        } = req.body;

        // Validation
        if (!serviceType || !description || !serviceDate) {
            return res.status(400).json({
                success: false,
                message: "Loại dịch vụ, mô tả và ngày dịch vụ là bắt buộc"
            });
        }

        const vehicle = await Vehicle.findById(vehicleId);
        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy xe"
            });
        }

        // Validate mileage
        if (mileage && mileage < vehicle.currentMileage) {
            return res.status(400).json({
                success: false,
                message: "Số km hiện tại không thể nhỏ hơn số km trước đó"
            });
        }

        const newServiceRecord = {
            serviceType,
            description,
            serviceDate: new Date(serviceDate),
            mileage: mileage || vehicle.currentMileage,
            serviceCenter: serviceCenter || vehicle.assignedServiceCenter,
            cost: cost || 0,
            technicianId: technicianId || req.user.userId,
            partsReplaced: partsReplaced || [],
            recordedBy: req.user.userId
        };

        vehicle.serviceHistory.push(newServiceRecord);

        // Update vehicle mileage if provided and higher
        if (mileage && mileage > vehicle.currentMileage) {
            vehicle.currentMileage = mileage;
        }

        // Update parts status if replaced
        if (partsReplaced && partsReplaced.length > 0) {
            partsReplaced.forEach(partSerial => {
                const part = vehicle.parts.find(p => p.serialNumber === partSerial);
                if (part) {
                    part.status = "replaced";
                    part.replacedDate = new Date(serviceDate);
                }
            });
        }

        await vehicle.save();

        // Invalidate cache
        await redisService.del(`vehicle:${vehicle.vin}`);
        await redisService.del(`service_history:${vehicleId}`);

        console.log(`📋 Service record added to ${vehicle.vin} by ${req.user.email}`);

        res.status(201).json({
            success: true,
            message: "Lưu lịch sử dịch vụ thành công",
            data: {
                vehicleVin: vehicle.vin,
                serviceType,
                serviceDate: newServiceRecord.serviceDate,
                mileage: newServiceRecord.mileage
            }
        });
    } catch (err) {
        console.error("Add service history error:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lưu lịch sử dịch vụ",
            error: err.message
        });
    }
});

// Get vehicle parts with Redis cache
router.get("/:vehicleId/parts", authenticateToken, async (req, res) => {
    try {
        const { vehicleId } = req.params;

        // Check Redis cache first
        const cachedParts = await redisService.get(`parts:${vehicleId}`);
        if (cachedParts) {
            return res.json({
                success: true,
                message: "Lấy danh sách phụ tùng thành công (cached)",
                data: JSON.parse(cachedParts),
                cached: true
            });
        }

        const vehicle = await Vehicle.findById(vehicleId).select("vin parts").lean();
        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy xe"
            });
        }

        // Cache for 30 minutes
        await redisService.set(`parts:${vehicleId}`, JSON.stringify(vehicle.parts), 1800);

        res.json({
            success: true,
            message: "Lấy danh sách phụ tùng thành công",
            data: vehicle.parts,
            vehicleVin: vehicle.vin,
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
});

// Update part status
router.put("/:vehicleId/parts/:partId", authenticateToken, authorizeRole("admin", "service_staff", "technician"), async (req, res) => {
    try {
        const { vehicleId, partId } = req.params;
        const { status, notes, replacedDate } = req.body;

        const validStatuses = ["active", "replaced", "defective", "recalled"];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Trạng thái không hợp lệ. Chỉ chấp nhận: " + validStatuses.join(", ")
            });
        }

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

        // Update part status
        if (status) part.status = status;
        if (notes) part.notes = notes;
        if (replacedDate) part.replacedDate = new Date(replacedDate);
        if (status === "replaced" && !part.replacedDate) {
            part.replacedDate = new Date();
        }

        part.updatedBy = req.user.userId;
        part.updatedAt = new Date();

        await vehicle.save();

        // Invalidate cache
        await redisService.del(`vehicle:${vehicle.vin}`);
        await redisService.del(`parts:${vehicleId}`);

        console.log(`🔧 Part status updated: ${part.serialNumber} to ${status} by ${req.user.email}`);

        res.json({
            success: true,
            message: "Cập nhật trạng thái phụ tùng thành công",
            data: {
                partId: part._id,
                serialNumber: part.serialNumber,
                status: part.status,
                updatedAt: part.updatedAt
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
});

// Search part by serial number
router.get("/parts/serial/:serialNumber", authenticateToken, async (req, res) => {
    try {
        const { serialNumber } = req.params;

        const vehicle = await Vehicle.findOne(
            { "parts.serialNumber": serialNumber },
            { vin: 1, model: 1, year: 1, ownerName: 1, parts: { $elemMatch: { serialNumber } } }
        ).lean();

        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy phụ tùng với số seri này"
            });
        }

        res.json({
            success: true,
            message: "Tìm thấy phụ tùng",
            data: {
                vehicle: {
                    id: vehicle._id,
                    vin: vehicle.vin,
                    model: vehicle.model,
                    year: vehicle.year,
                    ownerName: vehicle.ownerName
                },
                part: vehicle.parts[0]
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
});

// Get vehicle service history with Redis cache
router.get("/:vehicleId/service-history", authenticateToken, async (req, res) => {
    try {
        const { vehicleId } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const cacheKey = `service_history:${vehicleId}:page:${page}:limit:${limit}`;

        // Check Redis cache first
        const cachedHistory = await redisService.get(cacheKey);
        if (cachedHistory) {
            return res.json({
                success: true,
                message: "Lấy lịch sử dịch vụ thành công (cached)",
                data: JSON.parse(cachedHistory),
                cached: true
            });
        }

        const vehicle = await Vehicle.findById(vehicleId).select("vin serviceHistory").lean();
        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy xe"
            });
        }

        // Pagination
        const skip = (page - 1) * limit;
        const sortedHistory = vehicle.serviceHistory
            .sort((a, b) => new Date(b.serviceDate) - new Date(a.serviceDate))
            .slice(skip, skip + parseInt(limit));

        const result = {
            vehicleVin: vehicle.vin,
            serviceHistory: sortedHistory,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: vehicle.serviceHistory.length,
                pages: Math.ceil(vehicle.serviceHistory.length / limit)
            }
        };

        // Cache for 30 minutes
        await redisService.set(cacheKey, JSON.stringify(result), 1800);

        res.json({
            success: true,
            message: "Lấy lịch sử dịch vụ thành công",
            data: result,
            cached: false
        });
    } catch (err) {
        console.error("Get service history error:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy lịch sử dịch vụ",
            error: err.message
        });
    }
});

// Update service history record
router.put("/:vehicleId/service-history/:recordId", authenticateToken, authorizeRole("admin", "service_staff", "technician"), async (req, res) => {
    try {
        const { vehicleId, recordId } = req.params;
        const { description, cost, status, notes, attachments } = req.body;

        const vehicle = await Vehicle.findById(vehicleId);
        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy xe"
            });
        }

        const serviceRecord = vehicle.serviceHistory.id(recordId);
        if (!serviceRecord) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy bản ghi dịch vụ"
            });
        }

        // Update fields
        if (description) serviceRecord.description = description;
        if (cost !== undefined) serviceRecord.cost = cost;
        if (status) serviceRecord.status = status;
        if (notes) serviceRecord.notes = notes;
        if (attachments) serviceRecord.attachments = attachments;

        serviceRecord.updatedBy = req.user.userId;
        serviceRecord.updatedAt = new Date();

        await vehicle.save();

        // Invalidate cache
        await redisService.del(`vehicle:${vehicle.vin}`);
        await redisService.del(`service_history:${vehicleId}:*`);

        console.log(`📋 Service record updated: ${recordId} by ${req.user.email}`);

        res.json({
            success: true,
            message: "Cập nhật lịch sử dịch vụ thành công",
            data: {
                recordId: serviceRecord._id,
                serviceDate: serviceRecord.serviceDate,
                description: serviceRecord.description,
                status: serviceRecord.status,
                updatedAt: serviceRecord.updatedAt
            }
        });
    } catch (err) {
        console.error("Update service history error:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi cập nhật lịch sử dịch vụ",
            error: err.message
        });
    }
});

// Get service history by service center
router.get("/service-center/:centerName/history", authenticateToken, authorizeRole("admin", "service_staff"), async (req, res) => {
    try {
        const { centerName } = req.params;
        const { page = 1, limit = 20, startDate, endDate } = req.query;

        const cacheKey = `service_center_history:${centerName}:page:${page}:limit:${limit}:${startDate || 'all'}:${endDate || 'all'}`;

        // Check Redis cache first
        const cachedHistory = await redisService.get(cacheKey);
        if (cachedHistory) {
            return res.json({
                success: true,
                message: "Lấy lịch sử dịch vụ theo trung tâm thành công (cached)",
                data: JSON.parse(cachedHistory),
                cached: true
            });
        }

        // Build aggregation pipeline
        const matchStage = {
            $match: {
                $or: [
                    { assignedServiceCenter: centerName },
                    { "serviceHistory.serviceCenter": centerName }
                ]
            }
        };

        const pipeline = [
            matchStage,
            { $unwind: "$serviceHistory" },
            {
                $match: {
                    "serviceHistory.serviceCenter": centerName
                }
            }
        ];

        // Add date filter if provided
        if (startDate || endDate) {
            const dateFilter = {};
            if (startDate) dateFilter.$gte = new Date(startDate);
            if (endDate) dateFilter.$lte = new Date(endDate);
            pipeline.push({
                $match: {
                    "serviceHistory.serviceDate": dateFilter
                }
            });
        }

        pipeline.push(
            {
                $project: {
                    vin: 1,
                    model: 1,
                    year: 1,
                    ownerName: 1,
                    serviceRecord: "$serviceHistory"
                }
            },
            { $sort: { "serviceRecord.serviceDate": -1 } },
            { $skip: (page - 1) * limit },
            { $limit: parseInt(limit) }
        );

        const serviceRecords = await Vehicle.aggregate(pipeline);

        // Get total count
        const countPipeline = pipeline.slice(0, -2); // Remove skip and limit
        countPipeline.push({ $count: "total" });
        const countResult = await Vehicle.aggregate(countPipeline);
        const total = countResult[0]?.total || 0;

        const result = {
            serviceCenter: centerName,
            serviceRecords,
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
            message: "Lấy lịch sử dịch vụ theo trung tâm thành công",
            data: result,
            cached: false
        });
    } catch (err) {
        console.error("Get service center history error:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy lịch sử dịch vụ theo trung tâm",
            error: err.message
        });
    }
});

// Update vehicle information
router.put("/:id", authenticateToken, authorizeRole("admin", "service_staff"), async (req, res) => {
    try {
        const { id } = req.params;
        const {
            model, year, color, batteryCapacity, motorPower,
            ownerName, ownerPhone, ownerEmail, ownerAddress,
            assignedServiceCenter, currentMileage, status, notes
        } = req.body;

        const vehicle = await Vehicle.findById(id);
        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy xe"
            });
        }

        // Build update data
        const updateData = {};
        if (model) updateData.model = model;
        if (year) updateData.year = year;
        if (color) updateData.color = color;
        if (batteryCapacity) updateData.batteryCapacity = batteryCapacity;
        if (motorPower) updateData.motorPower = motorPower;
        if (ownerName) updateData.ownerName = ownerName;
        if (ownerPhone) updateData.ownerPhone = ownerPhone;
        if (ownerEmail) updateData.ownerEmail = ownerEmail;
        if (ownerAddress) updateData.ownerAddress = ownerAddress;
        if (assignedServiceCenter) updateData.assignedServiceCenter = assignedServiceCenter;
        if (status) updateData.status = status;
        if (notes) updateData.notes = notes;

        // Validate mileage
        if (currentMileage !== undefined) {
            if (currentMileage < vehicle.currentMileage) {
                return res.status(400).json({
                    success: false,
                    message: "Số km hiện tại không thể nhỏ hơn số km trước đó"
                });
            }
            updateData.currentMileage = currentMileage;
        }

        updateData.updatedBy = req.user.userId;
        updateData.updatedAt = new Date();

        const updatedVehicle = await Vehicle.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).lean();

        // Invalidate cache
        await redisService.del(`vehicle:${vehicle.vin}`);
        if (vehicle.assignedServiceCenter) {
            await redisService.del(`vehicles:service_center:${vehicle.assignedServiceCenter}`);
        }

        console.log(`🔧 Vehicle updated: ${vehicle.vin} by ${req.user.email}`);

        res.json({
            success: true,
            message: "Cập nhật thông tin xe thành công",
            data: updatedVehicle
        });
    } catch (err) {
        console.error("Update vehicle error:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi cập nhật thông tin xe",
            error: err.message
        });
    }
});



// Export router
module.exports = router;
